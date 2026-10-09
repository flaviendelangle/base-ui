'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { visuallyHidden } from '@base-ui/utils/visuallyHidden';
import { getListboxDropDestination } from '../sorting/dropPosition';
import {
  SortableDropProvider,
  SortableDropTarget,
  getPayloadCollectionId,
  isSameDropPosition,
  omitDragRecords,
} from '../../internals/sorting/SortableDropProvider';
import type { ExternalDropTargetProps } from '../../internals/sorting/SortableDropProvider';
import { Draggable } from '../../draggable';
import { matchesSortingOrder, restoreSortingOrder } from '../../internals/sorting/sortingOrder';
import { SortingTransaction } from '../../internals/sorting/SortingTransaction';
import { REASONS } from '../../internals/reasons';
import { useDirection } from '../../internals/direction-context';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { BaseUIGenericEventDetails } from '../../internals/createBaseUIEventDetails';
import type { DragEventDetailsProperties } from '../../utils/drag-and-drop/types';
import type { DraggableKind } from '../../draggable/DraggableProvider';
import type {
  DraggableRootMoveEndEventReason,
  DraggableRootRecord,
  DraggableRootTargetChangeEventReason,
} from '../../draggable/root/DraggableRoot';
import type {
  DraggableTargetLocalPoint,
  DraggableTargetRecord,
} from '../../draggable/target/DraggableTarget';
import type { ListboxItemDraggableProps } from '../item/ListboxItem';
import { ListboxRootFeatureProvider } from '../root/ListboxRootFeatures';
import type { ListboxRootFeature } from '../root/ListboxRootFeatures';
import { ListboxSortingContext, ListboxSortableContext } from '../sorting/ListboxSortingContext';
import type { ListboxSortingItemRecord } from '../sorting/ListboxSortingContext';
import { useListboxSorting } from '../sorting/useListboxSorting';
import type { ListboxReorderParameters } from '../sorting/useListboxSorting';

export interface ListboxReorderDragPayload<Value = any> {
  id: ListboxItemId;
  itemIds: ListboxItemId[];
  items: Value[];
  /** Identifies the list that owns this drag. */
  collectionId: object;
}
export interface ListboxReorderDropPosition {
  id: ListboxItemId;
  placement: 'before' | 'after';
  /**
   * Override the zero-based insertion index across the entire list, including all
   * groups, before removing the moved items. Not relative to the destination group.
   */
  index?: number | undefined;
}
export interface ListboxReorderDropContext<Value = any> {
  /** The application value of the row under the pointer. */
  item: Value;
  itemMetadata: { index: number; groupId: string | null };
  itemId: ListboxItemId;
  /**
   * Returns where the pointer is within the row, as a fraction of its width and height.
   * The same as `target.getLocalPoint()`.
   */
  getLocalPoint: () => DraggableTargetLocalPoint;
  /** The row under the pointer. Its payload identifies the row, not the dragged items. */
  target: DraggableTargetRecord<ListboxReorderDragPayload<Value>>;
  /** The item being dragged. */
  source: DraggableRootRecord<ListboxReorderDragPayload<Value>>;
}
/** The event details passed to `onReorderEnd`. `reason` is the reason the drag ended. */
export type ListboxReorderProviderReorderEndEventDetails = BaseUIGenericEventDetails<
  DraggableRootMoveEndEventReason,
  DragEventDetailsProperties & {
    /** The IDs of the items that were dragged. */
    itemIds: ListboxItemId[];
    /**
     * Whether the reorder was canceled or rolled back: the drag was canceled, it was released
     * where the items can't move, or `onItemsReorder` canceled the move.
     * Unlike the drag's own `canceled` flag, it can be `true` when `reason` is `'drop'`.
     */
    canceled: boolean;
  }
>;
export type ListboxReorderProviderReorderEndEventReason =
  ListboxReorderProviderReorderEndEventDetails['reason'];
