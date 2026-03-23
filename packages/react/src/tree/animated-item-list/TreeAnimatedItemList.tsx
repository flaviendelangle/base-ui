'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { BaseUIComponentProps } from '../../utils/types';
import { useTreeRootContext } from '../root/TreeRootContext';
import { selectors } from '../store/selectors';
import { TreeGroupTransitionContext } from '../group-transition/TreeGroupTransitionContext';
import { TreeItemModelProvider } from '../utils/TreeItemModelProvider';
import type { CollectionItemId } from '../../types/collection';
import type { FlatListEntry } from '../store/types';

/**
 * Renders tree items with animated expand/collapse transitions.
 * Doesn't render its own HTML element.
 * Place inside `Tree.Root` instead of using a direct render function
 * to opt into group transition animations.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export function TreeAnimatedItemList(componentProps: TreeAnimatedItemList.Props) {
  const { children } = componentProps;
  const store = useTreeRootContext();

  // Signal to the store that animation is enabled
  React.useEffect(() => {
    store.set('enableGroupTransition', true);
    return () => {
      store.set('enableGroupTransition', false);
    };
  }, [store]);

  const flatListEntries = useStore(store, selectors.flatListWithGroupTransitions);

  // Fast path: no animations — flatListEntries is a plain CollectionItemId[]
  const isPlainList =
    flatListEntries.length === 0 ||
    typeof flatListEntries[0] === 'string' ||
    typeof flatListEntries[0] === 'number';

  // Build a map of parentId -> group-transition entry for quick lookup (only when animating)
  const groupTransitions = React.useMemo(() => {
    if (isPlainList) {
      return null;
    }
    const map = new Map<
      CollectionItemId,
      { childIds: CollectionItemId[]; animation: 'expanding' | 'collapsing' }
    >();
    for (const entry of flatListEntries as FlatListEntry[]) {
      if (entry.type === 'group-transition') {
        map.set(entry.parentId, { childIds: entry.childIds, animation: entry.animation });
      }
    }
    return map;
  }, [flatListEntries, isPlainList]);

  if (isPlainList) {
    // No animations: render items directly without wrapping overhead
    return (
      <React.Fragment>
        {(flatListEntries as CollectionItemId[]).map((itemId) => (
          <TreeGroupTransitionContext.Provider key={itemId} value={null}>
            <TreeItemModelProvider store={store} itemId={itemId}>
              {children}
            </TreeItemModelProvider>
          </TreeGroupTransitionContext.Provider>
        ))}
      </React.Fragment>
    );
  }

  // Animation path: process FlatListEntry[] with group transitions
  const entries = flatListEntries as FlatListEntry[];
  return (
    <React.Fragment>
      {entries
        .filter((entry) => entry.type === 'item')
        .map((entry) => {
          if (entry.type !== 'item') {
            return null;
          }

          const groupEntry = groupTransitions!.get(entry.itemId);

          let animatedChildren: React.ReactNode = null;
          let contextValue: React.ContextType<typeof TreeGroupTransitionContext> = null;

          if (groupEntry) {
            animatedChildren = groupEntry.childIds.map((childId) => (
              <TreeItemModelProvider key={childId} store={store} itemId={childId}>
                {children}
              </TreeItemModelProvider>
            ));
            contextValue = { parentId: entry.itemId, animation: groupEntry.animation };
          }

          return (
            <TreeGroupTransitionContext.Provider key={entry.itemId} value={contextValue}>
              <TreeItemModelProvider
                store={store}
                itemId={entry.itemId}
                animatedChildren={animatedChildren}
              >
                {children}
              </TreeItemModelProvider>
            </TreeGroupTransitionContext.Provider>
          );
        })}
    </React.Fragment>
  );
}

export interface TreeAnimatedItemListState {}

export interface TreeAnimatedItemListProps extends Omit<
  BaseUIComponentProps<'div', TreeAnimatedItemListState>,
  'children'
> {
  /**
   * The render function for each tree item.
   * Called with the item model and any animated children for expand/collapse transitions.
   *
   * @param item - The tree item model.
   * @param animatedChildren - Pre-rendered child items currently animating (expanding/collapsing).
   *   `null` when no animation is in progress for this item's children.
   *   Pass as children of `Tree.GroupTransition` to enable animated transitions.
   */
  children: (item: any, animatedChildren: React.ReactNode) => React.ReactNode;
}

export namespace TreeAnimatedItemList {
  export type Props = TreeAnimatedItemListProps;
  export type State = TreeAnimatedItemListState;
}
