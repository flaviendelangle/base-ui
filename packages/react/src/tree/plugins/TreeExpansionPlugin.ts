import type { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import type { TreeRootExpansionChangeEventReason } from '../store/types';
import { selectors } from '../store/selectors';
import {
  createChangeEventDetails,
  createGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';

export class TreeExpansionPlugin {
  private store: TreeStore;

  constructor(store: TreeStore) {
    this.store = store;
  }

  public canToggleItemExpansion = (itemId: CollectionItemId): boolean => {
    return (
      !selectors.isItemDisabled(this.store.state, itemId) &&
      selectors.isItemExpandable(this.store.state, itemId)
    );
  };

  public setItemExpansion = (
    itemId: CollectionItemId,
    shouldBeExpanded: boolean | undefined,
    reason: TreeRootExpansionChangeEventReason,
    event?: Event,
  ) => {
    const isExpandedBefore = selectors.isItemExpanded(this.store.state, itemId);
    const cleanShouldBeExpanded = shouldBeExpanded ?? !isExpandedBefore;
    if (isExpandedBefore === cleanShouldBeExpanded) {
      return;
    }

    // If lazy loading is active and we're expanding an item with no loaded children,
    // defer expansion to the plugin (it will call applyItemExpansion on success).
    if (
      this.store.lazyLoading &&
      cleanShouldBeExpanded &&
      selectors.isItemExpandable(this.store.state, itemId) &&
      selectors.itemOrderedChildrenIds(this.store.state, itemId).length === 0
    ) {
      this.store.lazyLoading.onBeforeExpand(itemId, reason, event);
      return;
    }

    this.applyItemExpansion(itemId, cleanShouldBeExpanded, reason, event);
  };

  public applyItemExpansion = (
    itemId: CollectionItemId,
    shouldBeExpanded: boolean,
    reason: TreeRootExpansionChangeEventReason,
    event?: Event,
  ) => {
    const oldExpanded = this.store.state.expandedItems;
    let newExpanded: CollectionItemId[];
    if (shouldBeExpanded) {
      newExpanded = [itemId, ...oldExpanded];
    } else {
      newExpanded = oldExpanded.filter((id) => id !== itemId);
    }

    const details = createChangeEventDetails(reason, event);
    this.store.context.onExpandedItemsChange(newExpanded, details);
    if (details.isCanceled) {
      return;
    }

    if (this.store.state.enableGroupTransition) {
      // Collect visible descendants using the appropriate expanded state
      const childIds = this.getVisibleDescendants(
        itemId,
        shouldBeExpanded ? newExpanded : oldExpanded,
      );

      if (childIds.length > 0) {
        this.store.set('animatingGroups', {
          ...this.store.state.animatingGroups,
          [itemId]: {
            parentId: itemId,
            type: shouldBeExpanded ? 'expanding' : 'collapsing',
            childIds,
          },
        });
      }
    }

    this.store.set('expandedItems', newExpanded);
    this.store.context.onItemExpansionToggle(
      { itemId, isExpanded: shouldBeExpanded },
      createGenericEventDetails(reason, event),
    );
  };

  /**
   * Called when a group transition animation completes.
   * Removes the animating group entry, causing the wrapper to be removed from the DOM.
   */
  public completeGroupTransition = (parentId: CollectionItemId) => {
    const { [parentId]: removedGroup, ...rest } = this.store.state.animatingGroups;
    this.store.set('animatingGroups', rest);
  };

  public expandAllSiblings = (
    itemId: CollectionItemId,
    reason: TreeRootExpansionChangeEventReason,
    event?: Event,
  ) => {
    const meta = selectors.itemMeta(this.store.state, itemId);
    if (meta == null) {
      return;
    }

    const siblings = selectors.itemOrderedChildrenIds(this.store.state, meta.parentId);
    const diff = siblings.filter(
      (child) =>
        selectors.isItemExpandable(this.store.state, child) &&
        !selectors.isItemExpanded(this.store.state, child),
    );

    if (diff.length > 0) {
      const newExpanded = [...this.store.state.expandedItems, ...diff];
      const details = createChangeEventDetails(reason, event);
      this.store.context.onExpandedItemsChange(newExpanded, details);
      if (details.isCanceled) {
        return;
      }
      this.store.set('expandedItems', newExpanded);
      for (const expandedItemId of diff) {
        this.store.context.onItemExpansionToggle(
          { itemId: expandedItemId, isExpanded: true },
          createGenericEventDetails(reason, event),
        );
      }
    }
  };

  public expandAll = (reason: TreeRootExpansionChangeEventReason) => {
    const metaLookup = selectors.itemMetaLookup(this.store.state);
    const expandedSet = selectors.expandedItemsSet(this.store.state);
    const diff: CollectionItemId[] = [];
    for (const meta of Object.values(metaLookup)) {
      if (meta.expandable && !expandedSet.has(meta.id)) {
        diff.push(meta.id);
      }
    }

    if (diff.length === 0) {
      return;
    }

    const newExpanded = [...this.store.state.expandedItems, ...diff];
    const details = createChangeEventDetails(reason);
    this.store.context.onExpandedItemsChange(newExpanded, details);
    if (details.isCanceled) {
      return;
    }
    this.store.set('expandedItems', newExpanded);
    for (const expandedItemId of diff) {
      this.store.context.onItemExpansionToggle(
        { itemId: expandedItemId, isExpanded: true },
        createGenericEventDetails(reason),
      );
    }
  };

  public collapseAll = (reason: TreeRootExpansionChangeEventReason) => {
    const oldExpanded = this.store.state.expandedItems;
    if (oldExpanded.length === 0) {
      return;
    }

    const details = createChangeEventDetails(reason);
    this.store.context.onExpandedItemsChange([], details);
    if (details.isCanceled) {
      return;
    }
    this.store.set('expandedItems', []);
    for (const collapsedItemId of oldExpanded) {
      this.store.context.onItemExpansionToggle(
        { itemId: collapsedItemId, isExpanded: false },
        createGenericEventDetails(reason),
      );
    }
  };

  public actions = {
    expandAll: () => this.expandAll(REASONS.imperativeAction),
    collapseAll: () => this.collapseAll(REASONS.imperativeAction),
    setItemExpansion: (itemId: CollectionItemId, isExpanded: boolean) =>
      this.setItemExpansion(itemId, isExpanded, REASONS.imperativeAction),
    isItemExpanded: (itemId: CollectionItemId) =>
      selectors.isItemExpanded(this.store.state, itemId),
    isItemExpandable: (itemId: CollectionItemId) =>
      selectors.isItemExpandable(this.store.state, itemId),
  };

  /**
   * Collects visible descendants of an item given a specific set of expanded items.
   * Used to determine which items will appear/disappear during expand/collapse.
   */
  private getVisibleDescendants(
    itemId: CollectionItemId,
    expandedItems: readonly CollectionItemId[],
  ): CollectionItemId[] {
    const expandedSet = new Set(expandedItems);
    const childrenLookup = selectors.itemOrderedChildrenIds;
    const result: CollectionItemId[] = [];

    const walk = (parentId: CollectionItemId) => {
      const children = childrenLookup(this.store.state, parentId) ?? [];
      for (const childId of children) {
        result.push(childId);
        if (expandedSet.has(childId)) {
          walk(childId);
        }
      }
    };

    walk(itemId);
    return result;
  }
}
