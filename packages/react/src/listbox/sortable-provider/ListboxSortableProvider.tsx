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
  type ExternalDropTargetProps,
} from '../../internals/sorting/SortableDropProvider';
import { Draggable } from '../../draggable';
import { matchesSortingOrder, restoreSortingOrder } from '../../internals/sorting/sortingOrder';
import { SortingTransaction } from '../../internals/sorting/SortingTransaction';
import { REASONS } from '../../internals/reasons';
import { useDirection } from '../../internals/direction-context';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { DragKind, DragSource } from '../../types/drag';
import type { ListboxItemDraggableProps } from '../item/ListboxItem';
import {
  ListboxSortingContext,
  ListboxSortableContext,
  type ListboxSortingItemRecord,
} from '../sorting/ListboxSortingContext';
import {
  useListboxSorting,
  type ListboxSortingParameters,
  type ListboxItemsReorderEventDetails,
  type ListboxMoveItemsParameters,
  type ListboxSortingAnnouncementParameters,
} from '../sorting/useListboxSorting';

export interface ListboxSortingDragPayload<Value = any> {
  id: ListboxItemId;
  itemIds: ListboxItemId[];
  items: Value[];
  /** Identifies the list that owns this drag. */
  collectionId: object;
  /** Application data supplied by getDragPayload. */
  data?: unknown;
}
export interface ListboxSortingDropPosition {
  id: ListboxItemId;
  placement: 'before' | 'after';
  /**
   * Override the zero-based insertion index across the entire list, including all
   * groups, before removing the moved items. Not relative to the destination group.
   * Tree uses indices within the current or destination parent.
   */
  index?: number | undefined;
}
export interface ListboxSortingDropContext<Value = any> {
  /** The application value of the row under the pointer. */
  item: Value;
  itemMetadata: { index: number; groupId: string | null; disabled: boolean };
  itemId: ListboxItemId;
  /** Coordinates relative to the row, normalized to its width and height. */
  point: { x: number; y: number };
  collision: Draggable.CollisionProvider.Collision<ListboxSortingDragPayload<Value>>;
  source: DragSource<ListboxSortingDragPayload<Value>>;
}
export interface ListboxSortableProviderProps<Value = any> extends ListboxSortingParameters<Value> {
  children?: React.ReactNode;
  /** Resolves pointer placement. Returning null disallows dropping at this position. */
  getDropPosition?:
    | ((
        context: ListboxSortingDropContext<Value>,
      ) => ListboxSortingDropPosition['placement'] | ListboxSortingDropPosition | null)
    | undefined;
  /** Called when pointer placement changes, including when sorting ends. */
  onDropPositionChange?: ((position: ListboxSortingDropPosition | null) => void) | undefined;
  /** When pointer sorting updates the items. Live moves are restored on cancellation. @default 'drop' */
  reorderOn?: 'drop' | 'move' | undefined;
  /** An explicit kind for integrating sorting with external drag sources and targets. */
  kind?: DragKind<ListboxSortingDragPayload<Value>> | undefined;
  /** Returns application data stored in the drag payload's data field. */
  getDragPayload?:
    ((parameters: { itemIds: ListboxItemId[]; items: Value[] }) => unknown) | undefined;
  /** Called once when pointer sorting ends, after the final move or rollback is proposed. */
  onSortEnd?: ((parameters: { itemIds: ListboxItemId[]; canceled: boolean }) => void) | undefined;
}

