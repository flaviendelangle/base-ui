import * as React from 'react';
import { ReactStore } from '@base-ui/utils/store';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/utils/empty';
import { TimeoutManager } from '@base-ui/utils/TimeoutManager';
import type { useDragAndDrop } from '../../use-drag-and-drop';
import { TreeItemMutationPlugin } from '../plugins/TreeItemMutationPlugin';
import { TreeSelectionPlugin } from '../plugins/TreeSelectionPlugin';
import { TreeExpansionPlugin } from '../plugins/TreeExpansionPlugin';
import type {
  TreeState,
  TreeStoreContext,
  TreeItemId,
  TreeDefaultItemModel,
  TreeRootActions,
  TreeRootExpansionChangeEventReason,
  TreeRootExpansionChangeEventDetails,
  TreeRootSelectionChangeEventDetails,
  TreeSelectedItemsType,
  TreeSelectionMode,
  TreeItemFocusEventReason,
  TreeItemExpansionToggleEventDetails,
  TreeItemExpansionToggleValue,
  TreeItemSelectionToggleEventDetails,
  TreeItemSelectionToggleValue,
  TreeItemFocusEventDetails,
  TreeRootItemsChangeEventDetails,
} from './types';
import { selectors } from './selectors';
import { createGenericEventDetails } from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';
import {
  getFirstNavigableItem,
  getLastNavigableItem,
  getNextNavigableItem,
  getPreviousNavigableItem,
} from './treeNavigation';

const TYPEAHEAD_TIMEOUT = 500;