/** The event details passed to `onDropPositionChange`: why the drop targets under the pointer changed. */
export type ListboxReorderProviderDropPositionChangeEventDetails = BaseUIGenericEventDetails<
  DraggableRootTargetChangeEventReason,
  DragEventDetailsProperties
>;
export type ListboxReorderProviderDropPositionChangeEventReason =
  ListboxReorderProviderDropPositionChangeEventDetails['reason'];
export interface ListboxReorderProviderProps<Value = any> extends ListboxReorderParameters<Value> {
  children?: React.ReactNode;
  /** Resolves pointer placement. Returning null disallows dropping at this position. */
  getDropPosition?:
    | ((
        context: ListboxReorderProvider.DropContext<Value>,
      ) => ListboxReorderDropPosition['placement'] | ListboxReorderDropPosition | null)
    | undefined;
  /**
   * Event handler called when pointer placement changes.
   * Receives null when an existing placement is cleared.
   */
  onDropPositionChange?:
    | ((
        position: ListboxReorderDropPosition | null,
        eventDetails: ListboxReorderProvider.DropPositionChangeEventDetails,
      ) => void)
    | undefined;
  /**
   * When pointer reordering updates the items. Live moves are restored on cancellation
   * unless an external reorder conflicts with the drag.
   * @default 'drop'
   */
  reorderOn?: 'drop' | 'move' | undefined;
  /** An explicit kind for integrating reordering with external drag sources and targets. */
  kind?: DraggableKind<ListboxReorderProvider.DragPayload<Value>> | undefined;
  /**
   * Event handler called once when pointer reordering ends, after the final move or rollback
   * is proposed. `eventDetails.itemIds` lists the dragged items, and
   * `eventDetails.canceled` tells whether the reorder was canceled or rolled back.
   */
  onReorderEnd?:
    ((eventDetails: ListboxReorderProvider.ReorderEndEventDetails) => void) | undefined;
}

