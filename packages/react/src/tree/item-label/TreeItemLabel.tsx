'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTreeRootContext } from '../root/TreeRootContext';
import { useTreeItemContext } from '../item/TreeItemContext';
import { TreeItemLabelDataAttributes } from './TreeItemLabelDataAttributes';

const EDITABLE_HOOK = { [TreeItemLabelDataAttributes.editable]: '' };

const stateAttributesMapping: StateAttributesMapping<TreeItemLabel.State> = {
  editable: (v) => (v ? EDITABLE_HOOK : null),
};

/**
 * Displays the label of a tree item.
 * Hides automatically when the item is being edited inline.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemLabel = fastComponentRef(function TreeItemLabel(
  componentProps: TreeItemLabel.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, children, ...elementProps } = componentProps;

  const store = useTreeRootContext();
  const itemId = useTreeItemContext();
  const label = store.useState('itemLabel', itemId);
  const isEditing = store.useState('isItemEditing', itemId);
  const editable = store.useState('isItemEditable', itemId);

  const state: TreeItemLabel.State = {
    editable,
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: forwardedRef,
    props: [
      {
        children: children ?? label,
        onDoubleClick: editable
          ? (event: React.MouseEvent) => {
              event.stopPropagation();
              store.editing.startEditing(itemId);
            }
          : undefined,
      },
      elementProps,
    ],
    stateAttributesMapping,
    enabled: !isEditing,
  });

  return element;
});

export interface TreeItemLabelState {
  /**
   * Whether the item can be edited inline.
   */
  editable: boolean;
}

export interface TreeItemLabelProps extends BaseUIComponentProps<'span', TreeItemLabelState> {}

export namespace TreeItemLabel {
  export type State = TreeItemLabelState;
  export type Props = TreeItemLabelProps;
}
