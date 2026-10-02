'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import { useListboxSortablePart } from '../sorting/ListboxSortingContext';

/** Limits pointer sorting to this handle. Render inside a sortable item. */
export const ListboxSortHandle = React.forwardRef(function ListboxSortHandle(
  props: ListboxSortHandle.Props,
  ref: React.ForwardedRef<HTMLSpanElement>,
) {
  useListboxSortablePart('SortHandle');
  return <Draggable.Handle {...props} ref={ref} />;
});
export interface ListboxSortHandleProps extends Draggable.Handle.Props {}
export namespace ListboxSortHandle {
  export type Props = ListboxSortHandleProps;
  export type State = Draggable.Handle.State;
}
