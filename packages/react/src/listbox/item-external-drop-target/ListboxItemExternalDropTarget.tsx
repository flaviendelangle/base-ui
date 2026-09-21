'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import { useListboxExternalDrop } from './useListboxExternalDrop';
import type {
  AcceptedDragPayload,
  AnyDragAccept,
  DragKind,
  DragSource,
  DragDropEventDetails,
} from '../../types/drag';
import {
  useListboxItemElement,
  renderListboxItem,
  type ListboxItemProps,
  type ListboxItemState,
} from '../item/ListboxItem';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxSortingDestination } from '../sorting/useListboxSorting';
import type { ListboxSortingDropPosition } from '../sortable-provider/ListboxSortableProvider';

/**
 * A complete listbox item that also accepts drags from outside this listbox.
 * Same-listbox drags remain owned by the sorting provider. Renders a `<div>` element.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxItemExternalDropTarget = React.forwardRef(
  function ListboxItemExternalDropTarget<
    TAccept extends AnyDragAccept = DragKind<unknown>,
    TItem = unknown,
  >(
    props: ListboxItemExternalDropTargetProps<TAccept, TItem>,
    ref: React.ForwardedRef<HTMLElement>,
  ) {
    const {
      accept,
      canDrop,
      getDropPosition,
      onDropPositionChange,
      onDrop,
      dropDisabled,
      ...itemProps
    } = props;
    const item = useListboxItemElement(itemProps, ref);
    const external = useListboxExternalDrop(item.store, item.dropItem, {
      accept,
      canDrop,
      getDropPosition,
      onDropPositionChange,
      onDrop,
      dropDisabled,
    });
    return renderListboxItem(item, {
      targetProps: external.targetProps,
      render: (element) => (
        <Draggable.Provider>
          <Draggable.Target
            {...external.targetProps}
            data-disabled={item.dropItem.disabled ? '' : undefined}
            render={element}
          />
        </Draggable.Provider>
      ),
    });
  },
) as <TAccept extends AnyDragAccept = DragKind<unknown>, TItem = unknown>(
  props: ListboxItemExternalDropTargetProps<TAccept, TItem> & React.RefAttributes<HTMLElement>,
) => React.JSX.Element;

export interface ListboxItemExternalDropTargetPositionContext<TPayload = unknown, TItem = unknown> {
  /** The incoming drag source. */
  source: DragSource<TPayload>;
  /** The item under the pointer. */
  item: TItem;
  itemId: ListboxItemId;
  itemMetadata: { index: number; groupId: string | null; disabled: boolean };
  /** Pointer coordinates normalized to the item's width and height. */
  point: { x: number; y: number };
}
export interface ListboxItemExternalDropTargetDropContext<
  TPayload = unknown,
  TItem = unknown,
> extends ListboxItemExternalDropTargetPositionContext<TPayload, TItem> {
  position: ListboxSortingDropPosition;
  /** Insertion index across the entire list, including groups. Not relative to the group. */
  destination: ListboxSortingDestination;
}
export interface ListboxItemExternalDropTargetOptions<
  TAccept extends AnyDragAccept = DragKind<unknown>,
  TItem = unknown,
> {
  /** One or more kinds of external drag sources accepted by this item. */
  accept: TAccept;
  /** Disables external drops without disabling selection or internal sorting. @default false */
  dropDisabled?: boolean | undefined;
  /** Validates the resolved destination. Returning false rejects the drop, including ancestor targets. */
  canDrop?:
    | ((
        context: ListboxItemExternalDropTargetDropContext<AcceptedDragPayload<TAccept>, TItem>,
      ) => boolean)
    | undefined;
  /** Overrides the default before/after placement. Returning null rejects the drop. */
  getDropPosition?:
    | ((
        context: ListboxItemExternalDropTargetPositionContext<AcceptedDragPayload<TAccept>, TItem>,
      ) => ListboxSortingDropPosition['placement'] | ListboxSortingDropPosition | null)
    | undefined;
  /** Called when external placement changes, including null when it clears. */
  onDropPositionChange?: ((position: ListboxSortingDropPosition | null) => void) | undefined;
  /** Handles an accepted external drop. Does not automatically insert or remove items. */
  onDrop?:
    | ((
        context: ListboxItemExternalDropTargetDropContext<AcceptedDragPayload<TAccept>, TItem>,
        eventDetails: DragDropEventDetails,
      ) => void)
    | undefined;
}
export interface ListboxItemExternalDropTargetProps<
  TAccept extends AnyDragAccept = DragKind<unknown>,
  TItem = unknown,
>
  extends
    Omit<ListboxItemProps, 'onDrop' | 'value'>,
    ListboxItemExternalDropTargetOptions<TAccept, TItem> {
  /** The unique value identifying this option. */
  value?: TItem | undefined;
}
export type ListboxItemExternalDropTargetState = ListboxItemState;

export namespace ListboxItemExternalDropTarget {
  export type Props<
    TAccept extends AnyDragAccept = DragKind<unknown>,
    TItem = unknown,
  > = ListboxItemExternalDropTargetProps<TAccept, TItem>;
  export type State = ListboxItemExternalDropTargetState;
  export type PositionContext<
    TPayload = unknown,
    TItem = unknown,
  > = ListboxItemExternalDropTargetPositionContext<TPayload, TItem>;
  export type DropContext<
    TPayload = unknown,
    TItem = unknown,
  > = ListboxItemExternalDropTargetDropContext<TPayload, TItem>;
  export type DropPosition = ListboxSortingDropPosition;
}
