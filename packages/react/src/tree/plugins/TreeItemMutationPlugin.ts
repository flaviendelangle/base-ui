import type { TreeStore } from '../store/TreeStore';
import type { TreeItemId, TreeRootItemsChangeEventReason } from '../store/types';
import { selectors } from '../store/selectors';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';

export class TreeItemMutationPlugin {
  private store: TreeStore;

  constructor(store: TreeStore) {
    this.store = store;
  }

  // ---------------------------------------------------------------------------
  // Public — Remove
  // ---------------------------------------------------------------------------

  removeItems = (itemIds: Set<TreeItemId>): void => {
    if (itemIds.size === 0) {
      return;
    }

    const newItems = this.removeItemModels(this.store.state.items, itemIds);
    this.applyMutation(newItems, REASONS.imperativeAction);
  };

  // ---------------------------------------------------------------------------
  // Public — Add
  // ---------------------------------------------------------------------------

  addItems = (items: any[], parentId: TreeItemId | null, index: number): void => {
    if (items.length === 0) {
      return;
    }

    const newItems = this.insertItemModels(this.store.state.items, items, parentId, index);
    this.applyMutation(newItems, REASONS.imperativeAction);
  };

  addItemsBefore = (items: any[], referenceItemId: TreeItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex);
  };

  addItemsAfter = (items: any[], referenceItemId: TreeItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex + 1);
  };

  // ---------------------------------------------------------------------------
  // Public — Move
  // ---------------------------------------------------------------------------

  moveItems = (
    itemIds: Set<TreeItemId>,
    newParentId: TreeItemId | null,
    newIndex: number,
  ): void => {
    const { state } = this.store;

    if (itemIds.size === 0) {
      return;
    }

    // 1. Prune descendants: for each item, walk up its ancestor chain —
    //    if any ancestor is also in the set, skip this item.
    const prunedIds: TreeItemId[] = [];

    for (const id of itemIds) {
      if (selectors.itemMeta(state, id) == null) {
        continue;
      }
      let dominated = false;
      let currentId: TreeItemId | null = selectors.itemParentId(state, id);
      while (currentId != null) {
        if (itemIds.has(currentId)) {
          dominated = true;
          break;
        }
        currentId = selectors.itemParentId(state, currentId);
      }
      if (!dominated) {
        prunedIds.push(id);
      }
    }

    if (prunedIds.length === 0) {
      return;
    }

    const prunedIdSet = new Set(prunedIds);

    // 2. Collect the item models in their current tree order.
    const itemsToMove = prunedIds
      .map((id) => selectors.itemModel(state, id))
      .filter((model) => model != null);

    if (itemsToMove.length === 0) {
      return;
    }

    // 3. Adjust insertion index — count pruned items that are siblings sitting
    //    before the target index (their removal shifts later indices down).
    let adjustedIndex = newIndex;
    for (const id of prunedIds) {
      const parentId = selectors.itemParentId(state, id);
      const isSameParent =
        (parentId === null && newParentId === null) || parentId === newParentId;
      if (isSameParent) {
        const idx = selectors.itemIndex(state, id);
        if (idx !== -1 && idx < newIndex) {
          adjustedIndex -= 1;
        }
      }
    }

    // 4. Remove, then insert.
    const withoutItems = this.removeItemModels(state.items, prunedIdSet);
    const newItems = this.insertItemModels(
      withoutItems,
      itemsToMove,
      newParentId,
      adjustedIndex,
    );

    this.applyMutation(newItems, REASONS.imperativeAction);
  };

  moveItemsBefore = (itemIds: Set<TreeItemId>, referenceItemId: TreeItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.moveItems(itemIds, targetMeta.parentId, targetIndex);
  };

  moveItemsAfter = (itemIds: Set<TreeItemId>, referenceItemId: TreeItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.moveItems(itemIds, targetMeta.parentId, targetIndex + 1);
  };

  // ---------------------------------------------------------------------------
  // Public — Disable
  // ---------------------------------------------------------------------------

  setIsItemDisabled = (itemId: TreeItemId, isDisabled: boolean): void => {
    const meta = selectors.itemMeta(this.store.state, itemId);
    if (!meta || meta.disabled === isDisabled) {
      return;
    }

    this.store.update({
      itemMetaPatches: {
        ...this.store.state.itemMetaPatches,
        [itemId]: { ...this.store.state.itemMetaPatches[itemId], disabled: isDisabled },
      },
    });
  };

  // ---------------------------------------------------------------------------
  // Private — Tree mutation helpers
  // ---------------------------------------------------------------------------

  /**
   * Fire `onItemsChange`, check cancellation, update store state.
   */
  private applyMutation(newItems: any[], reason: TreeRootItemsChangeEventReason): void {
    if (newItems === this.store.state.items) {
      return;
    }

    const details = createChangeEventDetails(reason);
    this.store.context.onItemsChange(newItems, details);
    if (details.isCanceled) {
      return;
    }

    this.store.set('items', newItems);
  }

  /**
   * Remove multiple items from the raw items tree by ID.
   */
  private removeItemModels(
    items: readonly any[],
    idsToRemove: Set<TreeItemId>,
  ): any[] {
    const { state } = this.store;
    const result: any[] = [];

    for (const item of items) {
      if (idsToRemove.has(state.itemToId(item))) {
        continue;
      }
      const children = state.itemToChildren(item);
      if (children && children.length > 0) {
        const newChildren = this.removeItemModels(children, idsToRemove);
        if (newChildren.length !== children.length) {
          result.push({ ...item, children: newChildren });
          continue;
        }
      }
      result.push(item);
    }

    return result;
  }

  /**
   * Insert items at a given parent + index in the raw items tree.
   * Short-circuits recursion once the target parent is found.
   */
  private insertItemModels(
    items: readonly any[],
    newItems: any[],
    parentId: TreeItemId | null,
    index: number,
  ): any[] {
    const { state } = this.store;

    if (parentId === null) {
      const result = [...items];
      result.splice(index, 0, ...newItems);
      return result;
    }

    let found = false;
    const result = items.map((current) => {
      if (found) {
        return current;
      }
      if (state.itemToId(current) === parentId) {
        found = true;
        const children = [...(state.itemToChildren(current) ?? [])];
        children.splice(index, 0, ...newItems);
        return { ...current, children };
      }
      const currentChildren = state.itemToChildren(current);
      if (currentChildren && currentChildren.length > 0) {
        const newChildren = this.insertItemModels(currentChildren, newItems, parentId, index);
        if (newChildren !== currentChildren) {
          found = true;
          return { ...current, children: newChildren };
        }
      }
      return current;
    });

    return found ? result : (items as any[]);
  }
}
