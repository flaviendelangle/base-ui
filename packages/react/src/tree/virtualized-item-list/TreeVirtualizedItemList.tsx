'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { LayoutList, useVirtualizer, type Virtualizer } from '@mui/x-virtualizer';
import type { BaseUIComponentProps } from '../../utils/types';
import { useTreeRootContext } from '../root/TreeRootContext';
import { selectors } from '../store/selectors';
import { TreeItemModelProvider } from '../utils/TreeItemModelProvider';
import { TreeDefaultItemModel } from '../store/types';

const VirtualizerContext = React.createContext<Virtualizer | null>(null);

const ListContent = React.memo(function ListContent() {
  const virtualizer = React.useContext(VirtualizerContext)!;
  const { getRows } = virtualizer.api.getters;

  const rows = getRows();

  return <React.Fragment>{rows}</React.Fragment>;
});

/**
 * Renders tree items in a virtualized scrolling container.
 * Only items visible in the viewport (plus an overscan buffer) are rendered.
 * Place inside `Tree.Root` to render items alongside other children like `Tree.Empty`.
 *
 * Requires `@mui/x-virtualizer` as a peer dependency.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export function TreeVirtualizedItemList(componentProps: TreeVirtualizedItemList.Props) {
  const { children, itemHeight, overscan } = componentProps;
  const store = useTreeRootContext();

  // Signal to the store that virtualization is enabled
  React.useEffect(() => {
    store.set('virtualized', true);
    return () => {
      store.set('virtualized', false);
    };
  }, [store]);

  const flatItemIds = useStore(store, selectors.flatList);

  const rows = React.useMemo(
    () => flatItemIds.map((itemId) => ({ id: itemId, model: EMPTY_OBJECT })),
    [flatItemIds],
  );

  const range = React.useMemo(
    () => ({ firstRowIndex: 0, lastRowIndex: rows.length }),
    [rows.length],
  );

  const refs = {
    container: React.useRef<HTMLDivElement>(null),
    scroller: React.useRef<HTMLDivElement>(null),
  };
  const layout = useRefWithInit(() => new LayoutList(refs)).current;

  const renderRow = React.useCallback(
    (params: { id: string }) => (
      <TreeItemModelProvider key={params.id} store={store} itemId={params.id}>
        {children}
      </TreeItemModelProvider>
    ),
    [store, children],
  );

  const virtualizer = useVirtualizer({
    layout,
    dimensions: {
      rowHeight: itemHeight,
    },
    virtualization: overscan != null ? { rowBufferPx: overscan } : {},
    rows,
    range,
    rowCount: rows.length,
    renderRow,
  });

  const containerProps = virtualizer.store.use(LayoutList.selectors.containerProps);
  const contentProps = virtualizer.store.use(LayoutList.selectors.contentProps);
  const positionerProps = virtualizer.store.use(LayoutList.selectors.positionerProps);

  // Scroll to the focused item when it changes (e.g. via keyboard navigation).
  // Uses store.observe instead of useStore to avoid re-rendering all virtualized rows.
  const scrollerRef = refs.scroller;
  React.useEffect(() => {
    return store.observe(selectors.focusedItemId, (nextFocusedId, prevFocusedId) => {
      if (nextFocusedId == null || nextFocusedId === prevFocusedId) {
        return;
      }

      const currentFlatList = selectors.flatList(store.state);
      const index = currentFlatList.indexOf(nextFocusedId);
      if (index === -1) {
        return;
      }

      const container = scrollerRef.current;
      if (container == null) {
        return;
      }

      const targetTop = index * itemHeight;
      const targetBottom = targetTop + itemHeight;
      const viewportTop = container.scrollTop;
      const viewportBottom = viewportTop + container.clientHeight;

      if (targetTop < viewportTop) {
        container.scrollTo({ top: targetTop });
      } else if (targetBottom > viewportBottom) {
        container.scrollTo({ top: targetBottom - container.clientHeight });
      }
    });
  }, [store, itemHeight, scrollerRef]);

  // Register virtualizer scroller for auto-scroll during drag
  React.useEffect(() => {
    if (!store.dragAndDrop || !scrollerRef.current) {
      return undefined;
    }
    return store.dragAndDrop.setupScroller(scrollerRef.current);
  }, [store, scrollerRef]);

  return (
    <VirtualizerContext.Provider value={virtualizer}>
      <div
        {...containerProps}
        role="presentation"
        style={{ ...containerProps.style, width: '100%', height: '100%' }}
      >
        <div {...contentProps} />
        <div {...positionerProps} />
        <ListContent />
      </div>
    </VirtualizerContext.Provider>
  );
}

export interface TreeVirtualizedItemListState {}

export interface TreeVirtualizedItemListProps<TItem = TreeDefaultItemModel> extends Omit<
  BaseUIComponentProps<'div', TreeVirtualizedItemListState>,
  'children'
> {
  /**
   * The render function for each tree item.
   */
  children: (item: TItem) => React.ReactNode;
  /**
   * The fixed height (in pixels) of each item row.
   * Required for virtualization calculations.
   */
  itemHeight: number;
  /**
   * The number of pixels to render above and below the visible area.
   * @default 50
   */
  overscan?: number | undefined;
}

export namespace TreeVirtualizedItemList {
  export type Props = TreeVirtualizedItemListProps;
  export type State = TreeVirtualizedItemListState;
}
