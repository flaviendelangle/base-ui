import type { TreeStore } from '../store/TreeStore';
import type { TreeItemId, TreeRootSelectionChangeEventReason } from '../store/types';
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

  private lastSelectedItem: TreeItemId | null = null;

  private lastSelectedRange = new Set<TreeItemId>();

  constructor(store: TreeStore) {
    this.store = store;
  }

  // ---------------------------------------------------------------------------
  // Private — Core state setter
  // ---------------------------------------------------------------------------

  private setSelectedItems(
    newModel: TreeItemId[] | TreeItemId | null | typeof TREE_SELECTION_ALL,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
    additionalItemsToPropagate?: TreeItemId[],
    shouldPropagate: boolean = true,
  ) {
    const oldModel = this.store.state.selectedItems;
    let cleanModel: TreeItemId[] | TreeItemId | null | typeof TREE_SELECTION_ALL;
    if (
      shouldPropagate &&
      this.store.state.selectionMode === 'multiple' &&
      newModel !== TREE_SELECTION_ALL
    ) {
      cleanModel = this.propagateSelection(
        newModel as TreeItemId[],
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
    newModel: TreeItemId[],
    oldModel: TreeItemId[],
    additionalItemsToPropagate?: TreeItemId[],
  ): TreeItemId[] {
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

    for (const addedItemId of added) {
      if (checkboxSelectionPropagation.descendants) {
        const selectDescendants = (itemId: TreeItemId) => {
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
        const checkAllDescendantsSelected = (itemId: TreeItemId): boolean => {
          // Non-selectable items don't count toward the "all selected" check
          if (!selectors.canItemBeSelected(this.store.state, itemId)) {
            return true;
          }
          if (!newModelSet.has(itemId)) {
            return false;
          }
          const children = selectors.itemOrderedChildrenIds(this.store.state, itemId);
          return children.every(checkAllDescendantsSelected);
        };

        const selectParents = (itemId: TreeItemId) => {
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
        const deSelectDescendants = (itemId: TreeItemId) => {
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
    itemId: TreeItemId;
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
    let newSelected: TreeItemId[] | TreeItemId | null;

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
  materializeSelectedItems = (): TreeItemId[] => {
    if (this.store.state.selectedItems !== TREE_SELECTION_ALL) {
      return normalizeSelectedItems(this.store.state.selectedItems);
    }
    const result: TreeItemId[] = [];
    const traverse = (parentId: TreeItemId | null) => {
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
    itemId: TreeItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    if (this.lastSelectedItem != null) {
      const [start, end] = findOrderInTremauxTree(this.store.state, itemId, this.lastSelectedItem);
      this.selectRange([start, end], reason, event);
    }
  };

  selectRangeFromStartToItem = (
    itemId: TreeItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    const firstItem = getFirstNavigableItem(this.store.state);
    if (firstItem != null) {
      this.selectRange([firstItem, itemId], reason, event);
    }
  };

  selectRangeFromItemToEnd = (
    itemId: TreeItemId,
    reason: TreeRootSelectionChangeEventReason,
    event?: Event,
  ) => {
    const lastItem = getLastNavigableItem(this.store.state);
    if (lastItem != null) {
      this.selectRange([itemId, lastItem], reason, event);
    }
  };

  selectItemFromArrowNavigation = (
    currentItem: TreeItemId,
    nextItem: TreeItemId,
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
    [start, end]: [TreeItemId, TreeItemId],
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
function normalizeSelectedItems(raw: TreeItemId | null | readonly TreeItemId[]): TreeItemId[] {
  if (Array.isArray(raw)) {
    return raw as TreeItemId[];
  }
  if (raw != null) {
    return [raw as TreeItemId];
  }
  return [];
}
