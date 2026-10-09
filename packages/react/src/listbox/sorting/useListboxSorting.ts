'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { getTarget, closest } from '@base-ui/utils/shadowDom';
import { ownerWindow } from '@base-ui/utils/owner';
import { INTERACTIVE_ELEMENT_SELECTOR } from '../../floating-ui-react/utils/constants';
import { getParentElement } from '../../utils/getParentElement';
import { useDirection } from '../../internals/direction-context';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { ListboxItemId } from '../utils/ListboxItemId';
import { useListboxRootContext } from '../root/ListboxRootContext';
import { toSortingItem } from './ListboxSortingContext';
import type {
  ListboxReorderItem,
  ListboxSortingItemRecord,
  ListboxSortingContextValue,
} from './ListboxSortingContext';

export interface ListboxReorderDestination {
  /**
   * Zero-based insertion index across the entire list, including all groups,
   * before removing the moved items. This is not an index within the destination group.
   */
  index: number;
  /** Group of the destination item, or null for ungrouped items. */
  groupId: string | null;
}
export interface ListboxReorderMove<Value = any> {
  items: ListboxReorderItem<Value>[];
  destination: ListboxReorderDestination;
}
export type ListboxItemsReorderEventDetails<Value = any> = Omit<
  BaseUIChangeEventDetails<typeof REASONS.none>,
  'reason'
> &
  ListboxReorderMove<Value> & {
    reason: typeof REASONS.keyboard | typeof REASONS.drag;
    /** Complete proposed order, including group membership. Use this when moving items between groups. */
    order: ListboxReorderItem<Value>[];
  };
export interface ListboxReorderAnnouncementParameters<Value = any> {
  /** Moved items with their current values and positions. */
  items: ListboxReorderItem<Value>[];
  /**
   * Resulting position of the first moved item, or null if none remain or nothing moved.
   * The index is relative to the whole list after the operation.
   */
  destination: ListboxReorderDestination | null;
  reason: 'keyboard' | 'drag';
  /**
   * - `'moved'`, `'unchanged'`, `'canceled'`: how a completed move or a pointer reorder ended.
   * - `'blocked'`: a keyboard move can't go in `direction`.
   */
  outcome: 'moved' | 'unchanged' | 'canceled' | 'blocked';
  /** The arrow key direction of a keyboard move, or `null` for pointer reordering. */
  direction: 'up' | 'down' | 'left' | 'right' | null;
}

type ListboxSortingDirection = NonNullable<ListboxReorderAnnouncementParameters['direction']>;

// Word Joiner is invisible and zero-width, so toggling it changes the region's text
// without changing what is read.
const REPEAT_MARKER = '\u2060';

export interface ListboxReorderParameters<Value = any> {
  /** Disables keyboard and pointer reordering. @default false */
  disabled?: boolean | undefined;
  /**
   * Event handler called when reordering proposes a new order, with all values in that order.
   * Render the items in this order to accept the move.
   */
  onItemsReorder: (items: Value[], eventDetails: ListboxItemsReorderEventDetails<Value>) => void;
  /** Applies the same movement rules to keyboard and pointer reordering. */
  canMoveItems?: ((move: ListboxReorderMove<Value>) => boolean) | undefined;
  /**
   * Whether an item can be moved. Return `false` to keep it in place while it stays
   * selectable and available as a destination.
   */
  isItemReorderable?: ((item: ListboxReorderItem<Value>) => boolean) | undefined;
  /**
   * Customizes polite announcements for keyboard moves and final pointer outcomes.
   * Return `undefined` to use the default text.
   */
  getAnnouncement?:
    ((parameters: ListboxReorderAnnouncementParameters<Value>) => string | undefined) | undefined;
}

