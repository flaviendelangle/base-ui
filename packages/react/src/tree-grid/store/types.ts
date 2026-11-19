import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
  BaseUIHighlightEventDetails,
} from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';

import type { InternalTreeGridItemCollection } from '../items/itemCollection';
import type { TreeGridStatusChange } from '../status/TreeGridStatus';

export type TreeGridItemId = string | number;

/** Controls how a filtered tree presents non-matching items. */
export type TreeGridFilterMode = 'hide-non-matches' | 'collapse-non-matches' | 'expand-matches';

/**
 * Determines whether an item matches the filter query.
 *
 * @param text The item's label.
 * @param query The trimmed filter query.
 * @param item The item model.
 */
export type TreeGridFilterFunction<TItem> = (text: string, query: string, item: TItem) => boolean;

/**
 * Sentinel value representing "all selectable items are selected".
 * When used as the value of `selectedItems`, every item that supports selection and is
 * not disabled is considered selected — including items added after the value is set.
 *
 * Use it with `multiple`. A `disabled` tree keeps it. Deselecting an item replaces it with
 * an array of the remaining selected IDs. Exposed as `TreeGrid.SELECTION_ALL`.
 *
 * It is a unique symbol rather than a string, so it never collides with an item
 * `id` and cannot be accidentally matched by `selectedItems.includes(...)`.
 */
export const TREE_GRID_SELECTION_ALL: unique symbol = Symbol('Base UI: TreeGrid.SELECTION_ALL');

/**
 * Conditional type that narrows the selected items type based on the `multiple` prop.
 * When `Multiple` is `true` or `'opt-in'`, the type is `readonly TreeGridItemId[]` or `typeof TREE_GRID_SELECTION_ALL`.
 */
export type TreeGridSelectedItemsType<Multiple extends boolean | 'opt-in' | undefined> =
  Multiple extends true | 'opt-in'
    ? readonly TreeGridItemId[] | typeof TREE_GRID_SELECTION_ALL
    : TreeGridItemId;

/**
 * The value `onSelectedItemsChange` receives: the shape of `TreeGridSelectedItemsType`, with
 * mutable arrays the tree doesn't keep.
 */
export type TreeGridSelectedItemsChangeValue<Multiple extends boolean | 'opt-in' | undefined> =
  Multiple extends true | 'opt-in'
    ? TreeGridItemId[] | typeof TREE_GRID_SELECTION_ALL
    : TreeGridItemId;

/**
 * The shape of an item as provided by the user in the `items` prop.
 * Users can extend this with custom properties.
 */
export interface TreeGridDefaultItem {
  id: TreeGridItemId;
  label: string;
  children?: readonly TreeGridDefaultItem[] | undefined;
  disabled?: boolean | undefined;
}

/**
 * Internal metadata about an item, derived from the items prop processing.
 */
export interface TreeGridItemMeta {
  id: TreeGridItemId;
  parentId: TreeGridItemId | null;
  level: number;
  expandable: boolean;
  disabled: boolean;
  /**
   * Pre-computed disabled state that accounts for ancestor disabled states.
   * `true` when either the item itself or any of its ancestors is disabled.
   */
  resolvedDisabled: boolean;
  selectable: boolean;
  label: string;
}

/**
 * Checkbox selection propagation configuration.
 * Controls how checkbox selection propagates through the hierarchy.
 * This does not affect item presses, which use replace-selection semantics.
 */
export interface TreeGridCheckboxSelectionPropagation {
  /**
   * Whether selecting all of a parent's descendants selects the parent, and deselecting
   * one of them deselects it.
   */
  parents?: boolean | undefined;
  /**
   * Whether selecting or deselecting a parent does the same to all its descendants.
   */
  descendants?: boolean | undefined;
}

/**
 * Sentinel key standing in for "no parent" in the internal parent-keyed lookups.
 *
 * A symbol, not a string: item ids are `string | number`, so no consumer id can
 * collide with it.
 */
export const TREE_GRID_VIEW_ROOT_PARENT_ID: unique symbol = Symbol('treeRootParent');

/** A key in the parent-keyed lookups: an item id, or the root sentinel. */
export type TreeGridItemLookupKey = string;

