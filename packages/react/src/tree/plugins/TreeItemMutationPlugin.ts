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

  /**
   * Remove items by ID. Descendants are removed along with their parent.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public removeItems = (itemIds: Set<CollectionItemId>): void => {
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
        updated: [],
      },
      lookupUpdates,
    );
  };

  /**
   * Add item models at a specific position.
   * If `parentId` is `null`, adds at root level.
   * Descendants included in the item models are added along with their parent.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public addItems = (
    items: readonly TItem[],
    parentId: CollectionItemId | null,
    index: number,
  ): void => {
    if (items.length === 0) {
      return;
    }

    const added: TreeItemsChangeInfo['added'] = items.map((item, i) => ({
      item,
      parentId,
      index: index + i,
    }));

    // Compute incremental lookup updates
    const lookupUpdates = this.addItemsToLookups(items, parentId, index);

    const newItems = this.insertItemModels(this.store.state.items, items, parentId, index);
    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      {
        added,
        removed: [],
        moved: [],
        updated: [],
      },
      lookupUpdates,
    );
  };

  /**
   * Add item models directly before a reference item.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public addItemsBefore = (items: readonly TItem[], referenceItemId: CollectionItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex);
  };

  /**
   * Add item models directly after a reference item.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public addItemsAfter = (items: readonly TItem[], referenceItemId: CollectionItemId): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.addItems(items, targetMeta.parentId, targetIndex + 1);
  };

  /**
   * Move one or more items to a new position.
   * Prunes descendants automatically and preserves relative order.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public moveItems = (
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
        updated: [],
      },
      lookupUpdates,
    );
  };

  /**
   * Move one or more items directly before another item.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public moveItemsBefore = (
    itemIds: Set<CollectionItemId>,
    referenceItemId: CollectionItemId,
  ): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.moveItems(itemIds, targetMeta.parentId, targetIndex);
  };

  /**
   * Move one or more items directly after another item.
   * When using controlled items with a custom item model,
   * provide the `setItemChildren` prop so the tree can produce updated items.
   */
  public moveItemsAfter = (
    itemIds: Set<CollectionItemId>,
    referenceItemId: CollectionItemId,
  ): void => {
    const targetMeta = selectors.itemMeta(this.store.state, referenceItemId);
    if (!targetMeta) {
      return;
    }
    const targetIndex = selectors.itemIndex(this.store.state, referenceItemId);
    this.moveItems(itemIds, targetMeta.parentId, targetIndex + 1);
  };

  /**
   * Replace all children of a parent with new items.
   * When isItemExpandable is omitted, items are expandable if they have inline children.
   */
  public setChildren = (
    parentId: CollectionItemId | null,
    children: readonly TItem[],
    isItemExpandable?: (item: TItem) => boolean,
  ): void => {
    const { state } = this.store;
    const parentKey = parentId ?? TREE_VIEW_ROOT_PARENT_ID;

    // Remove existing children from lookups, then add new ones
    const existingChildrenIds = state.itemOrderedChildrenIdsLookup[parentKey];
    const hasExistingChildren = existingChildrenIds && existingChildrenIds.length > 0;

    // Start from a clean base: remove old children if any
    const baseState = hasExistingChildren
      ? this.removeItemsFromLookups(new Set(existingChildrenIds))
      : {};

    // Clear the parent's children slot so addItemsToLookups inserts at index 0 cleanly
    if (hasExistingChildren && baseState.itemOrderedChildrenIdsLookup) {
      baseState.itemOrderedChildrenIdsLookup[parentKey] = [];
      baseState.itemChildrenIndexesLookup![parentKey] = {};
    }

    // Add new children on top of the cleaned lookups
    const addUpdates = this.addItemsToLookups(children, parentId, 0, isItemExpandable, baseState);

    // Update items array
    let newItems: readonly TItem[];
    if (parentId === null) {
      newItems = [...children];
    } else {
      newItems = this.replaceItemChildren(state.items, parentId, children);
    }

    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      { added: [], removed: [], moved: [], updated: [] },
      addUpdates,
    );
  };

  /**
   * Remove all children of a parent item.
   * @param {CollectionItemId | null} parentId The parent whose children should be removed. `null` for root.
   */
  public removeChildren = (parentId: CollectionItemId | null): void => {
    const { state } = this.store;
    const parentKey = parentId ?? TREE_VIEW_ROOT_PARENT_ID;

    const existingChildrenIds = state.itemOrderedChildrenIdsLookup[parentKey];
    if (!existingChildrenIds || existingChildrenIds.length === 0) {
      return;
    }

    const lookupUpdates = this.removeItemsFromLookups(new Set(existingChildrenIds));

    let newItems: readonly TItem[];
    if (parentId === null) {
      newItems = [];
    } else {
      newItems = this.replaceItemChildren(state.items, parentId, []);
    }

    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      { added: [], removed: [], moved: [], updated: [] },
      lookupUpdates,
    );
  };

  /**
   * Batch-update the expandable flag in item metadata.
   * Does not modify the items array (expandable is derived metadata).
   * @param {Record<CollectionItemId, boolean>} overrides Map of item IDs to their new expandable state.
   */
  public setItemsExpandable = (overrides: Record<CollectionItemId, boolean>): void => {
    const { state } = this.store;
    const itemMetaLookup = { ...state.itemMetaLookup };
    let changed = false;

    for (const [id, expandable] of Object.entries(overrides)) {
      if (itemMetaLookup[id] && itemMetaLookup[id].expandable !== expandable) {
        itemMetaLookup[id] = { ...itemMetaLookup[id], expandable };
        changed = true;
      }
    }

    if (changed) {
      this.store.set('itemMetaLookup', itemMetaLookup);
    }
  };

  public setIsItemDisabled = (itemId: CollectionItemId, isDisabled: boolean): void => {
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
      { added: [], removed: [], moved: [], updated: [{ itemId, newItem }] },
      { itemMetaLookup, itemModelLookup },
    );
  };

  public setItemLabel = (itemId: CollectionItemId, label: string): void => {
    const { state } = this.store;
    const meta = selectors.itemMeta(state, itemId);
    if (!meta || meta.label === label) {
      return;
    }

    const currentItem = state.itemModelLookup[itemId];
    if (!currentItem) {
      return;
    }

    const newItem = state.setItemLabel(currentItem, label);
    const newItems = this.replaceItemModel(state.items, itemId, newItem);

    const itemMetaLookup = { ...state.itemMetaLookup };
    itemMetaLookup[itemId] = { ...itemMetaLookup[itemId], label };

    const itemModelLookup = { ...state.itemModelLookup };
    itemModelLookup[itemId] = newItem;

    this.applyMutation(
      newItems,
      REASONS.imperativeAction,
      { added: [], removed: [], moved: [], updated: [{ itemId, newItem }] },
      { itemMetaLookup, itemModelLookup },
    );
  };

  public actions = {
    moveItems: this.moveItems,
    moveItemsBefore: this.moveItemsBefore,
    moveItemsAfter: this.moveItemsAfter,
    removeItems: this.removeItems,
    addItems: this.addItems,
    addItemsBefore: this.addItemsBefore,
    addItemsAfter: this.addItemsAfter,
    setIsItemDisabled: this.setIsItemDisabled,
    setItemLabel: this.setItemLabel,
  };

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
   * When isItemExpandable is omitted, items are expandable if they have inline children.
   */
  private addItemsToLookups(
    items: readonly TItem[],
    parentId: CollectionItemId | null,
    insertIndex: number,
    isItemExpandable?: (item: TItem) => boolean,
    baseLookups?: Partial<TreeItemsState>,
  ): Partial<TreeItemsState> {
    const { state } = this.store;
    const parentKey = parentId ?? TREE_VIEW_ROOT_PARENT_ID;
    const parentMeta = parentId != null ? state.itemMetaLookup[parentId] : null;
    const level = parentMeta ? parentMeta.level + 1 : 1;

    // Start from baseLookups (if provided) or clone from state
    const itemModelLookup = baseLookups?.itemModelLookup ?? { ...state.itemModelLookup };
    const itemMetaLookup = baseLookups?.itemMetaLookup ?? { ...state.itemMetaLookup };
    const itemIdLookup = baseLookups?.itemIdLookup ?? { ...state.itemIdLookup };
    const itemOrderedChildrenIdsLookup = baseLookups?.itemOrderedChildrenIdsLookup ?? {
      ...state.itemOrderedChildrenIdsLookup,
    };
    const itemChildrenIndexesLookup = baseLookups?.itemChildrenIndexesLookup ?? {
      ...state.itemChildrenIndexesLookup,
    };

    // Recursively add items to flat lookups
    const newChildIds: CollectionItemId[] = [];

    const processItems = (
      siblings: readonly TItem[],
      siblingParentId: CollectionItemId | null,
      siblingLevel: number,
    ) => {
      const siblingParentKey = siblingParentId ?? TREE_VIEW_ROOT_PARENT_ID;
      const siblingIds: CollectionItemId[] = [];

      for (let i = 0; i < siblings.length; i += 1) {
        const item = siblings[i];
        const itemId = state.itemToId(item);
        const children = state.itemToChildren(item);
        const hasInlineChildren = !!children && children.length > 0;

        itemIdLookup[itemId] = itemId;
        itemModelLookup[itemId] = item;
        itemMetaLookup[itemId] = {
          id: itemId,
          parentId: siblingParentId,
          level: siblingLevel,
          expandable: hasInlineChildren || (isItemExpandable ? isItemExpandable(item) : false),
          disabled: state.isItemDisabled(item),
          selectable: !state.isItemSelectionDisabled(item),
          label: state.itemToStringLabel(item),
        };
        siblingIds.push(itemId);

        if (hasInlineChildren) {
          processItems(children, itemId, siblingLevel + 1);
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

    processItems(items, parentId, level);

    // Splice new IDs into parent's children array
    const oldParentChildren = itemOrderedChildrenIdsLookup[parentKey] ?? [];
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
   * and update parentId/level for moved subtrees.
   */
  private moveItemsInLookups(
    itemIds: CollectionItemId[],
    newParentId: CollectionItemId | null,
    newIndex: number,
  ): Partial<TreeItemsState> {
    const { state } = this.store;
    const newParentKey = newParentId ?? TREE_VIEW_ROOT_PARENT_ID;
    const newParentMeta = newParentId != null ? state.itemMetaLookup[newParentId] : null;
    const newLevel = newParentMeta ? newParentMeta.level + 1 : 1;

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

    // Update parentId and level for moved items and their descendants
    const updateLevels = (
      id: CollectionItemId,
      parentIdVal: CollectionItemId | null,
      level: number,
    ) => {
      const oldMeta = itemMetaLookup[id];
      if (!oldMeta) {
        return;
      }
      itemMetaLookup[id] = { ...oldMeta, parentId: parentIdVal, level };
      const children = itemOrderedChildrenIdsLookup[id];
      if (children) {
        for (const childId of children) {
          updateLevels(childId, id, level + 1);
        }
      }
    };

    for (const id of itemIds) {
      updateLevels(id, newParentId, newLevel);
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
   * Replace all children of a parent item in the raw items tree.
   * Short-circuits recursion once the target parent is found.
   */
  private replaceItemChildren(
    items: readonly TItem[],
    parentId: CollectionItemId,
    newChildren: readonly TItem[],
  ): readonly TItem[] {
    const { state } = this.store;
    let found = false;
    const result = items.map((item) => {
      if (found) {
        return item;
      }
      if (state.itemToId(item) === parentId) {
        found = true;
        return state.setItemChildren(item, newChildren);
      }
      const children = state.itemToChildren(item);
      if (children && children.length > 0) {
        const updatedChildren = this.replaceItemChildren(children, parentId, newChildren);
        if (updatedChildren !== children) {
          found = true;
          return state.setItemChildren(item, updatedChildren);
        }
      }
      return item;
    });

    return found ? result : items;
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
