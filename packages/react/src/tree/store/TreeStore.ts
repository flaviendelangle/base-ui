import { ReactStore } from '@base-ui/utils/store';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui/utils/empty';
import { TimeoutManager } from '@base-ui/utils/TimeoutManager';
import type { useDragAndDrop } from '../../use-drag-and-drop';
import { TreeItemMutationPlugin } from '../plugins/TreeItemMutationPlugin';
import { TreeSelectionPlugin } from '../plugins/TreeSelectionPlugin';
import { TreeExpansionPlugin } from '../plugins/TreeExpansionPlugin';
import { TreeInteractionPlugin } from '../plugins/TreeInteractionPlugin';
import type { CollectionActions, CollectionItemId } from '../../types/collection';
import type {
  TreeState,
  TreeStoreContext,
  TreeDefaultItemModel,
  TreeRootActions,
  TreeRootExpansionChangeEventReason,
  TreeRootExpansionChangeEventDetails,
  TreeRootSelectionChangeEventDetails,
  TreeSelectedItemsType,
  TreeSelectionMode,
  TreeItemExpansionToggleEventDetails,
  TreeItemExpansionToggleValue,
  TreeItemSelectionToggleEventDetails,
  TreeItemSelectionToggleValue,
  TreeItemFocusEventDetails,
  TreeRootItemsChangeEventDetails,
} from './types';
import { selectors } from './selectors';
import { buildItemsState } from './buildItemsState';
import { REASONS } from '../../utils/reasons';

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

