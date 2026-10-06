'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import { useListboxExternalDrop } from './useListboxExternalDrop';
import type { AcceptedDragPayload } from '../../utils/drag-and-drop/types';
import type { DraggableAccept, DraggableKind } from '../../draggable/DraggableProvider';
import type { DraggableRootRecord } from '../../draggable/root/DraggableRoot';
import type {
  DraggableTargetDropEventDetails,
  DraggableTargetLocalPoint,
} from '../../draggable/target/DraggableTarget';
import { useListboxItemElement, renderListboxItem } from '../item/ListboxItem';
import type { ListboxItemProps, ListboxItemState } from '../item/ListboxItem';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxSortingDestination } from '../sorting/useListboxSorting';
import type {
  ListboxSortingDropPosition,
  ListboxSortableProviderDropPositionChangeEventDetails,
} from '../sortable-provider/ListboxSortableProvider';

/**
 * A complete listbox item that also accepts drags from outside this listbox.
 * Same-listbox drags remain owned by the sorting provider.
 * External drops are pointer-only for now; keyboard support is a work in progress.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxItemExternalDropTarget = React.forwardRef(
  function ListboxItemExternalDropTarget<
    TAccept extends DraggableAccept<unknown> = DraggableKind<unknown>,
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
      onDraggableDrop,
      dropDisabled,
      ...itemProps
    } = props;
    const item = useListboxItemElement(itemProps, ref);
    const external = useListboxExternalDrop(item.store, item.dropItem, {
      accept,
      canDrop,
      getDropPosition,
      onDropPositionChange,
      onDraggableDrop,
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
) as <TAccept extends DraggableAccept<unknown> = DraggableKind<unknown>, TItem = unknown>(
  props: ListboxItemExternalDropTargetProps<TAccept, TItem> & React.RefAttributes<HTMLElement>,
) => React.JSX.Element;

export interface ListboxItemExternalDropTargetPositionContext<TPayload = unknown, TItem = unknown> {
  /** The incoming drag source. */
  source: DraggableRootRecord<TPayload>;
  /** The item under the pointer. */
  item: TItem;
  itemId: ListboxItemId;
  itemMetadata: { index: number; groupId: string | null };
  /** Returns where the pointer is within the item, as a fraction of its width and height. */
  getLocalPoint: () => DraggableTargetLocalPoint;
}
export interface ListboxItemExternalDropTargetDropContext<
  TPayload = unknown,
  TItem = unknown,
> extends ListboxItemExternalDropTargetPositionContext<TPayload, TItem> {
  /** Where the drop lands relative to the item under the pointer. */
  dropPosition: ListboxSortingDropPosition;
  /**
   * Where to insert the dropped content in the listbox: the index across the entire
   * list, including groups. Not relative to the group.
   */
  destination: ListboxSortingDestination;
}
/**
 * The event details passed to `onDraggableDrop`: the drop target's event details, along
 * with the accepted drop and its resolved destination.
 */
// An interface so the API reference prints its name instead of expanding it.
export interface ListboxItemExternalDropTargetDropEventDetails<TPayload = unknown, TItem = unknown>
  extends
    DraggableTargetDropEventDetails<TPayload>,
    ListboxItemExternalDropTargetDropContext<TPayload, TItem> {}
export type ListboxItemExternalDropTargetDropEventReason =
  ListboxItemExternalDropTargetDropEventDetails['reason'];
export interface ListboxItemExternalDropTargetOptions<
  TAccept extends DraggableAccept<unknown> = DraggableKind<unknown>,
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
  /**
   * Event handler called when the placement of an incoming drag changes.
   * Receives null when the placement clears.
   */
  onDropPositionChange?:
    | ((
        position: ListboxSortingDropPosition | null,
        eventDetails: ListboxSortableProviderDropPositionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an accepted external drag is dropped on the item.
   * Does not insert or remove items. `eventDetails.destination` is where to insert
   * the dropped content.
   */
  onDraggableDrop?:
    | ((
        eventDetails: ListboxItemExternalDropTargetDropEventDetails<
          AcceptedDragPayload<TAccept>,
          TItem
        >,
      ) => void)
    | undefined;
}
export interface ListboxItemExternalDropTargetProps<
  TAccept extends DraggableAccept<unknown> = DraggableKind<unknown>,
  TItem = unknown,
>
  extends Omit<ListboxItemProps, 'value'>, ListboxItemExternalDropTargetOptions<TAccept, TItem> {
  /** The unique value identifying this option. */
  value?: TItem | undefined;
}
export type ListboxItemExternalDropTargetState = ListboxItemState;

export namespace ListboxItemExternalDropTarget {
  export type Props<
    TAccept extends DraggableAccept<unknown> = DraggableKind<unknown>,
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
  export type DropEventDetails<
    TPayload = unknown,
    TItem = unknown,
  > = ListboxItemExternalDropTargetDropEventDetails<TPayload, TItem>;
  export type DropEventReason = ListboxItemExternalDropTargetDropEventReason;
  export type DropPosition = ListboxSortingDropPosition;
}
