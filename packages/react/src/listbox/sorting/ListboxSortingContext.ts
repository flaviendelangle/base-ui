'use client';
import * as React from 'react';
import type { ExternalDropTargetProps } from '../../internals/sorting/SortableDropProvider';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxItemDraggableProps } from '../item/ListboxItem';

export interface ListboxSortingItem<Value = any> {
  id: ListboxItemId;
  value: Value;
  /**
   * Zero-based item index across the entire list, including all groups.
   * This is not an index within the item's group.
   * Tree uses indices within the current or destination parent.
   */
  index: number;
  /** The containing group's ID, or null for an ungrouped item. */
  groupId: string | null;
}

export interface ListboxSortingItemRecord<Value = any> extends ListboxSortingItem<Value> {
  disabled: boolean;
}

export interface ListboxSortingContextValue {
  disabled: boolean;
  isDisabled: (item: ListboxSortingItemRecord) => boolean;
  scheduleReconcile: () => void;
  setupItem: (
    id: ListboxItemId,
    element: HTMLElement,
    item: React.RefObject<Omit<ListboxSortingItemRecord, 'id'>>,
  ) => () => void;
  handleKeyDown: (event: React.KeyboardEvent, id: ListboxItemId) => void;
}

export const ListboxSortingContext = React.createContext<ListboxSortingContextValue | undefined>(
  undefined,
);

export interface ListboxSortableContextValue {
  renderItem: (
    element: React.ReactElement,
    id: ListboxItemId,
    disabled: boolean,
    props: ListboxItemDraggableProps | undefined,
    external?: ExternalDropTargetProps,
  ) => React.ReactElement;
}

// Item and keyboard sorting do not import the pointer implementation.
export const ListboxSortableContext = React.createContext<ListboxSortableContextValue | undefined>(
  undefined,
);

/** Public movement metadata excludes internal interaction state. */
export function toSortingItem<Value>(item: ListboxSortingItem<Value>): ListboxSortingItem<Value> {
  return { id: item.id, value: item.value, index: item.index, groupId: item.groupId };
}
