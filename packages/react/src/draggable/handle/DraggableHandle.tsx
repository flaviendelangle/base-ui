'use client';
import { warn } from '@base-ui/utils/warn';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import * as React from 'react';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useDraggableRootContext } from '../root/DraggableRootContext';

/**
 * Restricts the drag pickup to this element, leaving the rest of the source
 * interactive. Omit it to make the whole source draggable.
 * Renders a `<button>` element.
 *
 * Provide an accessible name when the handle is a button without visible text.
 *
 * Documentation: [Base UI Draggable](https://base-ui.com/react/utils/draggable)
 */
export const DraggableHandle = React.forwardRef(function DraggableHandle(
  componentProps: DraggableHandle.Props,
  forwardedRef: React.ForwardedRef<HTMLButtonElement>,
) {
  const {
    className,
    render,
    style,
    nativeButton = true,
    // Stripped rather than forwarded: the type rejects it, but a JavaScript
    // consumer can still pass it, and letting it reach the DOM natively disables
    // the button while the root stays draggable.
    disabled: disabledProp,
    ...elementProps
  } = componentProps;

  const { setHandleElement, disabled } = useDraggableRootContext();

  if (process.env.NODE_ENV !== 'production') {
    if (disabledProp !== undefined) {
      warn(
        'Base UI: `disabled` was passed to Draggable.Handle, which has no disabled state of its own. ' +
          'The engine reads `disabled` from Draggable.Root, so the handle would look disabled while the root stayed draggable. ' +
          'Set `disabled` on Draggable.Root instead.',
      );
    }
  }

  // A disabled root refuses the pickup at the engine level; the handle follows
  // so it isn't left as a focusable button that does nothing.
  const { getButtonProps, buttonRef } = useButton({ disabled, native: nativeButton });

  const state: DraggableHandle.State = { disabled };

  // Identifies this handle to the root across attach and detach. Created once,
  // so the ref callback keeps a stable identity too.
  const handleRef = useRefWithInit(() => {
    const token = {};
    return (node: HTMLElement | null) => setHandleElement(node, token);
  }).current;

  return useRenderElement('button', componentProps, {
    state,
    props: [elementProps, getButtonProps],
    ref: [forwardedRef, buttonRef, handleRef],
  });
});

export interface DraggableHandleState {
  /**
   * Whether the draggable is disabled.
   */
  disabled: boolean;
}

export interface DraggableHandleProps
  extends
    Omit<BaseUIComponentProps<'button', DraggableHandleState>, 'disabled'>,
    Omit<NativeButtonProps, 'disabled'> {
  /**
   * A handle has no `disabled` of its own: the engine reads `disabled` from
   * `Draggable.Root`, so setting it here would natively disable the button while
   * leaving the root draggable, with no `data-disabled` and the wrong
   * button props. Disable the root instead, and the handle follows.
   *
   * Typed `never` so passing it is a compile error rather than a silent no-op.
   */
  disabled?: never | undefined;
}

export namespace DraggableHandle {
  export type State = DraggableHandleState;
  export type Props = DraggableHandleProps;
}
