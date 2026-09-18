'use client';
import * as React from 'react';
import type { CollectionItemId } from '../../types/collection';
import type { ListboxItemDraggableProps } from '../item/ListboxItem';

export interface ListboxSortingItem<Value = any> {
  id: CollectionItemId;
  value: Value;
  index: number;
  groupId: string | undefined;
  disabled: boolean;
}

export interface ListboxSortingContextValue {
  disabled: boolean;
  reconcile: () => void;
  setupItem: (
    id: CollectionItemId,
    element: HTMLElement,
    item: React.RefObject<Omit<ListboxSortingItem, 'id'>>,
  ) => () => void;
  handleKeyDown: (event: React.KeyboardEvent, id: CollectionItemId) => void;
}

export const ListboxSortingContext = React.createContext<ListboxSortingContextValue | undefined>(
  undefined,
);

export interface ListboxSortableContextValue {
  renderItem: (
    element: React.ReactElement,
    id: CollectionItemId,
    disabled: boolean,
    props: ListboxItemDraggableProps | undefined,
  ) => React.ReactElement;
}

// Item and keyboard sorting do not import the pointer implementation.
export const ListboxSortableContext = React.createContext<ListboxSortableContextValue | undefined>(
  undefined,
);
