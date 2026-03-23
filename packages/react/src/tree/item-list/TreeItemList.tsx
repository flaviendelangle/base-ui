'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { BaseUIComponentProps } from '../../utils/types';
import { useTreeRootContext } from '../root/TreeRootContext';
import { selectors } from '../store/selectors';
import { TreeItemModelProvider } from '../utils/TreeItemModelProvider';
import { TreeDefaultItemModel } from '../store/types';

/**
 * Renders tree items from a render function.
 * Doesn't render its own HTML element.
 * Place inside `Tree.Root` to render items alongside other children like `Tree.Empty`.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export function TreeItemList(componentProps: TreeItemList.Props) {
  const { children } = componentProps;
  const store = useTreeRootContext();

  const flatItemIds = useStore(store, selectors.flatList);

  return (
    <React.Fragment>
      {flatItemIds.map((itemId) => (
        <TreeItemModelProvider key={itemId} store={store} itemId={itemId}>
          {children}
        </TreeItemModelProvider>
      ))}
    </React.Fragment>
  );
}

export interface TreeItemListState {}

export interface TreeItemListProps<TItem = TreeDefaultItemModel> extends Omit<
  BaseUIComponentProps<'div', TreeItemListState>,
  'children'
> {
  /**
   * The render function for each tree item.
   */
  children: (item: TItem) => React.ReactNode;
}

export namespace TreeItemList {
  export type Props = TreeItemListProps;
  export type State = TreeItemListState;
}
