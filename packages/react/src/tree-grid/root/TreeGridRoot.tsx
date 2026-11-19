'use client';
import * as React from 'react';
import { useOnMount } from '@base-ui/utils/useOnMount';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { warn } from '@base-ui/utils/warn';
import { useDirection } from '../../direction-provider';
import { TreeGridRootContext } from './TreeGridRootContext';
import { TreeGridRootFeaturesContext } from './TreeGridRootFeatures';
import type { TreeGridRootFeatureState } from './TreeGridRootFeatures';
import { TreeGridStore } from '../store/TreeGridStore';
import type {
  TreeGridDefaultItem,
  TreeGridRootActions,
  TreeGridRootExpansionChangeEventReason,
  TreeGridRootExpansionChangeEventDetails,
  TreeGridRootSelectionChangeEventReason,
  TreeGridRootSelectionChangeEventDetails,
  TreeGridState,
  TreeGridStoreContext,
  TreeGridRootHighlightEventReason,
  TreeGridRootHighlightEventDetails,
  TreeGridRootItemsChangeEventReason,
  TreeGridRootItemsChangeEventDetails,
  TreeGridRootItemExpansionToggleEventDetails,
  TreeGridRootItemExpansionToggleValue,
  TreeGridRootItemSelectionToggleEventDetails,
  TreeGridRootItemSelectionToggleValue,
  TreeGridStateDefaultedKeys,
  TreeGridStoreParameters,
  TreeGridCheckboxSelectionPropagation,
} from '../store/types';
import { normalizeTreeGridItemCollection } from '../items/itemCollection';
import type { TreeGridItemCollection } from '../items/itemCollection';

const CHECKBOX_SELECTION_PROPAGATION_DISABLED = { parents: false, descendants: false } as const;

