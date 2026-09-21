'use client';
import * as React from 'react';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type { ListboxItemDraggableProps } from '../item/ListboxItem';

export interface ListboxSortingItem<Value = any> {
  id: ListboxItemId;
  value: Value;
  /**
   * Zero-based item index across the entire list, including all groups.
   * This is not an index within the item's group.
   *
   * TODO: Clarify before merging. Listbox uses a list-wide index, while Tree uses
   * an index within the item's parent. Decide whether sorting should share one
   * convention across both components or retain and document this difference.
   */
  index: number;
  /** The containing group's ID, or null for an ungrouped item. */
  groupId: string | null;
  disabled: boolean;
}

export interface ListboxSortingContextValue {
  disabled: boolean;
  isDisabled: (item: ListboxSortingItem) => boolean;
  scheduleReconcile: () => void;
  setupItem: (
    id: ListboxItemId,
    element: HTMLElement,
    item: React.RefObject<Omit<ListboxSortingItem, 'id'>>,
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
  ) => React.ReactElement;
}

// Item and keyboard sorting do not import the pointer implementation.
export const ListboxSortableContext = React.createContext<ListboxSortableContextValue | undefined>(
  undefined,
);
