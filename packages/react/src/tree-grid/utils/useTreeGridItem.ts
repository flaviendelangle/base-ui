'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { fastObjectShallowCompare } from '@base-ui/utils/fastObjectShallowCompare';
import { activeElement, contains } from '@base-ui/utils/shadowDom';
import { ownerDocument } from '@base-ui/utils/owner';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { warn } from '@base-ui/utils/warn';
import type { TreeGridItemId, TreeGridState } from '../store/types';

import type { TreeGridStore } from '../store/TreeGridStore';
import { selectors } from '../store/selectors';
import { getItemIdKey } from './itemIdKey';
import * as TreeGridItemCssVars from '../item/TreeGridItemCssVars';

/**
 * State and DOM registration for TreeGridItem.
 *
 * Handles:
 * - Subscribing to shared store selectors.
 * - Computing shared element props (role, aria-expanded, tabIndex, etc.).
 */
export function useTreeGridItem(parameters: UseTreeGridItemParameters): UseTreeGridItemReturnValue {
  const { store, itemId } = parameters;
  // Keep one snapshot per row instead of nesting memoized selectors. Store
  // notifications still check the values, but unchanged rows retain their snapshot.
  const selectItemState = React.useMemo(() => {
    const readState = (state: TreeGridState) => ({
      expanded: selectors.isItemExpanded(state, itemId),
      expandable: selectors.isItemExpandable(state, itemId),
      focused: selectors.isItemFocused(state, itemId),
      disabled: selectors.isItemDisabled(state, itemId),
      isDefaultFocusable: selectors.isItemDefaultFocusable(state, itemId),
      siblingsCount: selectors.itemSiblingsCount(state, itemId),
      posInSet: selectors.itemPositionInSet(state, itemId),
      level: selectors.itemLevel(state, itemId),
      ariaLabel: selectors.itemLabel(state, itemId),
      filterMatch: store.filtering?.isItemMatch(state, itemId) ?? false,
      selected: selectors.isItemSelected(state, itemId),
      selectionSupported: selectors.isItemSelectionSupported(state, itemId),
      current: state.activeLinkCounts[getItemIdKey(itemId)] !== undefined,
    });
    let previousState: TreeGridState | undefined;
    let previous: ReturnType<typeof readState> | undefined;
    return (state: TreeGridState) => {
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
    ariaLabel,
    filterMatch,
    selected,
    selectionSupported,
    current,
  } = useStore(store, selectItemState);
  const [element, setElement] = React.useState<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    if (element == null) {
      return undefined;
    }
    return store.items.registerItemDOMElement(itemId, element);
  }, [store, itemId, element]);

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
      if (element?.querySelector('[role="gridcell"]') === null) {
        warn(
          'A <TreeGrid.Item> renders no cell.',
          'Each row of the treegrid needs one for assistive technology to read its content.',
          'Render the content of the item inside <TreeGrid.ItemContent>.',
        );
      }
    }, [element]);
  }

  // Restore focus when the focused row remounts. The virtualizer recycling an
  // off-screen row, and a `TreeGrid.GroupTransition` re-parenting a row on
  // expand/collapse, both recreate its DOM node without a blur that clears
  // `focusedItemId`, so this effect re-runs on remount and puts focus back.
  React.useEffect(() => {
    if (!element || !focused) {
      return;
    }
    // Focus already lives inside this row (the row or a nested control such as
    // the inline label editor); re-focusing the row would steal it.
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

  const state: TreeGridItemBaseState = {
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
    role: 'row',
    // A tree row otherwise derives its name from every descendant,
    // including control labels. Naming it from the item model keeps row
    // focus concise while each control retains its own accessible name.
    'aria-label': ariaLabel,
    'aria-expanded': expandable ? expanded : undefined,
    'aria-level': level,
    'aria-setsize': siblingsCount,
    'aria-posinset': posInSet,
    'aria-disabled': disabled || undefined,
    'aria-current': current ? 'page' : undefined,
    tabIndex: isDefaultFocusable ? 0 : -1,
    style: { [TreeGridItemCssVars.level]: level } as React.CSSProperties,
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
export interface TreeGridItemBaseState {
  /**
   * The id of the item.
   */
  itemId: TreeGridItemId;
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
   * Whether the item is highlighted: it has focus, or one of its controls does.
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

interface UseTreeGridItemParameters {
  store: TreeGridStore<any, any>;
  itemId: TreeGridItemId;
}

interface UseTreeGridItemReturnValue {
  ref: React.RefCallback<HTMLElement>;
  state: TreeGridItemBaseState;
  props: React.HTMLAttributes<HTMLElement>;
  selected: boolean;
  selectionSupported: boolean;
}