/**
 * Groups all parts of the tree.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export function TreeGridRoot<
  TItem = TreeGridDefaultItem,
  Multiple extends boolean | 'opt-in' | undefined = undefined,
>(componentProps: TreeGridRoot.Props<TItem, Multiple>): React.JSX.Element;
// A wrapper passing on `TreeGridRoot.Props<TItem>` gives a union of every `multiple` value, which
// TypeScript can't infer a single `Multiple` from, since it mixes booleans and a string.
export function TreeGridRoot<TItem = TreeGridDefaultItem>(
  componentProps: TreeGridRoot.Props<TItem>,
): React.JSX.Element;
export function TreeGridRoot<TItem = TreeGridDefaultItem>(componentProps: object) {
  // `TreeGridRootProps` is distributed by `multiple` for consumers. Inside the implementation all
  // branches share this non-distributed runtime shape.
  const resolvedProps = componentProps as TreeGridRootImplementationProps<
    TItem,
    boolean | 'opt-in' | undefined
  >;
  const {
    // Data
    disabled = false,
    items,
    defaultItems,
    children,
    // Expansion
    expandedItems,
    defaultExpandedItems,
    expandOnClick = false,
    onExpandedItemsChange,
    transactionThrottle = 0,
    onItemExpansionToggle,
    // Selection
    selectedItems,
    defaultSelectedItems,
    onSelectedItemsChange,
    onItemSelectionToggle,
    multiple = false,
    disableEmptySelection = false,
    checkboxSelectionPropagation,
    // Focus
    itemFocusableWhenDisabled = true,
    onItemHighlighted,
    // Actions
    actionsRef,
    // Items mutation
    onItemsChange,
  } = resolvedProps;

  const itemsControlled = items !== undefined;
  const itemsInput = itemsControlled ? items : defaultItems;
  const inputCollection = React.useMemo(
    () => normalizeTreeGridItemCollection(itemsInput),
    [itemsInput],
  );
  // `defaultItems` only seeds the initial items, so an uncontrolled tree ignores
  // later data identities (an inline array would otherwise rebuild every lookup
  // on each parent render). Accessor changes still apply.
  const uncontrolledCollection = React.useMemo(
    () => inputCollection,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      inputCollection.itemToId,
      inputCollection.itemToStringLabel,
      inputCollection.itemToChildren,
      inputCollection.isItemDisabled,
      inputCollection.isItemSelectionDisabled,
      inputCollection.setItemChildren,
    ],
  );
  const itemCollection = itemsControlled ? inputCollection : uncontrolledCollection;
  const itemData = (itemCollection.data ?? EMPTY_ARRAY) as readonly TItem[];

  const direction = useDirection();

  const propagateToParents = checkboxSelectionPropagation?.parents ?? true;
  const propagateToDescendants = checkboxSelectionPropagation?.descendants ?? true;
  const multipleCheckboxSelectionPropagation = React.useMemo(
    () => ({ parents: propagateToParents, descendants: propagateToDescendants }),
    [propagateToParents, propagateToDescendants],
  );
  const effectiveCheckboxSelectionPropagation = multiple
    ? multipleCheckboxSelectionPropagation
    : CHECKBOX_SELECTION_PROPAGATION_DISABLED;

  if (process.env.NODE_ENV !== 'production') {
    if (
      !multiple &&
      (checkboxSelectionPropagation?.parents || checkboxSelectionPropagation?.descendants)
    ) {
      warn(
        'The `checkboxSelectionPropagation` prop has no effect without `multiple`. Set `multiple` to enable selection propagation.',
      );
    }
  }

  const rootRef = React.useRef<HTMLElement>(null);
  const features = React.useContext(TreeGridRootFeaturesContext);
  const featureState: TreeGridRootFeatureState = {};
  for (const feature of features) {
    Object.assign(featureState, feature.state);
  }

  const store = useRefWithInit(() => {
    const created = new TreeGridStore<boolean | 'opt-in' | undefined, TItem>({
      disabled,
      items: itemsControlled ? itemData : undefined,
      defaultItems: itemsControlled ? undefined : itemData,
      itemCollection,
      expandedItems,
      defaultExpandedItems,
      expandOnClick,
      onExpandedItemsChange,
      onItemExpansionToggle,
      selectedItems,
      defaultSelectedItems,
      onSelectedItemsChange,
      onItemSelectionToggle,
      multiple,
      disableEmptySelection,
      checkboxSelectionPropagation: effectiveCheckboxSelectionPropagation,
      itemFocusableWhenDisabled,
      onItemHighlighted,
      direction,
      rootRef,
      onItemsChange,
    });
    for (const feature of features) {
      feature.install?.(created);
    }
    created.update(featureState);
    return created;
  }).current;

  useOnMount(store.mountEffect);

  // Sync controlled props. Selection/expansion sync into a dedicated `*Prop`
  // slot so the plugins can tell whether they are controlled and avoid
  // self-mutating internal state.
  // Items and provider options sync first, so a controlled change in the same
  // render already sees them.
  store.useSyncedValues({
    disabled,
    itemsProp: itemsControlled ? itemData : undefined,
    itemCollection,
    expandOnClick,
    transactionThrottle,
    multiple,
    disableEmptySelection,
    checkboxSelectionPropagation: effectiveCheckboxSelectionPropagation,
    itemFocusableWhenDisabled,
    direction,
    hasItemsChangeHandler: onItemsChange != null,
    hasItemSelectionToggleHandler: onItemSelectionToggle != null,
    ...featureState,
  });
  store.useControlledProp('expandedItemsProp', expandedItems);
  store.useControlledProp('selectedItemsProp', selectedItems as TreeGridState['selectedItemsProp']);

  store.useContextCallback('onExpandedItemsChange', onExpandedItemsChange);
  store.useContextCallback('onItemExpansionToggle', onItemExpansionToggle);
  store.useContextCallback(
    'onSelectedItemsChange',
    onSelectedItemsChange as TreeGridStoreContext<TItem>['onSelectedItemsChange'],
  );
  store.useContextCallback('onItemSelectionToggle', onItemSelectionToggle);
  store.useContextCallback('onItemHighlighted', onItemHighlighted);
  store.useContextCallback('onItemsChange', onItemsChange);

  React.useImperativeHandle(actionsRef, () => store.getActions(), [store]);
  // After the imperative handle, so plugin callbacks can use `actionsRef`.
  useIsoLayoutEffect(() => store.layoutMountEffect(), [store]);

  // Memoized so that re-rendering the root alone doesn't re-render the features.
  const content = React.useMemo(() => {
    // The outermost provider's feature wraps the others.
    let wrapped: React.ReactNode = children;
    for (let index = features.length - 1; index >= 0; index -= 1) {
      wrapped = features[index].render?.(wrapped) ?? wrapped;
    }
    return wrapped;
  }, [features, children]);

  return (
    <TreeGridRootContext.Provider value={store}>
      <TreeGridRootFeaturesContext.Provider value={EMPTY_ARRAY}>
        {content}
      </TreeGridRootFeaturesContext.Provider>
    </TreeGridRootContext.Provider>
  );
}

export interface TreeGridRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

/**
 * Keys that are required on TreeGridStoreParameters but optional on
 * TreeGridRootProps because TreeGridRoot provides defaults.
 */
