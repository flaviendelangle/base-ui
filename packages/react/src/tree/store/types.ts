import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import { REASONS } from '../../utils/reasons';

export type TreeItemId = string | number;

/**
 * The selection mode of the tree.
 * - `'none'`: Selection is disabled.
 * - `'single'`: Only one item can be selected at a time.
 * - `'multiple'`: Multiple items can be selected.
 */
export type TreeSelectionMode = 'none' | 'single' | 'multiple';

/**
 * Sentinel value representing "all selectable items are selected".
 * When used as the value of `selectedItems`, every selectable item in the tree
 * is considered selected — including items that are lazy-loaded after the value is set.
 *
 * Only valid when `selectionMode` is `'multiple'`.
 *
 * Note: avoid using the string `"all"` as an item `id` in your data,
 * as it collides with this sentinel.
 */
export const TREE_SELECTION_ALL = 'all' as const;

/**
 * Conditional type that narrows the selected items type based on the `selectionMode` prop.
 * When `Mode` is `'multiple'`, the type is `TreeItemId[]` or `typeof TREE_SELECTION_ALL`.
 * Otherwise, the type is `TreeItemId`.
 */
export type TreeSelectedItemsType<Mode extends TreeSelectionMode | undefined> =
  Mode extends 'multiple' ? TreeItemId[] | typeof TREE_SELECTION_ALL : TreeItemId;

/**
 * The shape of an item as provided by the user in the `items` prop.
 * Users can extend this with custom properties.
 */
export interface TreeDefaultItemModel {
  id: TreeItemId;
  label: string;
  children?: TreeDefaultItemModel[] | undefined;
  [key: string]: any;
}

/**
 * Internal metadata about an item, derived from the items prop processing.
 */
export interface TreeItemMeta {
  id: TreeItemId;
  parentId: TreeItemId | null;
  depth: number;
  expandable: boolean;
  disabled: boolean;
  selectable: boolean;
  label: string;
}

/**
 * Checkbox selection propagation configuration.
 * Controls how selecting a `Tree.CheckboxItem` propagates through the tree hierarchy.
 * This does not affect `Tree.Item` (which uses replace-selection semantics).
 */
export interface TreeCheckboxSelectionPropagation {
  parents?: boolean | undefined;
  descendants?: boolean | undefined;
}

/**
 * Sparse per-item metadata patches applied on top of computed metadata.
 * Only the fields that are actually overridden are present.
 */
export type ItemMetaPatches = Record<TreeItemId, Partial<Pick<TreeItemMeta, 'disabled'>>>;

/**
 * Lazy-loaded tree structure and loading state.
 */
export interface TreeLazyItemsState<TItem = TreeDefaultItemModel> {
  /**
   * Lazily-fetched children arrays, keyed by parent item ID.
   */
  children: Record<TreeItemId, TItem[]>;
  /**
   * Whether each item should be treated as expandable (has children to load).
   */
  expandable: Record<TreeItemId, boolean>;
  /**
   * Whether each item's children are currently being fetched.
   */
  loading: Record<TreeItemId, boolean>;
  /**
   * Error that occurred while fetching an item's children, if any.
   */
  errors: Record<TreeItemId, Error | undefined>;
}

/**
 * Sentinel ID used as the parent key for root-level items in lazy loading state.
 */
export const TREE_VIEW_ROOT_PARENT_ID = '__ROOT__';

/**
 * The computed lookup tables derived from the items prop and accessor functions.
 */
export interface TreeItemsState<TItem = TreeDefaultItemModel> {
  /**
   * Maps each item ID to its full item model.
   */
  itemModelLookup: Record<TreeItemId, TItem>;
  /**
   * Maps each item ID to its computed metadata (depth, parent, disabled, etc.).
   */
  itemMetaLookup: Record<TreeItemId, TreeItemMeta>;
  /**
   * Maps each item ID to the ordered list of its children's IDs.
   * The root's children are keyed by `TREE_VIEW_ROOT_PARENT_ID`.
   */
  itemOrderedChildrenIdsLookup: Record<TreeItemId, TreeItemId[]>;
  /**
   * Maps each item ID to a record of its children's IDs to their index among siblings.
   */
  itemChildrenIndexesLookup: Record<TreeItemId, Record<TreeItemId, number>>;
  /**
   * Maps the stringified ID back to the original ID.
   * Used to recover the original type (string vs number) when reading IDs from DOM attributes.
   */
  itemIdLookup: Record<string, TreeItemId>;
}

export type TreeRootExpansionChangeEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.keyboard
  | typeof REASONS.imperativeAction;

export type TreeRootExpansionChangeEventDetails =
  BaseUIChangeEventDetails<TreeRootExpansionChangeEventReason>;

export type TreeRootSelectionChangeEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.keyboard
  | typeof REASONS.imperativeAction;

export type TreeRootSelectionChangeEventDetails =
  BaseUIChangeEventDetails<TreeRootSelectionChangeEventReason>;

export type TreeItemFocusEventReason =
  | typeof REASONS.itemPress
  | typeof REASONS.keyboard
  | typeof REASONS.imperativeAction;

export type TreeItemFocusEventDetails = BaseUIGenericEventDetails<TreeItemFocusEventReason>;

export type TreeItemExpansionToggleEventDetails =
  BaseUIGenericEventDetails<TreeRootExpansionChangeEventReason>;

export type TreeItemSelectionToggleEventDetails =
  BaseUIGenericEventDetails<TreeRootSelectionChangeEventReason>;

