import { createSelector, createSelectorMemoized } from '@base-ui/utils/store';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import type { CollectionItemId } from '../../types/collection';
import type { TreeState, FlatListEntry, TreeItemMeta } from './types';
import { TREE_VIEW_ROOT_PARENT_ID, TREE_SELECTION_ALL } from './types';

/**
 * Intermediate selector: bundles all accessor functions into a single memoized object.
 * Used by the TreeStore observer to detect accessor changes and trigger a rebuild.
 */
const itemAccessorsSelector = createSelectorMemoized(
  (state: TreeState) => state.itemToId,
  (state: TreeState) => state.itemToStringLabel,
  (state: TreeState) => state.itemToChildren,
  (state: TreeState) => state.isItemDisabled,
  (state: TreeState) => state.isItemSelectionDisabled,
  (itemToId, itemToStringLabel, itemToChildren, isItemDisabled, isItemSelectionDisabled) => ({
    itemToId,
    itemToStringLabel,
    itemToChildren,
    isItemDisabled,
    isItemSelectionDisabled,
  }),
);

/**
 * All lookup selectors read directly from state.
 * Lookups are initialized by buildItemsState() and updated incrementally by mutations
 * (including lazy loading, which updates them via TreeItemMutationPlugin).
 */
const itemMetaLookupSelector = createSelector((state: TreeState) => state.itemMetaLookup);

const itemModelLookupSelector = createSelector((state: TreeState) => state.itemModelLookup);

const itemOrderedChildrenIdsLookupSelector = createSelector(
  (state: TreeState) => state.itemOrderedChildrenIdsLookup,
);

const itemChildrenIndexesLookupSelector = createSelector(
  (state: TreeState) => state.itemChildrenIndexesLookup,
);

const itemIdLookupSelector = createSelector((state: TreeState) => state.itemIdLookup);

const itemOrderedChildrenIdsSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId | null): CollectionItemId[] =>
    itemOrderedChildrenIdsLookupSelector(state)[itemId ?? TREE_VIEW_ROOT_PARENT_ID] ?? EMPTY_ARRAY,
);

const isItemDisabledSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): boolean => {
    if (state.disabled) {
      return true;
    }
    const metaLookup = itemMetaLookupSelector(state);
    const meta = metaLookup[itemId];
    if (!meta) {
      return false;
    }
    if (meta.disabled) {
      return true;
    }
    if (meta.parentId != null) {
      return isItemDisabledSelector(state, meta.parentId);
    }
    return false;
  },
);

const expandedItemsSetSelector = createSelectorMemoized(
  (state: TreeState) => state.expandedItems,
  (expandedItems): Set<CollectionItemId> => new Set(expandedItems),
);

const isItemExpandedSelector = createSelector(
  expandedItemsSetSelector,
  (expandedSet, itemId: CollectionItemId): boolean => expandedSet.has(itemId),
);

const selectedItemsSetSelector = createSelectorMemoized(
  (state: TreeState) => state.selectedItems,
  (raw): Set<CollectionItemId> | typeof TREE_SELECTION_ALL => {
    if (raw === TREE_SELECTION_ALL) {
      return TREE_SELECTION_ALL;
    }
    if (Array.isArray(raw)) {
      return new Set(raw);
    }
    if (raw != null) {
      return new Set([raw as CollectionItemId]);
    }
    return new Set();
  },
);

const isSelectionDisabledSelector = createSelector(
  (state: TreeState): boolean => state.selectionMode === 'none',
);

const canItemBeSelectedSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): boolean => {
    if (state.selectionMode === 'none') {
      return false;
    }
    const meta = itemMetaLookupSelector(state)[itemId];
    if (!meta) {
      return false;
    }
    if (!meta.selectable) {
      return false;
    }
    return !isItemDisabledSelector(state, itemId);
  },
);

const isItemSelectedSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): boolean => {
    const selectedSet = selectedItemsSetSelector(state);
    if (selectedSet === TREE_SELECTION_ALL) {
      return canItemBeSelectedSelector(state, itemId);
    }
    return selectedSet.has(itemId);
  },
);

export type CheckboxSelectionStatus = 'checked' | 'indeterminate' | 'empty';

/**
 * Precomputes {selected, total} descendant counts for every item in a single
 * O(N) bottom-up traversal. Memoized so it only recomputes when selectedItems
 * or tree structure changes.
 */
