'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxSortingDragPayload } from '../sortable-provider/ListboxSortableProvider';

/** Customizes or hides the pointer preview. Render inside a sortable item. */
export function ListboxSortPreview<Value = any>(props: ListboxSortPreview.Props<Value>) {
  const { children, ...other } = props;
  return (
    <Draggable.Preview {...other}>
      {typeof children === 'function'
        ? ({ source }) => {
            const payload = source.payload as ListboxSortingDragPayload<Value>;
            return children({ itemIds: payload.itemIds, items: payload.items });
          }
        : children}
    </Draggable.Preview>
  );
}
export interface ListboxSortPreviewProps<Value = any> extends Omit<
  Draggable.Preview.Props,
  'children' | 'kind'
> {
  /** Preview content. A callback returning null hides the preview. */
  children?:
    | React.ReactNode
    | ((parameters: { itemIds: ListboxItemId[]; items: Value[] }) => React.ReactNode);
}
export namespace ListboxSortPreview {
  export type Props<Value = any> = ListboxSortPreviewProps<Value>;
  export type State = Draggable.Preview.State;
}
