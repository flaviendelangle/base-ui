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
import type { CollectionActions, CollectionItemId } from '../../types/collection';
import type {
  DragDropEventDetails,
  DragEndEventDetails,
  DragStartEventDetails,
  DropTargetChangeEventDetails,
} from '../../types/drag';
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
  type ListboxDragProviderReorderChange,
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
  lastTargetItemId: CollectionItemId | null;
  lastEdge: ListboxDropTargetEdge | null;
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

function getOrderedItemsByIds<Value>(
  itemIds: readonly CollectionItemId[],
  items: readonly OrderedItem<Value>[],
): OrderedItem<Value>[] | null {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const orderedItems: OrderedItem<Value>[] = [];

  for (const itemId of itemIds) {
    const item = itemsById.get(itemId);
    if (!item) {
      return null;
    }
    orderedItems.push(item);
  }

  return orderedItems.length === items.length ? orderedItems : null;
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
  const dragEventRef = React.useRef<PointerEvent | TouchEvent | null>(null);
  const dragSessionRef = React.useRef(0);
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
    (items: Value[], details: ListboxDragProviderItemsReorderEventDetails<Value>) => {
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
      event: PointerEvent | TouchEvent,
      change: {
        sourceItems: ListboxDragItem<Value>[];
        targetItem: ListboxDragItem<Value> | null;
        edge: ListboxDropTargetEdge | null;
      },
    ) => {
      const details = createChangeEventDetails(REASONS.drag, event, undefined, change);
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
      event: PointerEvent | TouchEvent,
    ) => {
      const currentItems = getOrderedItems();
      const proposalSnapshot = getOrderedItemsByIds(
        transaction.snapshot.map(({ id }) => id),
        currentItems,
      );
      if (proposalSnapshot == null) {
        transaction.stale = true;
        return false;
      }

      const proposal = createReorderProposal(
        proposalSnapshot,
        transaction.draggedItemIds,
        targetItemId,
        edge,
      );
      if (proposal == null) {
        return false;
      }

      const proposalIds = proposal.map(({ id }) => id);
      if (hasSameOrder(proposalIds, transaction.expectedItemIds)) {
        transaction.lastTargetItemId = targetItemId;
        transaction.lastEdge = edge;
        return true;
      }

      const sourceItems = currentItems
        .filter(({ id }) => transaction.draggedItemIds.has(id))
        .map(({ item }) => item);
      const targetItem = getItem(targetItemId);
      if (!targetItem || !notifyReorder(proposal, event, { sourceItems, targetItem, edge })) {
        return false;
      }

      transaction.expectedItemIds = proposalIds;
      transaction.changed = true;
      transaction.lastTargetItemId = targetItemId;
      transaction.lastEdge = edge;
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

  const handleStateChange = useStableCallback(
    (
      dndState: DraggableCollectionState,
      eventDetails?: DragStartEventDetails | DropTargetChangeEventDetails | DragEndEventDetails,
    ) => {
      const dragActiveItemIds = new Set<CollectionItemId>();
      for (const itemId of dndState.draggedItemIds) {
        if (registeredItems.has(itemId)) {
          dragActiveItemIds.add(itemId);
        }
      }

      const dragOverItemId =
        dndState.dropTargetItemId != null && registeredItems.has(dndState.dropTargetItemId)
          ? dndState.dropTargetItemId
          : null;
      const dropPosition =
        dndState.dropPosition === 'before' || dndState.dropPosition === 'after'
          ? dndState.dropPosition
          : null;

      store.update({
        dragActiveItemIds: dragActiveItemIds.size === 0 ? null : dragActiveItemIds,
        dragOverItemId,
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

      if (eventDetails?.reason === 'pointer') {
        dragEventRef.current = eventDetails.event;
      }
      const dragEvent = dragEventRef.current;
      if (dragEvent == null) {
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

        applyLiveProposal(transaction, dndState.dropTargetItemId!, dropPosition, dragEvent);
      });
    },
  );

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
    onDrop: ({ itemIds, target, isInternal }, eventDetails: DragDropEventDetails) => {
      if (!isInternal || !onItemsReorder || target.itemId == null || target.position === 'on') {
        return false;
      }

      liveReorderFrame.cancel();
      // Listbox disables collection keyboard activation, so a committed drop always comes from
      // the pointer sensor even though the generic collection event also supports keyboard drops.
      const dragEvent = eventDetails.event as PointerEvent;
      dragEventRef.current = dragEvent;
      const transaction = transactionRef.current;
      if (updateOn === 'drag' && transaction?.stale) {
        return false;
      }
      const currentItems = getOrderedItems();
      const draggedItemIds = transaction?.draggedItemIds ?? itemIds;
      if (
        updateOn === 'drag' &&
        transaction != null &&
        transaction.draggedItemIds.has(target.itemId)
      ) {
        const sourceItems = currentItems
          .filter(({ id }) => transaction.draggedItemIds.has(id))
          .map(({ item }) => item);
        const lastTargetItem =
          transaction.lastTargetItemId == null ? undefined : getItem(transaction.lastTargetItemId);
        const dropAllowed =
          lastTargetItem != null &&
          transaction.lastEdge != null &&
          handleCanDrop({
            sourceItems,
            targetItem: lastTargetItem,
            edge: transaction.lastEdge,
          });
        transaction.committed =
          dropAllowed &&
          hasSameOrder(
            currentItems.map(({ id }) => id),
            transaction.expectedItemIds,
          );
        return transaction.committed;
      }

      const proposalSnapshot =
        updateOn === 'drag' && transaction != null
          ? getOrderedItemsByIds(
              transaction.snapshot.map(({ id }) => id),
              currentItems,
            )
          : currentItems;
      if (proposalSnapshot == null) {
        if (transaction) {
          transaction.stale = true;
        }
        return false;
      }
      const proposal = createReorderProposal(
        proposalSnapshot,
        draggedItemIds,
        target.itemId,
        target.position,
      );
      if (proposal == null) {
        return false;
      }

      const proposalIds = proposal.map(({ id }) => id);
      const currentItemIds = currentItems.map(({ id }) => id);
      const alreadyApplied = hasSameOrder(proposalIds, currentItemIds);
      const sourceItems = currentItems
        .filter(({ id }) => draggedItemIds.has(id))
        .map(({ item }) => item);
      const targetItem = getItem(target.itemId);
      const committed =
        alreadyApplied ||
        (targetItem != null &&
          notifyReorder(proposal, dragEvent, {
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
    onDragStart: ({ itemIds, source }, eventDetails: DragStartEventDetails) => {
      dropHighlightTimeout.clear();
      dropHighlightFrame.cancel();
      dragSessionRef.current += 1;
      // `keyboardActivation="off"` makes this event a PointerEvent at runtime.
      dragEventRef.current = eventDetails.event as PointerEvent;
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
        lastTargetItemId: null,
        lastEdge: null,
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
        const currentItems = getOrderedItems();
        const currentItemIds = currentItems.map(({ id }) => id);
        const snapshotIds = transaction.snapshot.map(({ id }) => id);
        if (!hasSameOrder(currentItemIds, snapshotIds)) {
          const rollbackProposal = getOrderedItemsByIds(snapshotIds, currentItems);
          const sourceItems = currentItems
            .filter(({ id }) => transaction.draggedItemIds.has(id))
            .map(({ item }) => item);
          if (rollbackProposal && dragEventRef.current) {
            notifyReorder(rollbackProposal, dragEventRef.current, {
              sourceItems,
              targetItem: null,
              edge: null,
            });
          }
        }
      }
      transactionRef.current = null;

      const endedDragItemId = draggedItemIdRef.current;
      const endedDragSession = dragSessionRef.current;
      draggedItemIdRef.current = null;
      afterDomSettle(dropHighlightTimeout, dropHighlightFrame, () => {
        if (dragSessionRef.current !== endedDragSession) {
          return;
        }
        const target =
          endedDragItemId == null ? undefined : registeredItemElements.get(endedDragItemId);
        const options = store.state.listElement?.querySelectorAll<HTMLElement>('[role="option"]');
        const targetIndex = target && options ? Array.prototype.indexOf.call(options, target) : -1;
        if (target && targetIndex >= 0) {
          target.focus();
          store.set('activeIndex', targetIndex);
        }
        dragEventRef.current = null;
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

  const restoreFocusAfterKeyboardReorder = useStableCallback(
    (
      itemId: CollectionItemId | undefined,
      itemValue: Value,
      initiatingElement: HTMLElement | null,
    ) => {
      keyboardFocusTimeout.start(0, () => {
        const listElement = store.state.listElement;
        if (!listElement) {
          pointerMoveSuppressedRef.current = false;
          return;
        }

        let itemElement = itemId === undefined ? undefined : registeredItemElements.get(itemId);
        if (!itemElement?.isConnected && initiatingElement?.isConnected) {
          itemElement = initiatingElement;
        }
        if (!itemElement?.isConnected) {
          for (const [registeredItemId, itemRef] of registeredItems) {
            if (store.state.isItemEqualToValue(itemRef.next.value, itemValue)) {
              itemElement = registeredItemElements.get(registeredItemId);
              break;
            }
          }
        }

        const options = listElement.querySelectorAll<HTMLElement>('[role="option"]');
        const itemIndex = itemElement ? Array.prototype.indexOf.call(options, itemElement) : -1;
        if (itemElement && itemIndex >= 0) {
          store.set('activeIndex', itemIndex);
          itemElement.focus();
          itemElement.scrollIntoView?.({ block: 'nearest' });
        }
        pointerMoveSuppressedRef.current = false;
      });
    },
  );

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
    | ((items: Value[], details: ListboxDragProviderItemsReorderEventDetails<Value>) => void)
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
  export type Item<Value = any> = ListboxDragItem<Value>;
  export type ReorderChange<Value = any> = ListboxDragProviderReorderChange<Value>;
  export type CanDropParameters<Value = any> = ListboxDragProviderCanDropParameters<Value>;
  export type ItemsReorderEventDetails<Value = any> =
    ListboxDragProviderItemsReorderEventDetails<Value>;
}

export type {
  ListboxDragItem,
  ListboxDragProviderCanDropParameters,
  ListboxDragProviderItemsReorderEventDetails,
  ListboxDragProviderReorderChange,
  ListboxDropTargetEdge,
} from './ListboxDragProviderContext';
