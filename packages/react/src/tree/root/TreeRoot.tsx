'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useRenderElement } from '../../utils/useRenderElement';
import { useDirection } from '../../direction-provider/DirectionContext';
import type { BaseUIComponentProps } from '../../utils/types';
import { TreeRootContext } from './TreeRootContext';
import { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import { TreeStoreParameters } from '../store/types';
import { selectors } from '../store/selectors';
import type {
  TreeDefaultItemModel,
  TreeRootActions,
  TreeRootExpansionChangeEventReason,
  TreeRootExpansionChangeEventDetails,
  TreeRootSelectionChangeEventReason,
  TreeRootSelectionChangeEventDetails,
  TreeSelectionMode,
  TreeItemFocusEventReason,
  TreeItemFocusEventDetails,
  TreeItemExpansionToggleEventDetails,
  TreeItemExpansionToggleValue,
  TreeItemSelectionToggleEventDetails,
  TreeItemSelectionToggleValue,
} from '../store/types';
import { TreeItemModelProvider } from '../utils/TreeItemModelProvider';

const defaultItemToId = (item: any) => item.id;
const defaultItemToStringLabel = (item: any) => item.label;
const defaultItemToChildren = (item: any) => item.children;
const defaultSetItemChildren = (item: any, children: any) => ({ ...item, children });
const defaultIsItemDisabled = (item: any) => !!item.disabled;
const defaultSetIsItemDisabled = (item: any, isDisabled: boolean) => ({
  ...item,
  disabled: isDisabled,
});
const defaultIsItemSelectionDisabled = (item: any) => !!item.disabled;
const defaultSetItemLabel = (item: any, label: string) => ({ ...item, label });

const DEFAULT_CHECKBOX_SELECTION_PROPAGATION = { parents: true, descendants: true } as const;

/**
 * Groups all parts of the tree.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeRoot = React.forwardRef(function TreeRoot<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
>(componentProps: TreeRoot.Props<Mode, TItem>, forwardedRef: React.ForwardedRef<HTMLDivElement>) {
  const {
    // Rendering props
    className,
    render,
    // Data
    disabled,
    items,
    defaultItems,
    children,
    // Expansion
    expandedItems,
    defaultExpandedItems,
    expandOnClick,
    onExpandedItemsChange,
    onItemExpansionToggle,
    // Selection
    selectedItems,
    defaultSelectedItems,
    onSelectedItemsChange,
    onItemSelectionToggle,
    selectionMode,
    disallowEmptySelection,
    checkboxSelectionPropagation,
    // Item accessors
    itemToId = defaultItemToId,
    itemToStringLabel = defaultItemToStringLabel,
    itemToChildren = defaultItemToChildren,
    setItemChildren = defaultSetItemChildren,
    isItemDisabled = defaultIsItemDisabled,
    setIsItemDisabled = defaultSetIsItemDisabled,
    isItemSelectionDisabled = defaultIsItemSelectionDisabled,
    // Focus
    itemFocusableWhenDisabled,
    onItemFocus,
    // Actions
    actionsRef,
    // Items mutation
    onItemsChange,
    // Editing
    isItemEditable,
    setItemLabel = defaultSetItemLabel,
    // Plugins
    lazyLoading,
    dragAndDrop,
    resolveDropTargetGroup,
    // Props forwarded to the DOM element
    ...elementProps
  } = componentProps;

  const direction = useDirection();

  if (process.env.NODE_ENV !== 'production') {
    if (
      (selectionMode === undefined || selectionMode === 'single') &&
      (checkboxSelectionPropagation?.parents || checkboxSelectionPropagation?.descendants)
    ) {
      console.warn(
        'Base UI: The `checkboxSelectionPropagation` prop is not supported when `selectionMode="single"`. It will be ignored.',
      );
    }
  }

  const rootRef = React.useRef<HTMLDivElement>(null);

  const store = useRefWithInit(
    () =>
      new TreeStore<Mode, TItem>({
        disabled,
        items,
        defaultItems,
        expandedItems,
        defaultExpandedItems,
        expandOnClick,
        onExpandedItemsChange,
        onItemExpansionToggle,
        selectedItems,
        defaultSelectedItems,
        onSelectedItemsChange,
        onItemSelectionToggle,
        selectionMode,
        disallowEmptySelection,
        checkboxSelectionPropagation,
        itemToId,
        itemToStringLabel,
        itemToChildren,
        setItemChildren,
        isItemDisabled,
        setIsItemDisabled,
        isItemSelectionDisabled,
        itemFocusableWhenDisabled,
        onItemFocus,
        direction,
        rootRef,
        isItemEditable,
        setItemLabel,
        lazyLoading,
        dragAndDrop,
        onItemsChange,
        resolveDropTargetGroup,
      }),
  ).current;

  useOnMount(store.mountEffect);

  // Register root element as drop target for onRootDrop
  React.useEffect(() => {
    if (!store.dragAndDrop || !rootRef.current) {
      return undefined;
    }
    return store.dragAndDrop.setupRoot(rootRef.current);
  }, [store]);

  // Sync controlled props
  store.useControlledProp('expandedItems', expandedItems);
  store.useControlledProp('selectedItems', selectedItems as any);
  store.useControlledProp('items', items);
  store.useSyncedValues({
    disabled: disabled ?? false,
    expandOnClick: expandOnClick ?? false,
    selectionMode: selectionMode ?? 'single',
    disallowEmptySelection: disallowEmptySelection ?? false,
    checkboxSelectionPropagation:
      checkboxSelectionPropagation ?? DEFAULT_CHECKBOX_SELECTION_PROPAGATION,
    itemFocusableWhenDisabled: itemFocusableWhenDisabled ?? false,
    itemToId,
    itemToStringLabel,
    itemToChildren,
    setItemChildren,
    isItemDisabled,
    setIsItemDisabled,
    isItemSelectionDisabled,
    setItemLabel,
    direction,
    isItemEditable: isItemEditable ?? false,
  });

  store.useContextCallback('onExpandedItemsChange', onExpandedItemsChange);
  store.useContextCallback('onItemExpansionToggle', onItemExpansionToggle);
  store.useContextCallback('onSelectedItemsChange', onSelectedItemsChange as any);
  store.useContextCallback('onItemSelectionToggle', onItemSelectionToggle);
  store.useContextCallback('onItemFocus', onItemFocus);
  store.useContextCallback('onItemsChange', onItemsChange);

  // Sync resolveDropTargetGroup so it can change over the component's lifetime
  store.resolveDropTargetGroup = resolveDropTargetGroup;

  // Expose imperative actions
  React.useImperativeHandle(actionsRef, () => store.getActions(), [store]);

  // Get flat list of visible items
  const flatItemIds = useStore(store, selectors.flatList);

  const renderChildren = React.useMemo(() => {
    if (typeof children !== 'function') {
      // AnimatedItemList, ItemList, VirtualizedItemList,
      // or other ReactNode handles its own rendering.
      return children;
    }

    return flatItemIds.map((itemId) => (
      <TreeItemModelProvider key={itemId} store={store} itemId={itemId}>
        {children as any}
      </TreeItemModelProvider>
    ));
  }, [flatItemIds, store, children]);

  const state: TreeRoot.State = {
    disabled: disabled ?? false,
  };

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, rootRef],
    props: [
      {
        dir: direction,
        role: 'tree',
        'aria-multiselectable': selectionMode === 'multiple' || undefined,
        children: renderChildren,
      },
      store.interaction.rootEventHandlers,
      elementProps,
    ],
  });

  return <TreeRootContext.Provider value={store}>{element}</TreeRootContext.Provider>;
}) as {
  <Mode extends TreeSelectionMode | undefined = undefined, TItem = TreeDefaultItemModel>(
    props: TreeRoot.Props<Mode, TItem>,
  ): React.JSX.Element;
};

export interface TreeRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

/**
 * Accessor keys that are required on TreeStoreParameters but optional on
 * TreeRootProps because TreeRoot provides defaults.
 */
type TreeRootOptionalAccessors =
  | 'itemToId'
  | 'itemToStringLabel'
  | 'itemToChildren'
  | 'setItemChildren'
  | 'isItemDisabled'
  | 'setIsItemDisabled'
  | 'isItemSelectionDisabled'
  | 'setItemLabel';

export interface TreeRootProps<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
>
  extends
    Omit<BaseUIComponentProps<'div', TreeRootState>, 'children'>,
    Omit<TreeStoreParameters<Mode, TItem>, 'rootRef' | 'direction' | TreeRootOptionalAccessors> {
  /**
   * The render function for each tree item, or a `Tree.ItemList` / `Tree.AnimatedItemList`
   * element for more control over item rendering.
   */
  children: ((item: TItem) => React.ReactNode) | React.ReactNode;
  /**
   * A ref to imperative actions on the tree.
   */
  actionsRef?: React.RefObject<TreeRootActions<TItem> | null> | undefined;
  /**
   * Used to determine the id of a given item.
   * @default (item) => item.id
   */
  itemToId?: ((item: TItem) => CollectionItemId) | undefined;
  /**
   * Used to determine the string label of a given item.
   * @default (item) => item.label
   */
  itemToStringLabel?: ((item: TItem) => string) | undefined;
  /**
   * Used to determine the children of a given item.
   * @default (item) => item.children
   */
  itemToChildren?: ((item: TItem) => readonly TItem[] | undefined) | undefined;
  /**
   * Returns a new item with the given children set.
   * @default (item, children) => ({ ...item, children })
   */
  setItemChildren?: ((item: TItem, children: readonly TItem[]) => TItem) | undefined;
  /**
   * Used to determine if a given item should be disabled.
   * @default (item) => !!item.disabled
   */
  isItemDisabled?: ((item: TItem) => boolean) | undefined;
  /**
   * Returns a new item with the given disabled state set.
   * @default (item, isDisabled) => ({ ...item, disabled: isDisabled })
   */
  setIsItemDisabled?: ((item: TItem, isDisabled: boolean) => TItem) | undefined;
  /**
   * Used to determine if a given item should have selection disabled.
   * @default (item) => !!item.disabled
   */
  isItemSelectionDisabled?: ((item: TItem) => boolean) | undefined;
  /**
   * Returns a new item with the given label set.
   * Used by inline editing to update the item model after the user commits a label change.
   * @default (item, label) => ({ ...item, label })
   */
  setItemLabel?: ((item: TItem, label: string) => TItem) | undefined;
}

export namespace TreeRoot {
  export type State = TreeRootState;
  export type Props<
    Mode extends TreeSelectionMode | undefined = undefined,
    TItem = TreeDefaultItemModel,
  > = TreeRootProps<Mode, TItem>;
  export type Actions<TItem = TreeDefaultItemModel> = TreeRootActions<TItem>;
  export type ExpansionChangeEventReason = TreeRootExpansionChangeEventReason;
  export type ExpansionChangeEventDetails = TreeRootExpansionChangeEventDetails;
  export type SelectionChangeEventReason = TreeRootSelectionChangeEventReason;
  export type SelectionChangeEventDetails = TreeRootSelectionChangeEventDetails;
  export type ItemExpansionToggleEventDetails = TreeItemExpansionToggleEventDetails;
  export type ItemExpansionToggleValue = TreeItemExpansionToggleValue;
  export type ItemSelectionToggleEventDetails = TreeItemSelectionToggleEventDetails;
  export type ItemSelectionToggleValue = TreeItemSelectionToggleValue;
  export type ItemFocusEventReason = TreeItemFocusEventReason;
  export type ItemFocusEventDetails = TreeItemFocusEventDetails;
}
