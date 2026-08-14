'use client';
import * as React from 'react';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useTimeout } from '@base-ui/utils/useTimeout';
import { warn } from '@base-ui/utils/warn';
import { DraggablePreviewProvider } from '../../draggable/preview-provider/DraggablePreviewProvider';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { findItemIndex } from '../../internals/itemEquality';
import type { CollectionActions, CollectionItemId } from '../../types/collection';
import {
  useDraggableCollection,
  type CollectionDragPreview,
  type DraggableCollectionState,
} from '../../internals/use-draggable-collection';
import { useListboxRootContext } from '../root/ListboxRootContext';
import { afterDomSettle } from '../utils/afterDomSettle';
import {
  type ListboxDragProviderContext as ListboxDragContextValue,
  ListboxDragProviderContext,
  type ListboxDragItem,
  type ListboxDragProviderCanDropParameters,
  type ListboxDragProviderItemsReorderEventDetails,
  type ListboxDropTargetEdge,
  type RegisteredListboxDragItem,
} from './ListboxDragProviderContext';
import {
  createListboxDragPreviewRegistry,
  ListboxDragPreviewContext,
  type ListboxDragPreviewDeclaration,
} from '../drag-preview/ListboxDragPreviewContext';

interface OrderedItem<Value> {
  id: CollectionItemId;
  item: ListboxDragItem<Value>;
}

interface LiveReorderTransaction<Value> {
  snapshot: OrderedItem<Value>[];
  draggedItemIds: Set<CollectionItemId>;
  expectedItemIds: CollectionItemId[];
  changed: boolean;
  committed: boolean;
  stale: boolean;
}

function hasSameOrder(a: readonly CollectionItemId[], b: readonly CollectionItemId[]) {
  return a.length === b.length && a.every((itemId, index) => itemId === b[index]);
}

function createReorderProposal<Value>(
  snapshot: readonly OrderedItem<Value>[],
  draggedItemIds: ReadonlySet<CollectionItemId>,
  targetItemId: CollectionItemId,
  edge: ListboxDropTargetEdge,
): OrderedItem<Value>[] | null {
  if (draggedItemIds.has(targetItemId)) {
    return null;
  }

  const draggedItems = snapshot.filter(({ id }) => draggedItemIds.has(id));
  const remainingItems = snapshot.filter(({ id }) => !draggedItemIds.has(id));
  const targetIndex = remainingItems.findIndex(({ id }) => id === targetItemId);

  if (draggedItems.length === 0 || targetIndex === -1) {
    return null;
  }

  const insertionIndex = edge === 'after' ? targetIndex + 1 : targetIndex;
  remainingItems.splice(insertionIndex, 0, ...draggedItems);
  return remainingItems;
}

