'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxReorderDragPayload } from '../reorder-provider/ListboxReorderProvider';
import { useListboxSortablePart } from '../sorting/ListboxSortingContext';

/**
 * Customizes or hides the pointer preview. Render inside a reorderable item.
 * Renders a `<div>` element, which is copied beside the dragged item while dragging.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxReorderPreview<Value = any>(props: ListboxReorderPreview.Props<Value>) {
  const { children, ...other } = props;
  useListboxSortablePart('ReorderPreview');
  return (
    <Draggable.Preview {...other}>
      {typeof children === 'function'
        ? ({ source, location }) => {
            const payload = source.payload as ListboxReorderDragPayload<Value>;
            return children({ itemIds: payload.itemIds, items: payload.items, source, location });
          }
        : children}
    </Draggable.Preview>
  );
}
export interface ListboxReorderPreviewProps<Value = any> extends Omit<
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
    | React.ReactNode
    | ((parameters: ListboxReorderPreviewRenderParameters<Value>) => React.ReactNode);
}

export interface ListboxReorderPreviewRenderParameters<Value = any> {
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
export namespace ListboxReorderPreview {
  export type Props<Value = any> = ListboxReorderPreviewProps<Value>;
  export type RenderParameters<Value = any> = ListboxReorderPreviewRenderParameters<Value>;
  export type State = Draggable.Preview.State;
}
