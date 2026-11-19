'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { TreeItemId } from '../store/types';
import { useTreeRootContext } from '../root/TreeRootContext';
import { TreeItemContext } from '../item/TreeItemContext';
import { useTreeItem } from '../utils/useTreeItem';
import type { TreeItemBaseState } from '../utils/useTreeItem';
import { itemMapping } from '../utils/stateAttributesMapping';
import { TreeCheckboxItemContext } from './TreeCheckboxItemContext';
import * as DataAttributes from './TreeCheckboxItemDataAttributes';

const CHECKED_HOOK = { [DataAttributes.checked]: '' };
const UNCHECKED_HOOK = { [DataAttributes.unchecked]: '' };

const checkedMapping: StateAttributesMapping<TreeCheckboxItemState> = {
  ...(itemMapping as StateAttributesMapping<TreeCheckboxItemState>),
  checked(value) {
    return value ? CHECKED_HOOK : UNCHECKED_HOOK;
  },
};

// An indeterminate item is neither checked nor unchecked.
const indeterminateMapping: StateAttributesMapping<TreeCheckboxItemState> = {
  ...(itemMapping as StateAttributesMapping<TreeCheckboxItemState>),
  checked: () => null,
};

/**
 * A tree item with a checkbox. Pressing it toggles whether it's selected, and keeps the
 * rest of the selection. It exposes its state with `aria-checked`, which is `mixed` while
 * only some of its descendants are selected.
 * Use it in place of `<Tree.Item>`.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeCheckboxItem = fastComponentRef(function TreeCheckboxItem(
  componentProps: TreeCheckboxItem.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, style, itemId, ...elementProps } = componentProps;

  const store = useTreeRootContext();
  const sharedItemResponse = useTreeItem({ store, itemId });
  const { selectionSupported } = sharedItemResponse;
  const status = store.useState('checkboxSelectionStatus', itemId);

  useIsoLayoutEffect(() => store.interaction.registerCheckboxItem(itemId), [store, itemId]);

  const indeterminate = status === 'indeterminate';
  const checked = status === 'checked';
  const state: TreeCheckboxItem.State = { ...sharedItemResponse.state, checked, indeterminate };

  const checkboxState = React.useMemo(
    () => ({ checked, indeterminate, disabled: !selectionSupported || state.disabled }),
    [checked, indeterminate, selectionSupported, state.disabled],
  );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, sharedItemResponse.ref],
    props: [
      store.interaction.itemEventHandlers,
      sharedItemResponse.props,
      // A checkbox item exposes its checkbox state rather than `aria-selected`, including a
      // parent whose descendants are only partly selected. A parent whose descendants are all
      // selected shows as checked with `checkboxSelectionPropagation.parents`, before it's
      // selected itself.
      selectionSupported
        ? { 'aria-checked': indeterminate ? ('mixed' as const) : checked }
        : undefined,
      elementProps,
    ],
    stateAttributesMapping: indeterminate ? indeterminateMapping : checkedMapping,
  });

  return (
    <TreeItemContext.Provider value={itemId}>
      <TreeCheckboxItemContext.Provider value={checkboxState}>
        {element}
      </TreeCheckboxItemContext.Provider>
    </TreeItemContext.Provider>
  );
});

export interface TreeCheckboxItemState extends TreeItemBaseState {
  /**
   * Whether the item is selected.
   */
  checked: boolean;
  /**
   * Whether the item is not selected but some of its selectable descendants are.
   */
  indeterminate: boolean;
}

export interface TreeCheckboxItemProps extends BaseUIComponentProps<'div', TreeCheckboxItemState> {
  /**
   * The id of the item.
   */
  itemId: TreeItemId;
}

export namespace TreeCheckboxItem {
  export type State = TreeCheckboxItemState;
  export type Props = TreeCheckboxItemProps;
}
