import type { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import type { TreeRootSelectionChangeEventReason } from '../store/types';
import { TREE_SELECTION_ALL } from '../store/types';
import { selectors } from '../store/selectors';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import {
  findOrderInTremauxTree,
  getFirstNavigableItem,
  getLastNavigableItem,
  getNonDisabledItemsInRange,
} from '../store/treeNavigation';

export class TreeSelectionPlugin {
  private store: TreeStore;

  private lastSelectedItem: CollectionItemId | null = null;

  private lastSelectedRange = new Set<CollectionItemId>();

  constructor(store: TreeStore) {
    this.store = store;
  }

  // ---------------------------------------------------------------------------
  // Private — Core state setter
  // ---------------------------------------------------------------------------

  private setSelectedItems(
    newModel: CollectionItemId[] | CollectionItemId | null | typeof TREE_SELECTION_ALL,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
    additionalItemsToPropagate?: CollectionItemId[],
    shouldPropagate: boolean = true,
  ) {
    const oldModel = this.store.state.selectedItems;
    let cleanModel: CollectionItemId[] | CollectionItemId | null | typeof TREE_SELECTION_ALL;
    if (
      shouldPropagate &&
      this.store.state.selectionMode === 'multiple' &&
      newModel !== TREE_SELECTION_ALL
    ) {
      cleanModel = this.propagateSelection(
        newModel as CollectionItemId[],
        this.materializeSelectedItems(),
        additionalItemsToPropagate,
      );
    } else {
      cleanModel = newModel;
    }

    if (cleanModel !== TREE_SELECTION_ALL && this.store.state.disallowEmptySelection) {
      const normalizedClean = normalizeSelectedItems(cleanModel);
      if (normalizedClean.length === 0) {
        return;
      }
    }

    const details = createChangeEventDetails(reason, event);
    this.store.context.onSelectedItemsChange(cleanModel, details);
    if (details.isCanceled) {
      return;
    }
    this.store.set('selectedItems', cleanModel);

    // Skip per-item toggle events when transitioning to/from "all"
    // since we can't efficiently diff without materializing all items.
    if (cleanModel === TREE_SELECTION_ALL || oldModel === TREE_SELECTION_ALL) {
      return;
    }

    // Fire onItemSelectionToggle for each item whose selection state changed
    const normalizedOld = new Set(normalizeSelectedItems(oldModel));
    const normalizedNew = new Set(normalizeSelectedItems(cleanModel));
    const selectionDetails = createGenericEventDetails(reason, event);
    for (const itemId of normalizedNew) {
      if (!normalizedOld.has(itemId)) {
        this.store.context.onItemSelectionToggle({ itemId, isSelected: true }, selectionDetails);
      }
    }
    for (const itemId of normalizedOld) {
      if (!normalizedNew.has(itemId)) {
        this.store.context.onItemSelectionToggle({ itemId, isSelected: false }, selectionDetails);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private — Checkbox selection propagation
  // ---------------------------------------------------------------------------

  private propagateSelection(
    newModel: CollectionItemId[],
    oldModel: CollectionItemId[],
    additionalItemsToPropagate?: CollectionItemId[],
  ): CollectionItemId[] {
    const checkboxSelectionPropagation = selectors.checkboxSelectionPropagation(this.store.state);
    if (!checkboxSelectionPropagation.descendants && !checkboxSelectionPropagation.parents) {
      return newModel;
    }

    const flags = { shouldRegenerateModel: false };
    const newModelSet = new Set(newModel);

    const oldModelSet = new Set(oldModel);
    const added = newModel.filter((id) => !oldModelSet.has(id));
    const removed = oldModel.filter((id) => !newModelSet.has(id));

    additionalItemsToPropagate?.forEach((itemId) => {
      if (newModelSet.has(itemId)) {
        if (!added.includes(itemId)) {
          added.push(itemId);
        }
      } else if (!removed.includes(itemId)) {
        removed.push(itemId);
      }
    });

    // Cache for checkAllDescendantsSelected: only `true` results are cached
    // because newModelSet only grows during the added phase, so a `true` result
    // (item + all descendants selected) can never become `false`.
    const fullySelectedCache = new Set<CollectionItemId>();

    for (const addedItemId of added) {
      if (checkboxSelectionPropagation.descendants) {
        const selectDescendants = (itemId: CollectionItemId) => {
          if (itemId !== addedItemId) {
            if (!selectors.canItemBeSelected(this.store.state, itemId)) {
              return;
            }
            flags.shouldRegenerateModel = true;
            newModelSet.add(itemId);
          }
          const children = selectors.itemOrderedChildrenIds(this.store.state, itemId);
          for (const childId of children) {
            selectDescendants(childId);
          }
        };
        selectDescendants(addedItemId);
      }

      if (checkboxSelectionPropagation.parents) {
        const checkAllDescendantsSelected = (itemId: CollectionItemId): boolean => {
          if (fullySelectedCache.has(itemId)) {
            return true;
          }
          // Non-selectable items don't count toward the "all selected" check
          if (!selectors.canItemBeSelected(this.store.state, itemId)) {
            fullySelectedCache.add(itemId);
            return true;
          }
          if (!newModelSet.has(itemId)) {
            return false;
          }
          const children = selectors.itemOrderedChildrenIds(this.store.state, itemId);
          const result = children.every(checkAllDescendantsSelected);
          if (result) {
            fullySelectedCache.add(itemId);
          }
          return result;
        };

        const selectParents = (itemId: CollectionItemId) => {
          const parentId = selectors.itemParentId(this.store.state, itemId);
          if (parentId == null) {
            return;
          }
          const siblings = selectors.itemOrderedChildrenIds(this.store.state, parentId);
          if (siblings.every(checkAllDescendantsSelected)) {
            if (selectors.canItemBeSelected(this.store.state, parentId)) {
              flags.shouldRegenerateModel = true;
              newModelSet.add(parentId);
            }
            selectParents(parentId);
          }
        };
        selectParents(addedItemId);
      }
    }

    for (const removedItemId of removed) {
      if (checkboxSelectionPropagation.parents) {
        let parentId = selectors.itemParentId(this.store.state, removedItemId);
        while (parentId != null) {
          if (newModelSet.has(parentId)) {
            flags.shouldRegenerateModel = true;
            newModelSet.delete(parentId);
          }
          parentId = selectors.itemParentId(this.store.state, parentId);
        }
      }

      if (checkboxSelectionPropagation.descendants) {
        const deSelectDescendants = (itemId: CollectionItemId) => {
          if (itemId !== removedItemId) {
            flags.shouldRegenerateModel = true;
            newModelSet.delete(itemId);
          }
          const children = selectors.itemOrderedChildrenIds(this.store.state, itemId);
          for (const childId of children) {
            deSelectDescendants(childId);
          }
        };
        deSelectDescendants(removedItemId);
      }
    }

    return flags.shouldRegenerateModel ? Array.from(newModelSet) : newModel;
  }

  // ---------------------------------------------------------------------------
  // Public — Single item selection
  // ---------------------------------------------------------------------------

  setItemSelection = ({
    itemId,
    keepExistingSelection = false,
    shouldBeSelected,
    shouldPropagate,
    reason,
    event,
  }: {
    itemId: CollectionItemId;
    keepExistingSelection?: boolean | undefined;
    shouldBeSelected?: boolean | undefined;
    /**
     * Whether to propagate the selection change through the tree hierarchy.
     * Defaults to the value of `keepExistingSelection` (toggle semantics propagate, replace semantics don't).
     */
    shouldPropagate?: boolean | undefined;
    reason: TreeRootSelectionChangeEventReason;
    event?: Event | undefined;
  }) => {
    if (this.store.state.selectionMode === 'none') {
      return;
    }

    const isMulti = this.store.state.selectionMode === 'multiple';
    let newSelected: CollectionItemId[] | CollectionItemId | null;

    if (keepExistingSelection) {
      const oldSelected = this.materializeSelectedItems();
      const isSelectedBefore = selectors.isItemSelected(this.store.state, itemId);

      if (isSelectedBefore && (shouldBeSelected === false || shouldBeSelected == null)) {
        newSelected = oldSelected.filter((id) => id !== itemId);
      } else if (!isSelectedBefore && (shouldBeSelected === true || shouldBeSelected == null)) {
        newSelected = [itemId, ...oldSelected];
      } else {
        newSelected = oldSelected;
      }
    } else if (
      shouldBeSelected === false ||
      (shouldBeSelected == null && selectors.isItemSelected(this.store.state, itemId))
    ) {
      newSelected = isMulti ? [] : null;
    } else {
      newSelected = isMulti ? [itemId] : itemId;
    }

    // Prevent empty selection when disallowEmptySelection is true
    if (this.store.state.disallowEmptySelection) {
      const normalizedNew = normalizeSelectedItems(newSelected);
      if (normalizedNew.length === 0) {
        return;
      }
    }

    this.setSelectedItems(newSelected, reason, event, [itemId], shouldPropagate ?? false);
    this.lastSelectedItem = itemId;
    this.lastSelectedRange = new Set();
  };

  // ---------------------------------------------------------------------------
  // Public — Materialize
  // ---------------------------------------------------------------------------

  /**
   * Returns the selected items as a plain array.
   * Handles the "all" sentinel by expanding it into all selectable item IDs,
   * and normalizes single-item / null values into an array.
   */
  materializeSelectedItems = (): CollectionItemId[] => {
    if (this.store.state.selectedItems !== TREE_SELECTION_ALL) {
      return normalizeSelectedItems(this.store.state.selectedItems);
    }
    const result: CollectionItemId[] = [];
    const traverse = (parentId: CollectionItemId | null) => {
      const children = selectors.itemOrderedChildrenIds(this.store.state, parentId);
      for (const childId of children) {
        if (selectors.canItemBeSelected(this.store.state, childId)) {
          result.push(childId);
        }
        traverse(childId);
      }
    };
    traverse(null);
    return result;
  };

  // ---------------------------------------------------------------------------
  // Public — Bulk / range selection
  // ---------------------------------------------------------------------------

  selectAllNavigableItems = (reason: TreeRootSelectionChangeEventReason, event?: Event) => {
    if (this.store.state.selectionMode !== 'multiple') {
      return;
    }

    this.setSelectedItems(TREE_SELECTION_ALL, reason, event);
    this.lastSelectedRange = new Set();
  };

  expandSelectionRange = (
    itemId: CollectionItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    if (this.lastSelectedItem != null) {
      const [start, end] = findOrderInTremauxTree(this.store.state, itemId, this.lastSelectedItem);
      this.selectRange([start, end], reason, event);
    }
  };

  selectRangeFromStartToItem = (
    itemId: CollectionItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    const firstItem = getFirstNavigableItem(this.store.state);
    if (firstItem != null) {
      this.selectRange([firstItem, itemId], reason, event);
    }
  };

  selectRangeFromItemToEnd = (
    itemId: CollectionItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    const lastItem = getLastNavigableItem(this.store.state);
    if (lastItem != null) {
      this.selectRange([itemId, lastItem], reason, event);
    }
  };

  selectItemFromArrowNavigation = (
    currentItem: CollectionItemId,
    nextItem: CollectionItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    if (this.store.state.selectionMode !== 'multiple') {
      return;
    }

    const currentSelectedItems =
      this.store.state.selectedItems === TREE_SELECTION_ALL
        ? this.materializeSelectedItems()
        : normalizeSelectedItems(this.store.state.selectedItems);
    let newSelectedItems = currentSelectedItems.slice();

    if (this.lastSelectedRange.size === 0) {
      newSelectedItems.push(nextItem);
      this.lastSelectedRange = new Set([currentItem, nextItem]);
    } else {
      if (!this.lastSelectedRange.has(currentItem)) {
        this.lastSelectedRange = new Set();
      }

      if (this.lastSelectedRange.has(nextItem)) {
        newSelectedItems = newSelectedItems.filter((id) => id !== currentItem);
        this.lastSelectedRange.delete(currentItem);
      } else {
        newSelectedItems.push(nextItem);
        this.lastSelectedRange.add(nextItem);
      }
    }

    this.setSelectedItems(newSelectedItems, reason, event);
  };

  // ---------------------------------------------------------------------------
  // Private — Range selection implementation
  // ---------------------------------------------------------------------------

  private selectRange(
    [start, end]: [CollectionItemId, CollectionItemId],
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) {
    if (this.store.state.selectionMode !== 'multiple') {
      return;
    }

    const currentSelectedItems =
      this.store.state.selectedItems === TREE_SELECTION_ALL
        ? this.materializeSelectedItems()
        : normalizeSelectedItems(this.store.state.selectedItems);
    let newSelectedItems = currentSelectedItems.slice();

    // Remove items from last range
    if (this.lastSelectedRange.size > 0) {
      newSelectedItems = newSelectedItems.filter((id) => !this.lastSelectedRange.has(id));
    }

    // Add items in new range that are selectable
    const selectedItemsSet = new Set(newSelectedItems);
    const range = getNonDisabledItemsInRange(this.store.state, start, end).filter((id) => {
      const meta = selectors.itemMeta(this.store.state, id);
      return meta?.selectable !== false;
    });
    const itemsToAdd = range.filter((id) => !selectedItemsSet.has(id));
    newSelectedItems = newSelectedItems.concat(itemsToAdd);

    // Prevent empty selection when disallowEmptySelection is true
    if (this.store.state.disallowEmptySelection && newSelectedItems.length === 0) {
      return;
    }

    this.setSelectedItems(newSelectedItems, reason, event);
    this.lastSelectedRange = new Set(range);
  }
}

/**
 * Converts a raw selectedItems value to a plain array.
 * Does NOT handle the "all" sentinel — use `materializeSelectedItems()` for that.
 */
function normalizeSelectedItems(
  raw: CollectionItemId | null | readonly CollectionItemId[],
): CollectionItemId[] {
  if (Array.isArray(raw)) {
    return raw as CollectionItemId[];
  }
  if (raw != null) {
    return [raw as CollectionItemId];
  }
  return [];
}