type TreeGridRootDefaultedKeys = TreeGridStateDefaultedKeys;

export type TreeGridRootItems<TItem> =
  | TreeGridItemCollection<TItem>
  | ([TItem] extends [TreeGridDefaultItem] ? readonly TItem[] : never);

type TreeGridRootInternalKeys =
  'rootRef' | 'direction' | 'items' | 'defaultItems' | 'itemCollection';

interface TreeGridRootOwnProps<TItem> {
  /**
   * The children of the component.
   */
  children: React.ReactNode;
  /**
   * A ref to imperative actions on the tree.
   */
  actionsRef?: React.RefObject<TreeGridRootActions<TItem> | null> | undefined;
  /**
   * The controlled item data. Pass a standard item array, or a collection returned by
   * `TreeGrid.createItems()` for a custom item model.
   * A model that extends the standard item must redeclare `children` with its own type.
   */
  items?: TreeGridRootItems<TItem> | undefined;
  /**
   * The item data used for an uncontrolled component on its initial render.
   * Accepts the same data as `items`.
   */
  defaultItems?: TreeGridRootItems<TItem> | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The minimum time between two commits of `actionsRef.applyTransaction()`, in milliseconds.
   * The first transaction after a quiet period commits at once. The ones that follow within
   * the window are applied together, as a single items change, when the window ends.
   * Until then, the actions and the rendered items show the items as the last commit left them.
   * Call `actionsRef.flushTransactions()` to commit them right away.
   * @default 0
   */
  transactionThrottle?: number | undefined;
  /**
   * Whether clicking anywhere on an item row toggles expansion.
   * When `false`, clicking the row does not toggle expansion; clicking its expansion trigger does.
   * @default false
   */
  expandOnClick?: boolean | undefined;
  /**
   * Whether the user is prevented from deselecting the last selected item.
   * An empty initial or controlled selection is still allowed.
   * @default false
   */
  disableEmptySelection?: boolean | undefined;
  /**
   * Controls how checkbox selection, Space on an item row, and `setItemSelection()` propagate through the hierarchy.
   * This does not affect item presses, which use replace-selection semantics.
   *
   * When `checkboxSelectionPropagation.descendants` is set to `true`:
   * - Selecting a parent selects all its descendants automatically.
   * - Deselecting a parent deselects all its descendants automatically.
   *
   * When `checkboxSelectionPropagation.parents` is set to `true`:
   * - Selecting all descendants of a parent selects the parent automatically.
   * - Deselecting a descendant of a selected parent deselects the parent automatically.
   *
   * @default { parents: true, descendants: true }
   */
  checkboxSelectionPropagation?: TreeGridCheckboxSelectionPropagation | undefined;
  /**
   * Whether disabled items should be focusable.
   * @default true
   */
  itemFocusableWhenDisabled?: boolean | undefined;
}