/**
 * Enables managed drag-and-drop on the nearest `Listbox.Root`.
 * Renders no DOM element of its own.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxDragProvider<Value = any>(props: ListboxDragProvider.Props<Value>) {
  const { children, ...other } = props;
  const [previewDeclaration, setPreviewDeclaration] =
    React.useState<ListboxDragPreviewDeclaration | null>(null);
  const previewRegistry = useRefWithInit(() =>
    createListboxDragPreviewRegistry(setPreviewDeclaration),
  ).current;

  return (
    <DraggablePreviewProvider>
      <ListboxDragPreviewContext.Provider value={previewRegistry}>
        <ListboxDragProviderInner {...other} previewDeclaration={previewDeclaration}>
          {children}
        </ListboxDragProviderInner>
      </ListboxDragPreviewContext.Provider>
    </DraggablePreviewProvider>
  );
}

interface ListboxDragProviderInnerProps<Value> extends Omit<
  ListboxDragProviderProps<Value>,
  'children'
> {
  previewDeclaration: ListboxDragPreviewDeclaration | null;
  children?: React.ReactNode;
}

function ListboxDragProviderInner<Value>(props: ListboxDragProviderInnerProps<Value>) {
  const {
    children,
    updateOn = 'drop',
    onItemsReorder,
    isItemDragDisabled,
    canDrop,
    trackDisplacement = updateOn === 'drag',
    previewDeclaration,
  } = props;
  const store = useListboxRootContext();
  const dropHighlightTimeout = useTimeout();
  const dropHighlightFrame = useAnimationFrame();
  const liveReorderFrame = useAnimationFrame();
  const controlledCommitFrame = useAnimationFrame();
  const keyboardFocusTimeout = useTimeout();
  const { labelsRef, pointerMoveSuppressedRef } = store.context;
  const draggedItemIdRef = React.useRef<CollectionItemId | null>(null);
  const transactionRef = React.useRef<LiveReorderTransaction<Value> | null>(null);
  const registeredItems = useRefWithInit(
    () => new Map<CollectionItemId, RegisteredListboxDragItem<Value>>(),
  ).current;
  const registeredItemElements = useRefWithInit(
    () => new Map<CollectionItemId, HTMLElement>(),
  ).current;

  const getItem = useStableCallback((itemId: CollectionItemId) => {
    return registeredItems.get(itemId)?.next;
  });

  const getOrderedItems = useStableCallback((): OrderedItem<Value>[] => {
    const itemOrder = new Map<HTMLElement, number>();
    store.state.listElement
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      .forEach((element, index) => itemOrder.set(element, index));

    return [...registeredItems]
      .map(([id, itemRef]) => ({ id, item: itemRef.next }))
      .sort((a, b) => {
        const aIndex = itemOrder.get(registeredItemElements.get(a.id)!);
        const bIndex = itemOrder.get(registeredItemElements.get(b.id)!);
        return (aIndex ?? a.item.index) - (bIndex ?? b.item.index);
      });
  });

  const handleItemsReorder = useStableCallback(
    (items: Value[], details: ListboxDragProviderItemsReorderEventDetails) => {
      onItemsReorder?.(items, details);
      return !details.isCanceled;
    },
  );

  const handleIsItemDragDisabled = useStableCallback((item: ListboxDragItem<Value>) => {
    return store.state.disabled || item.disabled || (isItemDragDisabled?.(item) ?? false);
  });

  const handleCanDrop = useStableCallback(
    (parameters: ListboxDragProviderCanDropParameters<Value>) => {
      return !store.state.disabled && (canDrop?.(parameters) ?? true);
    },
  );

  const canDragItem = useStableCallback((itemId: CollectionItemId) => {
    const item = getItem(itemId);
    return item ? !handleIsItemDragDisabled(item) : false;
  });

  const actions = useRefWithInit<CollectionActions<ListboxDragItem<Value>>>(() => ({
    hasItem(itemId) {
      return registeredItems.has(itemId);
    },
    getSelectedItemIds() {
      const selectedItemIds = new Set<CollectionItemId>();
      const { isItemEqualToValue, value: selectedValues } = store.state;

      for (const [itemId, itemRef] of registeredItems) {
        if (
          selectedValues.some((selectedValue) =>
            isItemEqualToValue(itemRef.next.value, selectedValue),
          )
        ) {
          selectedItemIds.add(itemId);
        }
      }

      return selectedItemIds;
    },
    getItemModels(itemIds) {
      const items: ListboxDragItem<Value>[] = [];
      for (const itemId of itemIds) {
        const item = registeredItems.get(itemId)?.next;
        if (item) {
          items.push(item);
        }
      }
      return items;
    },
  })).current;

  const dragPreview = React.useMemo<
    CollectionDragPreview<CollectionActions<ListboxDragItem<Value>>> | undefined
  >(() => {
    if (previewDeclaration == null) {
      return undefined;
    }

    return {
      render: ({ itemIds, actions: collectionActions }) => {
        const items = collectionActions
          .getItemModels([...itemIds])
          .sort((a, b) => a.index - b.index);
        return previewDeclaration.render(items);
      },
      get offset() {
        return previewDeclaration.offset;
      },
      get modifiers() {
        return previewDeclaration.modifiers;
      },
      get disabled() {
        return previewDeclaration.disabled;
      },
      get container() {
        return previewDeclaration.container;
      },
    };
  }, [previewDeclaration]);

  const notifyReorder = useStableCallback(
    (
      proposal: readonly OrderedItem<Value>[],
      reason: typeof REASONS.drag | typeof REASONS.keyboard,
      change: {
        sourceItems: ListboxDragItem<Value>[];
        targetItem: ListboxDragItem<Value> | null;
        edge: ListboxDropTargetEdge | null;
      },
    ) => {
      const details = createChangeEventDetails(reason, undefined, undefined, change);
      const accepted = handleItemsReorder(
        proposal.map(({ item }) => item.value),
        details,
      );
      return accepted;
    },
  );

  const applyLiveProposal = useStableCallback(
    (
      transaction: LiveReorderTransaction<Value>,
      targetItemId: CollectionItemId,
      edge: ListboxDropTargetEdge,
    ) => {
      const proposal = createReorderProposal(
        transaction.snapshot,
        transaction.draggedItemIds,
        targetItemId,
        edge,
      );
      if (proposal == null) {
        return false;
      }

      const proposalIds = proposal.map(({ id }) => id);
      if (hasSameOrder(proposalIds, transaction.expectedItemIds)) {
        return true;
      }

      const sourceItems = transaction.snapshot
        .filter(({ id }) => transaction.draggedItemIds.has(id))
        .map(({ item }) => item);
      const targetItem = getItem(targetItemId);
      if (
        !targetItem ||
        !notifyReorder(proposal, REASONS.drag, { sourceItems, targetItem, edge })
      ) {
        return false;
      }

      transaction.expectedItemIds = proposalIds;
      transaction.changed = true;
      controlledCommitFrame.request(() => {
        if (transactionRef.current !== transaction) {
          return;
        }
        const currentItemIds = getOrderedItems().map(({ id }) => id);
        if (!hasSameOrder(currentItemIds, transaction.expectedItemIds)) {
          warn(
            'a Listbox using `updateOn="drag"` did not synchronously render the ' +
              'order passed to `onItemsReorder`, so its items cannot move with the pointer. ' +
              'Update the rendered item order synchronously, or use `updateOn="drop"`.',
          );
        }
      });
      return true;
    },
  );

  const handleStateChange = useStableCallback((dndState: DraggableCollectionState) => {
    const dragActiveIndices: number[] = [];
    for (const itemId of dndState.draggedItemIds) {
      const item = getItem(itemId);
      if (item) {
        dragActiveIndices.push(item.index);
      }
    }

    const dragOverItem =
      dndState.dropTargetItemId == null ? undefined : getItem(dndState.dropTargetItemId);
    const dropPosition =
      dndState.dropPosition === 'before' || dndState.dropPosition === 'after'
        ? dndState.dropPosition
        : null;

    store.update({
      dragActiveIndices: dragActiveIndices.length === 0 ? null : dragActiveIndices,
      dragOverIndex: dragOverItem?.index ?? null,
      dropPosition,
    });

    if (
      updateOn !== 'drag' ||
      dndState.dropTargetItemId == null ||
      dropPosition == null ||
      dndState.draggedItemIds.size === 0
    ) {
      liveReorderFrame.cancel();
      return;
    }

    liveReorderFrame.request(() => {
      const transaction = transactionRef.current;
      if (transaction == null || transaction.stale) {
        return;
      }

      const currentItemIds = getOrderedItems().map(({ id }) => id);
      if (!hasSameOrder(currentItemIds, transaction.expectedItemIds)) {
        const snapshotIds = transaction.snapshot.map(({ id }) => id);
        if (!hasSameOrder(currentItemIds, snapshotIds)) {
          transaction.stale = true;
        }
        return;
      }

      applyLiveProposal(transaction, dndState.dropTargetItemId!, dropPosition);
    });
  });

  const dragAndDrop = useDraggableCollection<
    ListboxDragItem<Value>,
    CollectionActions<ListboxDragItem<Value>>
  >({
    orientation: store.state.orientation,
    getActions: () => actions,
    keyboardActivation: 'off',
    canDrag: canDragItem,
    canDrop: ({ draggedItemIds, targetItemId, position }) => {
      if (position === 'on') {
        return false;
      }

      const sourceItems = actions.getItemModels([...draggedItemIds]);
      const targetItem = getItem(targetItemId);
      return targetItem ? handleCanDrop({ sourceItems, targetItem, edge: position }) : false;
    },
    canDropRoot: () => false,
    allowDropOnDraggedItems: updateOn === 'drag',
    getDropCapabilities: () => ({ hasOn: false, hasBeforeAfter: true }),
    onDrop: ({ itemIds, target, isInternal }) => {
      if (!isInternal || !onItemsReorder || target.itemId == null || target.position === 'on') {
        return false;
      }

      liveReorderFrame.cancel();
      const transaction = transactionRef.current;
      if (
        updateOn === 'drag' &&
        transaction != null &&
        transaction.draggedItemIds.has(target.itemId)
      ) {
        const currentItemIds = getOrderedItems().map(({ id }) => id);
        transaction.committed = hasSameOrder(currentItemIds, transaction.expectedItemIds);
        return transaction.committed;
      }

      const snapshot = transaction?.snapshot ?? getOrderedItems();
      const draggedItemIds = transaction?.draggedItemIds ?? itemIds;
      const proposal = createReorderProposal(
        snapshot,
        draggedItemIds,
        target.itemId,
        target.position,
      );
      if (proposal == null) {
        return false;
      }

      const proposalIds = proposal.map(({ id }) => id);
      const currentItemIds = getOrderedItems().map(({ id }) => id);
      const alreadyApplied = hasSameOrder(proposalIds, currentItemIds);
      const sourceItems = snapshot
        .filter(({ id }) => draggedItemIds.has(id))
        .map(({ item }) => item);
      const targetItem = getItem(target.itemId);
      const committed =
        alreadyApplied ||
        (targetItem != null &&
          notifyReorder(proposal, REASONS.drag, {
            sourceItems,
            targetItem,
            edge: target.position,
          }));

      if (transaction) {
        transaction.expectedItemIds = proposalIds;
        transaction.changed =
          transaction.changed ||
          !hasSameOrder(
            proposalIds,
            transaction.snapshot.map(({ id }) => id),
          );
        transaction.committed = committed;
      }
      return committed;
    },
    onStateChange: handleStateChange,
    onDragStart: ({ itemIds, source }) => {
      const payload = source.payload;
      draggedItemIdRef.current =
        typeof payload === 'object' &&
        payload !== null &&
        'draggedItemId' in payload &&
        (typeof payload.draggedItemId === 'string' || typeof payload.draggedItemId === 'number')
          ? payload.draggedItemId
          : null;
      const snapshot = getOrderedItems();
      transactionRef.current = {
        snapshot,
        draggedItemIds: new Set(itemIds),
        expectedItemIds: snapshot.map(({ id }) => id),
        changed: false,
        committed: false,
        stale: false,
      };
      pointerMoveSuppressedRef.current = true;
    },
    onDragEnd: ({ canceled }) => {
      liveReorderFrame.cancel();
      controlledCommitFrame.cancel();
      const transaction = transactionRef.current;
      if (
        updateOn === 'drag' &&
        transaction != null &&
        !transaction.stale &&
        transaction.changed &&
        (canceled || !transaction.committed)
      ) {
        const currentItemIds = getOrderedItems().map(({ id }) => id);
        const snapshotIds = transaction.snapshot.map(({ id }) => id);
        if (!hasSameOrder(currentItemIds, snapshotIds)) {
          const sourceItems = transaction.snapshot
            .filter(({ id }) => transaction.draggedItemIds.has(id))
            .map(({ item }) => item);
          notifyReorder(transaction.snapshot, REASONS.drag, {
            sourceItems,
            targetItem: null,
            edge: null,
          });
        }
      }
      transactionRef.current = null;

      afterDomSettle(dropHighlightTimeout, dropHighlightFrame, () => {
        const draggedItem =
          draggedItemIdRef.current == null ? undefined : getItem(draggedItemIdRef.current);
        if (draggedItem) {
          const target =
            store.state.listElement?.querySelectorAll<HTMLElement>('[role="option"]')[
              draggedItem.index
            ];
          target?.focus();
          store.set('activeIndex', draggedItem.index);
        }
        draggedItemIdRef.current = null;
        pointerMoveSuppressedRef.current = false;
      });
    },
    getItemLabel: (itemId) => {
      const item = getItem(itemId);
      return (item && labelsRef.current[item.index]) ?? String(item?.value ?? itemId);
    },
    dragPreview,
    trackDisplacement,
  });

  const setupItem = useStableCallback<ListboxDragContextValue['setupItem']>(
    (itemId, element, itemRef) => {
      registeredItems.set(itemId, itemRef);
      registeredItemElements.set(itemId, element);
      const cleanup = dragAndDrop.setupItem(itemId, element);

      return () => {
        cleanup();
        if (registeredItems.get(itemId) === itemRef) {
          registeredItems.delete(itemId);
          registeredItemElements.delete(itemId);
        }
      };
    },
  );

  const setupHandle = useStableCallback<ListboxDragContextValue['setupHandle']>((itemId, element) =>
    dragAndDrop.setupHandle(itemId, element),
  );

  const scheduleItemDisplacementSweep = useStableCallback((element: HTMLElement) =>
    dragAndDrop.scheduleDisplacementSweep(element),
  );

  const restoreFocusAfterKeyboardReorder = useStableCallback((itemValue: Value) => {
    keyboardFocusTimeout.start(0, () => {
      const listElement = store.state.listElement;
      if (!listElement) {
        pointerMoveSuppressedRef.current = false;
        return;
      }

      const itemIndex = findItemIndex(
        store.context.valuesRef.current,
        itemValue,
        store.state.isItemEqualToValue,
      );
      const itemElement = listElement.querySelectorAll<HTMLElement>('[role="option"]')[itemIndex];
      if (itemElement) {
        store.set('activeIndex', itemIndex);
        itemElement.focus();
        itemElement.scrollIntoView?.({ block: 'nearest' });
      }
      pointerMoveSuppressedRef.current = false;
    });
  });

  const itemsReorderEnabled = onItemsReorder != null;
  const contextValue = React.useMemo(
    () => ({
      onItemsReorder: itemsReorderEnabled ? handleItemsReorder : undefined,
      isItemDragDisabled: handleIsItemDragDisabled,
      canDrop: handleCanDrop,
      restoreFocusAfterKeyboardReorder,
      scheduleDisplacementSweep: scheduleItemDisplacementSweep,
      setupItem,
      setupHandle,
    }),
    [
      handleCanDrop,
      handleIsItemDragDisabled,
      handleItemsReorder,
      itemsReorderEnabled,
      restoreFocusAfterKeyboardReorder,
      scheduleItemDisplacementSweep,
      setupHandle,
      setupItem,
    ],
  );

  return (
    <ListboxDragProviderContext.Provider value={contextValue}>
      {children}
    </ListboxDragProviderContext.Provider>
  );
}

export type ListboxDragUpdateOn = 'drop' | 'drag';

export interface ListboxDragProviderProps<Value = any> {
  /** Applies reordering on release or live as the active target changes. @default 'drop' */
  updateOn?: ListboxDragUpdateOn | undefined;
  /**
   * Called with all item values in their proposed visual order.
   * Render the items in this order synchronously when `updateOn="drag"`.
   */
  onItemsReorder?:
    | ((items: Value[], details: ListboxDragProviderItemsReorderEventDetails) => void)
    | undefined;
  /** Declaratively disables drag pickup for an item without disabling its other interactions. */
  isItemDragDisabled?: ((item: ListboxDragItem<Value>) => boolean) | undefined;
  /** Returns whether the dragged items can be dropped relative to a target item. */
  canDrop?: ((parameters: ListboxDragProviderCanDropParameters<Value>) => boolean) | undefined;
  /** Enables displacement attributes and CSS variables on items. Defaults to `true` in live mode. */
  trackDisplacement?: boolean | undefined;
  /** The listbox content and optional preview part. */
  children?: React.ReactNode;
}

export interface ListboxDragProviderState {}

export namespace ListboxDragProvider {
  export type Props<Value = any> = ListboxDragProviderProps<Value>;
  export type State = ListboxDragProviderState;
  export type CanDropParameters<Value = any> = ListboxDragProviderCanDropParameters<Value>;
  export type ItemsReorderEventDetails<Value = any> =
    ListboxDragProviderItemsReorderEventDetails<Value>;
}

export type {
  ListboxDragItem,
  ListboxDragProviderCanDropParameters,
  ListboxDragProviderItemsReorderEventDetails,
  ListboxDropTargetEdge,
} from './ListboxDragProviderContext';
