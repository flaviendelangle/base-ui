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
  TreeSelectionMode,
  TreeLazyLoading,
  TreeStoreParameters,
} from './types';
import { selectors } from './selectors';
import { buildItemsState } from './buildItemsState';
import { REASONS } from '../../utils/reasons';

export class TreeStore<
  Mode extends TreeSelectionMode | undefined = undefined,
  TItem = TreeDefaultItemModel,
> extends ReactStore<TreeState<TItem>, TreeStoreContext<TItem>, typeof selectors> {
  public itemMutation = new TreeItemMutationPlugin<TItem>(this);

  public selection = new TreeSelectionPlugin(this);

  public expansion = new TreeExpansionPlugin(this);

  public interaction = new TreeInteractionPlugin(this);

  public lazyLoading: TreeLazyLoading<TItem> | undefined;

  public timeoutManager = new TimeoutManager();

  public dragAndDrop: ReturnType<typeof useDragAndDrop> | undefined;

  private dragAndDropCleanup: (() => void) | null = null;

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
