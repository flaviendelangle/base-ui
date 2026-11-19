'use client';
import type * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useTreeGridItemContext } from '../item/TreeGridItemContext';
import { expansionMapping } from '../utils/stateAttributesMapping';

/**
 * A visual indicator for expandable tree items.
 * Renders a `<span>` element when the item can be expanded.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItemGroupIndicator = fastComponentRef(function TreeGridItemGroupIndicator(
  componentProps: TreeGridItemGroupIndicator.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, style, ...elementProps } = componentProps;

  const store = useTreeGridRootContext();
  const itemId = useTreeGridItemContext();
  const expanded = store.useState('isItemExpanded', itemId);
  const expandable = store.useState('isItemExpandable', itemId);

  const state: TreeGridItemGroupIndicator.State = { expanded };

  return useRenderElement('span', componentProps, {
    state,
    ref: forwardedRef,
    props: [{ 'aria-hidden': true }, elementProps],
    stateAttributesMapping: expansionMapping,
    enabled: expandable,
  });
});

export interface TreeGridItemGroupIndicatorState {
  /**
   * Whether the item is currently expanded.
   */
  expanded: boolean;
}

export interface TreeGridItemGroupIndicatorProps extends BaseUIComponentProps<
  'span',
  TreeGridItemGroupIndicatorState
> {}

export namespace TreeGridItemGroupIndicator {
  export type State = TreeGridItemGroupIndicatorState;
  export type Props = TreeGridItemGroupIndicatorProps;
}