const descendantSelectionCountsSelector = createSelectorMemoized(
  selectedItemsSetSelector,
  itemOrderedChildrenIdsLookupSelector,
  itemMetaLookupSelector,
  (state: TreeState) => state.disabled,
  (
    selectedSet,
    childrenLookup,
    metaLookup,
    treeDisabled,
  ): Record<CollectionItemId, { selected: number; total: number }> | typeof TREE_SELECTION_ALL => {
    if (selectedSet === TREE_SELECTION_ALL) {
      return TREE_SELECTION_ALL;
    }

    const counts: Record<CollectionItemId, { selected: number; total: number }> = {};

    const compute = (
      itemId: CollectionItemId,
      parentDisabled: boolean,
    ): { selected: number; total: number } => {
      const children = childrenLookup[itemId];
      if (!children || children.length === 0) {
        const result = { selected: 0, total: 0 };
        counts[itemId] = result;
        return result;
      }

      let selected = 0;
      let total = 0;

      for (const childId of children) {
        const meta = metaLookup[childId];
        const isDisabled = parentDisabled || (meta?.disabled ?? false);
        const canBeSelected = (meta?.selectable ?? true) && !isDisabled;
        if (canBeSelected) {
          total += 1;
          if (selectedSet.has(childId)) {
            selected += 1;
          }
        }
        const childCounts = compute(childId, isDisabled);
        selected += childCounts.selected;
        total += childCounts.total;
      }

      const result = { selected, total };
      counts[itemId] = result;
      return result;
    };

    compute(TREE_VIEW_ROOT_PARENT_ID, treeDisabled ?? false);
    return counts;
  },
);

const checkboxSelectionStatusSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): CheckboxSelectionStatus => {
    if (isItemSelectedSelector(state, itemId)) {
      return 'checked';
    }

    const allCounts = descendantSelectionCountsSelector(state);
    if (allCounts === TREE_SELECTION_ALL) {
      return 'checked';
    }

    const counts = allCounts[itemId];
    if (!counts || counts.total === 0) {
      return 'empty';
    }

    const hasSelectedDescendant = counts.selected > 0;
    const hasUnSelectedDescendant = counts.selected < counts.total;

    if (state.checkboxSelectionPropagation.parents) {
      if (hasSelectedDescendant && hasUnSelectedDescendant) {
        return 'indeterminate';
      }
      if (hasSelectedDescendant) {
        return 'checked';
      }
      return 'empty';
    }

    if (hasSelectedDescendant) {
      return 'indeterminate';
    }

    return 'empty';
  },
);

const isItemFocusedSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): boolean => state.focusedItemId === itemId,
);

const defaultFocusableItemIdSelector = createSelectorMemoized(
  (state: TreeState) => state.selectedItems,
  expandedItemsSetSelector,
  itemMetaLookupSelector,
  (state: TreeState) => state.itemFocusableWhenDisabled,
  itemOrderedChildrenIdsLookupSelector,
  (
    selectedItems,
    expandedSet,
    metaLookup,
    disabledFocusable,
    childrenLookup,
  ): CollectionItemId | null => {
    // When "all" or no explicit selection, skip to first root item
    if (selectedItems !== TREE_SELECTION_ALL) {
      let normalized: readonly CollectionItemId[];
      if (Array.isArray(selectedItems)) {
        normalized = selectedItems;
      } else if (selectedItems != null) {
        normalized = [selectedItems as CollectionItemId];
      } else {
        normalized = [];
      }

      // Try to focus the first selected and visible item
      for (const selectedId of normalized) {
        const meta = metaLookup[selectedId];
        if (!meta) {
          continue;
        }
        // Check if the item is visible (all ancestors are expanded)
        let isVisible = true;
        let parentId = meta.parentId;
        while (parentId != null) {
          if (!expandedSet.has(parentId)) {
            isVisible = false;
            break;
          }
          parentId = metaLookup[parentId]?.parentId ?? null;
        }
        if (isVisible && (disabledFocusable || !meta.disabled)) {
          return selectedId;
        }
      }
    }

    // Fall back to first navigable root item
    const rootChildren = childrenLookup[TREE_VIEW_ROOT_PARENT_ID] ?? [];
    for (const childId of rootChildren) {
      const meta = metaLookup[childId];
      if (meta && (disabledFocusable || !meta.disabled)) {
        return childId;
      }
    }

    return null;
  },
);

const isItemDefaultFocusableSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): boolean => {
    const currentFocusedId = state.focusedItemId;
    if (currentFocusedId != null) {
      return currentFocusedId === itemId;
    }
    return defaultFocusableItemIdSelector(state) === itemId;
  },
);

const itemSiblingsCountSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): number => {
    const meta = itemMetaLookupSelector(state)[itemId];
    if (!meta) {
      return 0;
    }
    const parentKey = meta.parentId ?? TREE_VIEW_ROOT_PARENT_ID;
    return itemOrderedChildrenIdsLookupSelector(state)[parentKey]?.length ?? 0;
  },
);

const itemPositionInSetSelector = createSelector(
  (state: TreeState, itemId: CollectionItemId): number => {
    const meta = itemMetaLookupSelector(state)[itemId];
    if (!meta) {
      return 1;
    }
    const parentKey = meta.parentId ?? TREE_VIEW_ROOT_PARENT_ID;
    return (itemChildrenIndexesLookupSelector(state)[parentKey]?.[itemId] ?? 0) + 1;
  },
);

const flatListSelector = createSelectorMemoized(
  itemOrderedChildrenIdsLookupSelector,
  expandedItemsSetSelector,
  (childrenLookup, expandedSet): CollectionItemId[] => {
    const result: CollectionItemId[] = [];

    const appendChildren = (parentId: CollectionItemId) => {
      const children = childrenLookup[parentId];
      if (!children) {
        return;
      }
      for (const childId of children) {
        result.push(childId);
        if (expandedSet.has(childId)) {
          appendChildren(childId);
        }
      }
    };

    appendChildren(TREE_VIEW_ROOT_PARENT_ID);
    return result;
  },
);

const flatListWithGroupTransitionsSelector = createSelectorMemoized(
  flatListSelector,
  (state: TreeState) => state.animatingGroups,
  (flatList, animatingGroups): CollectionItemId[] | FlatListEntry[] => {
    const animatingGroupValues = Object.values(animatingGroups);
    if (animatingGroupValues.length === 0) {
      return flatList;
    }

    // Build a set of all childIds currently being animated
    const animatingChildIds = new Set<CollectionItemId>();
    // Map childId -> parentId for items in expanding groups
    const childToAnimatingParent = new Map<CollectionItemId, CollectionItemId>();
    for (const group of animatingGroupValues) {
      for (const childId of group.childIds) {
        animatingChildIds.add(childId);
        childToAnimatingParent.set(childId, group.parentId);
      }
    }

    const result: FlatListEntry[] = [];
    const insertedGroups = new Set<CollectionItemId>();

    for (const itemId of flatList) {
      // If this item is inside an expanding animation group, skip it
      // (it will be rendered inside the group-transition wrapper)
      if (animatingChildIds.has(itemId)) {
        const parentId = childToAnimatingParent.get(itemId)!;
        if (!insertedGroups.has(parentId)) {
          insertedGroups.add(parentId);
          const group = animatingGroups[parentId];
          result.push({
            type: 'group-transition',
            parentId,
            childIds: group.childIds,
            animation: group.type,
          });
        }
        continue;
      }

      result.push({ type: 'item', itemId });

      // After a parent item, inject any collapsing group
      // (its children are no longer in flatList since expandedItems was already updated)
      const collapsingGroup = animatingGroups[itemId];
      if (collapsingGroup?.type === 'collapsing' && !insertedGroups.has(itemId)) {
        insertedGroups.add(itemId);
        result.push({
          type: 'group-transition',
          parentId: itemId,
          childIds: collapsingGroup.childIds,
          animation: 'collapsing',
        });
      }
    }

    return result;
  },
);

const labelMapSelector = createSelectorMemoized(
  itemMetaLookupSelector,
  (metaLookup): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const meta of Object.values(metaLookup)) {
      if (meta.label) {
        map[meta.id] = meta.label.toLowerCase();
      }
    }
    return map;
  },
);

