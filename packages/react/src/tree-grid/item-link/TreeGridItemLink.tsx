'use client';
import type * as React from 'react';
import { EMPTY_OBJECT } from '@base-ui/utils/empty';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ACTION_CONTROL_KEYS, useTreeGridItemControl } from '../utils/useTreeGridItemControl';
import type { TreeGridItemControlKeys } from '../item-control/TreeGridItemControl';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useTreeGridItemContext } from '../item/TreeGridItemContext';

/**
 * A link inside a tree item that takes part in the item's keyboard navigation.
 * Renders an `<a>` element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItemLink = fastComponentRef(function TreeGridItemLink(
  componentProps: TreeGridItemLink.Props,
  forwardedRef: React.ForwardedRef<HTMLAnchorElement>,
) {
  const {
    className,
    controlKeys,
    render,
    style,
    tabIndex,
    active = false,
    ...elementProps
  } = componentProps;

  const store = useTreeGridRootContext();
  const itemId = useTreeGridItemContext();
  const disabled = store.useState('isItemDisabled', itemId);
  const control = useTreeGridItemControl({ controlKeys, defaultKeys: ACTION_CONTROL_KEYS });

  // The row takes focus instead of the link, so it reports the current page too.
  useIsoLayoutEffect(() => {
    if (!active) {
      return undefined;
    }
    store.updateItemCount('activeLinkCounts', itemId, 1);
    return () => store.updateItemCount('activeLinkCounts', itemId, -1);
  }, [active, store, itemId]);

  const state: TreeGridItemLink.State = { active, disabled };

  return useRenderElement('a', componentProps, {
    state,
    ref: [forwardedRef, control.ref],
    props: [
      {
        'aria-current': active ? 'page' : undefined,
        'aria-disabled': disabled || undefined,
        tabIndex: tabIndex ?? control.tabIndex,
      },
      elementProps,
      disabled ? getDisabledLinkProps : EMPTY_OBJECT,
    ],
  });
});

// Like a disabled `TreeGrid.ItemButton`, the link stays focusable but ignores the
// interactions that would activate it.
function getDisabledLinkProps(props: React.ComponentPropsWithRef<'a'>) {
  const { onClick, onAuxClick, onMouseDown, onPointerDown, onKeyDown, onKeyUp, ...otherProps } =
    props;
  return {
    ...otherProps,
    onClick: preventDefault,
    // Middle-click opens the `href` through `auxclick`, not `click`.
    onAuxClick: preventDefault,
  };
}

function preventDefault(event: React.MouseEvent) {
  event.preventDefault();
}

export interface TreeGridItemLinkState {
  /**
   * Whether the link is the currently active page.
   */
  active: boolean;
  /**
   * Whether the link is disabled, because its item or the tree is.
   */
  disabled: boolean;
}

export interface TreeGridItemLinkProps extends BaseUIComponentProps<
  'a',
  TreeGridItemLinkState,
  React.ComponentPropsWithRef<'a'>
> {
  /**
   * Whether the link is the currently active page.
   * Marks the link and its item with `aria-current="page"`.
   * @default false
   */
  active?: boolean | undefined;
  /**
   * Which keys the link handles itself instead of the tree.
   * By default, the arrows, Home, End, and Escape navigate the tree.
   */
  controlKeys?: TreeGridItemControlKeys | undefined;
}

export namespace TreeGridItemLink {
  export type State = TreeGridItemLinkState;
  export type Props = TreeGridItemLinkProps;
}
