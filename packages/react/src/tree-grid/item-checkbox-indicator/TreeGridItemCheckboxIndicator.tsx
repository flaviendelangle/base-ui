'use client';
import * as React from 'react';
import { Checkbox } from '../../checkbox';
import type { CheckboxIndicatorState } from '../../checkbox';
import type { BaseUIComponentProps } from '../../internals/types';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import type { TreeGridItemCheckboxState } from '../item-checkbox/TreeGridItemCheckbox';
import { mapStateProps } from '../utils/mapStateProps';

function toItemCheckboxIndicatorState(
  state: CheckboxIndicatorState,
): TreeGridItemCheckboxIndicatorState {
  return {
    checked: state.checked,
    indeterminate: state.indeterminate,
    disabled: state.disabled,
    transitionStatus: state.transitionStatus,
  };
}

/**
 * Renders when the tree item checkbox is checked or mixed.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItemCheckboxIndicator = React.forwardRef(
  function TreeGridItemCheckboxIndicator(
    componentProps: TreeGridItemCheckboxIndicator.Props,
    forwardedRef: React.ForwardedRef<HTMLSpanElement>,
  ) {
    const { className, style, render, ...otherProps } = componentProps;
    return (
      <Checkbox.Indicator
        {...otherProps}
        {...mapStateProps({ className, style, render }, toItemCheckboxIndicatorState)}
        ref={forwardedRef}
      />
    );
  },
);

export interface TreeGridItemCheckboxIndicatorState extends TreeGridItemCheckboxState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TreeGridItemCheckboxIndicatorProps extends BaseUIComponentProps<
  'span',
  TreeGridItemCheckboxIndicatorState
> {
  /**
   * Whether to keep the element in the DOM when the checkbox is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TreeGridItemCheckboxIndicator {
  export type State = TreeGridItemCheckboxIndicatorState;
  export type Props = TreeGridItemCheckboxIndicatorProps;
}