export const selectors = {
  itemAccessors: itemAccessorsSelector,
  virtualized: createSelector((state: TreeState): boolean => state.virtualized),
  itemMetaLookup: itemMetaLookupSelector,
  itemMeta: createSelector(
    (state: TreeState, itemId: CollectionItemId | null): TreeItemMeta | null =>
      itemMetaLookupSelector(state)[itemId ?? TREE_VIEW_ROOT_PARENT_ID] ?? null,
  ),
  itemModel: createSelector(
    (state: TreeState, itemId: CollectionItemId) => itemModelLookupSelector(state)[itemId],
  ),
  itemOrderedChildrenIds: itemOrderedChildrenIdsSelector,
  itemIndex: createSelector((state: TreeState, itemId: CollectionItemId): number => {
    const meta = itemMetaLookupSelector(state)[itemId];
    if (!meta) {
      return -1;
    }
    return (
      itemChildrenIndexesLookupSelector(state)[meta.parentId ?? TREE_VIEW_ROOT_PARENT_ID]?.[
        itemId
      ] ?? -1
    );
  }),
  itemParentId: createSelector(
    (state: TreeState, itemId: CollectionItemId): CollectionItemId | null =>
      itemMetaLookupSelector(state)[itemId]?.parentId ?? null,
  ),
  itemDepth: createSelector(
    (state: TreeState, itemId: CollectionItemId): number =>
      itemMetaLookupSelector(state)[itemId]?.depth ?? 0,
  ),
  isItemDisabled: isItemDisabledSelector,
  canItemBeFocused: createSelector(
    (state: TreeState, itemId: CollectionItemId): boolean =>
      state.itemFocusableWhenDisabled || !isItemDisabledSelector(state, itemId),
  ),
  isItemExpanded: isItemExpandedSelector,
  isItemExpandable: createSelector(
    (state: TreeState, itemId: CollectionItemId): boolean =>
      itemMetaLookupSelector(state)[itemId]?.expandable ?? false,
  ),
  flatList: flatListSelector,
  flatListWithGroupTransitions: flatListWithGroupTransitionsSelector,
  isItemSelected: isItemSelectedSelector,
  isMultiSelectEnabled: createSelector(
    (state: TreeState): boolean => state.selectionMode === 'multiple',
  ),
  isSelectionDisabled: isSelectionDisabledSelector,
  canItemBeSelected: canItemBeSelectedSelector,
  checkboxSelectionStatus: checkboxSelectionStatusSelector,
  checkboxSelectionPropagation: createSelector(
    (state: TreeState) => state.checkboxSelectionPropagation,
  ),
  focusedItemId: createSelector((state: TreeState): CollectionItemId | null => state.focusedItemId),
  isItemFocused: isItemFocusedSelector,
  defaultFocusableItemId: defaultFocusableItemIdSelector,
  isItemLoading: createSelector(
    (state: TreeState, itemId: CollectionItemId | null): boolean =>
      state.lazyItems?.loading[itemId ?? TREE_VIEW_ROOT_PARENT_ID] ?? false,
  ),
  itemError: createSelector(
    (state: TreeState, itemId: CollectionItemId | null): Error | undefined =>
      state.lazyItems?.errors[itemId ?? TREE_VIEW_ROOT_PARENT_ID],
  ),
  isItemDefaultFocusable: isItemDefaultFocusableSelector,
  itemSiblingsCount: itemSiblingsCountSelector,
  itemPositionInSet: itemPositionInSetSelector,
  itemLabel: createSelector(
    (state: TreeState, itemId: CollectionItemId): string =>
      itemMetaLookupSelector(state)[itemId]?.label ?? '',
  ),
  itemIdLookup: itemIdLookupSelector,
  expandedItemsSet: expandedItemsSetSelector,
  labelMap: labelMapSelector,
  // Drag-and-drop selectors
  isDragAndDropEnabled: createSelector((state: TreeState): boolean => state.dragAndDrop != null),
  isItemDragged: createSelector(
    (state: TreeState, itemId: CollectionItemId): boolean =>
      state.dragAndDrop?.draggedItemIds.has(itemId) ?? false,
  ),
  isItemDropTarget: createSelector(
    (state: TreeState, itemId: CollectionItemId): boolean =>
      state.dragAndDrop?.dropTargetItemId === itemId,
  ),
  itemDropPosition: createSelector(
    (state: TreeState, itemId: CollectionItemId): 'before' | 'after' | 'on' | null =>
      state.dragAndDrop?.dropTargetItemId === itemId
        ? (state.dragAndDrop?.dropPosition ?? null)
        : null,
  ),
  itemDropOperation: createSelector(
    (state: TreeState, itemId: CollectionItemId): 'move' | 'copy' | 'link' | 'cancel' | null =>
      state.dragAndDrop?.dropTargetItemId === itemId
        ? (state.dragAndDrop?.dropOperation ?? null)
        : null,
  ),
  isItemInDropTargetGroup: createSelector((state: TreeState, itemId: CollectionItemId): boolean => {
    const groupId = state.dropTargetGroupId;
    if (groupId == null) {
      return false;
    }
    if (itemId === groupId) {
      return true;
    }
    const metaLookup = itemMetaLookupSelector(state);
    let currentId: CollectionItemId | null = metaLookup[itemId]?.parentId ?? null;
    while (currentId != null) {
      if (currentId === groupId) {
        return true;
      }
      currentId = metaLookup[currentId]?.parentId ?? null;
    }
    return false;
  }),
};
