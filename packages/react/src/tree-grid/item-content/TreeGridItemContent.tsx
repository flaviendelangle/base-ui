'use client';
import type * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useTreeGridItemContext } from '../item/TreeGridItemContext';

/**
 * Contains the interactive content of a tree item.
 * Renders a `<div>` element with `role="gridcell"`, named after its item.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItemContent = fastComponentRef(function TreeGridItemContent(
  componentProps: TreeGridItemContent.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, style, ...elementProps } = componentProps;

  const store = useTreeGridRootContext();
  const itemId = useTreeGridItemContext();
  // Otherwise the cell's name joins every label inside it, which screen readers read when
  // focus moves to one of its controls: "Select Documents Collapse Documents Documents".
  const label = store.useState('itemLabel', itemId);

  return useRenderElement('div', componentProps, {
    state: {},
    ref: forwardedRef,
    props: [{ role: 'gridcell', 'aria-label': label }, elementProps],
  });
});

export interface TreeGridItemContentState {}

export interface TreeGridItemContentProps extends BaseUIComponentProps<
  'div',
  TreeGridItemContentState
> {}

export namespace TreeGridItemContent {
  export type State = TreeGridItemContentState;
  export type Props = TreeGridItemContentProps;
}
