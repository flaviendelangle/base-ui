'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../internals/types';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useTreeCheckboxItemContext } from '../checkbox-item/TreeCheckboxItemContext';
import * as DataAttributes from './TreeCheckboxItemIndicatorDataAttributes';

const CHECKED_HOOK = { [DataAttributes.checked]: '' };
const UNCHECKED_HOOK = { [DataAttributes.unchecked]: '' };

const checkedMapping: StateAttributesMapping<TreeCheckboxItemIndicatorState> = {
  ...transitionStatusMapping,
  checked(value) {
    return value ? CHECKED_HOOK : UNCHECKED_HOOK;
  },
};

// An indeterminate item is neither checked nor unchecked.
const indeterminateMapping: StateAttributesMapping<TreeCheckboxItemIndicatorState> = {
  ...transitionStatusMapping,
  checked: () => null,
};

const Inner = React.memo(
  React.forwardRef(
    (
      componentProps: TreeCheckboxItemIndicator.Props & { visible: boolean },
      forwardedRef: React.ForwardedRef<HTMLSpanElement>,
    ) => {
      const { render, className, style, keepMounted, visible, ...elementProps } = componentProps;
      const checkboxState = useTreeCheckboxItemContext();

      const indicatorRef = React.useRef<HTMLSpanElement | null>(null);
      const { transitionStatus, setMounted } = useTransitionStatus(visible);

      const state: TreeCheckboxItemIndicatorState = { ...checkboxState, transitionStatus };

      const element = useRenderElement('span', componentProps, {
        ref: [forwardedRef, indicatorRef],
        state,
        props: [{ 'aria-hidden': true }, elementProps],
        stateAttributesMapping: checkboxState.indeterminate ? indeterminateMapping : checkedMapping,
      });

      useOpenChangeComplete({
        open: visible,
        ref: indicatorRef,
        onComplete() {
          if (!visible) {
            setMounted(false);
          }
        },
      });

      return element;
    },
  ),
);

/**
 * Indicates whether the checkbox item is selected, or indeterminate.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeCheckboxItemIndicator = React.forwardRef(function TreeCheckboxItemIndicator(
  componentProps: TreeCheckboxItemIndicator.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const keepMounted = componentProps.keepMounted ?? false;
  const { checked, indeterminate } = useTreeCheckboxItemContext();
  const visible = checked || indeterminate;

  if (!keepMounted && !visible) {
    return null;
  }

  return <Inner {...componentProps} ref={forwardedRef} visible={visible} />;
});

export interface TreeCheckboxItemIndicatorState {
  /**
   * Whether the item is selected.
   */
  checked: boolean;
  /**
   * Whether the item is not selected but some of its selectable descendants are.
   */
  indeterminate: boolean;
  /**
   * Whether the item is disabled or cannot be selected.
   */
  disabled: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TreeCheckboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  TreeCheckboxItemIndicatorState
> {
  children?: React.ReactNode;
  /**
   * Whether to keep the element in the DOM when the item is not selected or indeterminate.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TreeCheckboxItemIndicator {
  export type State = TreeCheckboxItemIndicatorState;
  export type Props = TreeCheckboxItemIndicatorProps;
}
