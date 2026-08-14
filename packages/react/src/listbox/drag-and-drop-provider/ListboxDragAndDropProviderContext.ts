'use client';
import * as React from 'react';
import type { CollectionItemId } from '../../types/collection';

export type ListboxDragAndDropTargetEdge = 'before' | 'after';

export interface ListboxDragAndDropItem<Value = any> {
  value: Value;
  index: number;
  groupId: string | undefined;
  disabled: boolean;
}

export interface RegisteredListboxDragAndDropItem<Value = any> {
  next: ListboxDragAndDropItem<Value>;
}

export interface ListboxDragAndDropProviderOnItemsReorderEvent<Value = any> {
  items: Value[];
  referenceItem: Value;
  edge: ListboxDragAndDropTargetEdge;
  reason: 'drag' | 'keyboard';
}

export interface ListboxDragAndDropProviderContext {
  onItemsReorder: ((event: ListboxDragAndDropProviderOnItemsReorderEvent) => void) | undefined;
  canDragItem: (item: ListboxDragAndDropItem) => boolean;
  canDropItems: (
    sourceItems: ListboxDragAndDropItem[],
    targetItem: ListboxDragAndDropItem,
    edge: ListboxDragAndDropTargetEdge,
  ) => boolean;
  setupItem: (
    itemId: CollectionItemId,
    element: HTMLElement,
    itemRef: RegisteredListboxDragAndDropItem,
  ) => () => void;
  setupHandle: (itemId: CollectionItemId, element: HTMLElement) => () => void;
}

export const ListboxDragAndDropProviderContext = React.createContext<
  ListboxDragAndDropProviderContext | undefined
>(undefined);

export function useListboxDragAndDropProviderContext(
  optional?: false,
): ListboxDragAndDropProviderContext;
export function useListboxDragAndDropProviderContext(
  optional: true,
): ListboxDragAndDropProviderContext | undefined;
export function useListboxDragAndDropProviderContext(optional?: boolean) {
  const context = React.useContext(ListboxDragAndDropProviderContext);

  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: ListboxDragAndDropProviderContext is missing. Use <Listbox.DragAndDropProvider>.',
    );
  }

  return context;
}
