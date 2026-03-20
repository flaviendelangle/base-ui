'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTreeRootContext } from '../root/TreeRootContext';
import { useTreeItemContext } from '../item/TreeItemContext';
import { TreeItemDragIndicatorDataAttributes } from './TreeItemDragIndicatorDataAttributes';

const DRAGGABLE_HOOK = { [TreeItemDragIndicatorDataAttributes.draggable]: '' };
const DRAGGING_HOOK = { [TreeItemDragIndicatorDataAttributes.dragging]: '' };

const stateAttributesMapping = {
  dragging(v: boolean) {
    return v ? DRAGGING_HOOK : null;
  },
} satisfies StateAttributesMapping<TreeItemDragIndicator.State>;

/**
 * A drag handle indicator for draggable tree items.
 * Only renders when drag-and-drop is enabled and the item is draggable.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemDragIndicator = fastComponentRef(function TreeItemDragIndicator(
  componentProps: TreeItemDragIndicator.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, ...elementProps } = componentProps;

  const store = useTreeRootContext();
  const itemId = useTreeItemContext();
  const dragAndDropEnabled = store.useState('isDragAndDropEnabled');
  const dragging = store.useState('isItemDragged', itemId);

  // Check if this specific item can be dragged
  const draggable = dragAndDropEnabled && (store.dragAndDrop?.canDragItem(itemId) ?? false);

  const state: TreeItemDragIndicator.State = {
    draggable,
    dragging,
  };

  return useRenderElement('span', componentProps, {
    state,
    ref: forwardedRef,
    props: [elementProps],
    stateAttributesMapping,
    enabled: draggable,
  });
});

export interface TreeItemDragIndicatorState {
  /**
   * Whether the item is draggable.
   */
  draggable: boolean;
  /**
   * Whether the item is currently being dragged.
   */
  dragging: boolean;
}

export interface TreeItemDragIndicatorProps
  extends BaseUIComponentProps<'span', TreeItemDragIndicatorState> {}

export namespace TreeItemDragIndicator {
  export type State = TreeItemDragIndicatorState;
  export type Props = TreeItemDragIndicatorProps;
}
