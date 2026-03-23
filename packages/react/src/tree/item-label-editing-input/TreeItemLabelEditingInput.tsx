'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTreeItemLabelEditingContext } from '../item-label-editing/TreeItemLabelEditingContext';

/**
 * A pre-wired input for inline label editing.
 * Handles Enter (save), Escape (cancel), blur (save), and auto-focus with text selection.
 * Must be placed within `Tree.ItemLabelEditing`.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemLabelEditingInput = fastComponentRef(function TreeItemLabelEditingInput(
  componentProps: TreeItemLabelEditingInput.Props,
  forwardedRef: React.ForwardedRef<HTMLInputElement>,
) {
  const { className, render, ...elementProps } = componentProps;

  const { save, cancel, label } = useTreeItemLabelEditingContext();

  const element = useRenderElement('input', componentProps, {
    state: {},
    ref: forwardedRef,
    props: [
      {
        defaultValue: label,
        autoFocus: true,
        type: 'text',
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') {
            save(event.currentTarget.value);
          } else if (event.key === 'Escape') {
            cancel();
          }
        },
        onBlur: (event: React.FocusEvent<HTMLInputElement>) => {
          save(event.currentTarget.value);
        },
        onFocus: (event: React.FocusEvent<HTMLInputElement>) => {
          event.currentTarget.select();
        },
      },
      elementProps,
    ],
  });

  return element;
});

export interface TreeItemLabelEditingInputState {}

export interface TreeItemLabelEditingInputProps extends BaseUIComponentProps<
  'input',
  TreeItemLabelEditingInputState
> {}

export namespace TreeItemLabelEditingInput {
  export type State = TreeItemLabelEditingInputState;
  export type Props = TreeItemLabelEditingInputProps;
}