export class TreeStore<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
> extends ReactStore<TreeState<TItem>, TreeStoreContext<TItem>, typeof selectors> {
  public itemMutation = new TreeItemMutationPlugin<TItem>(this);

  public selection = new TreeSelectionPlugin(this);

  public expansion = new TreeExpansionPlugin(this);

  public interaction = new TreeInteractionPlugin(this);

  public lazyLoading: TreeLazyLoading<TItem> | undefined;

  public dragAndDrop: ReturnType<typeof useDragAndDrop> | undefined;

  private dragAndDropCleanup: (() => void) | null = null;

  private timeoutManager = new TimeoutManager();

  public resolveDropTargetGroup:
    | ((dropTargetItemId: CollectionItemId) => CollectionItemId | null)
    | undefined;

  /**
   * Holds the items reference from the last mutation that already updated
   * lookups incrementally. The items observer compares against this to skip
   * redundant rebuilds, then clears it.
   */
  public lastMutationItems: readonly TItem[] | null = null;

  constructor(parameters: TreeStoreParameters<Mode, TItem>) {
    const selectionMode: TreeSelectionMode = parameters.selectionMode ?? 'single';
    // Default accessors assume TreeDefaultItemModel shape.
    // The cast is safe: users with custom TItem must provide their own accessors.
    const itemToId =
      parameters.itemToId ??
      ((item: TItem) => (item as TreeDefaultItemModel).id as CollectionItemId);
    const itemToStringLabel =
      parameters.itemToStringLabel ?? ((item: TItem) => (item as TreeDefaultItemModel).label);
    const itemToChildren =
      parameters.itemToChildren ??
      ((item: TItem) => (item as TreeDefaultItemModel).children as TItem[] | undefined);
    const setItemChildren =
      parameters.setItemChildren ??
      ((item: TItem, children: readonly TItem[]) => ({ ...item, children }) as TItem);
    const isItemDisabled =
      parameters.isItemDisabled ?? ((item: TItem) => !!(item as TreeDefaultItemModel).disabled);
    const setIsItemDisabled =
      parameters.setIsItemDisabled ??
      ((item: TItem, disabled: boolean) => ({ ...item, disabled }) as TItem);
    const isItemSelectionDisabled =
      parameters.isItemSelectionDisabled ??
      ((item: TItem) => !!(item as TreeDefaultItemModel).disabled);
    const initialItems =
      parameters.items ?? parameters.defaultItems ?? (EMPTY_ARRAY as readonly TItem[]);
    const initialItemsState = buildItemsState(
      initialItems,
      itemToId,
      itemToStringLabel,
      itemToChildren,
      isItemDisabled,
      isItemSelectionDisabled,
    );
    super(
      {
        disabled: parameters.disabled ?? false,
        items: initialItems,
        ...initialItemsState,
        lazyItems: undefined,
        expandedItems: parameters.expandedItems ?? parameters.defaultExpandedItems ?? EMPTY_ARRAY,
        expandOnClick: parameters.expandOnClick ?? false,
        selectedItems:
          parameters.selectedItems ??
          parameters.defaultSelectedItems ??
          (selectionMode === 'multiple' ? EMPTY_ARRAY : null),
        selectionMode,
        disallowEmptySelection: parameters.disallowEmptySelection ?? false,
        checkboxSelectionPropagation: parameters.checkboxSelectionPropagation ?? {
          parents: true,
          descendants: true,
        },
        focusedItemId: null,
        itemFocusableWhenDisabled: parameters.itemFocusableWhenDisabled ?? false,
        itemToId,
        itemToStringLabel,
        itemToChildren,
        setItemChildren,
        isItemDisabled,
        setIsItemDisabled,
        isItemSelectionDisabled,
        direction: parameters.direction,
        dragAndDrop: undefined,
        dropTargetGroupId: null,
        virtualized: false,
        enableGroupTransition: false,
        animatingGroups: EMPTY_OBJECT,
      },
      {
        onExpandedItemsChange: parameters.onExpandedItemsChange ?? (() => {}),
        onSelectedItemsChange:
          (parameters.onSelectedItemsChange as TreeStoreContext<TItem>['onSelectedItemsChange']) ??
          (() => {}),
        onItemExpansionToggle: parameters.onItemExpansionToggle ?? (() => {}),
        onItemSelectionToggle: parameters.onItemSelectionToggle ?? (() => {}),
        onItemFocus: parameters.onItemFocus ?? (() => {}),
        onItemsChange: parameters.onItemsChange ?? (() => {}),
        rootRef: parameters.rootRef,
      },
      selectors,
    );

    // Wire plugins (attach is called in mountEffect)
    this.lazyLoading = parameters.lazyLoading;
    this.dragAndDrop = parameters.dragAndDrop;
    this.resolveDropTargetGroup = parameters.resolveDropTargetGroup;

    // Watch for external items/accessor changes and rebuild lookups.
    // Mutations set `lastMutationItems` to the new reference so we can
    // distinguish mutation-driven updates (lookups already current) from
    // external/controlled prop updates (need full rebuild).
    this.observe(
      (state: TreeState<TItem>) => state.items,
      (newItems, oldItems) => {
        if (newItems === oldItems) {
          return;
        }
        if (newItems === this.lastMutationItems) {
          this.lastMutationItems = null;
          return;
        }
        this.rebuildItemsState();
      },
    );

    this.observe(selectors.itemAccessors, (newAcc, oldAcc) => {
      if (newAcc === oldAcc) {
        return;
      }
      this.rebuildItemsState();
    });

    this.interaction.setupFocusRecovery();
  }

  // ===========================================================================
  // Items state rebuild
  // ===========================================================================

  /**
   * Rebuilds all 5 lookup tables from `state.items` + current accessors
   * and updates the store state.
   */
  private rebuildItemsState(): void {
    const { state } = this;
    const lookups = buildItemsState(
      state.items,
      state.itemToId,
      state.itemToStringLabel,
      state.itemToChildren,
      state.isItemDisabled,
      state.isItemSelectionDisabled,
    );
    this.update(lookups);
  }

  // ===========================================================================
  // Item DOM element
  // ===========================================================================

  public getItemDOMElement(itemId: CollectionItemId): HTMLElement | null {
    const rootElement = this.context.rootRef.current;
    if (!rootElement) {
      return null;
    }
    return rootElement.querySelector(`[data-item-id="${CSS.escape(String(itemId))}"]`);
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  public mountEffect = () => {
    // Attach plugins on mount rather than in the constructor.
    // This correctly handles React Strict Mode's unmount/remount cycle:
    // destroy() nullifies the store reference, and attach() restores it.
    this.lazyLoading?.attach(this);

    if (this.dragAndDrop) {
      this.dragAndDropCleanup = this.dragAndDrop.attach(this.actions, {
        onStateChange: (dndState) => {
          const prevTargetId = this.state.dragAndDrop?.dropTargetItemId ?? null;
          const newTargetId = dndState.dropTargetItemId;

          this.set('dragAndDrop', dndState);

          // Compute drop target group for folder subtree highlighting
          if (this.resolveDropTargetGroup && dndState.dropTargetItemId != null) {
            const groupId = this.resolveDropTargetGroup(dndState.dropTargetItemId);
            if (this.state.dropTargetGroupId !== groupId) {
              this.set('dropTargetGroupId', groupId);
            }
          } else if (this.state.dropTargetGroupId !== null) {
            this.set('dropTargetGroupId', null);
          }

          // Auto-expand: when hovering a new expandable target, start a timer
          if (newTargetId !== prevTargetId) {
            this.timeoutManager.clearTimeout('autoExpand');
            if (
              newTargetId != null &&
              selectors.isItemExpandable(this.state, newTargetId) &&
              !selectors.isItemExpanded(this.state, newTargetId)
            ) {
              this.timeoutManager.startTimeout('autoExpand', 800, () => {
                this.expansion.applyItemExpansion(newTargetId, true, REASONS.imperativeAction);
              });
            }
          }
        },
        pruneDraggedItems: (itemIds) => {
          const result = new Set<CollectionItemId>();
          for (const id of itemIds) {
            let isDescendant = false;
            for (const otherId of itemIds) {
              if (otherId !== id && this.actions.isDescendantOf(id, otherId)) {
                isDescendant = true;
                break;
              }
            }
            if (!isDescendant) {
              result.add(id);
            }
          }
          return result;
        },
        isDropTargetInvalid: (dropTargetItemId, draggedItemIds) => {
          for (const id of draggedItemIds) {
            if (this.actions.isDescendantOf(dropTargetItemId, id)) {
              return true;
            }
          }
          return false;
        },
      });
    }

    return () => {
      this.interaction.dispose();
      this.timeoutManager.clearAll();
      this.lazyLoading?.destroy();
      this.dragAndDropCleanup?.();
      this.dragAndDropCleanup = null;
    };
  };

  private collectionActions: CollectionActions<TItem> = {
    getItemIndex: (itemId) => selectors.itemIndex(this.state, itemId),
    hasItem: (itemId) => selectors.itemMeta(this.state, itemId) != null,
    getSelectedItemIds: () => new Set(this.selection.materializeSelectedItems()),
    getItemModel: (itemId) => selectors.itemModel(this.state, itemId),
    getItemModels: (itemIds) => {
      const models: TItem[] = [];
      for (const id of itemIds) {
        const model = selectors.itemModel(this.state, id);
        if (model != null) {
          models.push(model);
        }
      }
      return models;
    },
  };

  private actions = {
    ...this.collectionActions,
    ...this.itemMutation.actions,
    ...this.expansion.actions,
    ...this.selection.actions,
    isDescendantOf: (itemId: CollectionItemId, ancestorId: CollectionItemId) => {
      let currentId: CollectionItemId | null = itemId;
      while (currentId != null) {
        currentId = selectors.itemParentId(this.state, currentId);
        if (currentId === ancestorId) {
          return true;
        }
      }
      return false;
    },
    focusItem: (itemId: CollectionItemId) =>
      this.interaction.focusItem(itemId, REASONS.imperativeAction),
    getItemOrderedChildrenIds: (itemId: CollectionItemId | null) =>
      selectors.itemOrderedChildrenIds(this.state, itemId),
    getItemDOMElement: (itemId: CollectionItemId) => this.getItemDOMElement(itemId),
    getParentId: (itemId: CollectionItemId) => selectors.itemParentId(this.state, itemId),
    refreshItemChildren: (itemId: CollectionItemId | null) => {
      if (!this.lazyLoading) {
        throw new Error(
          'Base UI Tree: refreshItemChildren requires a lazyLoading plugin. ' +
            'Pass a lazyLoading prop to Tree.Root created via Tree.useLazyLoading().',
        );
      }
      return this.lazyLoading.refreshItemChildren(itemId);
    },
  };

  public getActions(): TreeRootActions<TItem> {
    return this.actions;
  }
}
