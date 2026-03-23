import type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../../utils/createBaseUIEventDetails';
import type { CollectionItemId } from '../../types/collection';
import type { DragAndDropState, useDragAndDrop } from '../../use-drag-and-drop';
import { REASONS } from '../../utils/reasons';
import { TreeStore } from './TreeStore';

export type TreeItemId = CollectionItemId;

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
 * When `Mode` is `'multiple'`, the type is `CollectionItemId[]` or `typeof TREE_SELECTION_ALL`.
 * Otherwise, the type is `CollectionItemId`.
 */
export type TreeSelectedItemsType<Mode extends TreeSelectionMode | undefined> =
  Mode extends 'multiple' ? CollectionItemId[] | typeof TREE_SELECTION_ALL : CollectionItemId;

/**
 * The shape of an item as provided by the user in the `items` prop.
 * Users can extend this with custom properties.
 */
export interface TreeDefaultItemModel {
  id: CollectionItemId;
  label: string;
  children?: TreeDefaultItemModel[] | undefined;
  [key: string]: any;
}

/**
 * Internal metadata about an item, derived from the items prop processing.
 */
export interface TreeItemMeta {
  id: CollectionItemId;
  parentId: CollectionItemId | null;
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
 * Lazy loading status (loading indicators and errors).
 * Children and expandable state are stored directly in the generic lookups.
 */
export interface TreeLazyItemsState {
  /**
   * Whether each item's children are currently being fetched.
   */
  loading: Record<CollectionItemId, boolean>;
  /**
   * Error that occurred while fetching an item's children, if any.
   */
  errors: Record<CollectionItemId, Error | undefined>;
}

/**
 * Sentinel ID used as the parent key for root-level items in lazy loading state.
 */
export const TREE_VIEW_ROOT_PARENT_ID = '__ROOT__';

/**
 * The computed lookup tables derived from the items prop and accessor functions.
 */
export interface TreeItemsState<TItem = any> {
  /**
   * Maps each item ID to its full item model.
   */
  itemModelLookup: Record<CollectionItemId, TItem>;
  /**
   * Maps each item ID to its computed metadata (depth, parent, disabled, etc.).
   */
  itemMetaLookup: Record<CollectionItemId, TreeItemMeta>;
  /**
   * Maps each item ID to the ordered list of its children's IDs.
   * The root's children are keyed by `TREE_VIEW_ROOT_PARENT_ID`.
   */
  itemOrderedChildrenIdsLookup: Record<CollectionItemId, CollectionItemId[]>;
  /**
   * Maps each item ID to a record of its children's IDs to their index among siblings.
   */
  itemChildrenIndexesLookup: Record<CollectionItemId, Record<CollectionItemId, number>>;
  /**
   * Maps the stringified ID back to the original ID.
   * Used to recover the original type (string vs number) when reading IDs from DOM attributes.
   */
  itemIdLookup: Record<string, CollectionItemId>;
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

export type TreeRootItemsChangeEventReason = typeof REASONS.imperativeAction | typeof REASONS.drag;

/**
 * Position of an item in the tree (parent + sibling index).
 */
export interface TreeItemPosition {
  parentId: CollectionItemId | null;
  index: number;
}

/**
 * Per-item change info attached to `TreeRootItemsChangeEventDetails`.
 * All three arrays are always present (empty when no changes of that type).
 */
export interface TreeItemsChangeInfo {
  added: { item: any; parentId: CollectionItemId | null; index: number }[];
  removed: { itemId: CollectionItemId; parentId: CollectionItemId | null }[];
  moved: {
    itemId: CollectionItemId;
    oldPosition: TreeItemPosition;
    newPosition: TreeItemPosition;
  }[];
}

export type TreeRootItemsChangeEventDetails = BaseUIChangeEventDetails<
  TreeRootItemsChangeEventReason,
  TreeItemsChangeInfo
>;

export interface TreeItemExpansionToggleValue {
  itemId: CollectionItemId;
  isExpanded: boolean;
}

export interface TreeItemSelectionToggleValue {
  itemId: CollectionItemId;
  isSelected: boolean;
}

/**
 * The full store state for the Tree component.
 */
export interface TreeState<TItem = any> {
  /**
   * Whether the entire tree is disabled
   */
  disabled: boolean;
  /**
   * The raw items prop from the user
   */
  items: readonly TItem[];
  /**
   * Maps each item ID to its full item model.
   * Updated incrementally by mutations.
   */
  itemModelLookup: Record<CollectionItemId, TItem>;
  /**
   * Maps each item ID to its computed metadata (depth, parent, disabled, etc.).
   * Updated incrementally by mutations.
   */
  itemMetaLookup: Record<CollectionItemId, TreeItemMeta>;
  /**
   * Maps each parent item ID to the ordered list of its children's IDs.
   * Root children are keyed by `TREE_VIEW_ROOT_PARENT_ID`.
   * Updated incrementally by mutations.
   */
  itemOrderedChildrenIdsLookup: Record<CollectionItemId, CollectionItemId[]>;
  /**
   * Maps each parent item ID to a record of its children's IDs to their index among siblings.
   * Updated incrementally by mutations.
   */
  itemChildrenIndexesLookup: Record<CollectionItemId, Record<CollectionItemId, number>>;
  /**
   * Maps the stringified ID back to the original ID.
   * Updated incrementally by mutations.
   */
  itemIdLookup: Record<string, CollectionItemId>;
  /**
   * Returns a new item with the given disabled state set.
   */
  setIsItemDisabled: (item: TItem, isDisabled: boolean) => TItem;
  /**
   * IDs of currently expanded items
   */
  expandedItems: readonly CollectionItemId[];
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
  selectedItems: CollectionItemId | null | readonly CollectionItemId[] | typeof TREE_SELECTION_ALL;
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
  focusedItemId: CollectionItemId | null;
  /**
   * Whether disabled items can receive focus
   */
  itemFocusableWhenDisabled: boolean;
  /**
   * Lazy loading status (loading indicators and errors).
   * `undefined` when lazy loading is not enabled.
   */
  lazyItems: TreeLazyItemsState | undefined;
  /**
   * Extracts the ID from an item model
   */
  itemToId: (item: TItem) => CollectionItemId;
  /**
   * Extracts the label from an item model
   */
  itemToStringLabel: (item: TItem) => string;
  /**
   * Extracts the children from an item model
   */
  itemToChildren: (item: TItem) => readonly TItem[] | undefined;
  /**
   * Returns a new item with the given children set
   */
  setItemChildren: (item: TItem, children: readonly TItem[]) => TItem;
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
   * Drag-and-drop visual state.
   * `undefined` when drag-and-drop is not enabled.
   */
  dragAndDrop: DragAndDropState | undefined;
  /**
   * The ID of the group (folder) containing the current drop target.
   * Computed by `resolveDropTargetGroup` when provided on `Tree.Root`.
   * `null` when the feature is not enabled or nothing is being hovered.
   */
  dropTargetGroupId: CollectionItemId | null;
  /**
   * Map of item IDs that are currently animating their children group.
   * Key: parent item ID, Value: animation direction and affected children.
   */
  animatingGroups: Record<
    CollectionItemId,
    {
      parentId: CollectionItemId;
      type: 'expanding' | 'collapsing';
      childIds: CollectionItemId[];
    }
  >;
}

/**
 * Non-reactive context values stored alongside state in the TreeStore.
 */
export interface TreeStoreContext<TItem> {
  rootRef: React.RefObject<HTMLElement | null>;
  onExpandedItemsChange: (
    expandedItems: CollectionItemId[],
    details: TreeRootExpansionChangeEventDetails,
  ) => void;
  onSelectedItemsChange: (
    selectedItems: CollectionItemId | null | CollectionItemId[] | typeof TREE_SELECTION_ALL,
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
  onItemFocus: (itemId: CollectionItemId, details: TreeItemFocusEventDetails) => void;
  onItemsChange: (items: TItem[], details: TreeRootItemsChangeEventDetails) => void;
}

export interface TreeStoreParameters<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The items to render.
   * Each item must have a unique identifier.
   *
   * To render an uncontrolled tree, use the `defaultItems` prop instead.
   */
  items?: readonly TItem[] | undefined;
  /**
   * The items that are initially rendered.
   *
   * To render a controlled tree, use the `items` prop instead.
   */
  defaultItems?: readonly TItem[] | undefined;
  /**
   * The expanded items.
   *
   * To render an uncontrolled tree, use the `defaultExpandedItems` prop instead.
   */
  expandedItems?: readonly CollectionItemId[] | undefined;
  /**
   * The items that are initially expanded.
   *
   * To render a controlled tree, use the `expandedItems` prop instead.
   * @default []
   */
  defaultExpandedItems?: readonly CollectionItemId[] | undefined;
  /**
   * Whether clicking anywhere on an item row toggles expansion.
   * When `false`, only `Tree.ItemExpansionTrigger` can expand items.
   * @default false
   */
  expandOnClick?: boolean | undefined;
  /**
   * Event handler called when items are expanded or collapsed.
   */
  onExpandedItemsChange?:
    | ((
        expandedItems: CollectionItemId[],
        eventDetails: TreeRootExpansionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is expanded or collapsed.
   */
  onItemExpansionToggle?:
    | ((value: TreeItemExpansionToggleValue, details: TreeItemExpansionToggleEventDetails) => void)
    | undefined;
  /**
   * The selected items.
   *
   * To render an uncontrolled tree, use the `defaultSelectedItems` prop instead.
   */
  selectedItems?:
    | TreeSelectedItemsType<Mode>
    | (Mode extends 'multiple' ? never : null)
    | undefined;
  /**
   * The items that are initially selected.
   *
   * To render a controlled tree, use the `selectedItems` prop instead.
   * @default []
   */
  defaultSelectedItems?:
    | TreeSelectedItemsType<Mode>
    | (Mode extends 'multiple' ? never : null)
    | undefined;
  /**
   * Event handler called when the selected items change.
   */
  onSelectedItemsChange?:
    | ((
        selectedItems: TreeSelectedItemsType<Mode> | (Mode extends 'multiple' ? never : null),
        eventDetails: TreeRootSelectionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * Event handler called when an item is selected or deselected.
   */
  onItemSelectionToggle?:
    | ((value: TreeItemSelectionToggleValue, details: TreeItemSelectionToggleEventDetails) => void)
    | undefined;
  /**
   * The selection mode of the tree.
   * Use `'single'` for single selection, `'multiple'` for multiple selection.
   */
  selectionMode?: Mode | undefined;
  /**
   * Whether the tree disallows having no selected item.
   * When `true`, at least one item must remain selected at all times.
   * @default false
   */
  disallowEmptySelection?: boolean | undefined;
  /**
   * Controls how selecting a `Tree.CheckboxItem` propagates through the tree hierarchy.
   * This does not affect `Tree.Item` interactions (which use replace-selection semantics).
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
  checkboxSelectionPropagation?:
    | { parents?: boolean | undefined; descendants?: boolean | undefined }
    | undefined;
  /**
   * Whether disabled items should be focusable.
   * @default false
   */
  itemFocusableWhenDisabled?: boolean | undefined;
  /**
   * Event handler called when an item is focused.
   */
  onItemFocus?:
    | ((itemId: CollectionItemId, details: TreeItemFocusEventDetails) => void)
    | undefined;
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
   * The direction of the tree layout.
   */
  direction: 'ltr' | 'rtl';
  /**
   * A ref to the root element of the tree.
   */
  rootRef: React.RefObject<HTMLElement | null>;
  /**
   * The lazy loading plugin instance returned by `Tree.useLazyLoading`.
   * It is used to load items on demand when expanding a parent item.
   */
  lazyLoading?: TreeLazyLoading<TItem> | undefined;
  /**
   * The drag-and-drop plugin instance returned by `useDragAndDrop`.
   * It is used to enable drag-and-drop interactions on the tree.
   */
  dragAndDrop?: ReturnType<typeof useDragAndDrop> | undefined;
  /**
   * Event handler called when items are reordered or reparented.
   */
  onItemsChange?: ((items: TItem[], details: TreeRootItemsChangeEventDetails) => void) | undefined;
  /**
   * Maps a drop target item to its containing group (e.g., parent folder).
   * When provided, items in the group receive `data-drop-target-group`.
   */
  resolveDropTargetGroup?:
    | ((dropTargetItemId: CollectionItemId) => CollectionItemId | null)
    | undefined;
}

export interface TreeLazyLoading<TItem = TreeDefaultItemModel> {
  attach(store: TreeStore<any, TItem>): void;
  onBeforeExpand(
    itemId: CollectionItemId,
    reason: TreeRootExpansionChangeEventReason,
    event?: Event,
  ): Promise<void>;
  refreshItemChildren(itemId: CollectionItemId | null): Promise<void>;
  destroy(): void;
}

/**
 * Actions that can be performed imperatively on a tree via actionsRef.
 */
export type TreeRootActions<TItem = TreeDefaultItemModel> = TreeStore<any, TItem>['actions'];

/**
 * An entry in the flat list that can be either a regular item or a group transition wrapper.
 */
export type FlatListEntry =
  | { type: 'item'; itemId: CollectionItemId }
  | {
      type: 'group-transition';
      parentId: CollectionItemId;
      childIds: CollectionItemId[];
      animation: 'expanding' | 'collapsing';
    };