export type TreeGridParentKey = TreeGridItemId | typeof TREE_GRID_VIEW_ROOT_PARENT_ID;

export type TreeGridParentLookupKey = TreeGridItemLookupKey | typeof TREE_GRID_VIEW_ROOT_PARENT_ID;

export type TreeGridItemKeyed<V> = Record<TreeGridItemLookupKey, V>;

/**
 * A lookup keyed by parent. The root entry is optional so it can be `delete`d,
 * and every read is already written defensively (`?? EMPTY_ARRAY`, `if (!x)`)
 * because an arbitrary id may not be present.
 */
export type TreeGridParentKeyed<V> = TreeGridItemKeyed<V> & {
  [TREE_GRID_VIEW_ROOT_PARENT_ID]?: V | undefined;
};

/**
 * The computed lookup tables derived from the items prop and accessor functions.
 */
export interface TreeGridItemsState<TItem = any> {
  /**
   * Maps each item ID to its full item model.
   */
  itemModelLookup: TreeGridItemKeyed<TItem>;
  /**
   * Maps each item ID to its computed metadata (level, parent, disabled, etc.).
   */
  itemMetaLookup: TreeGridItemKeyed<TreeGridItemMeta>;
  /**
   * Maps each item ID to the ordered list of its children's IDs.
   * The root's children are keyed by `TREE_GRID_VIEW_ROOT_PARENT_ID`.
   */
  itemOrderedChildrenIdsLookup: TreeGridParentKeyed<TreeGridItemId[]>;
}

export type TreeGridRootExpansionChangeEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.triggerPress
  | typeof REASONS.keyboard
  | typeof REASONS.imperativeAction
  | typeof REASONS.missing
  | typeof REASONS.none;

export type TreeGridRootExpansionChangeEventDetails =
  BaseUIChangeEventDetails<TreeGridRootExpansionChangeEventReason>;

export type TreeGridRootSelectionChangeEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.keyboard
  | typeof REASONS.escapeKey
  | typeof REASONS.imperativeAction
  | typeof REASONS.missing
  | typeof REASONS.none;

export type TreeGridRootSelectionChangeEventDetails =
  BaseUIChangeEventDetails<TreeGridRootSelectionChangeEventReason>;

export type TreeGridRootHighlightEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.keyboard
  | typeof REASONS.imperativeAction
  | typeof REASONS.none;

export type TreeGridRootHighlightEventDetails =
  BaseUIHighlightEventDetails<TreeGridRootHighlightEventReason>;

export type TreeGridRootItemExpansionToggleEventDetails =
  BaseUIGenericEventDetails<TreeGridRootExpansionChangeEventReason>;

export type TreeGridRootItemSelectionToggleEventDetails =
  BaseUIGenericEventDetails<TreeGridRootSelectionChangeEventReason>;

/** `'imperative-action'`: an `actionsRef` mutation method. */
export type TreeGridRootItemsChangeEventReason = typeof REASONS.imperativeAction;

/** One group of children animating in or out while its parent expands or collapses. */
export interface TreeGridAnimatingGroup {
  parentId: TreeGridItemId;
  type: 'expanding' | 'collapsing';
  childIds: TreeGridItemId[];
}

/** The filter inputs `TreeGrid.FilterProvider` passes to the store. */
export interface TreeGridFilterOptions<TItem = any> {
  /** The trimmed query. */
  query: string;
  filter: TreeGridFilterFunction<TItem> | null;
  filteredItems: readonly TItem[] | undefined;
  mode: TreeGridFilterMode;
}

/** Expansion changes the user made while filtering, applied over the filter-forced expansion. */
export interface TreeGridFilterExpansionOverrides {
  /** The filter session the overrides belong to; they are ignored once the filter inputs change. */
  session: object;
  /** `false` collapses a row the filter expands; `true` expands a row the filter keeps collapsed. */
  values: ReadonlyMap<TreeGridItemId, boolean>;
}

/**
 * The hierarchy as the tree presents it. Features that change the presentation
 * without changing the items, such as filtering, derive it from the canonical
 * lookups with a {@link TreeGridViewTransform}.
 */
