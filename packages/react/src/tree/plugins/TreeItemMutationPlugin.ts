import type { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import type {
  TreeRootItemsChangeEventReason,
  TreeItemsChangeInfo,
  TreeItemsState,
  TreeSelectionMode,
} from '../store/types';
import { TREE_VIEW_ROOT_PARENT_ID } from '../store/types';
import { selectors } from '../store/selectors';
import { createChangeEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';

export class TreeItemMutationPlugin<TItem> {
  private store: TreeStore<TreeSelectionMode | undefined, TItem>;

  constructor(store: TreeStore<TreeSelectionMode | undefined, TItem>) {
    this.store = store;
  }

  removeItems = (itemIds: Set<CollectionItemId>): void => {
    if (itemIds.size === 0) {
      return;
    }

    const { state } = this.store;
    const removed: TreeItemsChangeInfo['removed'] = [];
    for (const itemId of itemIds) {
      const meta = selectors.itemMeta(state, itemId);
      if (meta) {
        removed.push({ itemId, parentId: meta.parentId });
      }
    }

    // Compute incremental lookup updates
    const lookupUpdates = this.removeItemsFromLookups(itemIds);

    const newItems = this.removeItemModels(state.items, itemIds);
    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      {
        added: [],
        removed,
        moved: [],
      },
      lookupUpdates,
    );
  };

  addItems = (items: readonly TItem[], parentId: CollectionItemId | null, index: number): void => {
    if (items.length === 0) {
      return;
    }

    const added: TreeItemsChangeInfo['added'] = items.map((item, i) => ({
      item,
      parentId,
      index: index + i,
    }));

    // Compute incremental lookup updates
    const parentMeta = parentId != null ? selectors.itemMeta(this.store.state, parentId) : null;
    const depth = parentMeta ? parentMeta.depth + 1 : 0;
    const lookupUpdates = this.addItemsToLookups(items, parentId, index, depth);

    const newItems = this.insertItemModels(this.store.state.items, items, parentId, index);
    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      {
        added,
        removed: [],
        moved: [],
      },
      lookupUpdates,
    );
  };

  addItemsBefore = (items: readonly TItem[], referenceItemId: CollectionItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex);
  };

  addItemsAfter = (items: readonly TItem[], referenceItemId: CollectionItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex + 1);
  };

  moveItems = (
    itemIds: Set<CollectionItemId>,
    newParentId: CollectionItemId | null,
    newIndex: number,
  ): void => {
    const { state } = this.store;

    if (itemIds.size === 0) {
      return;
    }

    // 1. Prune descendants: for each item, walk up its ancestor chain —
    //    if any ancestor is also in the set, skip this item.
    const prunedIds: CollectionItemId[] = [];

    for (const id of itemIds) {
      if (selectors.itemMeta(state, id) == null) {
        continue;
      }
      let dominated = false;
      let currentId: CollectionItemId | null = selectors.itemParentId(state, id);
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
      const isSameParent = (parentId === null && newParentId === null) || parentId === newParentId;
      if (isSameParent) {
        const idx = selectors.itemIndex(state, id);
        if (idx !== -1 && idx < newIndex) {
          adjustedIndex -= 1;
        }
      }
    }

    // 4. Capture old positions before mutation.
    const moved: TreeItemsChangeInfo['moved'] = prunedIds.map((id, i) => ({
      itemId: id,
      oldPosition: {
        parentId: selectors.itemParentId(state, id),
        index: selectors.itemIndex(state, id),
      },
      newPosition: {
        parentId: newParentId,
        index: adjustedIndex + i,
      },
    }));

    // 5. Compute incremental lookup updates: remove from old parents, add to new parent,
    //    update depths for moved subtrees.
    const lookupUpdates = this.moveItemsInLookups(prunedIds, newParentId, adjustedIndex);

    // 6. Remove, then insert (raw items array).
    const withoutItems = this.removeItemModels(state.items, prunedIdSet);
    const newItems = this.insertItemModels(withoutItems, itemsToMove, newParentId, adjustedIndex);

    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      {
        added: [],
        removed: [],
        moved,
      },
      lookupUpdates,
    );
  };

  moveItemsBefore = (itemIds: Set<CollectionItemId>, referenceItemId: CollectionItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.moveItems(itemIds, targetMeta.parentId, targetIndex);
  };

  moveItemsAfter = (itemIds: Set<CollectionItemId>, referenceItemId: CollectionItemId): void => {
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

  setIsItemDisabled = (itemId: CollectionItemId, isDisabled: boolean): void => {
    const { state } = this.store;
    const meta = selectors.itemMeta(state, itemId);
    if (!meta || meta.disabled === isDisabled) {
      return;
    }

    const currentItem = state.itemModelLookup[itemId];
    if (!currentItem) {
      return;
    }

    const newItem = state.setIsItemDisabled(currentItem, isDisabled);
    const newItems = this.replaceItemModel(state.items, itemId, newItem);

    const itemMetaLookup = { ...state.itemMetaLookup };
    itemMetaLookup[itemId] = { ...itemMetaLookup[itemId], disabled: isDisabled };

    const itemModelLookup = { ...state.itemModelLookup };
    itemModelLookup[itemId] = newItem;

    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      { added: [], removed: [], moved: [] },
      { itemMetaLookup, itemModelLookup },
    );
  };

  // ---------------------------------------------------------------------------
  // Private — Apply mutation
  // ---------------------------------------------------------------------------

  /**
   * Fire `onItemsChange`, check cancellation, update store state with items + lookup updates.
   */
  private applyMutation(
    newItems: readonly TItem[],
    reason: TreeRootItemsChangeEventReason,
    changeInfo: TreeItemsChangeInfo,
    lookupUpdates: Partial<TreeItemsState>,
  ): void {
    if (newItems === this.store.state.items) {
      return;
    }

    const details = createChangeEventDetails(reason, undefined, undefined, changeInfo);
    this.store.context.onItemsChange(newItems as TItem[], details);
    if (details.isCanceled) {
      return;
    }

    this.store.lastMutationItems = newItems;
    this.store.update({
      items: newItems,
      ...lookupUpdates,
    });
  }

  /**
   * Collect an item and all its descendants from the current lookups.
   */
  private collectDescendantIds(itemId: CollectionItemId): CollectionItemId[] {
    const { state } = this.store;
    const result: CollectionItemId[] = [itemId];
    for (let i = 0; i < result.length; i += 1) {
      const children = state.itemOrderedChildrenIdsLookup[result[i]];
      if (children) {
        for (const childId of children) {
          result.push(childId);
        }
      }
    }
    return result;
  }

  /**
   * Build a childrenIndexes record from an ordered children IDs array.
   */
  private buildChildrenIndexes(childrenIds: CollectionItemId[]): Record<CollectionItemId, number> {
    const indexes: Record<CollectionItemId, number> = {};
    for (let i = 0; i < childrenIds.length; i += 1) {
      indexes[childrenIds[i]] = i;
    }
    return indexes;
  }

  /**
   * Remove items and their descendants from all lookup tables.
   */
  private removeItemsFromLookups(itemIds: Set<CollectionItemId>): Partial<TreeItemsState> {
    const { state } = this.store;
    const allIdsToRemove = new Set<CollectionItemId>();
    const affectedParentKeys = new Set<CollectionItemId>();

    for (const itemId of itemIds) {
      const meta = state.itemMetaLookup[itemId];
      if (!meta) {
        continue;
      }
      affectedParentKeys.add(meta.parentId ?? TREE_VIEW_ROOT_PARENT_ID);
      for (const id of this.collectDescendantIds(itemId)) {
        allIdsToRemove.add(id);
      }
    }

    // Clone and update lookups
    const itemModelLookup = { ...state.itemModelLookup };
    const itemMetaLookup = { ...state.itemMetaLookup };
    const itemIdLookup = { ...state.itemIdLookup };
    const itemOrderedChildrenIdsLookup = { ...state.itemOrderedChildrenIdsLookup };
    const itemChildrenIndexesLookup = { ...state.itemChildrenIndexesLookup };

    // Delete removed items from flat lookups
    for (const id of allIdsToRemove) {
      delete itemModelLookup[id];
      delete itemMetaLookup[id];
      delete itemIdLookup[id];
      // Also clean up their children entries
      delete itemOrderedChildrenIdsLookup[id];
      delete itemChildrenIndexesLookup[id];
    }

    // Update affected parents' children arrays
    for (const parentKey of affectedParentKeys) {
      const oldChildren = state.itemOrderedChildrenIdsLookup[parentKey];
      if (!oldChildren) {
        continue;
      }
      const newChildren = oldChildren.filter((id) => !allIdsToRemove.has(id));
      itemOrderedChildrenIdsLookup[parentKey] = newChildren;
      itemChildrenIndexesLookup[parentKey] = this.buildChildrenIndexes(newChildren);
    }

    return {
      itemModelLookup,
      itemMetaLookup,
      itemIdLookup,
      itemOrderedChildrenIdsLookup,
      itemChildrenIndexesLookup,
    };
  }

  /**
   * Add items and their descendants to all lookup tables.
   */
  private addItemsToLookups(
    items: readonly TItem[],
    parentId: CollectionItemId | null,
    insertIndex: number,
    depth: number,
  ): Partial<TreeItemsState> {
    const { state } = this.store;
    const parentKey = parentId ?? TREE_VIEW_ROOT_PARENT_ID;

    // Clone the lookups we'll modify
    const itemModelLookup = { ...state.itemModelLookup };
    const itemMetaLookup = { ...state.itemMetaLookup };
    const itemIdLookup = { ...state.itemIdLookup };
    const itemOrderedChildrenIdsLookup = { ...state.itemOrderedChildrenIdsLookup };
    const itemChildrenIndexesLookup = { ...state.itemChildrenIndexesLookup };

    // Recursively add items to flat lookups
    const newChildIds: CollectionItemId[] = [];

    const processItems = (
      siblings: readonly TItem[],
      siblingParentId: CollectionItemId | null,
      siblingDepth: number,
    ) => {
      const siblingParentKey = siblingParentId ?? TREE_VIEW_ROOT_PARENT_ID;
      const siblingIds: CollectionItemId[] = [];

      for (let i = 0; i < siblings.length; i += 1) {
        const item = siblings[i];
        const itemId = state.itemToId(item);
        const children = state.itemToChildren(item);

        itemIdLookup[itemId] = itemId;
        itemModelLookup[itemId] = item;
        itemMetaLookup[itemId] = {
          id: itemId,
          parentId: siblingParentId,
          depth: siblingDepth,
          expandable: !!children,
          disabled: state.isItemDisabled(item),
          selectable: !state.isItemSelectionDisabled(item),
          label: state.itemToStringLabel(item),
        };
        siblingIds.push(itemId);

        if (children && children.length > 0) {
          processItems(children, itemId, siblingDepth + 1);
        }
      }

      // If these are nested children (not the top-level items being added),
      // set their parent's children arrays directly
      if (siblingParentId !== parentId) {
        itemOrderedChildrenIdsLookup[siblingParentKey] = siblingIds;
        itemChildrenIndexesLookup[siblingParentKey] = this.buildChildrenIndexes(siblingIds);
      } else {
        // For top-level items, collect IDs to splice into the parent
        newChildIds.push(...siblingIds);
      }
    };

    processItems(items, parentId, depth);

    // Splice new IDs into parent's children array
    const oldParentChildren = state.itemOrderedChildrenIdsLookup[parentKey] ?? [];
    const newParentChildren = [...oldParentChildren];
    newParentChildren.splice(insertIndex, 0, ...newChildIds);
    itemOrderedChildrenIdsLookup[parentKey] = newParentChildren;
    itemChildrenIndexesLookup[parentKey] = this.buildChildrenIndexes(newParentChildren);

    // If the parent was previously not expandable, update its meta
    if (parentId != null) {
      const parentMetaEntry = itemMetaLookup[parentId];
      if (parentMetaEntry && !parentMetaEntry.expandable) {
        itemMetaLookup[parentId] = { ...parentMetaEntry, expandable: true };
      }
    }

    return {
      itemModelLookup,
      itemMetaLookup,
      itemIdLookup,
      itemOrderedChildrenIdsLookup,
      itemChildrenIndexesLookup,
    };
  }

  /**
   * Move items in the lookup tables: remove from old parents, add to new parent,
   * and update parentId/depth for moved subtrees.
   */
  private moveItemsInLookups(
    itemIds: CollectionItemId[],
    newParentId: CollectionItemId | null,
    newIndex: number,
  ): Partial<TreeItemsState> {
    const { state } = this.store;
    const newParentKey = newParentId ?? TREE_VIEW_ROOT_PARENT_ID;
    const newParentMeta = newParentId != null ? state.itemMetaLookup[newParentId] : null;
    const newDepth = newParentMeta ? newParentMeta.depth + 1 : 0;

    // Clone lookups
    const itemMetaLookup = { ...state.itemMetaLookup };
    const itemOrderedChildrenIdsLookup = { ...state.itemOrderedChildrenIdsLookup };
    const itemChildrenIndexesLookup = { ...state.itemChildrenIndexesLookup };

    // Track affected old parents
    const affectedOldParentKeys = new Set<CollectionItemId>();
    const itemIdSet = new Set(itemIds);

    for (const id of itemIds) {
      const meta = state.itemMetaLookup[id];
      if (meta) {
        affectedOldParentKeys.add(meta.parentId ?? TREE_VIEW_ROOT_PARENT_ID);
      }
    }

    // Remove from old parents' children arrays
    for (const parentKey of affectedOldParentKeys) {
      const oldChildren = itemOrderedChildrenIdsLookup[parentKey] ?? [];
      const newChildren = oldChildren.filter((id) => !itemIdSet.has(id));
      itemOrderedChildrenIdsLookup[parentKey] = newChildren;
      itemChildrenIndexesLookup[parentKey] = this.buildChildrenIndexes(newChildren);
    }

    // Insert into new parent's children array
    const currentNewParentChildren = itemOrderedChildrenIdsLookup[newParentKey] ?? [];
    const updatedNewParentChildren = [...currentNewParentChildren];
    updatedNewParentChildren.splice(newIndex, 0, ...itemIds);
    itemOrderedChildrenIdsLookup[newParentKey] = updatedNewParentChildren;
    itemChildrenIndexesLookup[newParentKey] = this.buildChildrenIndexes(updatedNewParentChildren);

    // Update parentId and depth for moved items and their descendants
    const updateDepths = (
      id: CollectionItemId,
      parentIdVal: CollectionItemId | null,
      depth: number,
    ) => {
      const oldMeta = itemMetaLookup[id];
      if (!oldMeta) {
        return;
      }
      itemMetaLookup[id] = { ...oldMeta, parentId: parentIdVal, depth };
      const children = itemOrderedChildrenIdsLookup[id];
      if (children) {
        for (const childId of children) {
          updateDepths(childId, id, depth + 1);
        }
      }
    };

    for (const id of itemIds) {
      updateDepths(id, newParentId, newDepth);
    }

    // If new parent was previously not expandable, update its meta
    if (newParentId != null) {
      const parentMetaEntry = itemMetaLookup[newParentId];
      if (parentMetaEntry && !parentMetaEntry.expandable) {
        itemMetaLookup[newParentId] = { ...parentMetaEntry, expandable: true };
      }
    }

    // If old parents lost all children, update expandable
    for (const parentKey of affectedOldParentKeys) {
      if (parentKey === TREE_VIEW_ROOT_PARENT_ID) {
        continue;
      }
      const remaining = itemOrderedChildrenIdsLookup[parentKey];
      if (remaining && remaining.length === 0) {
        const parentMetaEntry = itemMetaLookup[parentKey];
        if (parentMetaEntry && parentMetaEntry.expandable) {
          itemMetaLookup[parentKey] = { ...parentMetaEntry, expandable: false };
        }
      }
    }

    return {
      itemMetaLookup,
      itemOrderedChildrenIdsLookup,
      itemChildrenIndexesLookup,
      // itemModelLookup and itemIdLookup don't change for moves
    };
  }

  /**
   * Remove multiple items from the raw items tree by ID.
   */
  private removeItemModels(
    items: readonly TItem[],
    idsToRemove: Set<CollectionItemId>,
  ): readonly TItem[] {
    const { state } = this.store;
    let changed = false;
    const result: TItem[] = [];

    for (const item of items) {
      if (idsToRemove.has(state.itemToId(item))) {
        changed = true;
        continue;
      }
      const children = state.itemToChildren(item);
      if (children && children.length > 0) {
        const newChildren = this.removeItemModels(children, idsToRemove);
        if (newChildren !== children) {
          changed = true;
          result.push(state.setItemChildren(item, newChildren));
          continue;
        }
      }
      result.push(item);
    }

    return changed ? result : items;
  }

  /**
   * Insert items at a given parent + index in the raw items tree.
   * Short-circuits recursion once the target parent is found.
   */
  private insertItemModels(
    items: readonly TItem[],
    newItems: readonly TItem[],
    parentId: CollectionItemId | null,
    index: number,
  ): readonly TItem[] {
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
        return state.setItemChildren(current, children);
      }
      const currentChildren = state.itemToChildren(current);
      if (currentChildren && currentChildren.length > 0) {
        const newChildren = this.insertItemModels(currentChildren, newItems, parentId, index);
        if (newChildren !== currentChildren) {
          found = true;
          return state.setItemChildren(current, newChildren);
        }
      }
      return current;
    });

    return found ? result : (items as TItem[]);
  }

  /**
   * Replace a single item by ID in the raw items tree.
   * Short-circuits recursion once the target is found.
   */
  private replaceItemModel(
    items: readonly TItem[],
    itemId: CollectionItemId,
    newItem: TItem,
  ): readonly TItem[] {
    const { state } = this.store;
    let found = false;
    const result = items.map((item) => {
      if (found) {
        return item;
      }
      if (state.itemToId(item) === itemId) {
        found = true;
        return newItem;
      }
      const children = state.itemToChildren(item);
      if (children && children.length > 0) {
        const newChildren = this.replaceItemModel(children, itemId, newItem);
        if (newChildren !== children) {
          found = true;
          return state.setItemChildren(item, newChildren);
        }
      }
      return item;
    });

    return found ? result : items;
  }
}