export function useListboxSorting<Value>(props: ListboxReorderParameters<Value>) {
  const store = useListboxRootContext();
  const rootDisabled = store.useState('disabled');
  const disabled = rootDisabled || !!props.disabled;
  const isItemReorderable = props.isItemReorderable;
  const direction = useDirection();
  const frame = useAnimationFrame();
  const [announcement, setAnnouncement] = React.useState('');
  const pending = React.useRef<{
    order: ListboxSortingItemRecord<Value>[];
    sourceValue: Value;
    parameters: ListboxReorderMove<Value> | null;
    outcome?: 'moved' | 'unchanged' | 'canceled' | undefined;
    reason: 'keyboard' | 'drag';
    direction: ListboxSortingDirection | null;
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
      disabled ||
      item.disabled ||
      (isItemReorderable != null && !isItemReorderable(toSortingItem(item))),
    [disabled, isItemReorderable],
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
    (ids: ListboxItemId[], destination: ListboxReorderDestination) => {
      const ordered = getOrderedItems();
      const items = ordered.filter((item) => ids.includes(item.id));
      return (
        !disabled &&
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
  const getLabel = useStableCallback((items: ListboxSortingItemRecord<Value>[]) =>
    items
      .map(
        (item) =>
          store.state.itemToStringLabel?.(item.value) ??
          records.get(item.id)?.element.textContent ??
          String(item.value),
      )
      .join(', '),
  );
  const announce = useStableCallback(
    (parameters: ListboxReorderAnnouncementParameters<Value>, fallback: string) => {
      const text = props.getAnnouncement?.(parameters) ?? fallback;
      // Toggled so that the live region changes, and announces a repeated message again.
      setAnnouncement((previous) =>
        text !== '' && previous === text ? `${text}${REPEAT_MARKER}` : text,
      );
    },
  );
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
      const fallback = {
        canceled: 'Reordering canceled.',
        unchanged: 'Order unchanged.',
        moved: `Moved ${getLabel(moved)} to position ${(first?.index ?? index) + 1} of ${items.length}.`,
      }[outcome];
      announce(
        {
          items: moved.map(toSortingItem),
          destination,
          reason: proposal.reason,
          outcome,
          direction: proposal.direction,
        },
        fallback,
      );
    }
  });
  const scheduleReconcile = useStableCallback(() => frame.request(reconcile));
  useIsoLayoutEffect(reconcile);

  const notifyOrder = useStableCallback(
    (
      items: ListboxSortingItemRecord<Value>[],
      parameters: ListboxReorderMove<Value>,
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
      props.onItemsReorder(
        items.map((item) => item.value),
        details,
      );
      return !details.isCanceled;
    },
  );
  const move = useStableCallback(
    (
      ids: ListboxItemId[],
      destination: ListboxReorderDestination,
      event: Event,
      sourceId = ids[0],
      reason: typeof REASONS.drag | typeof REASONS.keyboard = REASONS.drag,
      direction: ListboxSortingDirection | null = null,
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
            direction,
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
      parameters: ListboxReorderMove<Value>,
      outcome: 'moved' | 'unchanged' | 'canceled',
    ) => {
      pending.current = {
        order,
        sourceValue,
        parameters,
        outcome,
        reason: 'drag',
        direction: null,
      };
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
    const arrow = event.key.slice('Arrow'.length).toLowerCase() as ListboxSortingDirection;
    const announceBlocked = (items: ListboxSortingItemRecord<Value>[]) =>
      announce(
        {
          items: items.map(toSortingItem),
          destination: null,
          reason: 'keyboard',
          outcome: 'blocked',
          direction: arrow,
        },
        `Can't move ${getLabel(items)} further ${arrow}.`,
      );
    if (!moving.length) {
      const source = ordered.find((item) => item.id === id);
      if (source) {
        announceBlocked([source]);
      }
      return;
    }
    // A pointer can drop before or after an enabled item, so the keyboard
    // reaches the same slots: it jumps over disabled items in one step.
    let destination: ListboxReorderDestination | null = null;
    if (event.key === previousKey) {
      for (let index = moving[0].index - 1; index >= 0 && !destination; index -= 1) {
        const item = ordered[index];
        const before = ordered[index - 1];
        if (!item.disabled) {
          destination = { index: item.index, groupId: item.groupId };
        } else if (before && !before.disabled) {
          destination = { index: before.index + 1, groupId: before.groupId };
        }
      }
    } else {
      const last = moving[moving.length - 1].index;
      for (let index = last + 1; index < ordered.length && !destination; index += 1) {
        const item = ordered[index];
        const after = ordered[index + 1];
        if (!item.disabled) {
          destination = { index: item.index + 1, groupId: item.groupId };
        } else if (after && !after.disabled) {
          destination = { index: after.index, groupId: after.groupId };
        }
      }
    }
    if (!destination || !move(ids, destination, event.nativeEvent, id, REASONS.keyboard, arrow)) {
      announceBlocked(moving);
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
