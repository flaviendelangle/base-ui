'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { StateAttributesMapping } from '../../utils/getStateAttributesProps';
import { useTreeRootContext } from '../root/TreeRootContext';
import { TreeItemContext } from '../item/TreeItemContext';
import { TreeCheckboxItemContext } from './TreeCheckboxItemContext';
import { TreeCheckboxItemDataAttributes } from './TreeCheckboxItemDataAttributes';
import { TreeItemCssVars } from '../item/TreeItemCssVars';
import type { CollectionItemId } from '../../types/collection';

const EXPANDED_HOOK = { [TreeCheckboxItemDataAttributes.expanded]: '' };
const COLLAPSED_HOOK = { [TreeCheckboxItemDataAttributes.collapsed]: '' };
const CHECKED_HOOK = { [TreeCheckboxItemDataAttributes.checked]: '' };
const UNCHECKED_HOOK = { [TreeCheckboxItemDataAttributes.unchecked]: '' };
const INDETERMINATE_HOOK = { [TreeCheckboxItemDataAttributes.indeterminate]: '' };
const DRAGGED_HOOK = { [TreeCheckboxItemDataAttributes.dragged]: '' };
const DROP_TARGET_HOOK = { [TreeCheckboxItemDataAttributes.dropTarget]: '' };
const DROP_TARGET_GROUP_HOOK = { [TreeCheckboxItemDataAttributes.dropTargetGroup]: '' };

const stateAttributesMapping = {
  itemId(v: CollectionItemId) {
    return { [TreeCheckboxItemDataAttributes.itemId]: String(v) };
  },
  expanded(v: boolean) {
    return v ? EXPANDED_HOOK : COLLAPSED_HOOK;
  },
  checked(v: boolean) {
    return v ? CHECKED_HOOK : null;
  },
  unchecked(v: boolean) {
    return v ? UNCHECKED_HOOK : null;
  },
  indeterminate(v: boolean) {
    return v ? INDETERMINATE_HOOK : null;
  },
  dragged(v: boolean) {
    return v ? DRAGGED_HOOK : null;
  },
  dropTarget(v: boolean) {
    return v ? DROP_TARGET_HOOK : null;
  },
  dropPosition(v: 'before' | 'after' | 'on' | null) {
    return v ? { [TreeCheckboxItemDataAttributes.dropPosition]: v } : null;
  },
  dropOperation(v: 'move' | 'copy' | 'link' | 'cancel' | null) {
    return v ? { [TreeCheckboxItemDataAttributes.dropOperation]: v } : null;
  },
  inDropTargetGroup(v: boolean) {
    return v ? DROP_TARGET_GROUP_HOOK : null;
  },
} satisfies StateAttributesMapping<TreeCheckboxItem.State>;

