'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { getTarget, closest } from '@base-ui/utils/shadowDom';
import { ownerWindow } from '@base-ui/utils/owner';
import { INTERACTIVE_ELEMENT_SELECTOR } from '../../utils/isInteractiveElement';
import { getParentElement } from '../../utils/getParentElement';
import { useDirection } from '../../internals/direction-context';
import {
  createChangeEventDetails,
  type BaseUIChangeEventDetails,
} from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { ListboxItemId } from '../utils/ListboxItemId';
import { useListboxRootContext } from '../root/ListboxRootContext';
import {
  toSortingItem,
  type ListboxSortingItem,
  type ListboxSortingItemRecord,
  type ListboxSortingContextValue,
} from './ListboxSortingContext';

export interface ListboxSortingDestination {
  /**
   * Zero-based insertion index across the entire list, including all groups,
   * before removing the moved items. This is not an index within the destination group.
   * Tree uses indices within the current or destination parent.
   */
  index: number;
  /** Group of the destination item, or null for ungrouped items. */
  groupId: string | null;
}
export interface ListboxSortingMove<Value = any> {
  items: ListboxSortingItem<Value>[];
  destination: ListboxSortingDestination;
}
export type ListboxItemsReorderEventDetails<Value = any> = Omit<
  BaseUIChangeEventDetails<typeof REASONS.none>,
  'reason'
> &
  ListboxSortingMove<Value> & {
    reason: typeof REASONS.keyboard | typeof REASONS.drag;
    /** Complete proposed order, including group membership. Use this when moving items between groups. */
    order: ListboxSortingItem<Value>[];
  };
export interface ListboxSortingAnnouncementParameters<Value = any> {
  /** Moved items with their current values and positions. */
  items: ListboxSortingItem<Value>[];
  /** Resulting position of the first moved item, or null if none remain. The index is relative to the whole list after the operation. */
  destination: ListboxSortingDestination | null;
  reason: 'keyboard' | 'drag';
  outcome: 'moved' | 'unchanged' | 'canceled';
}

export interface ListboxSortingParameters<Value = any> {
  /** Disables keyboard and pointer sorting. @default false */
  disabled?: boolean | undefined;
  /** Called with all values in their proposed order. Render the items in this order to accept the move. */
  onItemsReorder?:
    ((items: Value[], eventDetails: ListboxItemsReorderEventDetails<Value>) => void) | undefined;
  /** Applies the same movement rules to keyboard and pointer sorting. */
  canMoveItems?: ((move: ListboxSortingMove<Value>) => boolean) | undefined;
  /** Disables sorting for an item without disabling selection. */
  isItemSortingDisabled?: ((item: ListboxSortingItem<Value>) => boolean) | undefined;
  /** Customizes polite announcements for completed keyboard moves and final pointer outcomes. */
  getAnnouncement?:
    ((parameters: ListboxSortingAnnouncementParameters<Value>) => string) | undefined;
}