/** Enables keyboard and pointer sorting with automatic item registration. */
export function ListboxSortableProvider<Value = any>(props: ListboxSortableProvider.Props<Value>) {
  const {
    children,
    reorderOn = 'drop',
    getDropPosition,
    getDragPayload,
    onDropPositionChange,
    onSortEnd,
  } = props;
  const sorting = useListboxSorting(props);
  const { store, disabled: sortingDisabled, getItemIds, getOrderedItems } = sorting;
  const direction = useDirection();
  const [localKind] = React.useState(() =>
    Draggable.createKind<ListboxSortingDragPayload<Value>>('listbox-sort'),
  );
  const kind = props.kind ?? localKind;
  const externalCompletion = React.useRef(false);
  const position = React.useRef<ListboxSortingDropPosition | null>(null);
  const [transaction] = React.useState(
    () => new SortingTransaction<ListboxSortingItemRecord<Value>[]>(),
  );
  const lastMovePosition = React.useRef<ListboxSortingDropPosition | null>(null);
  const lastEvent = React.useRef<Event | null>(null);
  const activePayload = React.useRef<ListboxSortingDragPayload<Value> | null>(null);
  const focusFrame = useAnimationFrame();
  const reconcileFrame = useAnimationFrame();

  const getSourceItems = useStableCallback((source: ListboxSortingDragPayload<Value>) =>
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
  const getDestination = useStableCallback((next: ListboxSortingDropPosition) =>
    getListboxDropDestination(sorting.getOrderedItems(), next),
  );
  const resolve = useStableCallback(
    (
      collision: Draggable.CollisionProvider.Collision<ListboxSortingDragPayload<Value>> | null,
      dragSource: DragSource<ListboxSortingDragPayload<Value>>,
    ) => {
      const source = dragSource.payload;
      if (!collision || source.collectionId !== store || sorting.disabled) {
        return null;
      }
      const sourceIds = getSourceItems(source).map((item) => item.id);
      const id = collision.target.payload.id;
      const item = sorting.getOrderedItems().find((entry) => entry.id === id);
      const point = collision.target.getLocalPoint();
      if (!item || item.disabled || !point || sourceIds.includes(id)) {
        return null;
      }
      const horizontalCoordinate = direction === 'rtl' ? 1 - point.x : point.x;
      const coordinate = store.state.orientation === 'horizontal' ? horizontalCoordinate : point.y;
      const defaultPlacement = coordinate < 0.5 ? 'before' : 'after';
      const resolved = getDropPosition
        ? getDropPosition({
            item: item.value,
            itemMetadata: { index: item.index, groupId: item.groupId, disabled: item.disabled },
            itemId: id,
            point,
            collision,
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
  const setPosition = useStableCallback((next: ListboxSortingDropPosition | null) => {
    const previous = position.current;
    if (
      previous?.id === next?.id &&
      previous?.placement === next?.placement &&
      previous?.index === next?.index
    ) {
      return;
    }
    position.current = next;
    store.set('dragOverItemId', next?.id ?? null);
    store.set('dropPosition', next?.placement ?? null);
    onDropPositionChange?.(next);
  });
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
      disabled: boolean,
      draggableProps: ListboxItemDraggableProps | undefined,
      external?: ExternalDropTargetProps,
    ) => (
      <SortableDropTarget
        payload={{ id, itemIds: [id], items: [], collectionId: store }}
        external={external}
        snap={draggableProps?.snap}
        element={
          <Draggable.Root
            {...draggableProps}
            render={element}
            kind={kind}
            disabled={disabled || sortingDisabled || draggableProps?.disabled}
            data-disabled={disabled ? '' : undefined}
            onBeforeMoveStart={(event, details) => {
              draggableProps?.onBeforeMoveStart?.(event, details);
              if (getItemIds(id).length === 0) {
                details.cancel();
              }
            }}
            collision={false}
            onMoveEnd={(event, details) => {
              if (
                !event.canceled &&
                event.dropTarget &&
                event.dropTarget.element !== event.source.element
              ) {
                const target = event.dropTarget.payload;
                const destinationCollection =
                  target &&
                  typeof target === 'object' &&
                  'payload' in target &&
                  target.payload &&
                  typeof target.payload === 'object' &&
                  'collectionId' in target.payload
                    ? target.payload.collectionId
                    : null;
                if (destinationCollection !== store) {
                  externalCompletion.current = true;
                  lastEvent.current = details.event;
                  rollback();
                  transaction.reset();
                }
              }
              draggableProps?.onMoveEnd?.(event, details);
            }}
            getPayload={() => {
              const itemIds = getItemIds(id);
              const items = getOrderedItems()
                .filter((item) => itemIds.includes(item.id))
                .map((item) => item.value);
              return {
                id,
                itemIds,
                items,
                collectionId: store,
                data: getDragPayload?.({ itemIds, items }),
              };
            }}
          />
        }
      />
    ),
    [
      kind,
      sortingDisabled,
      getItemIds,
      getOrderedItems,
      store,
      getDragPayload,
      rollback,
      transaction,
    ],
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
          onMoveStart={({ source }) => {
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
          onCollisionChange={(event, details) => {
            const next = resolve(event.collision, event.source);
            const previous = position.current;
            setPosition(next);
            lastEvent.current = details.event;
            if (
              reorderOn === 'move' &&
              transaction.hasExpectedOrder(matchesOrder) &&
              next &&
              (previous?.id !== next.id ||
                previous?.placement !== next.placement ||
                previous?.index !== next.index)
            ) {
              const destination = getDestination(next);
              if (destination) {
                const result = sorting.move(
                  getSourceItems(event.source.payload).map((item) => item.id),
                  destination,
                  details.event,
                  undefined,
                  REASONS.drag,
                  (current, order, notify) => transaction.propose(current, order, notify),
                );
                if (result?.changed) {
                  lastMovePosition.current = next;
                }
              }
            }
          }}
          onMoveEnd={(event, details) => {
            const source = event.source.payload;
            if (source.collectionId !== store) {
              return;
            }
            lastEvent.current = details.event;
            if (externalCompletion.current) {
              setPosition(null);
              store.set('dragActiveItemIds', null);
              activePayload.current = null;
              lastMovePosition.current = null;
              store.context.pointerMoveSuppressedRef.current = false;
              externalCompletion.current = false;
              onSortEnd?.({ itemIds: source.itemIds, canceled: false });
              return;
            }
            const next = resolve(event.collision, event.source);
            const sourceIds = getSourceItems(source).map((item) => item.id);
            const onSource =
              event.dropTarget?.element === event.source.element ||
              (event.collision?.target.payload.collectionId === store &&
                sourceIds.includes(event.collision.target.payload.id));
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
              event.canceled ||
              !transaction.hasExpectedOrder(matchesOrder) ||
              (!next && !canKeepLiveMove);
            if (!canceled && next) {
              const destination = getDestination(next);
              const result = destination && sorting.move(sourceIds, destination, details.event);
              canceled = !result;
              if (result) {
                changed ||= result.changed;
                focusOrder = result.items;
              }
            }
            if (canceled) {
              focusOrder = rollback() ?? focusOrder;
            }
            setPosition(null);
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
            onSortEnd?.({ itemIds: source.itemIds, canceled });
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
export namespace ListboxSortableProvider {
  export type AnnouncementParameters<Value = any> = ListboxSortingAnnouncementParameters<Value>;
  export type Props<Value = any> = ListboxSortableProviderProps<Value>;
  export type DragPayload<Value = any> = ListboxSortingDragPayload<Value>;
  export type DropPosition = ListboxSortingDropPosition;
  export type DropContext<Value = any> = ListboxSortingDropContext<Value>;
  export type ItemsReorderEventDetails<Value = any> = ListboxItemsReorderEventDetails<Value>;
  export type MoveItemsParameters<Value = any> = ListboxMoveItemsParameters<Value>;
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
