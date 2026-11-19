'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TreeGridItemId } from '../store/types';

import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { TreeGridItemContext } from './TreeGridItemContext';
import { useTreeGridItem } from '../utils/useTreeGridItem';
import type { TreeGridItemBaseState } from '../utils/useTreeGridItem';
import { itemMapping } from '../utils/stateAttributesMapping';

/**
 * An individual item in a hierarchical collection. Clicking it selects it and deselects other items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItem = fastComponentRef(function TreeGridItem(
  componentProps: TreeGridItem.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, style, itemId, ...elementProps } = componentProps;

  const store = useTreeGridRootContext();
  const sharedItemResponse = useTreeGridItem({ store, itemId });
  const { selected, selectionSupported } = sharedItemResponse;

  const state: TreeGridItem.State = { ...sharedItemResponse.state, selected };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, sharedItemResponse.ref],
    props: [
      store.interaction.itemEventHandlers,
      sharedItemResponse.props,
      // Per WAI-ARIA, when selection is supported, all focusable rows must have
      // aria-selected set to true or false — a disabled row included, and a
      // *selected* disabled row above all. Only a row that cannot be selected at all
      // (`isItemSelectionDisabled`) omits it.
      selectionSupported ? { 'aria-selected': selected } : undefined,
      elementProps,
    ],
    stateAttributesMapping: itemMapping,
  });

  return <TreeGridItemContext.Provider value={itemId}>{element}</TreeGridItemContext.Provider>;
});

export interface TreeGridItemState extends TreeGridItemBaseState {
  /**
   * Whether the item is currently selected.
   */
  selected: boolean;
}

export interface TreeGridItemProps extends BaseUIComponentProps<'div', TreeGridItemState> {
  /**
   * The id of the item.
   */
  itemId: TreeGridItemId;
}

export namespace TreeGridItem {
  export type State = TreeGridItemState;
  export type Props = TreeGridItemProps;
}
