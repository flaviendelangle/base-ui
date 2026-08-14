'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useListboxDragProviderContext } from '../drag-provider/ListboxDragProviderContext';
import { useListboxItemContext } from '../item/ListboxItemContext';

/**
 * A drag handle within a listbox item for initiating drag-and-drop reordering.
 * Renders a `<div>` element.
 *
 * When placed inside a `Listbox.Item` within `Listbox.DragProvider`,
 * the drag operation will be restricted to start only from this handle
 * whenever the provider allows dragging for that item.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxItemDragHandle = React.forwardRef(function ListboxItemDragHandle(
  componentProps: ListboxItemDragHandle.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, style, ...elementProps } = componentProps;
  const { dragItemId } = useListboxItemContext();
  const dragContext = useListboxDragProviderContext(true);
  const cleanupRef = React.useRef<(() => void) | undefined>(undefined);
  const handleRef = React.useCallback(
    (element: HTMLElement | null) => {
      cleanupRef.current?.();
      cleanupRef.current =
        element && dragContext && dragItemId !== undefined
          ? dragContext.setupHandle(dragItemId, element)
          : undefined;
    },
    [dragContext, dragItemId],
  );

  return useRenderElement('div', componentProps, {
    ref: [forwardedRef, handleRef],
    props: [
      {
        'aria-hidden': true,
      },
      elementProps,
    ],
  });
});

export interface ListboxItemDragHandleState {}

export interface ListboxItemDragHandleProps extends BaseUIComponentProps<
  'div',
  ListboxItemDragHandleState
> {}

export namespace ListboxItemDragHandle {
  export type State = ListboxItemDragHandleState;
  export type Props = ListboxItemDragHandleProps;
}
