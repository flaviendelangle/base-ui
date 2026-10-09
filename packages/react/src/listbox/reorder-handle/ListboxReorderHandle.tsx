'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import { useListboxSortablePart } from '../sorting/ListboxSortingContext';

/**
 * Limits pointer reordering to this handle. Render inside a reorderable item.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxReorderHandle = React.forwardRef(function ListboxReorderHandle(
  props: ListboxReorderHandle.Props,
  ref: React.ForwardedRef<HTMLSpanElement>,
) {
  useListboxSortablePart('ReorderHandle');
  return <Draggable.Handle {...props} ref={ref} />;
});
export interface ListboxReorderHandleProps extends Draggable.Handle.Props {}
export namespace ListboxReorderHandle {
  export type Props = ListboxReorderHandleProps;
  export type State = Draggable.Handle.State;
}
