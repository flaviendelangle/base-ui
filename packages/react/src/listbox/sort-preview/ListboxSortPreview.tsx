'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxSortingDragPayload } from '../sortable-provider/ListboxSortableProvider';
import { useListboxSortablePart } from '../sorting/ListboxSortingContext';

/**
 * Customizes or hides the pointer preview. Render inside a sortable item.
 * Renders a `<div>` element, which is copied beside the dragged item while dragging.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxSortPreview<Value = any>(props: ListboxSortPreview.Props<Value>) {
  const { children, ...other } = props;
  useListboxSortablePart('SortPreview');
  return (
    <Draggable.Preview {...other}>
      {typeof children === 'function'
        ? ({ source, location }) => {
            const payload = source.payload as ListboxSortingDragPayload<Value>;
            return children({ itemIds: payload.itemIds, items: payload.items, source, location });
          }
        : children}
    </Draggable.Preview>
  );
}
export interface ListboxSortPreviewProps<Value = any> extends Omit<
  Draggable.Preview.Props,
  'children' | 'kind'
> {
  /**
   * Whether to hide the preview. The drag continues while no preview is shown.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Preview content. A callback returning null hides the preview. It runs when the
   * drag starts, and again on each `Draggable.updatePreview()`.
   */
  children?:
    React.ReactNode | ((parameters: ListboxSortPreviewRenderParameters<Value>) => React.ReactNode);
}

export interface ListboxSortPreviewRenderParameters<Value = any> {
  /** The ids of the dragged items. */
  itemIds: ListboxItemId[];
  /** The dragged items. */
  items: Value[];
  /**
   * The drag source. To show drag state in the preview, store it with
   * `source.updateDragData()` and call `Draggable.updatePreview()` from a drag handler.
   */
  source: Draggable.Root.Record;
  /** The pointer position and drop targets when the preview renders. */
  location: Draggable.LocationHistory;
}
export namespace ListboxSortPreview {
  export type Props<Value = any> = ListboxSortPreviewProps<Value>;
  export type RenderParameters<Value = any> = ListboxSortPreviewRenderParameters<Value>;
  export type State = Draggable.Preview.State;
}