export interface TreeItemExpansionToggleValue {
  itemId: TreeItemId;
  isExpanded: boolean;
}

export interface TreeItemSelectionToggleValue {
  itemId: TreeItemId;
  isSelected: boolean;
}

/**
 * The full store state for the Tree component.
 */
export interface TreeState<TItem = TreeDefaultItemModel> {
  /**
   * Whether the entire tree is disabled
   */
  disabled: boolean;
  /**
   * The raw items prop from the user
   */
  items: readonly TItem[];
  /**
   * Sparse per-item metadata patches (imperative disabled).
   * Applied on top of the computed items state in selectors.
   */
  itemMetaPatches: ItemMetaPatches;
  /**
   * IDs of currently expanded items
   */
  expandedItems: readonly TreeItemId[];
  /**
   * Whether clicking anywhere on an item row toggles expansion
   */
  expandOnClick: boolean;
  /**
   * Currently selected items.
   * - string | null when selectionMode is 'single'
   * - string[] or 'all' when selectionMode is 'multiple'
   * - null when selectionMode is 'none'
   */
  selectedItems: TreeItemId | null | readonly TreeItemId[] | typeof TREE_SELECTION_ALL;
  /**
   * The selection mode of the tree
   */
  selectionMode: TreeSelectionMode;
  /**
   * Whether at least one item must remain selected
   */
  disallowEmptySelection: boolean;
  /**
   * How checkbox selection propagates through the tree hierarchy.
   * Only applies to `Tree.CheckboxItem` interactions (toggle semantics).
   * Does not affect `Tree.Item` (replace semantics).
   */
  checkboxSelectionPropagation: TreeCheckboxSelectionPropagation;
  /**
   * The currently focused item ID, or null
   */
  focusedItemId: TreeItemId | null;
  /**
   * Whether disabled items can receive focus
   */
  itemFocusableWhenDisabled: boolean;
  /**
   * Lazy-loaded tree structure and loading state.
   * `undefined` when lazy loading is not enabled.
   */
  lazyItems: TreeLazyItemsState<TItem> | undefined;
  /**
   * Extracts the ID from an item model
   */
  itemToId: (item: TItem) => TreeItemId;
  /**
   * Extracts the label from an item model
   */
  itemToStringLabel: (item: TItem) => string;
  /**
   * Extracts the children from an item model
   */
  itemToChildren: (item: TItem) => TItem[] | undefined;
  /**
   * Whether an item is disabled
   */
  isItemDisabled: (item: TItem) => boolean;
  /**
   * Whether an item's selection is disabled
   */
  isItemSelectionDisabled: (item: TItem) => boolean;
  /**
   * The layout direction of the tree
   */
  direction: 'ltr' | 'rtl';
  /**
   * Whether the items are being externally virtualized.
   */
  virtualized: boolean;
  /**
   * Whether group transitions (expand/collapse animation) are enabled.
   */
  enableGroupTransition: boolean;
  /**
   * Map of item IDs that are currently animating their children group.
   * Key: parent item ID, Value: animation direction and affected children.
   */
  animatingGroups: Record<
    TreeItemId,
    {
      type: 'expanding' | 'collapsing';
      childIds: TreeItemId[];
    }
  >;
}

/**
 * Non-reactive context values stored alongside state in the TreeStore.
 */
export interface TreeStoreContext {
  rootRef: React.RefObject<HTMLElement | null>;
  onExpandedItemsChange: (
    expandedItems: TreeItemId[],
    details: TreeRootExpansionChangeEventDetails,
  ) => void;
  onSelectedItemsChange: (
    selectedItems: TreeItemId | null | TreeItemId[] | typeof TREE_SELECTION_ALL,
    details: TreeRootSelectionChangeEventDetails,
  ) => void;
  onItemExpansionToggle: (
    value: TreeItemExpansionToggleValue,
    details: TreeItemExpansionToggleEventDetails,
  ) => void;
  onItemSelectionToggle: (
    value: TreeItemSelectionToggleValue,
    details: TreeItemSelectionToggleEventDetails,
  ) => void;
  onItemFocus: (itemId: TreeItemId, details: TreeItemFocusEventDetails) => void;
}

/**
 * Actions that can be performed imperatively on a tree via actionsRef.
 */
export interface TreeRootActions {
  focusItem: (itemId: TreeItemId) => void;
  getItemDOMElement: (itemId: TreeItemId) => HTMLElement | null;
  getItemOrderedChildrenIds: (itemId: TreeItemId | null) => TreeItemId[];
  getParentId: (itemId: TreeItemId) => TreeItemId | null;
  isItemExpanded: (itemId: TreeItemId) => boolean;
  isItemSelected: (itemId: TreeItemId) => boolean;
  setItemExpansion: (itemId: TreeItemId, isExpanded: boolean) => void;
  setItemSelection: (itemId: TreeItemId, isSelected: boolean) => void;
  setIsItemDisabled: (itemId: TreeItemId, isDisabled: boolean) => void;
  refreshItemChildren: (itemId: TreeItemId | null) => Promise<void>;
  expandAll: () => void;
  collapseAll: () => void;
}

/**
 * An entry in the flat list that can be either a regular item or a group transition wrapper.
 */
export type FlatListEntry =
  | { type: 'item'; itemId: TreeItemId }
  | {
      type: 'group-transition';
      parentId: TreeItemId;
      childIds: TreeItemId[];
      animation: 'expanding' | 'collapsing';
    };
