'use client';
import * as React from 'react';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';
import type { CollectionItemId } from '../../types/collection';

export type ListboxDropTargetEdge = 'before' | 'after';

export interface ListboxDragItem<Value = any> {
  value: Value;
  index: number;
  groupId: string | undefined;
  disabled: boolean;
}

export interface RegisteredListboxDragItem<Value = any> {
  next: ListboxDragItem<Value>;
}

export interface ListboxDragProviderReorderChange<Value = any> {
  sourceItems: ListboxDragItem<Value>[];
  targetItem: ListboxDragItem<Value> | null;
  edge: ListboxDropTargetEdge | null;
}

export type ListboxDragProviderItemsReorderEventDetails<Value = any> = BaseUIChangeEventDetails<
  typeof REASONS.drag | typeof REASONS.keyboard,
  ListboxDragProviderReorderChange<Value>
>;

export interface ListboxDragProviderCanDropParameters<Value = any> {
  sourceItems: ListboxDragItem<Value>[];
  targetItem: ListboxDragItem<Value>;
  edge: ListboxDropTargetEdge;
}

export interface ListboxDragProviderContext {
  startKeyboardDrag: (itemId: CollectionItemId) => boolean;
  setupItem: (
    itemId: CollectionItemId,
    element: HTMLElement,
    itemRef: RegisteredListboxDragItem,
  ) => () => void;
  scheduleDisplacementSweep: (element: HTMLElement) => void;
}

export const ListboxDragProviderContext = React.createContext<
  ListboxDragProviderContext | undefined
>(undefined);

export function useListboxDragProviderContext(optional?: false): ListboxDragProviderContext;
export function useListboxDragProviderContext(
  optional: true,
): ListboxDragProviderContext | undefined;
export function useListboxDragProviderContext(optional?: boolean) {
  const context = React.useContext(ListboxDragProviderContext);

  if (context === undefined && !optional) {
    throw new Error('Base UI: ListboxDragProviderContext is missing. Use <Listbox.DragProvider>.');
  }

  return context;
}
