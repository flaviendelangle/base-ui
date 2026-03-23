'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTreeRootContext } from '../root/TreeRootContext';
import { useTreeItemContext } from '../item/TreeItemContext';
import {
  TreeItemLabelEditingContext,
  type TreeItemLabelEditingContextValue,
} from './TreeItemLabelEditingContext';
import { TreeItemLabelEditingDataAttributes } from './TreeItemLabelEditingDataAttributes';

const EDITING_HOOK = { [TreeItemLabelEditingDataAttributes.editing]: '' };

const stateAttributesMapping: StateAttributesMapping<TreeItemLabelEditing.State> = {
  editing: (v) => (v ? EDITING_HOOK : null),
};

/**
 * Wrapper for inline editing UI that renders only when the item is being edited.
 * Automatically stops keyboard and click event propagation to prevent
 * tree navigation from interfering with editing.
 *
 * Accepts either regular children or a render function `({ save, cancel, label })`.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemLabelEditing = fastComponentRef(function TreeItemLabelEditing(
  componentProps: TreeItemLabelEditing.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, children, ...elementProps } = componentProps;

  const store = useTreeRootContext();
  const itemId = useTreeItemContext();
  const isEditing = store.useState('isItemEditing', itemId);
  const label = store.useState('itemLabel', itemId);

  const save = React.useCallback(
    (newLabel: string) => {
      store.editing.saveEditing(itemId, newLabel);
    },
    [store, itemId],
  );

  const cancel = React.useCallback(() => {
    store.editing.cancelEditing();
  }, [store]);

  const editingContext = React.useMemo<TreeItemLabelEditingContextValue>(
    () => ({ save, cancel, label }),
    [save, cancel, label],
  );

  const resolvedChildren =
    typeof children === 'function' ? children({ save, cancel, label }) : children;

  const state: TreeItemLabelEditing.State = {
    editing: isEditing,
  };

  const element = useRenderElement('span', componentProps, {
    state,
    ref: forwardedRef,
    props: [
      {
        children: resolvedChildren,
        onKeyDown: (event: React.KeyboardEvent) => {
          event.stopPropagation();
        },
        onClick: (event: React.MouseEvent) => {
          event.stopPropagation();
        },
      },
      elementProps,
    ],
    stateAttributesMapping,
    enabled: isEditing,
  });

  return (
    <TreeItemLabelEditingContext.Provider value={editingContext}>
      {element}
    </TreeItemLabelEditingContext.Provider>
  );
});

export interface TreeItemLabelEditingState {
  /**
   * Whether the item is currently being edited.
   */
  editing: boolean;
}

export interface TreeItemLabelEditingRenderProps {
  save: (newLabel: string) => void;
  cancel: () => void;
  label: string;
}

export interface TreeItemLabelEditingProps extends Omit<
  BaseUIComponentProps<'span', TreeItemLabelEditingState>,
  'children'
> {
  children?: React.ReactNode | ((props: TreeItemLabelEditingRenderProps) => React.ReactNode);
}

export namespace TreeItemLabelEditing {
  export type State = TreeItemLabelEditingState;
  export type Props = TreeItemLabelEditingProps;
  export type RenderProps = TreeItemLabelEditingRenderProps;
}
