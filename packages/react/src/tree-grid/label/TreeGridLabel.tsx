'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { resolveRenderedId } from '../../internals/resolveRenderedId';
import { REASONS } from '../../internals/reasons';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { selectors } from '../store/selectors';

/**
 * An accessible label that is automatically associated with the tree.
 * Clicking it focuses the tree.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridLabel = React.forwardRef(function TreeGridLabel(
  componentProps: TreeGridLabel.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { render, className, style, id: idProp, ...elementProps } = componentProps;

  const store = useTreeGridRootContext();
  const id = useBaseUiId(idProp);
  // An empty id on the `render` element leaves the label without one to reference.
  store.useSyncedValueWithCleanup('labelId', resolveRenderedId(componentProps, id) || undefined);

  return useRenderElement('div', componentProps, {
    ref: forwardedRef,
    props: [
      {
        id,
        onClick(event: React.MouseEvent) {
          const tabbableItemId = selectors.tabbableItemId(store.state);
          if (tabbableItemId != null) {
            store.interaction.focusItem(tabbableItemId, REASONS.itemPress, event.nativeEvent);
          }
        },
        onPointerDown(event: React.PointerEvent) {
          // Keep focus where it is until the click moves it into the tree.
          event.preventDefault();
        },
      },
      elementProps,
    ],
  });
});

export interface TreeGridLabelState {}

export interface TreeGridLabelProps extends BaseUIComponentProps<'div', TreeGridLabel.State> {}

export namespace TreeGridLabel {
  export type State = TreeGridLabelState;
  export type Props = TreeGridLabelProps;
}
