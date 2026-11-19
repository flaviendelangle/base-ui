'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useTreeGridFilterPart } from '../filter-provider/TreeGridFilterContext';

/**
 * A button that clears the input text.
 * Requires the tree to be wrapped in `TreeGrid.FilterProvider`.
 * Renders a `<button>` element when the input has text.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridClear = React.forwardRef(function TreeGridClear(
  componentProps: TreeGridClear.Props,
  forwardedRef: React.ForwardedRef<HTMLButtonElement>,
) {
  const {
    render,
    className,
    style,
    disabled: disabledProp = false,
    nativeButton = true,
    ...elementProps
  } = componentProps;

  const { store, filtering, value, onValueChange } = useTreeGridFilterPart('Clear');
  const treeDisabled = useStore(store, (state) => state.disabled);
  const disabled = treeDisabled || disabledProp;

  const { buttonRef, getButtonProps } = useButton({ disabled, native: nativeButton });

  const state: TreeGridClear.State = { disabled };

  return useRenderElement('button', componentProps, {
    enabled: value !== '',
    state,
    ref: [forwardedRef, buttonRef],
    props: [
      {
        'aria-label': 'Clear filter',
        // Escape and the input's own editing clear the query from the
        // keyboard, so the button stays out of the tab order. It stays exposed
        // to assistive technology for touch screen reader and voice control
        // users, who have no Escape key.
        tabIndex: -1,
        onMouseDown(event: React.MouseEvent) {
          // Keep focus in the input.
          event.preventDefault();
        },
        onClick(event: React.MouseEvent) {
          onValueChange('', createChangeEventDetails(REASONS.clearPress, event.nativeEvent));
          filtering.focusInput();
        },
      },
      elementProps,
      getButtonProps,
    ],
  });
});

export interface TreeGridClearState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface TreeGridClearProps
  extends NativeButtonProps, BaseUIComponentProps<'button', TreeGridClearState> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace TreeGridClear {
  export type State = TreeGridClearState;
  export type Props = TreeGridClearProps;
}