/**
 * A tree item that uses toggle selection behavior with checkbox semantics.
 * Clicking toggles the item's selection without affecting other items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeCheckboxItem = fastComponentRef(function TreeCheckboxItem(
  componentProps: TreeCheckboxItem.Props,
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const { className, render, itemId, ...elementProps } = componentProps;

  const store = useTreeRootContext();

  const expanded = store.useState('isItemExpanded', itemId);
  const expandable = store.useState('isItemExpandable', itemId);
  const focused = store.useState('isItemFocused', itemId);
  const disabled = store.useState('isItemDisabled', itemId);
  const canBeSelected = store.useState('canItemBeSelected', itemId);
  const checkboxStatus = store.useState('checkboxSelectionStatus', itemId);
  const isDefaultFocusable = store.useState('isItemDefaultFocusable', itemId);
  const siblingsCount = store.useState('itemSiblingsCount', itemId);
  const posInSet = store.useState('itemPositionInSet', itemId);
  const loading = store.useState('isItemLoading', itemId);
  const depth = store.useState('itemDepth', itemId);
  const virtualized = store.useState('virtualized');
  const dragAndDropEnabled = store.useState('isDragAndDropEnabled');
  const dragged = store.useState('isItemDragged', itemId);
  const dropTarget = store.useState('isItemDropTarget', itemId);
  const dropPosition = store.useState('itemDropPosition', itemId);
  const dropOperation = store.useState('itemDropOperation', itemId);
  const inDropTargetGroup = store.useState('isItemInDropTargetGroup', itemId);

  // Compute aria-checked from checkbox selection status.
  const checked = checkboxStatus === 'checked';
  const indeterminate = checkboxStatus === 'indeterminate';
  let ariaChecked: boolean | 'mixed' | undefined;
  if (!canBeSelected) {
    ariaChecked = undefined;
  } else if (checked) {
    ariaChecked = true;
  } else if (indeterminate) {
    ariaChecked = 'mixed';
  } else {
    ariaChecked = false;
  }

  const state: TreeCheckboxItem.State = {
    itemId,
    expanded,
    expandable,
    checked,
    unchecked: !checked && !indeterminate,
    indeterminate,
    focused,
    disabled,
    depth,
    dragged,
    dropTarget,
    dropPosition,
    dropOperation,
    inDropTargetGroup,
  };

  const checkboxItemContext = React.useMemo(
    () => ({
      checked,
      indeterminate,
      disabled,
    }),
    [checked, indeterminate, disabled],
  );

  // In virtualized mode, auto-focus when this item mounts and it's the focused item.
  const autoFocusRef = React.useCallback(
    (element: HTMLDivElement | null) => {
      if (virtualized && element && focused) {
        element.focus();
      }
    },
    [virtualized, focused],
  );

  // Register with the DnD plugin when drag-and-drop is enabled.
  const elementRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!dragAndDropEnabled || !elementRef.current) {
      return undefined;
    }
    return store.dragAndDrop?.setupItem(itemId, elementRef.current);
  }, [store, dragAndDropEnabled, itemId]);

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, autoFocusRef, elementRef],
    props: [
      {
        role: 'treeitem',
        'aria-expanded': expandable ? expanded : undefined,
        'aria-checked': ariaChecked,
        'aria-level': depth + 1,
        'aria-setsize': siblingsCount,
        'aria-posinset': posInSet,
        'aria-disabled': disabled || undefined,
        'aria-busy': loading || undefined,
        'aria-grabbed': dragAndDropEnabled ? dragged : undefined,
        tabIndex: isDefaultFocusable ? 0 : -1,
        style: { [TreeItemCssVars.depth]: depth } as React.CSSProperties,
      },
      store.checkboxItemEventHandlers,
      elementProps,
    ],
    stateAttributesMapping,
  });

  return (
    <TreeItemContext.Provider value={itemId}>
      <TreeCheckboxItemContext.Provider value={checkboxItemContext}>
        {element}
      </TreeCheckboxItemContext.Provider>
    </TreeItemContext.Provider>
  );
});

export interface TreeCheckboxItemState {
  /**
   * The id of the item.
   */
  itemId: CollectionItemId;
  /**
   * Whether the item is currently expanded.
   */
  expanded: boolean;
  /**
   * Whether the item has children and can be expanded.
   */
  expandable: boolean;
  /**
   * Whether the checkbox item is currently checked.
   */
  checked: boolean;
  /**
   * Whether the checkbox item is currently unchecked.
   */
  unchecked: boolean;
  /**
   * Whether the checkbox item is in an indeterminate state.
   */
  indeterminate: boolean;
  /**
   * Whether the item is currently focused.
   */
  focused: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * The depth of the item in the tree hierarchy.
   */
  depth: number;
  /**
   * Whether the item is currently being dragged.
   */
  dragged: boolean;
  /**
   * Whether the item is currently a drop target.
   */
  dropTarget: boolean;
  /**
   * The drop position relative to this item, or `null`.
   */
  dropPosition: 'before' | 'after' | 'on' | null;
  /**
   * The drop operation for this item when it is a drop target, or `null`.
   */
  dropOperation: 'move' | 'copy' | 'link' | 'cancel' | null;
  /**
   * Whether the item belongs to the drop target's group (folder subtree).
   */
  inDropTargetGroup: boolean;
}

export interface TreeCheckboxItemProps extends BaseUIComponentProps<'div', TreeCheckboxItemState> {
  /**
   * The id of the item.
   */
  itemId: CollectionItemId;
}

export namespace TreeCheckboxItem {
  export type State = TreeCheckboxItemState;
  export type Props = TreeCheckboxItemProps;
}