export interface TreeGridView {
  /** Maps each parent to its presented children, in order. */
  childrenLookup: TreeGridParentKeyed<TreeGridItemId[]>;
  /** The expanded items as presented. */
  expandedItems: ReadonlySet<TreeGridItemId>;
  /**
   * Whether the view departs from the canonical hierarchy. Group transitions
   * assume the canonical hierarchy, so they pause while it does.
   */
  transformed: boolean;
}

/**
 * Derives a view from the previous one. Must return the same object while its
 * inputs are unchanged so the selectors derived from the view stay memoized.
 */
export type TreeGridViewTransform = (state: TreeGridState, view: TreeGridView) => TreeGridView;

/**
 * Where items land in the tree: a parent and an index among its children.
 * It is a valid position for the `add`, `set`, and `move` operations of `applyTransaction()`.
 */
export interface TreeGridItemDestination {
  parentId: TreeGridItemId | null;
  index: number;
}

/**
 * Where `add`, `set`, or `move` places items: `before` or `after` the item with the given ID,
 * or under a parent at an index.
 * Positions are resolved against the items as the earlier operations of the transaction left them.
 */
export type TreeGridItemPosition =
  | {
      /**
       * The ID of the item to place the items before.
       */
      before: TreeGridItemId;
    }
  | {
      /**
       * The ID of the item to place the items after.
       */
      after: TreeGridItemId;
    }
  | {
      /**
       * The ID of the parent to place the items in, or `null` for the root.
       */
      parentId: TreeGridItemId | null;
      /**
       * The index among the parent's children, clamped to the valid range.
       * A `move` counts the moved items at their old positions: in `[a, b, c]`, moving `a`
       * to index `2` gives `[b, a, c]`.
       * @default the end of the parent's children
       */
      index?: number | undefined;
    };

/**
 * Records the item changes of an `applyTransaction()` call.
 * The operations are applied in the order they are called, once the callback returns.
 * Each one applies to the items as the earlier operations left them.
 */
export interface TreeGridItemTransaction<TItem> {
  /**
   * Inserts an item with its descendants, at the end of the root unless `position` places it elsewhere.
   * Skipped when the tree has an item with the same ID: use `set` to replace an item wholesale or
   * `update` to merge fields into it.
   */
  add: (item: TItem, position?: TreeGridItemPosition) => void;
  /**
   * Inserts an item, or replaces the item with the same ID wholesale.
   * The item is stored exactly as passed, and its children replace the previous ones.
   * A replaced item keeps its position, and an item the tree already holds is skipped.
   */
  set: (item: TItem, position?: TreeGridItemPosition) => void;
  /**
   * Merges a patch into the item with the given ID (`{ ...item, ...patch }`).
   * Skipped when no item has the ID, or when the patch changes no field.
   */
  update: (itemId: TreeGridItemId, patch: Partial<TItem>) => void;
  /**
   * Moves items with their descendants, keeping their tree order.
   * IDs the tree doesn't have are skipped.
   */
  move: (
    itemIds: TreeGridItemId | readonly TreeGridItemId[],
    position: TreeGridItemPosition,
  ) => void;
  /**
   * Removes an item with its descendants. Unknown IDs are ignored.
   */
  remove: (itemId: TreeGridItemId) => void;
}

/**
 * One change of an `onItemsChange` event. The changes are listed in the order
 * they applied, and each one is relative to the items as the previous ones left
 * them, so applying them in order rebuilds the new items.
 */
export type TreeGridItemChange<TItem> =
  | {
      type: 'add';
      /**
       * The added items, each with its descendants, placed one after the other.
       */
      items: TItem[];
      /**
       * The ID of the parent the items were added to, or `null` for the root.
       */
      parentId: TreeGridItemId | null;
      /**
       * The index of the first added item among its new siblings.
       */
      index: number;
    }
  | {
      type: 'remove';
      /**
       * The removed items. Their descendants were removed along with them.
       */
      itemIds: TreeGridItemId[];
    }
  | {
      type: 'move';
      /**
       * The moved items, with their descendants, in the order they were placed in.
       */
      itemIds: TreeGridItemId[];
      /**
       * The ID of the parent the items were moved to, or `null` for the root.
       */
      parentId: TreeGridItemId | null;
      /**
       * The index of the first moved item among its new siblings, counted once the
       * moved items left their previous positions.
       */
      index: number;
    }
  | {
      type: 'update';
      /**
       * The ID of the replaced item.
       */
      itemId: TreeGridItemId;
      /**
       * The new model, whose children replaced the previous ones.
       */
      item: TItem;
    };

