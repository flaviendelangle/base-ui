'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../utils/types';
import { useComponentRenderer } from '../../utils/useComponentRenderer';
import { useToastRootContext } from '../root/ToastRootContext';
import { mergeProps } from '../../merge-props';
import { useToastContext } from '../provider/ToastProviderContext';
import { useButton } from '../../use-button/useButton';

/**
 * Closes the toast when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
const ToastClose = React.forwardRef(function ToastClose(
  props: ToastClose.Props,
  forwardedRef: React.ForwardedRef<HTMLButtonElement>,
) {
  const { render, className, disabled, ...other } = props;

  const { close } = useToastContext();
  const { toast } = useToastRootContext();

  const { getButtonProps } = useButton({
    disabled,
    buttonRef: forwardedRef,
  });

  const state: ToastClose.State = React.useMemo(
    () => ({
      type: toast.type,
    }),
    [toast.type],
  );

  const { renderElement } = useComponentRenderer({
    render: render ?? 'button',
    ref: forwardedRef,
    className,
    state,
    extraProps: mergeProps<'button'>(
      {
        onClick() {
          close(toast.id);
        },
      },
      other,
      getButtonProps,
    ),
  });

  return renderElement();
});

namespace ToastClose {
  export interface State {
    /**
     * The type of the toast.
     */
    type: string | undefined;
  }

  export interface Props extends BaseUIComponentProps<'button', State> {}
}

export { ToastClose };
