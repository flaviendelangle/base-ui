'use client';
import * as React from 'react';
import { activeElement } from '@base-ui/utils/shadowDom';
import { ownerDocument } from '@base-ui/utils/owner';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useTreeGridItemContext } from '../item/TreeGridItemContext';
import type { TreeGridItemControlKeys } from '../item-control/TreeGridItemControl';

export const ACTION_CONTROL_KEYS: Required<TreeGridItemControlKeys> = {
  horizontal: 'tree',
  vertical: 'tree',
  homeEnd: 'tree',
  escape: 'tree',
};

export const WIDGET_CONTROL_KEYS: Required<TreeGridItemControlKeys> = {
  horizontal: 'control',
  vertical: 'control',
  homeEnd: 'control',
  escape: 'control',
};

export interface UseTreeGridItemControlParameters {
  controlKeys: TreeGridItemControlKeys | undefined;
  /**
   * The keys the control keeps by default. A function is resolved on each key
   * press, so it can read the element's current attributes.
   */
  defaultKeys:
    | Required<TreeGridItemControlKeys>
    | ((element: HTMLElement) => Required<TreeGridItemControlKeys>);
  /**
   * Whether the control is disabled and can't receive focus, so navigation skips it.
   * A function reads the state from the element on each key press.
   */
  disabled?: boolean | ((element: HTMLElement) => boolean) | undefined;
}

export interface UseTreeGridItemControlReturnValue {
  /** Registers the control. Merge it with the element's other refs. */
  ref: React.RefCallback<HTMLElement>;
  /** `0` while the item holds the tree's tab stop, so Tab walks its controls. */
  tabIndex: number;
}

/**
 * Registers a control rendered inside a tree item with the item's keyboard navigation.
 */
export function useTreeGridItemControl(
  parameters: UseTreeGridItemControlParameters,
): UseTreeGridItemControlReturnValue {
  const { controlKeys, defaultKeys, disabled = false } = parameters;
  const store = useTreeGridRootContext();
  const itemId = useTreeGridItemContext();
  const tabbable = store.useState('isItemDefaultFocusable', itemId);

  const getKeys = useStableCallback((element: HTMLElement): Required<TreeGridItemControlKeys> => {
    const defaults = typeof defaultKeys === 'function' ? defaultKeys(element) : defaultKeys;
    return {
      horizontal: controlKeys?.horizontal ?? defaults.horizontal,
      vertical: controlKeys?.vertical ?? defaults.vertical,
      homeEnd: controlKeys?.homeEnd ?? defaults.homeEnd,
      escape: controlKeys?.escape ?? defaults.escape,
    };
  });
  const isDisabled = useStableCallback((element: HTMLElement) =>
    typeof disabled === 'function' ? disabled(element) : disabled,
  );

  const ref = React.useCallback(
    (element: HTMLElement | null) => {
      if (element == null) {
        return undefined;
      }
      const unregister = store.interaction.registerControl(
        itemId,
        element,
        () => getKeys(element),
        () => isDisabled(element),
      );
      return () => {
        unregister();
        // React detaches a ref before it removes the node, so a focused control
        // that unmounts or swaps its element (a retry button whose error
        // cleared) is still focused here. Once the node is gone, focus falls to
        // the document body.
        if (activeElement(ownerDocument(element)) === element) {
          store.interaction.recoverFocusFromRemovedControl(itemId);
        }
      };
    },
    [store, itemId, getKeys, isDisabled],
  );

  return { ref, tabIndex: tabbable ? 0 : -1 };
}