export type TreeGridRootItemsChangeEventDetails<TItem> = BaseUIChangeEventDetails<
  TreeGridRootItemsChangeEventReason,
  {
    /**
     * The changes, in the order they applied.
     */
    changes: TreeGridItemChange<TItem>[];
  }
>;

export interface TreeGridRootItemExpansionToggleValue {
  itemId: TreeGridItemId;
  expanded: boolean;
}

export interface TreeGridRootItemSelectionToggleValue {
  itemId: TreeGridItemId;
  selected: boolean;
}

/**
 * The full store state for the TreeGrid component.
 */
export interface TreeGridState<TItem = any> extends TreeGridItemsState<TItem> {
  /**
   * Whether the entire tree is disabled
   */
  disabled: boolean;
  /**
   * The item models the tree renders from.
   */
  items: readonly TItem[];
  /**
   * The raw `items` prop; `undefined` when the tree is uncontrolled. See
   * `expandedItemsProp` — a mutation commits `items` internally only while this
   * is `undefined`, so a controlled tree that does not feed a change back stays
   * exactly as its parent rendered it.
   */
  itemsProp: readonly TItem[] | undefined;
  /** The active normalized collection descriptor, tracked by identity. */
  itemCollection: InternalTreeGridItemCollection<TItem>;
  /** Derives the presented view; installed by `TreeGrid.FilterProvider`. */
  viewTransform: TreeGridViewTransform | undefined;
  /** The filter inputs; `undefined` until `TreeGrid.FilterProvider` installs filtering. */
  filterOptions?: TreeGridFilterOptions<TItem> | undefined;
  /** Expansion changes the user made during the current filter session. */
  filterExpansionOverrides?: TreeGridFilterExpansionOverrides | undefined;
  /** The id of the rendered list, published for `TreeGrid.Input` to reference. */
  listId?: string | undefined;
  /** The id of `TreeGrid.Label`, which names the list. */
  labelId?: string | undefined;
  /**
   * IDs of currently expanded items
   */
  expandedItems: readonly TreeGridItemId[];
  /**
   * The controlled `expandedItems` prop, or `undefined` when uncontrolled.
   * Internal expansion state is only mutated when this is `undefined`; otherwise
   * the prop drives `expandedItems` (synced via an observer in the store).
   */
  expandedItemsProp: readonly TreeGridItemId[] | undefined;
  /**
   * Whether clicking anywhere on an item row toggles expansion
   */
  expandOnClick: boolean;
  /**
   * The minimum time between two commits of `applyTransaction()`, in milliseconds.
   */
  transactionThrottle: number;
  /**
   * Currently selected items.
   * - `TreeGridItemId | null` with single selection
   * - `TreeGridItemId[]`, or the `TREE_GRID_SELECTION_ALL` sentinel, with `multiple`
   */
  selectedItems: TreeGridItemId | null | readonly TreeGridItemId[] | typeof TREE_GRID_SELECTION_ALL;
  /**
   * The controlled `selectedItems` prop, or `undefined` when uncontrolled.
   * Internal selection state is only mutated when this is `undefined`; otherwise
   * the prop drives `selectedItems` (synced via an observer in the store).
   */
  selectedItemsProp:
    TreeGridItemId | null | readonly TreeGridItemId[] | typeof TREE_GRID_SELECTION_ALL | undefined;
  /**
   * Whether multiple items can be selected, and whether pressing an item without a modifier
   * replaces the selection (`'opt-in'`)
   */
  multiple: boolean | 'opt-in';
  /**
   * Whether the user is prevented from deselecting the last selected item
   */
  disableEmptySelection: boolean;
  /**
   * How checkbox selection propagates through the hierarchy.
   * Only applies to checkbox interactions with toggle semantics.
   * It does not affect item presses, which use replace semantics.
   */
  checkboxSelectionPropagation: TreeGridCheckboxSelectionPropagation;
  /**
   * The currently focused item ID, or null
   */
  focusedItemId: TreeGridItemId | null;
  /**
   * The item that held focus when focus last left the tree. It keeps the roving
   * tab stop, so tabbing back in returns to where the user left.
   */
  lastFocusedItemId: TreeGridItemId | null;
  /**
   * Whether disabled items can receive focus
   */
  itemFocusableWhenDisabled: boolean;
  /**
   * The layout direction of the tree
   */
  direction: 'ltr' | 'rtl';
  /**
   * Map of item IDs that are currently animating their children group.
   * Key: parent item ID, Value: animation direction and affected children.
   */
  animatingGroups: TreeGridItemKeyed<TreeGridAnimatingGroup>;
  /** How many active `TreeGrid.ItemLink` parts each item renders. */
  activeLinkCounts: TreeGridItemKeyed<number>;
  /**
   * Whether the consumer passed `onItemsChange`. The store's context always holds
   * a stable wrapper for it, so checking that would never tell a supplied handler
   * from an absent one — which is what the controlled-`items` warning needs.
   */
  hasItemsChangeHandler: boolean;
  /** Whether `onItemSelectionToggle` is set; the context always holds a callable. */
  hasItemSelectionToggleHandler: boolean;
  /** The latest change `TreeGrid.Status` announces. */
  statusChange: TreeGridStatusChange | null;
}

