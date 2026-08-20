'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A visual drag affordance within a listbox item.
 * Renders a `<div>` element.
 *
 * Pointer dragging remains available from the whole item. Keyboard users start
 * dragging the focused item with Alt+Enter.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxItemDragHandle = React.forwardRef(function ListboxItemDragHandle(
  componentProps: ListboxItemDragHandle.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, style, ...elementProps } = componentProps;

  return useRenderElement('div', componentProps, {
    ref: forwardedRef,
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