type TreeGridRootMultipleProps<Multiple extends boolean | 'opt-in' | undefined> =
  Multiple extends undefined
    ? {
        /**
         * Whether multiple items can be selected, and how selecting an item affects the current selection.
         * - `false`: only one item can be selected.
         * - `true`: each item is toggled independently.
         * - `'opt-in'`: selecting an item moves the current selection to it, and users hold a modifier key
         *   to select more than one item. On touch devices, where there are no modifier keys, it behaves
         *   like `true`.
         * @default false
         */
        multiple?: false | undefined;
      }
    : {
        /**
         * Whether multiple items can be selected, and how selecting an item affects the current selection.
         * - `false`: only one item can be selected.
         * - `true`: each item is toggled independently.
         * - `'opt-in'`: selecting an item moves the current selection to it, and users hold a modifier key
         *   to select more than one item. On touch devices, where there are no modifier keys, it behaves
         *   like `true`.
         * @default false
         */
        multiple: Multiple;
      };

/**
 * Public TreeGrid root props, distributed by `multiple` so it stays correlated with the
 * selection value when this type is used by a wrapper component.
 */
export type TreeGridRootProps<
  TItem = TreeGridDefaultItem,
  Multiple extends boolean | 'opt-in' | undefined = boolean | 'opt-in' | undefined,
> = Multiple extends boolean | 'opt-in' | undefined
  ? Omit<
      TreeGridStoreParameters<Multiple, TItem>,
      TreeGridRootInternalKeys | TreeGridRootDefaultedKeys
    > &
      TreeGridRootOwnProps<TItem> &
      TreeGridRootMultipleProps<Multiple>
  : never;

type TreeGridRootImplementationProps<TItem, Multiple extends boolean | 'opt-in' | undefined> = Omit<
  TreeGridStoreParameters<Multiple, TItem>,
  TreeGridRootInternalKeys | TreeGridRootDefaultedKeys
> &
  TreeGridRootOwnProps<TItem> & { multiple?: Multiple | undefined };

export namespace TreeGridRoot {
  export type State = TreeGridRootState;
  export type Props<
    TItem = TreeGridDefaultItem,
    Multiple extends boolean | 'opt-in' | undefined = boolean | 'opt-in' | undefined,
  > = TreeGridRootProps<TItem, Multiple>;
  export type Actions<TItem = TreeGridDefaultItem> = TreeGridRootActions<TItem>;
  export type ExpansionChangeEventReason = TreeGridRootExpansionChangeEventReason;
  export type ExpansionChangeEventDetails = TreeGridRootExpansionChangeEventDetails;
  export type SelectionChangeEventReason = TreeGridRootSelectionChangeEventReason;
  export type SelectionChangeEventDetails = TreeGridRootSelectionChangeEventDetails;
  export type ItemExpansionToggleEventDetails = TreeGridRootItemExpansionToggleEventDetails;
  export type ItemExpansionToggleValue = TreeGridRootItemExpansionToggleValue;
  export type ItemSelectionToggleEventDetails = TreeGridRootItemSelectionToggleEventDetails;
  export type ItemSelectionToggleValue = TreeGridRootItemSelectionToggleValue;
  export type HighlightEventReason = TreeGridRootHighlightEventReason;
  export type HighlightEventDetails = TreeGridRootHighlightEventDetails;
  export type ItemsChangeEventReason = TreeGridRootItemsChangeEventReason;
  export type ItemsChangeEventDetails<TItem = TreeGridDefaultItem> =
    TreeGridRootItemsChangeEventDetails<TItem>;
  export type Items<TItem = TreeGridDefaultItem> = TreeGridRootItems<TItem>;
}