/**
 * Non-reactive context values stored alongside state in the TreeGridStore.
 */
export interface TreeGridStoreContext<TItem> {
  rootRef: React.RefObject<HTMLElement | null>;
  onExpandedItemsChange:
    | ((
        expandedItems: TreeGridItemId[],
        eventDetails: TreeGridRootExpansionChangeEventDetails,
      ) => void)
    | undefined;
  onSelectedItemsChange:
    | ((
        selectedItems: TreeGridItemId | null | TreeGridItemId[] | typeof TREE_GRID_SELECTION_ALL,
        eventDetails: TreeGridRootSelectionChangeEventDetails,
      ) => void)
    | undefined;
  onItemExpansionToggle:
    | ((
        value: TreeGridRootItemExpansionToggleValue,
        eventDetails: TreeGridRootItemExpansionToggleEventDetails,
      ) => void)
    | undefined;
  onItemSelectionToggle:
    | ((
        value: TreeGridRootItemSelectionToggleValue,
        eventDetails: TreeGridRootItemSelectionToggleEventDetails,
      ) => void)
    | undefined;
  onItemHighlighted:
    | ((
        itemId: TreeGridItemId | undefined,
        eventDetails: TreeGridRootHighlightEventDetails,
      ) => void)
    | undefined;
  onItemsChange:
    | ((items: TItem[], eventDetails: TreeGridRootItemsChangeEventDetails<TItem>) => void)
    | undefined;
}

/**
 * Keys from TreeGridState that have default values applied by TreeGridRoot.
 * TreeGridStoreParameters picks them as required; TreeGridRootProps makes them optional again.
 */
export type TreeGridStateDefaultedKeys =
  | 'disabled'
  | 'expandOnClick'
  | 'multiple'
  | 'disableEmptySelection'
  | 'checkboxSelectionPropagation'
  | 'itemFocusableWhenDisabled';

export interface TreeGridStoreParameters<
  Multiple extends boolean | 'opt-in' | undefined = undefined,
  TItem = TreeGridDefaultItem,