/**
 * Enables keyboard and pointer reordering in the listbox it wraps, with automatic item registration.
 * Renders a visually hidden announcement region inside the listbox.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxReorderProvider<Value = any>(props: ListboxReorderProvider.Props<Value>) {
  const {
    children,
    disabled,
    onItemsReorder,
    canMoveItems,
    isItemSortingDisabled,
    getAnnouncement,
    getDropPosition,
    onDropPositionChange,
    reorderOn,
    kind,
    onReorderEnd,
  } = props;
  const feature = React.useMemo(
    (): ListboxRootFeature => ({
      name: 'ReorderProvider',
      render: (rootChildren) => (
        <ListboxPointerSorting
          disabled={disabled}
          onItemsReorder={onItemsReorder}
          canMoveItems={canMoveItems}
          isItemSortingDisabled={isItemSortingDisabled}
          getAnnouncement={getAnnouncement}
          getDropPosition={getDropPosition}
          onDropPositionChange={onDropPositionChange}
          reorderOn={reorderOn}
          kind={kind}
          onReorderEnd={onReorderEnd}
        >
          {rootChildren}
        </ListboxPointerSorting>
      ),
    }),
    [
      disabled,
      onItemsReorder,
      canMoveItems,
      isItemSortingDisabled,
      getAnnouncement,
      getDropPosition,
      onDropPositionChange,
      reorderOn,
      kind,
      onReorderEnd,
    ],
  );
  return <ListboxRootFeatureProvider feature={feature}>{children}</ListboxRootFeatureProvider>;
}

/** The reordering of `Listbox.ReorderProvider`, rendered inside the root it wraps. */
function ListboxPointerSorting<Value>(props: ListboxReorderProvider.Props<Value>) {
  const {
    children,
    reorderOn = 'drop',
    getDropPosition,
    onDropPositionChange,
    onReorderEnd,
  } = props;
  const sorting = useListboxSorting(props);
  const { store, disabled: sortingDisabled, getItemIds, getOrderedItems } = sorting;
  const direction = useDirection();
  const [localKind] = React.useState(() =>
    Draggable.createKind<ListboxReorderDragPayload<Value>>('listbox-sort'),
  );
  const kind = props.kind ?? localKind;
  const externalCompletion = React.useRef(false);
  const position = React.useRef<ListboxReorderDropPosition | null>(null);
  const [transaction] = React.useState(
    () => new SortingTransaction<ListboxSortingItemRecord<Value>[]>(),
  );
  const lastMovePosition = React.useRef<ListboxReorderDropPosition | null>(null);
  const lastEvent = React.useRef<Event | null>(null);
  const activePayload = React.useRef<ListboxReorderDragPayload<Value> | null>(null);
  const focusFrame = useAnimationFrame();
  const reconcileFrame = useAnimationFrame();

  // When the dragged row remounts, for example in another group, the engine moves the drag
  // onto the new row, whose declared payload only identifies it. Keep the pickup payload.
  const getActivePayload = (dragSource: DraggableRootRecord<ListboxReorderDragPayload<Value>>) =>
    activePayload.current ?? dragSource.payload;
  const getSourceItems = useStableCallback((source: ListboxReorderDragPayload<Value>) =>
    sorting
      .getOrderedItems()
      .filter((item) =>
        source.items.some((value) => store.state.isItemEqualToValue(item.value, value)),
      ),
  );
  const sameItem = useStableCallback(
    (a: ListboxSortingItemRecord<Value>, b: ListboxSortingItemRecord<Value>) =>
      store.state.isItemEqualToValue(a.value, b.value),
  );
  const matchesOrder = useStableCallback((order: ListboxSortingItemRecord<Value>[]) =>
    matchesSortingOrder(
      groupSortingItems(sorting.getOrderedItems()),
      groupSortingItems(order),
      sameItem,
    ),
  );
  const getDestination = useStableCallback((next: ListboxReorderDropPosition) =>
    getListboxDropDestination(sorting.getOrderedItems(), next),
  );
  const resolve = useStableCallback(
    (
      target: DraggableTargetRecord<ListboxReorderDragPayload<Value>> | null,
      dragSource: DraggableRootRecord<ListboxReorderDragPayload<Value>>,
    ) => {
      const source = getActivePayload(dragSource);
      if (!target || source.collectionId !== store || sorting.disabled) {
        return null;
      }
      const sourceIds = getSourceItems(source).map((item) => item.id);
      const id = target.payload.id;
      const item = sorting.getOrderedItems().find((entry) => entry.id === id);
      if (!item || item.disabled || sourceIds.includes(id)) {
        return null;
      }
      const point = target.getLocalPoint();
      const horizontalCoordinate = direction === 'rtl' ? 1 - point.x : point.x;
      const coordinate = store.state.orientation === 'horizontal' ? horizontalCoordinate : point.y;
      const defaultPlacement = coordinate < 0.5 ? 'before' : 'after';
      const resolved = getDropPosition
        ? getDropPosition({
            item: item.value,
            itemMetadata: { index: item.index, groupId: item.groupId },
            itemId: id,
            getLocalPoint: target.getLocalPoint,
            target,
            source: dragSource,
          })
        : defaultPlacement;
      if (!resolved) {
        return null;
      }
      const next = typeof resolved === 'string' ? { id, placement: resolved } : resolved;
      const destination = getDestination(next);
      return destination &&
        !sourceIds.includes(next.id) &&
        sourceIds.length === source.items.length &&
        sorting.canMove(sourceIds, destination)
        ? next
        : null;
    },
  );
  const setPosition = useStableCallback(
    (
      next: ListboxReorderDropPosition | null,
      eventDetails: ListboxReorderProviderDropPositionChangeEventDetails,
    ) => {
      if (isSameDropPosition(position.current, next)) {
        return;
      }
      position.current = next;
      store.set('dragOverItemId', next?.id ?? null);
      store.set('dropPosition', next?.placement ?? null);
      onDropPositionChange?.(next, eventDetails);
    },
  );
  const rollback = useStableCallback(() => {
    const source = activePayload.current;
    if (!source || !lastEvent.current) {
      return undefined;
    }
    const event = lastEvent.current;
    return transaction.rollback(matchesOrder, (snapshot, awaitingProposal) => {
      const current = sorting.getOrderedItems();
      const groups = new Map(
        Array.from(
          store.state.listElement?.querySelectorAll<HTMLElement>('[role="group"]') ?? [],
        ).map((element) => [element.id, element]),
      );
      const currentOrder = groupSortingItems(current);
      // Empty groups can receive their original items during rollback.
      for (const groupId of [null, ...groups.keys()]) {
        if (!currentOrder.has(groupId)) {
          currentOrder.set(groupId, []);
        }
      }
      const restored = restoreSortingOrder(currentOrder, groupSortingItems(snapshot), sameItem);
      const next = Array.from(restored, ([groupId, items]) =>
        items.map((item) => (item.groupId === groupId ? item : { ...item, groupId })),
      ).flat();
      // Group order is owned by the DOM, including groups inserted during the drag.
      next.sort((a, b) => {
        if (a.groupId === b.groupId) {
          return 0;
        }
        const aElement = groups.get(a.groupId ?? '') ?? sorting.records.get(a.id)?.element;
        const bElement = groups.get(b.groupId ?? '') ?? sorting.records.get(b.id)?.element;
        if (!aElement || !bElement) {
          return 0;
        }
        // eslint-disable-next-line no-bitwise
        return aElement.compareDocumentPosition(bElement) & 4 ? -1 : 1;
      });
      const sourceIds = getSourceItems(source).map((item) => item.id);
      if (
        awaitingProposal ||
        !next.every((item, i) => item.id === current[i].id && item.groupId === current[i].groupId)
      ) {
        // Supersede a queued live proposal even if the rendered order is already restored.
        const accepted = sorting.notifyOrder(
          next,
          {
            items: current.filter((item) => sourceIds.includes(item.id)),
            destination: {
              index: next.findIndex((item) => sourceIds.includes(item.id)),
              groupId: next.find((item) => sourceIds.includes(item.id))?.groupId ?? null,
            },
          },
          event,
          REASONS.drag,
        );
        return accepted ? next : current;
      }
      return current;
    });
  });
  useIsoLayoutEffect(
    () => () => {
      rollback();
      transaction.reset();
      activePayload.current = null;
      store.set('dragActiveItemIds', null);
      store.set('dragOverItemId', null);
      store.set('dropPosition', null);
      store.context.pointerMoveSuppressedRef.current = false;
    },
    [rollback, store, transaction],
  );

  const renderItem = React.useCallback(
    (
      element: React.ReactElement,
      id: ListboxItemId,
      value: unknown,
      disabled: boolean,
      draggableProps: ListboxItemDraggableProps | undefined,
      external?: ExternalDropTargetProps,
    ) => (
      <ListboxSortableRowPayload<Value> id={id} collectionId={store}>
        {(payload) => (
          <SortableDropTarget
            payload={payload}
            external={external}
            snap={draggableProps?.snap}
            element={
              <Draggable.Root
                {...draggableProps}
                render={element}
                kind={kind}
                payload={payload}
                // Lets the settling preview find the row again when the drop remounts it,
                // for example in another list or a virtualized list.
                previewKey={draggableProps?.previewKey ?? getPreviewKey(value)}
                disabled={disabled || sortingDisabled || draggableProps?.disabled}
                data-disabled={disabled ? '' : undefined}
                onBeforeMoveStart={(eventDetails) => {
                  draggableProps?.onBeforeMoveStart?.(eventDetails);
                  if (eventDetails.isCanceled) {
                    return;
                  }
                  const itemIds = getItemIds(id);
                  if (itemIds.length === 0) {
                    eventDetails.cancel();
                    return;
                  }
                  const items = getOrderedItems()
                    .filter((item) => itemIds.includes(item.id))
                    .map((item) => item.value);
                  // The declared payload only identifies the row. The dragged items
                  // depend on the selection when the drag starts.
                  eventDetails.source.updatePayload({
                    id,
                    itemIds,
                    items,
                    collectionId: store,
                  });
                }}
                collision={false}
                onMoveEnd={(eventDetails) => {
                  const target = eventDetails.target;
                  if (
                    target &&
                    target.element !== eventDetails.source.element &&
                    getPayloadCollectionId(target.payload) !== store
                  ) {
                    externalCompletion.current = true;
                    lastEvent.current = eventDetails.event;
                    rollback();
                    transaction.reset();
                  }
                  draggableProps?.onMoveEnd?.(eventDetails);
                }}
              />
            }
          />
        )}
      </ListboxSortableRowPayload>
    ),
    [kind, sortingDisabled, getItemIds, getOrderedItems, store, rollback, transaction],
  );
  const reconcile = useStableCallback(() => {
    sorting.reconcile();
    if (activePayload.current) {
      const ids = getSourceItems(activePayload.current).map((item) => item.id);
      const activeIds = store.state.dragActiveItemIds;
      if (activeIds?.size !== ids.length || ids.some((id) => !activeIds?.has(id))) {
        store.set('dragActiveItemIds', new Set(ids));
      }
    }
  });
  const scheduleReconcile = useStableCallback(() => reconcileFrame.request(reconcile));
  const context = React.useMemo(
    () => ({ ...sorting, scheduleReconcile }),
    [sorting, scheduleReconcile],
  );
  const sortable = React.useMemo(() => ({ renderItem }), [renderItem]);
  return (
    <ListboxSortingContext.Provider value={context}>
      <Draggable.Provider>
        <SortableDropProvider
          collectionId={store}
          kind={kind}
          disabled={sorting.disabled}
          isTargetDisabled={(target) =>
            !sorting.records.has(target.id) ||
            !!sorting.records.get(target.id)?.item.current.disabled
          }
          onMoveStart={(eventDetails) => {
            const source = eventDetails.source;
            if (source.payload.collectionId !== store) {
              return;
            }
            focusFrame.cancel();
            sorting.clearAnnouncement();
            externalCompletion.current = false;
            transaction.reset();
            lastMovePosition.current = null;
            activePayload.current = source.payload;
            store.set('dragActiveItemIds', new Set(source.payload.itemIds));
            store.context.pointerMoveSuppressedRef.current = true;
          }}
          onCollisionChange={(eventDetails) => {
            const source = eventDetails.source;
            const next = resolve(eventDetails.target, source);
            const previous = position.current;
            setPosition(next, omitDragRecords(eventDetails));
            lastEvent.current = eventDetails.event;
            if (
              reorderOn === 'move' &&
              transaction.hasExpectedOrder(matchesOrder) &&
              next &&
              !isSameDropPosition(previous, next)
            ) {
              const destination = getDestination(next);
              if (destination) {
                const result = sorting.move(
                  getSourceItems(getActivePayload(source)).map((item) => item.id),
                  destination,
                  eventDetails.event,
                  undefined,
                  REASONS.drag,
                  null,
                  (current, order, notify) => transaction.propose(current, order, notify),
                );
                if (result?.changed) {
                  lastMovePosition.current = next;
                }
              }
            }
          }}
          onMoveEnd={(eventDetails) => {
            const dragSource = eventDetails.source;
            const target = eventDetails.target;
            const source = getActivePayload(dragSource);
            if (source.collectionId !== store) {
              return;
            }
            lastEvent.current = eventDetails.event;
            const { canceled: dragCanceled, ...sortEndDetails } = omitDragRecords(eventDetails);
            if (externalCompletion.current) {
              setPosition(null, sortEndDetails);
              store.set('dragActiveItemIds', null);
              activePayload.current = null;
              lastMovePosition.current = null;
              store.context.pointerMoveSuppressedRef.current = false;
              externalCompletion.current = false;
              onReorderEnd?.({ ...sortEndDetails, itemIds: source.itemIds, canceled: false });
              return;
            }
            const next = resolve(target, dragSource);
            const sourceIds = getSourceItems(source).map((item) => item.id);
            const onSource =
              eventDetails.location.current.targets[0]?.element === dragSource.element ||
              (target?.payload.collectionId === store && sourceIds.includes(target.payload.id));
            const lastDestination =
              lastMovePosition.current && getDestination(lastMovePosition.current);
            const canKeepLiveMove =
              reorderOn === 'move' &&
              transaction.hasMoved &&
              onSource &&
              lastDestination &&
              sourceIds.length === source.items.length &&
              sorting.canMove(sourceIds, lastDestination);
            let changed = transaction.hasMoved;
            let focusOrder = sorting.getOrderedItems();
            let canceled =
              dragCanceled ||
              !transaction.hasExpectedOrder(matchesOrder) ||
              (!next && !canKeepLiveMove);
            if (!canceled && next) {
              const destination = getDestination(next);
              const result =
                destination && sorting.move(sourceIds, destination, eventDetails.event);
              canceled = !result;
              if (result) {
                changed ||= result.changed;
                focusOrder = result.items;
              }
            }
            if (canceled) {
              focusOrder = rollback() ?? focusOrder;
            }
            setPosition(null, sortEndDetails);
            store.set('dragActiveItemIds', null);
            transaction.reset();
            activePayload.current = null;
            lastMovePosition.current = null;
            const finalItems = focusOrder.filter((item) =>
              source.items.some((value) => store.state.isItemEqualToValue(item.value, value)),
            );
            const completedOutcome = changed ? 'moved' : 'unchanged';
            sorting.requestFocus(
              focusOrder,
              source.items[source.itemIds.indexOf(source.id)],
              {
                items: finalItems,
                destination: {
                  index: focusOrder.indexOf(finalItems[0]),
                  groupId: finalItems[0]?.groupId ?? null,
                },
              },
              canceled ? 'canceled' : completedOutcome,
            );
            focusFrame.request(() => {
              store.context.pointerMoveSuppressedRef.current = false;
            });
            onReorderEnd?.({ ...sortEndDetails, itemIds: source.itemIds, canceled });
          }}
        >
          <ListboxSortableContext.Provider value={sortable}>
            {children}
          </ListboxSortableContext.Provider>
        </SortableDropProvider>
      </Draggable.Provider>
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {sorting.announcement}
      </span>
    </ListboxSortingContext.Provider>
  );
}
export namespace ListboxReorderProvider {
  export type Props<Value = any> = ListboxReorderProviderProps<Value>;
  export type DragPayload<Value = any> = ListboxReorderDragPayload<Value>;
  export type DropContext<Value = any> = ListboxReorderDropContext<Value>;
  export type DropPositionChangeEventDetails = ListboxReorderProviderDropPositionChangeEventDetails;
  export type DropPositionChangeEventReason = ListboxReorderProviderDropPositionChangeEventReason;
  export type ReorderEndEventDetails = ListboxReorderProviderReorderEndEventDetails;
  export type ReorderEndEventReason = ListboxReorderProviderReorderEndEventReason;
}

/**
 * Keeps a row's declared payload stable across renders. A new payload object during a
 * drag would replace the one set when the drag started.
 */
function ListboxSortableRowPayload<Value>(props: {
  id: ListboxItemId;
  collectionId: object;
  children: (payload: ListboxReorderDragPayload<Value>) => React.ReactElement;
}) {
  const { id, collectionId, children } = props;
  const payload = React.useMemo<ListboxReorderDragPayload<Value>>(
    () => ({ id, itemIds: [id], items: [], collectionId }),
    [id, collectionId],
  );
  return children(payload);
}

function getPreviewKey(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function groupSortingItems<Value>(items: readonly ListboxSortingItemRecord<Value>[]) {
  const groups = new Map<string | null, ListboxSortingItemRecord<Value>[]>();
  for (const item of items) {
    const siblings = groups.get(item.groupId);
    if (siblings) {
      siblings.push(item);
    } else {
      groups.set(item.groupId, [item]);
    }
  }
  return groups;
}