export function useListboxSorting<Value>(props: ListboxSortingParameters<Value>) {
  const store = useListboxRootContext();
  const rootDisabled = store.useState('disabled');
  const disabled = rootDisabled || !!props.disabled;
  const isItemSortingDisabled = props.isItemSortingDisabled;
  const direction = useDirection();
  const frame = useAnimationFrame();
  const [announcement, setAnnouncement] = React.useState('');
  const pending = React.useRef<{
    order: ListboxSortingItemRecord<Value>[];
    sourceValue: Value;
    parameters: ListboxSortingMove<Value> | null;
    outcome?: 'moved' | 'unchanged' | 'canceled' | undefined;
    reason: 'keyboard' | 'drag';
  } | null>(null);
  const records = useRefWithInit(
    () =>
      new Map<
        ListboxItemId,
        {
          element: HTMLElement;
          item: React.RefObject<Omit<ListboxSortingItemRecord<Value>, 'id'>>;
        }
      >(),
  ).current;

  const getOrderedItems = useStableCallback((): ListboxSortingItemRecord<Value>[] => {
    const order = new Map<Element, number>();
    store.state.listElement
      ?.querySelectorAll('[role="option"]')
      .forEach((element, index) => order.set(element, index));
    return [...records]
      .filter(([, record]) => record.element.isConnected)
      .sort(
        (a, b) =>
          (order.get(a[1].element) ?? a[1].item.current.index) -
          (order.get(b[1].element) ?? b[1].item.current.index),
      )
      .map(([id, record], index) => ({ ...record.item.current, id, index }));
  });
  const isDisabled = React.useCallback(
    (item: ListboxSortingItemRecord<Value>) =>
      disabled || item.disabled || !!isItemSortingDisabled?.(toSortingItem(item)),
    [disabled, isItemSortingDisabled],
  );
  const getItemIds = useStableCallback((id: ListboxItemId) => {
    const items = getOrderedItems();
    const source = items.find((item) => item.id === id);
    if (!source || isDisabled(source)) {
      return [];
    }
    const isSelected = (item: ListboxSortingItemRecord<Value>) =>
      store.state.value.some((value) => store.state.isItemEqualToValue(item.value, value));
    return (
      isSelected(source) ? items.filter((item) => isSelected(item) && !isDisabled(item)) : [source]
    ).map((item) => item.id);
  });
  const canMove = useStableCallback(
    (ids: ListboxItemId[], destination: ListboxSortingDestination) => {
      const ordered = getOrderedItems();
      const items = ordered.filter((item) => ids.includes(item.id));
      return (
        !disabled &&
        !!props.onItemsReorder &&
        items.length > 0 &&
        items.length === ids.length &&
        items.every((item) => !isDisabled(item)) &&
        Number.isInteger(destination.index) &&
        destination.index >= 0 &&
        destination.index <= ordered.length &&
        (props.canMoveItems?.({ items: items.map(toSortingItem), destination }) ?? true)
      );
    },
  );
  const clearAnnouncement = useStableCallback(() => {
    pending.current = null;
    setAnnouncement('');
  });
  const reconcile = useStableCallback(() => {
    if (disabled) {
      pending.current = null;
    }
    const proposal = pending.current;
    if (!proposal) {
      return;
    }
    const items = getOrderedItems();
    if (
      items.length !== proposal.order.length ||
      !items.every(
        (item, index) =>
          store.state.isItemEqualToValue(item.value, proposal.order[index].value) &&
          item.groupId === proposal.order[index].groupId,
      )
    ) {
      return;
    }
    pending.current = null;
    const index = items.findIndex((item) =>
      store.state.isItemEqualToValue(item.value, proposal.sourceValue),
    );
    if (index < 0) {
      return;
    }
    store.context.requestHighlightReconcile();
    store.set('activeIndex', index);
    records.get(items[index].id)?.element.focus();
    if (proposal.parameters) {
      const moved = items.filter((item) =>
        proposal.parameters!.items.some((entry) =>
          store.state.isItemEqualToValue(entry.value, item.value),
        ),
      );
      const first = moved[0];
      const destination = first ? { index: first.index, groupId: first.groupId } : null;
      const outcome = proposal.outcome ?? 'moved';
      const label = moved
        .map(
          (item) =>
            store.state.itemToStringLabel?.(item.value) ??
            records.get(item.id)?.element.textContent ??
            String(item.value),
        )
        .join(', ');
      const fallback = {
        canceled: 'Sorting canceled.',
        unchanged: 'Order unchanged.',
        moved: `Moved ${label} to position ${(first?.index ?? index) + 1} of ${items.length}.`,
      }[outcome];
      setAnnouncement(
        props.getAnnouncement?.({
          items: moved.map(toSortingItem),
          destination,
          reason: proposal.reason,
          outcome,
        }) ?? fallback,
      );
    }
  });
  const scheduleReconcile = useStableCallback(() => frame.request(reconcile));
  useIsoLayoutEffect(reconcile);

  const notifyOrder = useStableCallback(
    (
      items: ListboxSortingItemRecord<Value>[],
      parameters: ListboxSortingMove<Value>,
      event: Event,
      reason: typeof REASONS.drag | typeof REASONS.keyboard,
    ) => {
      const details = createChangeEventDetails(reason, undefined, undefined, {
        ...parameters,
        items: parameters.items.map(toSortingItem),
        order: items.map((item, index) => ({ ...toSortingItem(item), index })),
        event,
      });
      store.context.requestHighlightReconcile();
      props.onItemsReorder?.(
        items.map((item) => item.value),
        details,
      );
      return !details.isCanceled;
    },
  );
  const move = useStableCallback(
    (
      ids: ListboxItemId[],
      destination: ListboxSortingDestination,
      event: Event,
      sourceId = ids[0],
      reason: typeof REASONS.drag | typeof REASONS.keyboard = REASONS.drag,
      propose?: (
        current: ListboxSortingItemRecord<Value>[],
        next: ListboxSortingItemRecord<Value>[],
        notify: () => boolean,
      ) => boolean,
    ) => {
      if (!canMove(ids, destination)) {
        return null;
      }
      const current = getOrderedItems();
      const items = current.filter((item) => ids.includes(item.id));
      const next = current.filter((item) => !ids.includes(item.id));
      const index =
        destination.index - items.filter((item) => item.index < destination.index).length;
      next.splice(index, 0, ...items.map((item) => ({ ...item, groupId: destination.groupId })));
      if (
        next.every((item, i) => item.id === current[i].id && item.groupId === current[i].groupId)
      ) {
        return { changed: false, items: next };
      }
      const parameters = { items, destination };
      const keyboard = reason === REASONS.keyboard;
      // Install the proposal before notifying a consumer that may flush the update synchronously.
      pending.current = keyboard
        ? {
            order: next,
            sourceValue: current.find((item) => item.id === sourceId)!.value,
            parameters,
            reason: 'keyboard',
          }
        : null;
      const notify = () => notifyOrder(next, parameters, event, reason);
      if (!(propose ? propose(current, next, notify) : notify())) {
        pending.current = null;
        return null;
      }
      if (keyboard) {
        frame.request(reconcile);
      }
      return { changed: true, items: next };
    },
  );
  const requestFocus = useStableCallback(
    (
      order: ListboxSortingItemRecord<Value>[],
      sourceValue: Value,
      parameters: ListboxSortingMove<Value>,
      outcome: 'moved' | 'unchanged' | 'canceled',
    ) => {
      pending.current = { order, sourceValue, parameters, outcome, reason: 'drag' };
      frame.request(reconcile);
    },
  );
  const setupItem: ListboxSortingContextValue['setupItem'] = useStableCallback(
    (id, element, item) => {
      const record = { element, item };
      records.set(id, record);
      frame.request(reconcile);
      return () => {
        if (records.get(id) === record) {
          records.delete(id);
        }
      };
    },
  );
  const handleKeyDown = useStableCallback((event: React.KeyboardEvent, id: ListboxItemId) => {
    if (
      disabled ||
      event.defaultPrevented ||
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      closest(getTarget(event.nativeEvent) as Node | null, '[role="option"]') !==
        records.get(id)?.element
    ) {
      return;
    }
    const target = getTarget(event.nativeEvent);
    const row = records.get(id)?.element;
    if (!row || !(target instanceof ownerWindow(row).Element)) {
      return;
    }
    for (let node: Element | null = target; node && node !== row; node = getParentElement(node)) {
      if (node.matches(INTERACTIVE_ELEMENT_SELECTOR)) {
        return;
      }
    }
    const horizontal = store.state.orientation === 'horizontal';
    const backward = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
    const forward = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const previousKey = horizontal ? backward : 'ArrowUp';
    const nextKey = horizontal ? forward : 'ArrowDown';
    if (event.key !== previousKey && event.key !== nextKey) {
      return;
    }
    event.preventDefault();
    const ids = getItemIds(id);
    const ordered = getOrderedItems();
    const moving = ordered.filter((item) => ids.includes(item.id));
    if (!moving.length) {
      return;
    }
    const previous = event.key === previousKey;
    const destinationItem =
      ordered[previous ? moving[0].index - 1 : moving[moving.length - 1].index + 1];
    if (destinationItem && !destinationItem.disabled) {
      move(
        ids,
        { index: destinationItem.index + (previous ? 0 : 1), groupId: destinationItem.groupId },
        event.nativeEvent,
        id,
        REASONS.keyboard,
      );
    }
  });
  return React.useMemo(
    () => ({
      disabled,
      store,
      records,
      announcement,
      clearAnnouncement,
      setupItem,
      handleKeyDown,
      getOrderedItems,
      getItemIds,
      isDisabled,
      canMove,
      move,
      notifyOrder,
      reconcile,
      scheduleReconcile,
      requestFocus,
    }),
    [
      disabled,
      store,
      records,
      announcement,
      clearAnnouncement,
      setupItem,
      handleKeyDown,
      getOrderedItems,
      getItemIds,
      isDisabled,
      canMove,
      move,
      notifyOrder,
      reconcile,
      scheduleReconcile,
      requestFocus,
    ],
  );
}