> extends Pick<TreeGridState<TItem>, TreeGridStateDefaultedKeys> {
  /** The active normalized collection descriptor. */
  itemCollection: InternalTreeGridItemCollection<TItem>;
  /**
   * The items to render.
   * Each item must have a unique identifier.
   *
   * Controlled: the component renders exactly what is passed and never changes it on
   * its own. Anything that would modify the model, such as the `actionsRef`
   * mutation methods, reports
   * through `onItemsChange`, and only shows up once the new items come back in
   * through this prop.
   *
   * To let the component own the items, use the `defaultItems` prop instead.
   */
  items?: readonly TItem[] | undefined;
  /**
   * The items that are initially rendered.
   *
   * To render a controlled component, use the `items` prop instead.
   */
  defaultItems?: readonly TItem[] | undefined;
  /**
   * The expanded items.
   *
   * To render an uncontrolled component, use the `defaultExpandedItems` prop instead.
   */
  expandedItems?: readonly TreeGridItemId[] | undefined;
  /**
   * The items that are initially expanded.
   *
   * To render a controlled component, use the `expandedItems` prop instead.
   * @default []
   */
  defaultExpandedItems?: readonly TreeGridItemId[] | undefined;
  /**
   * Event handler called when items are expanded or collapsed.
   *
   * The event `reason` is `'missing'` when expanded items left the tree. Automatic
   * changes cannot be canceled; calling `eventDetails.cancel()` for `'missing'` has no effect.
   */
  onExpandedItemsChange?:
    | ((
        expandedItems: TreeGridItemId[],
        eventDetails: TreeGridRootExpansionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is expanded or collapsed.
   */
  onItemExpansionToggle?:
    | ((
        value: TreeGridRootItemExpansionToggleValue,
        eventDetails: TreeGridRootItemExpansionToggleEventDetails,
      ) => void)
    | undefined;
  /**
   * The selected items.
   *
   * To render an uncontrolled component, use the `defaultSelectedItems` prop instead.
   */
  selectedItems?:
    | TreeGridSelectedItemsType<Multiple>
    | (Multiple extends true | 'opt-in' ? never : null)
    | undefined;
  /**
   * The items that are initially selected.
   * Defaults to `null`, or `[]` with `multiple`.
   *
   * To render a controlled component, use the `selectedItems` prop instead.
   */
  defaultSelectedItems?:
    | TreeGridSelectedItemsType<Multiple>
    | (Multiple extends true | 'opt-in' ? never : null)
    | undefined;
  /**
   * Event handler called when the selected items change.
   *
   * The event `reason` is `'missing'` when selected items left the tree, and `'none'` when
   * the tree re-applies checkbox propagation after its items change, such as when a checked
   * folder loads its children. Automatic changes cannot be canceled; calling
   * `eventDetails.cancel()` for `'missing'` or `'none'` has no effect.
   */
  onSelectedItemsChange?:
    | ((
        selectedItems:
          | TreeGridSelectedItemsChangeValue<Multiple>
          | (Multiple extends true | 'opt-in' ? never : null),
        eventDetails: TreeGridRootSelectionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is selected or deselected.
   */
  onItemSelectionToggle?:
    | ((
        value: TreeGridRootItemSelectionToggleValue,
        eventDetails: TreeGridRootItemSelectionToggleEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is highlighted (it receives focus, or one of its
   * controls does) or unhighlighted.
   * Receives the highlighted item's id, or `undefined` when no item is highlighted anymore,
   * such as when focus leaves the tree.
   *
   * The event `reason` is `'none'` when nothing in the tree caused it, such as tabbing
   * into or out of the tree, or focus moving away from a removed item.
   */
  onItemHighlighted?:
    | ((
        itemId: TreeGridItemId | undefined,
        eventDetails: TreeGridRootHighlightEventDetails,
      ) => void)
    | undefined;
  /**
   * The direction of the tree layout.
   */
  direction: 'ltr' | 'rtl';
  /**
   * A ref to the root element of the tree.
   */
  rootRef: React.RefObject<HTMLElement | null>;
  /**
   * Event handler called when the items change.
   * Fires when items are added, removed, moved, or updated, so controlled
   * hierarchies can persist every edit.
   */
  onItemsChange?:
    | ((items: TItem[], eventDetails: TreeGridRootItemsChangeEventDetails<TItem>) => void)
    | undefined;
}

/**
 * Actions that can be performed imperatively on a tree via `actionsRef`.
 */
export interface TreeGridRootActions<TItem = TreeGridDefaultItem> {
  /**
   * Returns whether the item is disabled, including by an ancestor or the tree.
   */
  isItemDisabled: (itemId: TreeGridItemId) => boolean;
  /** Whether an item exists in the tree. */
  hasItem: (itemId: TreeGridItemId) => boolean;
  /** Returns a copy of the selected item IDs. */
  getSelectedItemIds: () => Set<TreeGridItemId>;
  /** Returns the models for the supplied IDs, skipping unknown items. */
  getItemModels: (itemIds: Iterable<TreeGridItemId>) => TItem[];
  // --- Queries ---
  /**
   * Returns the zero-based index of an item among its siblings, or `-1` when the item
   * isn't in the tree.
   */
  getItemIndex: (itemId: TreeGridItemId) => number;
  /**
   * Returns the model (data) associated with the given item ID,
   * or `undefined` if the item does not exist.
   */
  getItemModel: (itemId: TreeGridItemId) => TItem | undefined;
  /**
   * Returns the ordered child IDs of an item, or of the root when `itemId` is `null`.
   * Returns an empty array for an item that has no children or isn't in the tree.
   */
  getChildIds: (itemId: TreeGridItemId | null) => readonly TreeGridItemId[];
  /**
   * Returns the parent ID of an item, or `null` when it is a root item or isn't in the tree.
   */
  getParentId: (itemId: TreeGridItemId) => TreeGridItemId | null;
  /**
   * Returns the IDs of an item's ancestors, from the root down to its parent.
   * Returns an empty array for a root item or an item that isn't in the tree.
   */
  getAncestorIds: (itemId: TreeGridItemId) => TreeGridItemId[];
  /**
   * Returns the DOM element rendered for an item, or `null` when it is not mounted.
   */
  getItemDOMElement: (itemId: TreeGridItemId) => HTMLElement | null;
  /**
   * Returns the currently focused item ID, or `null` when none is focused.
   */
  getFocusedItemId: () => TreeGridItemId | null;
  /**
   * Whether an item is currently expanded.
   */
  isItemExpanded: (itemId: TreeGridItemId) => boolean;
  /**
   * Whether an item can be expanded (has or may have children).
   */
  isItemExpandable: (itemId: TreeGridItemId) => boolean;
  /**
   * Whether an item is currently selected.
   */
  isItemSelected: (itemId: TreeGridItemId) => boolean;

  // --- Mutations ---
  /**
   * Applies item changes as a single change: one `onItemsChange` call, and one proposal while
   * `items` is controlled.
   * The callback records `add`, `set`, `update`, `move`, and `remove` operations on the
   * transaction, which are applied in the order they were called once it returns. Using the
   * transaction after the callback returned throws.
   *
   * The changes are applied, or proposed, before this returns, unless `transactionThrottle`
   * holds them for the rest of its window.
   * Resolves with whether any item changed, or was proposed through `onItemsChange` while
   * `items` is controlled.
   * Rejects when the callback throws, which applies none of its operations, or when an
   * operation is invalid.
   */
  applyTransaction: (
    callback: (transaction: TreeGridItemTransaction<TItem>) => void,
  ) => Promise<boolean>;
  /**
   * Commits the transactions that `transactionThrottle` holds back right away,
   * instead of when their window ends.
   */
  flushTransactions: () => void;

  // --- Expansion / selection / focus ---
  /**
   * Expands every expandable item.
   */
  expandAll: () => void;
  /**
   * Collapses every expanded item.
   */
  collapseAll: () => void;
  /**
   * Expands or collapses a single item.
   * In an uncontrolled tree, an item that isn't in the tree yet, such as one just added with
   * `applyTransaction()`, keeps the expansion for when it appears, and no callback reports it.
   * A controlled tree must add the item to `expandedItems` itself.
   */
  setItemExpansion: (itemId: TreeGridItemId, expanded: boolean) => void;
  /**
   * Selects or deselects an item, keeping the rest of a multiple selection.
   * The change propagates through the hierarchy like the item's checkbox, following `checkboxSelectionPropagation`.
   */
  setItemSelection: (itemId: TreeGridItemId, selected: boolean) => void;
  /**
   * Moves focus to an item.
   */
  focusItem: (itemId: TreeGridItemId) => void;
}

/**
 * An entry in the flat list that can be either a regular item or a group transition wrapper.
 */
export type FlatListEntry =
  | { type: 'item'; itemId: TreeGridItemId }
  | {
      type: 'group-transition';
      parentId: TreeGridItemId;
      childIds: TreeGridItemId[];
      animation: 'expanding' | 'collapsing';
    };
