import * as React from 'react';
import { TimeoutManager } from '@base-ui/utils/TimeoutManager';
import type { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import type { TreeItemFocusEventReason } from '../store/types';
import { selectors } from '../store/selectors';
import { createGenericEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import {
  getFirstNavigableItem,
  getLastNavigableItem,
  getNextNavigableItem,
  getPreviousNavigableItem,
} from '../store/treeNavigation';

const TYPEAHEAD_TIMEOUT = 500;

function isPrintableKey(key: string): boolean {
  return key.length === 1 && !!key.match(/\S/);
}

export class TreeInteractionPlugin {
  private store: TreeStore;

  // Focus reason tracking — default to 'keyboard' since tab focus is keyboard-like
  private lastFocusReason: TreeItemFocusEventReason = REASONS.keyboard;

  // Typeahead
  private typeaheadQuery = '';

  private timeoutManager = new TimeoutManager();

  constructor(store: TreeStore) {
    this.store = store;
  }

  // ===========================================================================
  // Setup — called once from TreeStore constructor
  // ===========================================================================

  /**
   * Sets up store subscriptions for focus recovery when items are removed.
   * Must be called from the TreeStore constructor after the plugin is created.
   */
  setupFocusRecovery = () => {
    let previousState = this.store.state;
    let previousMetaLookup = selectors.itemMetaLookup(this.store.state);

    this.store.subscribe((newState) => {
      const newMetaLookup = selectors.itemMetaLookup(newState);
      if (newMetaLookup === previousMetaLookup) {
        previousState = newState;
        return;
      }

      // If focused item was removed, focus the closest neighbor.
      // The focus call is deferred with requestAnimationFrame because this
      // subscription fires synchronously on state change, before React has
      // committed the new DOM. Calling .focus() immediately could target an
      // element that hasn't been inserted yet, silently losing focus.
      const focusedId = newState.focusedItemId;
      if (focusedId != null && !newMetaLookup[focusedId]) {
        // Use previousState for navigation since the focused item still exists there.
        // Then verify the candidate still exists in the new state.
        // Walk forward then backward through the previous state to find the
        // nearest surviving neighbor. Multiple siblings may have been removed
        // in the same batch, so we keep walking until we find one that still
        // exists in the new state (or exhaust both directions).
        let candidate: CollectionItemId | null = null;

        let probe = getNextNavigableItem(previousState, focusedId);
        while (probe != null && !newMetaLookup[probe]) {
          probe = getNextNavigableItem(previousState, probe);
        }
        candidate = probe;

        if (candidate == null) {
          probe = getPreviousNavigableItem(previousState, focusedId);
          while (probe != null && !newMetaLookup[probe]) {
            probe = getPreviousNavigableItem(previousState, probe);
          }
          candidate = probe;
        }

        const itemToFocusId = candidate ?? getFirstNavigableItem(newState);

        if (itemToFocusId == null) {
          this.store.set('focusedItemId', null);
        } else {
          requestAnimationFrame(() => {
            // Verify the item still exists before focusing — another state
            // change may have removed it between scheduling and execution.
            if (selectors.itemMeta(this.store.state, itemToFocusId) != null) {
              this.focusItem(itemToFocusId);
            }
          });
        }
      }

      previousState = newState;
      previousMetaLookup = newMetaLookup;
    });
  };

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Returns a cleanup function that clears all pending timeouts (e.g. typeahead).
   */
  dispose = () => {
    this.timeoutManager.clearAll();
  };

  // ===========================================================================
  // Focus
  // ===========================================================================

  focusItem = (
    itemId: CollectionItemId,
    reason: TreeItemFocusEventReason = REASONS.keyboard,
  ) => {
    const meta = selectors.itemMeta(this.store.state, itemId);
    let isItemVisible = meta != null;
    if (isItemVisible) {
      let parentId = meta!.parentId;
      while (parentId != null) {
        if (!selectors.isItemExpanded(this.store.state, parentId)) {
          isItemVisible = false;
          break;
        }
        parentId = selectors.itemMeta(this.store.state, parentId)?.parentId ?? null;
      }
    }

    if (isItemVisible) {
      const element = this.store.getItemDOMElement(itemId);
      if (element) {
        // Calling .focus() synchronously triggers the onFocus handler,
        // which already updates focusedItemId and calls onItemFocus.
        // Set lastFocusReason so the onFocus handler picks up the correct reason.
        this.lastFocusReason = reason;
        element.focus();
      } else if (this.store.state.virtualized) {
        // In virtualized mode, the item may not be in the DOM yet.
        // Update state so the consumer can scroll the virtualizer to this item.
        // The item will auto-focus when it mounts (see TreeItem).
        this.store.set('focusedItemId', itemId);
        this.store.context.onItemFocus(itemId, createGenericEventDetails(reason));
      }
    }
  };

  removeFocusedItem = () => {
    const focusedId = this.store.state.focusedItemId;
    if (focusedId == null) {
      return;
    }

    const element = this.store.getItemDOMElement(focusedId);
    if (element) {
      element.blur();
    }

    this.store.set('focusedItemId', null);
  };

  // ===========================================================================
  // Keyboard navigation
  // ===========================================================================

  private isCheckboxItem(element: HTMLElement): boolean {
    return (
      element.hasAttribute('data-checked') ||
      element.hasAttribute('data-unchecked') ||
      element.hasAttribute('data-indeterminate')
    );
  }

  private getFirstItemMatchingTypeaheadQuery(
    itemId: CollectionItemId,
    newKey: string,
  ): CollectionItemId | null {
    const getNextItem = (idToCheck: CollectionItemId): CollectionItemId => {
      const nextId = getNextNavigableItem(this.store.state, idToCheck);
      return nextId ?? getFirstNavigableItem(this.store.state)!;
    };

    const getNextMatchingItemId = (query: string): CollectionItemId | null => {
      let matchingItemId: CollectionItemId | null = null;
      const checkedItems: Record<CollectionItemId, true> = {};
      let currentItemId: CollectionItemId = query.length > 1 ? itemId : getNextItem(itemId);
      while (matchingItemId == null && !checkedItems[currentItemId]) {
        if (
          selectors.labelMap(this.store.state)[currentItemId]?.startsWith(query) &&
          selectors.canItemBeFocused(this.store.state, currentItemId)
        ) {
          matchingItemId = currentItemId;
        } else {
          checkedItems[currentItemId] = true;
          currentItemId = getNextItem(currentItemId);
        }
      }
      return matchingItemId;
    };

    const cleanNewKey = newKey.toLowerCase();
    const concatenatedQuery = `${this.typeaheadQuery}${cleanNewKey}`;

    const concatenatedMatch = getNextMatchingItemId(concatenatedQuery);
    if (concatenatedMatch != null) {
      this.typeaheadQuery = concatenatedQuery;
      return concatenatedMatch;
    }

    const singleKeyMatch = getNextMatchingItemId(cleanNewKey);
    if (singleKeyMatch != null) {
      this.typeaheadQuery = cleanNewKey;
      return singleKeyMatch;
    }

    this.typeaheadQuery = '';
    return null;
  }

  private handleKeyDown(event: React.KeyboardEvent, itemId: CollectionItemId) {
    if (event.altKey) {
      return;
    }

    const ctrlPressed = event.ctrlKey || event.metaKey;
    const key = event.key;
    const isMulti = this.store.state.selectionMode === 'multiple';
    const isRtl = this.store.state.direction === 'rtl';
    const expandKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const collapseKey = isRtl ? 'ArrowRight' : 'ArrowLeft';

    // Select the item when pressing "Space"
    if (key === ' ' && selectors.canItemBeSelected(this.store.state, itemId)) {
      event.preventDefault();
      const isCheckbox = this.isCheckboxItem(event.target as HTMLElement);
      if (isMulti && event.shiftKey) {
        this.store.selection.expandSelectionRange(itemId, REASONS.keyboard, event.nativeEvent);
      } else {
        this.store.selection.setItemSelection({
          itemId,
          keepExistingSelection: isMulti,
          shouldBeSelected: undefined,
          shouldPropagate: isCheckbox,
          reason: REASONS.keyboard,
          event: event.nativeEvent,
        });
      }
    }

    // Enter: for link items, let the browser handle native navigation.
    // For other items, expand/collapse or select.
    else if (key === 'Enter') {
      const isLink = (event.target as HTMLElement).hasAttribute('data-link');
      if (isLink) {
        // Let the browser follow the link natively (no preventDefault).
        // Still handle selection so the item becomes selected on navigation.
        if (selectors.canItemBeSelected(this.store.state, itemId)) {
          this.store.selection.setItemSelection({
            itemId,
            shouldBeSelected: true,
            reason: REASONS.keyboard,
            event: event.nativeEvent,
          });
        }
        return;
      }
      if (this.store.expansion.canToggleItemExpansion(itemId)) {
        this.store.expansion.setItemExpansion(
          itemId,
          undefined,
          REASONS.keyboard,
          event.nativeEvent,
        );
        event.preventDefault();
      } else if (selectors.canItemBeSelected(this.store.state, itemId)) {
        if (isMulti) {
          event.preventDefault();
          this.store.selection.setItemSelection({
            itemId,
            keepExistingSelection: true,
            shouldPropagate: this.isCheckboxItem(event.target as HTMLElement),
            reason: REASONS.keyboard,
            event: event.nativeEvent,
          });
        } else if (!selectors.isItemSelected(this.store.state, itemId)) {
          this.store.selection.setItemSelection({
            itemId,
            reason: REASONS.keyboard,
            event: event.nativeEvent,
          });
          event.preventDefault();
        }
      }
    }

    // Focus next item
    else if (key === 'ArrowDown') {
      const nextItem = getNextNavigableItem(this.store.state, itemId);
      if (nextItem) {
        event.preventDefault();
        this.focusItem(nextItem);
        if (isMulti && event.shiftKey && selectors.canItemBeSelected(this.store.state, nextItem)) {
          this.store.selection.selectItemFromArrowNavigation(
            itemId,
            nextItem,
            REASONS.keyboard,
            event.nativeEvent,
          );
        }
      }
    }

    // Focus previous item
    else if (key === 'ArrowUp') {
      const prevItem = getPreviousNavigableItem(this.store.state, itemId);
      if (prevItem) {
        event.preventDefault();
        this.focusItem(prevItem);
        if (isMulti && event.shiftKey && selectors.canItemBeSelected(this.store.state, prevItem)) {
          this.store.selection.selectItemFromArrowNavigation(
            itemId,
            prevItem,
            REASONS.keyboard,
            event.nativeEvent,
          );
        }
      }
    }

    // Expand or focus first child
    else if (key === expandKey) {
      if (ctrlPressed) {
        return;
      }
      if (selectors.isItemExpanded(this.store.state, itemId)) {
        const nextItemId = getNextNavigableItem(this.store.state, itemId);
        if (nextItemId) {
          this.focusItem(nextItemId);
          event.preventDefault();
        }
      } else if (this.store.expansion.canToggleItemExpansion(itemId)) {
        this.store.expansion.setItemExpansion(
          itemId,
          undefined,
          REASONS.keyboard,
          event.nativeEvent,
        );
        event.preventDefault();
      }
    }

    // Collapse or focus parent
    else if (key === collapseKey) {
      if (ctrlPressed) {
        return;
      }
      if (
        this.store.expansion.canToggleItemExpansion(itemId) &&
        selectors.isItemExpanded(this.store.state, itemId)
      ) {
        this.store.expansion.setItemExpansion(
          itemId,
          undefined,
          REASONS.keyboard,
          event.nativeEvent,
        );
        event.preventDefault();
      } else {
        const parent = selectors.itemParentId(this.store.state, itemId);
        if (parent) {
          this.focusItem(parent);
          event.preventDefault();
        }
      }
    }

    // Home: focus first item
    else if (key === 'Home') {
      if (
        selectors.canItemBeSelected(this.store.state, itemId) &&
        isMulti &&
        ctrlPressed &&
        event.shiftKey
      ) {
        this.store.selection.selectRangeFromStartToItem(
          itemId,
          REASONS.keyboard,
          event.nativeEvent,
        );
      } else {
        const firstItem = getFirstNavigableItem(this.store.state);
        if (firstItem) {
          this.focusItem(firstItem);
        }
      }
      event.preventDefault();
    }

    // End: focus last item
    else if (key === 'End') {
      if (
        selectors.canItemBeSelected(this.store.state, itemId) &&
        isMulti &&
        ctrlPressed &&
        event.shiftKey
      ) {
        this.store.selection.selectRangeFromItemToEnd(
          itemId,
          REASONS.keyboard,
          event.nativeEvent,
        );
      } else {
        const lastItem = getLastNavigableItem(this.store.state);
        if (lastItem) {
          this.focusItem(lastItem);
        }
      }
      event.preventDefault();
    }

    // Expand all siblings
    else if (key === '*') {
      this.store.expansion.expandAllSiblings(itemId, REASONS.keyboard, event.nativeEvent);
      event.preventDefault();
    }

    // Ctrl+A: select all
    else if (event.key.toUpperCase() === 'A' && ctrlPressed && isMulti) {
      this.store.selection.selectAllNavigableItems(REASONS.keyboard, event.nativeEvent);
      event.preventDefault();
    }

    // Type-ahead
    else if (!ctrlPressed && !event.shiftKey && isPrintableKey(key)) {
      const matchingItem = this.getFirstItemMatchingTypeaheadQuery(itemId, key);
      if (matchingItem != null) {
        this.focusItem(matchingItem);
        event.preventDefault();
      } else {
        this.typeaheadQuery = '';
      }

      this.timeoutManager.startTimeout('typeahead', TYPEAHEAD_TIMEOUT, () => {
        this.typeaheadQuery = '';
      });
    }
  }

  // ===========================================================================
  // Event handler helpers
  // ===========================================================================

  private getItemIdFromEvent(event: React.SyntheticEvent): CollectionItemId | null {
    const stringId = (event.currentTarget as HTMLElement).getAttribute('data-item-id');
    if (stringId == null) {
      return null;
    }
    return selectors.itemIdLookup(this.store.state)[stringId] ?? null;
  }

  private readonly handleItemFocus = (event: React.FocusEvent) => {
    const itemId = this.getItemIdFromEvent(event);
    if (!itemId) {
      return;
    }
    if (selectors.canItemBeFocused(this.store.state, itemId) && this.store.state.focusedItemId !== itemId) {
      this.store.set('focusedItemId', itemId);
      this.store.context.onItemFocus(
        itemId,
        createGenericEventDetails(this.lastFocusReason, event.nativeEvent),
      );
      this.lastFocusReason = REASONS.keyboard;
    }
  };

  private readonly handleItemMouseDown = (event: React.MouseEvent) => {
    const itemId = this.getItemIdFromEvent(event);
    if (!itemId) {
      return;
    }
    // Prevent text selection when using modifier keys for multi-select.
    // Also prevent default for disabled items to avoid browser focus.
    if (
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      selectors.isItemDisabled(this.store.state, itemId)
    ) {
      event.preventDefault();
    }
  };

  // ===========================================================================
  // Static event handler objects
  // ===========================================================================

  public readonly rootEventHandlers = {
    onFocus: (event: React.FocusEvent) => {
      // Only handle focus if it's on the root element itself (not bubbled from children)
      const defaultFocusableId = selectors.defaultFocusableItemId(this.store.state);
      if (event.target === event.currentTarget && defaultFocusableId != null) {
        this.focusItem(defaultFocusableId);
      }
    },
    onBlur: (event: React.FocusEvent) => {
      // Check if focus moved outside the tree entirely
      const rootElement = this.store.context.rootRef.current;
      if (rootElement && !rootElement.contains(event.relatedTarget as Node)) {
        this.store.set('focusedItemId', null);
      }
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      const focusedId = this.store.state.focusedItemId;
      if (focusedId != null) {
        this.handleKeyDown(event, focusedId);
      }
    },
  };

  public readonly itemEventHandlers = {
    onMouseDown: this.handleItemMouseDown,
    onClick: (event: React.MouseEvent) => {
      const itemId = this.getItemIdFromEvent(event);
      if (!itemId) {
        return;
      }
      // Handle focus - disabled items are never focused by mouse click,
      // even when itemFocusableWhenDisabled is true (that only affects keyboard focus).
      if (!selectors.isItemDisabled(this.store.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.store.set('focusedItemId', itemId);
      }

      // Handle selection
      if (this.store.state.selectionMode !== 'none' && selectors.canItemBeSelected(this.store.state, itemId)) {
        const isMulti = this.store.state.selectionMode === 'multiple';
        if (isMulti && (event.ctrlKey || event.metaKey)) {
          this.store.selection.setItemSelection({
            itemId,
            keepExistingSelection: true,
            reason: REASONS.itemPress,
            event: event.nativeEvent,
          });
          return;
        }
        if (isMulti && event.shiftKey) {
          this.store.selection.expandSelectionRange(itemId, REASONS.itemPress, event.nativeEvent);
          return;
        }
        this.store.selection.setItemSelection({
          itemId,
          shouldBeSelected: true,
          reason: REASONS.itemPress,
          event: event.nativeEvent,
        });
      }

      // Handle expansion (skipped for multi-select modifier clicks via early return above)
      if (this.store.state.expandOnClick && this.store.expansion.canToggleItemExpansion(itemId)) {
        this.store.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
      }
    },
    onFocus: this.handleItemFocus,
  };

  public readonly checkboxItemEventHandlers = {
    onMouseDown: this.handleItemMouseDown,
    onClick: (event: React.MouseEvent) => {
      const itemId = this.getItemIdFromEvent(event);
      if (!itemId) {
        return;
      }
      // Handle focus - disabled items are never focused by mouse click,
      // even when itemFocusableWhenDisabled is true (that only affects keyboard focus).
      if (!selectors.isItemDisabled(this.store.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.store.set('focusedItemId', itemId);
      }

      // Handle selection (checkbox behavior: always toggle, keep existing in multi)
      if (selectors.canItemBeSelected(this.store.state, itemId)) {
        const isMulti = this.store.state.selectionMode === 'multiple';

        if (isMulti && event.shiftKey) {
          this.store.selection.expandSelectionRange(itemId, REASONS.itemPress, event.nativeEvent);
          return;
        }

        this.store.selection.setItemSelection({
          itemId,
          keepExistingSelection: isMulti,
          shouldPropagate: true,
          reason: REASONS.itemPress,
          event: event.nativeEvent,
        });
      }

      // Handle expansion
      if (this.store.state.expandOnClick && this.store.expansion.canToggleItemExpansion(itemId)) {
        this.store.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
      }
    },
    onFocus: this.handleItemFocus,
  };

  public readonly linkItemEventHandlers = {
    onMouseDown: (event: React.MouseEvent) => {
      const itemId = this.getItemIdFromEvent(event);
      if (!itemId) {
        return;
      }
      // Prevent default for disabled items to avoid browser focus.
      // Unlike regular items, we don't prevent default for modifier keys
      // so that Ctrl+click (open in new tab) and Shift+click (open in new window) work.
      if (selectors.isItemDisabled(this.store.state, itemId)) {
        event.preventDefault();
      }
    },
    onClick: (event: React.MouseEvent) => {
      const itemId = this.getItemIdFromEvent(event);
      if (!itemId) {
        return;
      }
      // Handle focus - disabled items are never focused by mouse click,
      // even when itemFocusableWhenDisabled is true (that only affects keyboard focus).
      if (!selectors.isItemDisabled(this.store.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.store.set('focusedItemId', itemId);
      }

      // Handle selection (same as Tree.Item: replace semantics)
      if (this.store.state.selectionMode !== 'none' && selectors.canItemBeSelected(this.store.state, itemId)) {
        this.store.selection.setItemSelection({
          itemId,
          shouldBeSelected: true,
          reason: REASONS.itemPress,
          event: event.nativeEvent,
        });
      }

      // expandOnClick is intentionally NOT handled for link items.
      // The primary action of a link is navigation, not expansion.
      // Expansion is done via ItemExpansionTrigger or ArrowRight/Left keys.
    },
    onFocus: this.handleItemFocus,
  };

  public readonly expansionTriggerEventHandlers = {
    onClick: (event: React.MouseEvent, itemId: CollectionItemId) => {
      event.stopPropagation();
      this.store.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
    },
  };
}
