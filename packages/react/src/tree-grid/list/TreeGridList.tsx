'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TreeGridItemId, FlatListEntry } from '../store/types';

import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { selectors } from '../store/selectors';
import { TreeGridGroupTransitionContext } from '../group-transition/TreeGridGroupTransitionContext';
import type { TreeGridGroupTransitionContextValue } from '../group-transition/TreeGridGroupTransitionContext';
import { TreeGridItemModelProvider } from '../utils/TreeGridItemModelProvider';
import { useTreeGridRootProps } from '../utils/useTreeGridRootProps';
import { useTreeGridListViewport } from './useTreeGridListViewport';
import { getItemIdKey } from '../utils/itemIdKey';

/**
 * Renders all tree items at once.
 * Renders a `<div>` element.
 *
 * Render a group transition after each item to animate expand/collapse transitions.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridList = React.forwardRef(function TreeGridList<TItem = any>(
  componentProps: TreeGridList.Props<TItem>,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { children, className, render, style, ...elementProps } = componentProps;
  const store = useTreeGridRootContext();
  const { rootProps, rootRef, state } = useTreeGridRootProps(componentProps);

  const flatListEntries = useStore(store, selectors.flatListWithGroupTransitions);

  const listRef = React.useRef<HTMLDivElement | null>(null);

  useTreeGridListViewport(listRef);

  // Every row gets the same provider, whether or not a group animates: the list
  // switches between both layouts whenever a group starts or stops animating,
  // and a different element type at each row's position would remount the
  // entire row subtree. The row's own ID tells a `TreeGrid.GroupTransition` which
  // row renders it.
  const renderRow = (
    itemId: TreeGridItemId,
    contextValue: TreeGridGroupTransitionContextValue = itemId,
  ) => (
    <TreeGridGroupTransitionContext.Provider key={getItemIdKey(itemId)} value={contextValue}>
      <TreeGridItemModelProvider store={store} itemId={itemId}>
        {children}
      </TreeGridItemModelProvider>
    </TreeGridGroupTransitionContext.Provider>
  );

  let renderChildren: React.ReactNode;
  if (isPlainList(flatListEntries)) {
    renderChildren = flatListEntries.map((itemId) => renderRow(itemId));
  } else {
    const groups = new Map<TreeGridItemId, Extract<FlatListEntry, { type: 'group-transition' }>>();
    for (const entry of flatListEntries) {
      if (entry.type === 'group-transition') {
        groups.set(entry.parentId, entry);
      }
    }
    renderChildren = flatListEntries.flatMap((entry) => {
      if (entry.type !== 'item') {
        return [];
      }
      const group = groups.get(entry.itemId);
      // Shadow the parent's context so that a `TreeGrid.GroupTransition` rendered by
      // an animating row does not consume the ancestor value and recursively
      // render the group again.
      return renderRow(
        entry.itemId,
        group
          ? {
              parentId: entry.itemId,
              animation: group.animation,
              children: group.childIds.map((childId) => renderRow(childId)),
            }
          : entry.itemId,
      );
    });
  }

  return useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, rootRef, listRef],
    props: [rootProps, { children: renderChildren }, elementProps],
  });
}) as <TItem = any>(
  props: TreeGridList.Props<TItem> & React.RefAttributes<HTMLDivElement>,
) => React.JSX.Element;

export interface TreeGridListState {
  /**
   * Whether the tree is disabled.
   */
  disabled: boolean;
  /**
   * Whether the tree has no visible rows, or no item matches the filter.
   */
  empty: boolean;
}

export interface TreeGridListProps<TItem = any> extends Omit<
  BaseUIComponentProps<'div', TreeGridListState>,
  'children'
> {
  /**
   * The render function for each tree item.
   * Pass the item type to `TreeGrid.List` to type the `item` parameter.
   */
  children: (item: TItem) => React.ReactNode;
}

export namespace TreeGridList {
  export type Props<TItem = any> = TreeGridListProps<TItem>;
  export type State = TreeGridListState;
}

function isPlainList(entries: (TreeGridItemId | FlatListEntry)[]): entries is TreeGridItemId[] {
  return entries.length === 0 || typeof entries[0] === 'string' || typeof entries[0] === 'number';
}