export interface TreeStoreParameters<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The items to render.
   * Each item must have a unique identifier.
   */
  items: readonly TItem[];
  /**
   * The expanded items.
   *
   * To render an uncontrolled tree, use the `defaultExpandedItems` prop instead.
   */
  expandedItems?: readonly TreeItemId[] | undefined;
  /**
   * The items that are initially expanded.
   *
   * To render a controlled tree, use the `expandedItems` prop instead.
   * @default []
   */
  defaultExpandedItems?: readonly TreeItemId[] | undefined;
  /**
   * Whether clicking anywhere on an item row toggles expansion.
   * When `false`, only `Tree.ItemExpansionTrigger` can expand items.
   * @default false
   */
  expandOnClick?: boolean | undefined;
  /**
   * Event handler called when items are expanded or collapsed.
   */
  onExpandedItemsChange?:
    | ((expandedItems: TreeItemId[], eventDetails: TreeRootExpansionChangeEventDetails) => void)
    | undefined;
  /**
   * Event handler called when an item is expanded or collapsed.
   */
  onItemExpansionToggle?:
    | ((value: TreeItemExpansionToggleValue, details: TreeItemExpansionToggleEventDetails) => void)
    | undefined;
  /**
   * The selected items.
   *
   * To render an uncontrolled tree, use the `defaultSelectedItems` prop instead.
   */
  selectedItems?:
    | TreeSelectedItemsType<Mode>
    | (Mode extends 'multiple' ? never : null)
    | undefined;
  /**
   * The items that are initially selected.
   *
   * To render a controlled tree, use the `selectedItems` prop instead.
   * @default []
   */
  defaultSelectedItems?:
    | TreeSelectedItemsType<Mode>
    | (Mode extends 'multiple' ? never : null)
    | undefined;
  /**
   * Event handler called when the selected items change.
   */
  onSelectedItemsChange?:
    | ((
        selectedItems: TreeSelectedItemsType<Mode> | (Mode extends 'multiple' ? never : null),
        eventDetails: TreeRootSelectionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is selected or deselected.
   */
  onItemSelectionToggle?:
    | ((value: TreeItemSelectionToggleValue, details: TreeItemSelectionToggleEventDetails) => void)
    | undefined;
  /**
   * The selection mode of the tree.
   * Use `'single'` for single selection, `'multiple'` for multiple selection.
   */
  selectionMode?: Mode | undefined;
  /**
   * Whether the tree disallows having no selected item.
   * When `true`, at least one item must remain selected at all times.
   * @default false
   */
  disallowEmptySelection?: boolean | undefined;
  /**
   * Controls how selecting a `Tree.CheckboxItem` propagates through the tree hierarchy.
   * This does not affect `Tree.Item` interactions (which use replace-selection semantics).
   *
   * When `checkboxSelectionPropagation.descendants` is set to `true`:
   * - Selecting a parent selects all its descendants automatically.
   * - Deselecting a parent deselects all its descendants automatically.
   *
   * When `checkboxSelectionPropagation.parents` is set to `true`:
   * - Selecting all descendants of a parent selects the parent automatically.
   * - Deselecting a descendant of a selected parent deselects the parent automatically.
   *
   * @default { parents: true, descendants: true }
   */
  checkboxSelectionPropagation?:
    | { parents?: boolean | undefined; descendants?: boolean | undefined }
    | undefined;
  /**
   * Whether disabled items should be focusable.
   * @default false
   */
  itemFocusableWhenDisabled?: boolean | undefined;
  /**
   * Event handler called when an item is focused.
   */
  onItemFocus?: ((itemId: TreeItemId, details: TreeItemFocusEventDetails) => void) | undefined;
  /**
   * Used to determine the id of a given item.
   * @default (item) => item.id
   */
  itemToId?: ((item: TItem) => TreeItemId) | undefined;
  /**
   * Used to determine the string label of a given item.
   * @default (item) => item.label
   */
  itemToStringLabel?: ((item: TItem) => string) | undefined;
  /**
   * Used to determine the children of a given item.
   * @default (item) => item.children
   */
  itemToChildren?: ((item: TItem) => TItem[] | undefined) | undefined;
  /**
   * Used to determine if a given item should be disabled.
   * @default (item) => !!item.disabled
   */
  isItemDisabled?: ((item: TItem) => boolean) | undefined;
  /**
   * Used to determine if a given item should have selection disabled.
   * @default (item) => !!item.disabled
   */
  isItemSelectionDisabled?: ((item: TItem) => boolean) | undefined;
  /**
   * The direction of the tree layout.
   */
  direction: 'ltr' | 'rtl';
  /**
   * A ref to the root element of the tree.
   */
  rootRef: React.RefObject<HTMLElement | null>;
  /**
   * The lazy loading plugin instance, used to load items on demand when expanding a parent item.
   */
  lazyLoading?: TreeLazyLoading<TItem> | undefined;
  /**
   * The drag-and-drop plugin instance, used to enable reordering and reparenting via drag.
   */
  dragAndDrop?: ReturnType<typeof useDragAndDrop> | undefined;
  /**
   * Event handler called when items are reordered or reparented.
   */
  onItemsChange?: ((items: TItem[], details: TreeRootItemsChangeEventDetails) => void) | undefined;
}

function isPrintableKey(key: string): boolean {
  return key.length === 1 && !!key.match(/\S/);
}

export interface TreeLazyLoading<TItem = TreeDefaultItemModel> {
  attach(store: TreeStore<any, TItem>): void;
  onBeforeExpand(
    itemId: TreeItemId,
    reason: TreeRootExpansionChangeEventReason,
    event?: Event,
  ): Promise<void>;
  refreshItemChildren(itemId: TreeItemId | null): Promise<void>;
  destroy(): void;
}

export class TreeStore<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
> extends ReactStore<TreeState<any>, TreeStoreContext, typeof selectors> {
  // Focus reason tracking — default to 'keyboard' since tab focus is keyboard-like
  private lastFocusReason: TreeItemFocusEventReason = REASONS.keyboard;

  // Typeahead
  private typeaheadQuery = '';

  private timeoutManager = new TimeoutManager();

  public itemMutation = new TreeItemMutationPlugin(this);

  public selection = new TreeSelectionPlugin(this);

  public expansion = new TreeExpansionPlugin(this);

  public lazyLoading: TreeLazyLoading<TItem> | undefined;

  public dragAndDrop: ReturnType<typeof useDragAndDrop> | undefined;

  private dragAndDropCleanup: (() => void) | null = null;

  constructor(parameters: TreeStoreParameters<Mode, TItem>) {
    const selectionMode: TreeSelectionMode = parameters.selectionMode ?? 'single';
    const itemToId = parameters.itemToId ?? ((item: any) => item.id);
    const itemToStringLabel = parameters.itemToStringLabel ?? ((item: any) => item.label);
    const itemToChildren = parameters.itemToChildren ?? ((item: any) => item.children);
    const isItemDisabled = parameters.isItemDisabled ?? ((item: any) => !!item.disabled);
    const isItemSelectionDisabled =
      parameters.isItemSelectionDisabled ?? ((item: any) => !!item.disabled);
    super(
      {
        disabled: parameters.disabled ?? false,
        items: parameters.items,
        itemMetaPatches: {},
        lazyItems: undefined,
        expandedItems: parameters.expandedItems ?? parameters.defaultExpandedItems ?? EMPTY_ARRAY,
        expandOnClick: parameters.expandOnClick ?? false,
        selectedItems:
          parameters.selectedItems ??
          parameters.defaultSelectedItems ??
          (selectionMode === 'multiple' ? EMPTY_ARRAY : null),
        selectionMode,
        disallowEmptySelection: parameters.disallowEmptySelection ?? false,
        checkboxSelectionPropagation: parameters.checkboxSelectionPropagation ?? {
          parents: true,
          descendants: true,
        },
        focusedItemId: null,
        itemFocusableWhenDisabled: parameters.itemFocusableWhenDisabled ?? false,
        itemToId,
        itemToStringLabel,
        itemToChildren,
        isItemDisabled,
        isItemSelectionDisabled,
        direction: parameters.direction,
        dragAndDrop: undefined,
        virtualized: false,
        enableGroupTransition: false,
        animatingGroups: EMPTY_OBJECT,
      },
      {
        onExpandedItemsChange: parameters.onExpandedItemsChange ?? (() => {}),
        onSelectedItemsChange:
          (parameters.onSelectedItemsChange as TreeStoreContext['onSelectedItemsChange']) ??
          (() => {}),
        onItemExpansionToggle: parameters.onItemExpansionToggle ?? (() => {}),
        onItemSelectionToggle: parameters.onItemSelectionToggle ?? (() => {}),
        onItemFocus: parameters.onItemFocus ?? (() => {}),
        onItemsChange: parameters.onItemsChange ?? (() => {}),
        rootRef: parameters.rootRef,
      },
      selectors,
    );

    // Wire plugins (attach is called in mountEffect)
    this.lazyLoading = parameters.lazyLoading;
    this.dragAndDrop = parameters.dragAndDrop;

    // Observe items changes to keep focus valid
    let previousState = this.state;
    let previousMetaLookup = selectors.itemMetaLookup(this.state);
    this.subscribe((newState) => {
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
        let candidate: TreeItemId | null = null;

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
          this.set('focusedItemId', null);
        } else {
          requestAnimationFrame(() => {
            this.focusItem(itemToFocusId);
          });
        }
      }

      previousState = newState;
      previousMetaLookup = newMetaLookup;
    });
  }

  // ===========================================================================
  // Focus
  // ===========================================================================

  public focusItem(itemId: TreeItemId, reason: TreeItemFocusEventReason = REASONS.keyboard) {
    const meta = selectors.itemMeta(this.state, itemId);
    let isItemVisible = meta != null;
    if (isItemVisible) {
      let parentId = meta!.parentId;
      while (parentId != null) {
        if (!selectors.isItemExpanded(this.state, parentId)) {
          isItemVisible = false;
          break;
        }
        parentId = selectors.itemMeta(this.state, parentId)?.parentId ?? null;
      }
    }

    if (isItemVisible) {
      const element = this.getItemDOMElement(itemId);
      if (element) {
        // Calling .focus() synchronously triggers the onFocus handler,
        // which already updates focusedItemId and calls onItemFocus.
        // Set lastFocusReason so the onFocus handler picks up the correct reason.
        this.lastFocusReason = reason;
        element.focus();
      } else if (this.state.virtualized) {
        // In virtualized mode, the item may not be in the DOM yet.
        // Update state so the consumer can scroll the virtualizer to this item.
        // The item will auto-focus when it mounts (see TreeItem).
        this.set('focusedItemId', itemId);
        this.context.onItemFocus(itemId, createGenericEventDetails(reason));
      }
    }
  }

  public removeFocusedItem() {
    const focusedId = this.state.focusedItemId;
    if (focusedId == null) {
      return;
    }

    const element = this.getItemDOMElement(focusedId);
    if (element) {
      element.blur();
    }

    this.set('focusedItemId', null);
  }

  // ===========================================================================
  // Item DOM element
  // ===========================================================================

  public getItemDOMElement(itemId: TreeItemId): HTMLElement | null {
    const rootElement = this.context.rootRef.current;
    if (!rootElement) {
      return null;
    }
    return rootElement.querySelector(`[data-item-id="${CSS.escape(String(itemId))}"]`);
  }

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
    itemId: TreeItemId,
    newKey: string,
  ): TreeItemId | null {
    const getNextItem = (idToCheck: TreeItemId): TreeItemId => {
      const nextId = getNextNavigableItem(this.state, idToCheck);
      return nextId ?? getFirstNavigableItem(this.state)!;
    };

    const getNextMatchingItemId = (query: string): TreeItemId | null => {
      let matchingItemId: TreeItemId | null = null;
      const checkedItems: Record<TreeItemId, true> = {};
      let currentItemId: TreeItemId = query.length > 1 ? itemId : getNextItem(itemId);
      while (matchingItemId == null && !checkedItems[currentItemId]) {
        if (
          selectors.labelMap(this.state)[currentItemId]?.startsWith(query) &&
          selectors.canItemBeFocused(this.state, currentItemId)
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

  private handleKeyDown(event: React.KeyboardEvent, itemId: TreeItemId) {
    if (event.altKey) {
      return;
    }

    const ctrlPressed = event.ctrlKey || event.metaKey;
    const key = event.key;
    const isMulti = this.state.selectionMode === 'multiple';

    switch (true) {
      // Select the item when pressing "Space"
      case key === ' ' && selectors.canItemBeSelected(this.state, itemId): {
        event.preventDefault();
        const isCheckbox = this.isCheckboxItem(event.target as HTMLElement);
        if (isMulti && event.shiftKey) {
          this.selection.expandSelectionRange(itemId, REASONS.keyboard, event.nativeEvent);
        } else {
          this.selection.setItemSelection({
            itemId,
            keepExistingSelection: isMulti,
            shouldBeSelected: undefined,
            shouldPropagate: isCheckbox,
            reason: REASONS.keyboard,
            event: event.nativeEvent,
          });
        }
        break;
      }

      // Enter: for link items, let the browser handle native navigation.
      // For other items, expand/collapse or select.
      case key === 'Enter': {
        const isLink = (event.target as HTMLElement).hasAttribute('data-link');
        if (isLink) {
          // Let the browser follow the link natively (no preventDefault).
          // Still handle selection so the item becomes selected on navigation.
          if (selectors.canItemBeSelected(this.state, itemId)) {
            this.selection.setItemSelection({
              itemId,
              shouldBeSelected: true,
              reason: REASONS.keyboard,
              event: event.nativeEvent,
            });
          }
          break;
        }
        if (this.expansion.canToggleItemExpansion(itemId)) {
          this.expansion.setItemExpansion(itemId, undefined, REASONS.keyboard, event.nativeEvent);
          event.preventDefault();
        } else if (selectors.canItemBeSelected(this.state, itemId)) {
          if (isMulti) {
            event.preventDefault();
            this.selection.setItemSelection({
              itemId,
              keepExistingSelection: true,
              shouldPropagate: this.isCheckboxItem(event.target as HTMLElement),
              reason: REASONS.keyboard,
              event: event.nativeEvent,
            });
          } else if (!selectors.isItemSelected(this.state, itemId)) {
            this.selection.setItemSelection({
              itemId,
              reason: REASONS.keyboard,
              event: event.nativeEvent,
            });
            event.preventDefault();
          }
        }
        break;
      }

      // Focus next item
      case key === 'ArrowDown': {
        const nextItem = getNextNavigableItem(this.state, itemId);
        if (nextItem) {
          event.preventDefault();
          this.focusItem(nextItem);
          if (isMulti && event.shiftKey && selectors.canItemBeSelected(this.state, nextItem)) {
            this.selection.selectItemFromArrowNavigation(
              itemId,
              nextItem,
              REASONS.keyboard,
              event.nativeEvent,
            );
          }
        }
        break;
      }

      // Focus previous item
      case key === 'ArrowUp': {
        const prevItem = getPreviousNavigableItem(this.state, itemId);
        if (prevItem) {
          event.preventDefault();
          this.focusItem(prevItem);
          if (isMulti && event.shiftKey && selectors.canItemBeSelected(this.state, prevItem)) {
            this.selection.selectItemFromArrowNavigation(
              itemId,
              prevItem,
              REASONS.keyboard,
              event.nativeEvent,
            );
          }
        }
        break;
      }

      // ArrowRight: expand or focus first child
      case (key === 'ArrowRight' && this.state.direction !== 'rtl') ||
        (key === 'ArrowLeft' && this.state.direction === 'rtl'): {
        if (ctrlPressed) {
          return;
        }
        if (selectors.isItemExpanded(this.state, itemId)) {
          const nextItemId = getNextNavigableItem(this.state, itemId);
          if (nextItemId) {
            this.focusItem(nextItemId);
            event.preventDefault();
          }
        } else if (this.expansion.canToggleItemExpansion(itemId)) {
          this.expansion.setItemExpansion(itemId, undefined, REASONS.keyboard, event.nativeEvent);
          event.preventDefault();
        }
        break;
      }

      // ArrowLeft: collapse or focus parent
      case (key === 'ArrowLeft' && this.state.direction !== 'rtl') ||
        (key === 'ArrowRight' && this.state.direction === 'rtl'): {
        if (ctrlPressed) {
          return;
        }
        if (
          this.expansion.canToggleItemExpansion(itemId) &&
          selectors.isItemExpanded(this.state, itemId)
        ) {
          this.expansion.setItemExpansion(itemId, undefined, REASONS.keyboard, event.nativeEvent);
          event.preventDefault();
        } else {
          const parent = selectors.itemParentId(this.state, itemId);
          if (parent) {
            this.focusItem(parent);
            event.preventDefault();
          }
        }
        break;
      }

      // Home: focus first item
      case key === 'Home': {
        if (
          selectors.canItemBeSelected(this.state, itemId) &&
          isMulti &&
          ctrlPressed &&
          event.shiftKey
        ) {
          this.selection.selectRangeFromStartToItem(itemId, REASONS.keyboard, event.nativeEvent);
        } else {
          const firstItem = getFirstNavigableItem(this.state);
          if (firstItem) {
            this.focusItem(firstItem);
          }
        }
        event.preventDefault();
        break;
      }

      // End: focus last item
      case key === 'End': {
        if (
          selectors.canItemBeSelected(this.state, itemId) &&
          isMulti &&
          ctrlPressed &&
          event.shiftKey
        ) {
          this.selection.selectRangeFromItemToEnd(itemId, REASONS.keyboard, event.nativeEvent);
        } else {
          const lastItem = getLastNavigableItem(this.state);
          if (lastItem) {
            this.focusItem(lastItem);
          }
        }
        event.preventDefault();
        break;
      }

      // Expand all siblings
      case key === '*': {
        this.expansion.expandAllSiblings(itemId, REASONS.keyboard, event.nativeEvent);
        event.preventDefault();
        break;
      }

      // Ctrl+A: select all
      case event.key.toUpperCase() === 'A' && ctrlPressed && isMulti: {
        this.selection.selectAllNavigableItems(REASONS.keyboard, event.nativeEvent);
        event.preventDefault();
        break;
      }

      // Type-ahead
      case !ctrlPressed && !event.shiftKey && isPrintableKey(key): {
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
        break;
      }

      default:
        break;
    }
  }

  // ===========================================================================
  // Static event handler objects (following TemporalFieldStore pattern)
  // ===========================================================================

  public readonly rootEventHandlers = {
    onFocus: (event: React.FocusEvent) => {
      // Only handle focus if it's on the root element itself (not bubbled from children)
      const defaultFocusableId = selectors.defaultFocusableItemId(this.state);
      if (event.target === event.currentTarget && defaultFocusableId != null) {
        this.focusItem(defaultFocusableId);
      }
    },
    onBlur: (event: React.FocusEvent) => {
      // Check if focus moved outside the tree entirely
      const rootElement = this.context.rootRef.current;
      if (rootElement && !rootElement.contains(event.relatedTarget as Node)) {
        this.set('focusedItemId', null);
      }
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      const focusedId = this.state.focusedItemId;
      if (focusedId != null) {
        this.handleKeyDown(event, focusedId);
      }
    },
  };

  private getItemIdFromEvent(event: React.SyntheticEvent): TreeItemId | null {
    const stringId = (event.currentTarget as HTMLElement).getAttribute('data-item-id');
    if (stringId == null) {
      return null;
    }
    return selectors.itemIdLookup(this.state)[stringId] ?? null;
  }

  private readonly handleItemFocus = (event: React.FocusEvent) => {
    const itemId = this.getItemIdFromEvent(event);
    if (!itemId) {
      return;
    }
    if (selectors.canItemBeFocused(this.state, itemId) && this.state.focusedItemId !== itemId) {
      this.set('focusedItemId', itemId);
      this.context.onItemFocus(
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
      selectors.isItemDisabled(this.state, itemId)
    ) {
      event.preventDefault();
    }
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
      if (!selectors.isItemDisabled(this.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.set('focusedItemId', itemId);
      }

      // Handle selection
      if (this.state.selectionMode !== 'none' && selectors.canItemBeSelected(this.state, itemId)) {
        const isMulti = this.state.selectionMode === 'multiple';
        if (isMulti && (event.ctrlKey || event.metaKey)) {
          this.selection.setItemSelection({
            itemId,
            keepExistingSelection: true,
            reason: REASONS.itemPress,
            event: event.nativeEvent,
          });
          return;
        }
        if (isMulti && event.shiftKey) {
          this.selection.expandSelectionRange(itemId, REASONS.itemPress, event.nativeEvent);
          return;
        }
        this.selection.setItemSelection({
          itemId,
          shouldBeSelected: true,
          reason: REASONS.itemPress,
          event: event.nativeEvent,
        });
      }

      // Handle expansion (skipped for multi-select modifier clicks via early return above)
      if (this.state.expandOnClick && this.expansion.canToggleItemExpansion(itemId)) {
        this.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
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
      if (!selectors.isItemDisabled(this.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.set('focusedItemId', itemId);
      }

      // Handle selection (checkbox behavior: always toggle, keep existing in multi)
      if (selectors.canItemBeSelected(this.state, itemId)) {
        const isMulti = this.state.selectionMode === 'multiple';

        if (isMulti && event.shiftKey) {
          this.selection.expandSelectionRange(itemId, REASONS.itemPress, event.nativeEvent);
          return;
        }

        this.selection.setItemSelection({
          itemId,
          keepExistingSelection: isMulti,
          shouldPropagate: true,
          reason: REASONS.itemPress,
          event: event.nativeEvent,
        });
      }

      // Handle expansion
      if (this.state.expandOnClick && this.expansion.canToggleItemExpansion(itemId)) {
        this.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
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
      if (selectors.isItemDisabled(this.state, itemId)) {
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
      if (!selectors.isItemDisabled(this.state, itemId)) {
        this.lastFocusReason = REASONS.itemPress;
        this.set('focusedItemId', itemId);
      }

      // Handle selection (same as Tree.Item: replace semantics)
      if (this.state.selectionMode !== 'none' && selectors.canItemBeSelected(this.state, itemId)) {
        this.selection.setItemSelection({
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
    onClick: (event: React.MouseEvent, itemId: TreeItemId) => {
      event.stopPropagation();
      this.expansion.setItemExpansion(itemId, undefined, REASONS.itemPress, event.nativeEvent);
    },
  };

  // ===========================================================================
  // Lazy loading helpers (called by the plugin)
  // ===========================================================================

  public setItemChildrenOverride(parentId: TreeItemId, children: TItem[]) {
    this.set('lazyItems', {
      ...this.state.lazyItems!,
      children: { ...this.state.lazyItems!.children, [parentId]: children },
    });
  }

  public removeChildrenOverride(parentId: TreeItemId) {
    const { [parentId]: removed, ...rest } = this.state.lazyItems!.children;
    this.set('lazyItems', { ...this.state.lazyItems!, children: rest });
  }

  public setItemExpandableOverrides(overrides: Record<TreeItemId, boolean>) {
    this.set('lazyItems', {
      ...this.state.lazyItems!,
      expandable: { ...this.state.lazyItems!.expandable, ...overrides },
    });
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  public mountEffect = () => {
    // Attach plugins on mount rather than in the constructor.
    // This correctly handles React Strict Mode's unmount/remount cycle:
    // destroy() nullifies the store reference, and attach() restores it.
    this.lazyLoading?.attach(this);

    if (this.dragAndDrop) {
      const context: useDragAndDrop.ComponentContext = {
        getParentId: (id) => selectors.itemParentId(this.state, id),
        getChildrenIds: (id) => selectors.itemOrderedChildrenIds(this.state, id),
        isDescendantOf: (id, ancestorId) => {
          let currentId: TreeItemId | null = id;
          while (currentId != null) {
            currentId = selectors.itemParentId(this.state, currentId);
            if (currentId === ancestorId) {
              return true;
            }
          }
          return false;
        },
        getItemIndex: (id) => selectors.itemIndex(this.state, id),
        isItemExpandable: (id) => selectors.isItemExpandable(this.state, id),
        expandItem: (id) => this.expansion.applyItemExpansion(id, true, REASONS.imperativeAction),
        hasItem: (id) => selectors.itemMeta(this.state, id) != null,
        getSelectedItemIds: () => this.selection.materializeSelectedItems(),
        onStateChange: (dndState) => this.set('dragAndDrop', dndState),
      };
      this.dragAndDropCleanup = this.dragAndDrop.attach(context);
    }

    return () => {
      this.timeoutManager.clearAll();
      this.lazyLoading?.destroy();
      this.dragAndDropCleanup?.();
      this.dragAndDropCleanup = null;
    };
  };

  // ===========================================================================
  // Actions (exposed via actionsRef)
  // ===========================================================================
  private actions: TreeRootActions = {
    focusItem: (itemId) => this.focusItem(itemId, REASONS.imperativeAction),
    getItemDOMElement: (itemId) => this.getItemDOMElement(itemId),
    getItemModel: (itemId) => selectors.itemModel(this.state, itemId),
    getItemOrderedChildrenIds: (itemId) => selectors.itemOrderedChildrenIds(this.state, itemId),
    getParentId: (itemId) => selectors.itemParentId(this.state, itemId),
    isItemExpanded: (itemId) => selectors.isItemExpanded(this.state, itemId),
    isItemSelected: (itemId) => selectors.isItemSelected(this.state, itemId),
    setItemExpansion: (itemId, isExpanded) =>
      this.expansion.setItemExpansion(itemId, isExpanded, REASONS.imperativeAction),
    setItemSelection: (itemId, isSelected) =>
      this.selection.setItemSelection({
        itemId,
        shouldBeSelected: isSelected,
        shouldPropagate: true,
        reason: REASONS.imperativeAction,
      }),
    setIsItemDisabled: this.itemMutation.setIsItemDisabled,
    expandAll: () => this.expansion.expandAll(REASONS.imperativeAction),
    collapseAll: () => this.expansion.collapseAll(REASONS.imperativeAction),
    moveItems: this.itemMutation.moveItems,
    moveItemsBefore: this.itemMutation.moveItemsBefore,
    moveItemsAfter: this.itemMutation.moveItemsAfter,
    removeItems: this.itemMutation.removeItems,
    addItems: this.itemMutation.addItems,
    addItemsBefore: this.itemMutation.addItemsBefore,
    addItemsAfter: this.itemMutation.addItemsAfter,
    refreshItemChildren: (itemId) => {
      if (!this.lazyLoading) {
        throw new Error(
          'Base UI Tree: refreshItemChildren requires a lazyLoading plugin. ' +
            'Pass a lazyLoading prop to Tree.Root created via Tree.useLazyLoading().',
        );
      }
      return this.lazyLoading.refreshItemChildren(itemId);
    },
  };

  public getActions(): TreeRootActions {
    return this.actions;
  }
}
