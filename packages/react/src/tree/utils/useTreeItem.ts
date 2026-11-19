'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { fastObjectShallowCompare } from '@base-ui/utils/fastObjectShallowCompare';
import { activeElement, contains } from '@base-ui/utils/shadowDom';
import { ownerDocument } from '@base-ui/utils/owner';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import type { TreeItemId, TreeState } from '../store/types';

import type { TreeStore } from '../store/TreeStore';
import { selectors } from '../store/selectors';
import * as TreeItemCssVars from '../item/TreeItemCssVars';

/**
 * State and DOM registration for TreeItem.
 *
 * Handles:
 * - Subscribing to shared store selectors.
 * - Computing shared element props (role, aria-expanded, tabIndex, etc.).
 */
export function useTreeItem(parameters: UseTreeItemParameters): UseTreeItemReturnValue {
  const { store, itemId } = parameters;
  // Keep one snapshot per row instead of nesting memoized selectors. Store
  // notifications still check the values, but unchanged rows retain their snapshot.
  const selectItemState = React.useMemo(() => {
    const readState = (state: TreeState) => ({
      expanded: selectors.isItemExpanded(state, itemId),
      expandable: selectors.isItemExpandable(state, itemId),
      focused: selectors.isItemFocused(state, itemId),
      disabled: selectors.isItemDisabled(state, itemId),
      isDefaultFocusable: selectors.isItemDefaultFocusable(state, itemId),
      siblingsCount: selectors.itemSiblingsCount(state, itemId),
      posInSet: selectors.itemPositionInSet(state, itemId),
      level: selectors.itemLevel(state, itemId),
      filterMatch: store.filtering?.isItemMatch(state, itemId) ?? false,
      selected: selectors.isItemSelected(state, itemId),
      selectionSupported: selectors.isItemSelectionSupported(state, itemId),
    });
    let previousState: TreeState | undefined;
    let previous: ReturnType<typeof readState> | undefined;
    return (state: TreeState) => {
      if (state === previousState) {
        return previous!;
      }
      const next = readState(state);
      previousState = state;
      if (previous !== undefined && fastObjectShallowCompare(previous, next)) {
        return previous;
      }
      previous = next;
      return next;
    };
  }, [store, itemId]);
  const {
    expanded,
    expandable,
    focused,
    disabled,
    isDefaultFocusable,
    siblingsCount,
    posInSet,
    level,
    filterMatch,
    selected,
    selectionSupported,
  } = useStore(store, selectItemState);
  const [element, setElement] = React.useState<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    if (element == null) {
      return undefined;
    }
    return store.items.registerItemDOMElement(itemId, element);
  }, [store, itemId, element]);

  // Restore focus when the focused row remounts. The virtualizer recycling an
  // off-screen row, and a `Tree.GroupTransition` re-parenting a row on
  // expand/collapse, both recreate its DOM node without a blur that clears
  // `focusedItemId`, so this effect re-runs on remount and puts focus back.
  React.useEffect(() => {
    if (!element || !focused) {
      return;
    }
    // Focus already lives inside this item, such as in a popup opened from it;
    // re-focusing the item would steal it.
    if (contains(element, activeElement(ownerDocument(element)))) {
      return;
    }
    // Restore only when focus was dropped (body/null) or is elsewhere in the
    // tree; if the user moved focus out of the tree, leave it be.
    if (
      store.interaction.getFocusLocation(store.context.rootRef.current ?? element) !== 'outside'
    ) {
      // Suppress native focus scrolling so remounting a row doesn't scroll-jump;
      // the list's focus observer owns scroll-into-view.
      element.focus({ preventScroll: true });
    }
  }, [store, element, focused]);

  const state: TreeItemBaseState = {
    itemId,
    // The model keeps the expansion of an item that can't expand, for when it can again.
    expanded: expandable && expanded,
    expandable,
    collapsed: expandable && !expanded,
    highlighted: focused,
    disabled,
    level,
    filterMatch,
  };

  const props: React.HTMLAttributes<HTMLElement> = {
    role: 'treeitem',
    'aria-expanded': expandable ? expanded : undefined,
    'aria-level': level,
    'aria-setsize': siblingsCount,
    'aria-posinset': posInSet,
    'aria-disabled': disabled || undefined,
    tabIndex: isDefaultFocusable ? 0 : -1,
    style: { [TreeItemCssVars.level]: level } as React.CSSProperties,
  };

  return {
    ref: setElement,
    state,
    props,
    selected,
    selectionSupported,
  };
}

/**
 * Base state shared by all tree item components.
 */
export interface TreeItemBaseState {
  /**
   * The id of the item.
   */
  itemId: TreeItemId;
  /**
   * Whether the item is currently expanded.
   */
  expanded: boolean;
  /**
   * Whether the item can be expanded.
   */
  expandable: boolean;
  /**
   * Whether the item is expandable and currently collapsed.
   */
  collapsed: boolean;
  /**
   * Whether the item has focus.
   */
  highlighted: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The level of the item in the tree hierarchy (1-based, matches aria-level).
   */
  level: number;
  /**
   * Whether the item is an exact match for the active filter.
   */
  filterMatch: boolean;
}

interface UseTreeItemParameters {
  store: TreeStore<any, any>;
  itemId: TreeItemId;
}

interface UseTreeItemReturnValue {
  ref: React.RefCallback<HTMLElement>;
  state: TreeItemBaseState;
  props: React.HTMLAttributes<HTMLElement>;
  selected: boolean;
  selectionSupported: boolean;
}
