'use client';
import * as React from 'react';
import { visuallyHidden } from '@base-ui/utils/visuallyHidden';
import { ListboxSortingContext } from '../sorting/ListboxSortingContext';
import {
  useListboxSorting,
  type ListboxSortingParameters,
  type ListboxItemsReorderEventDetails,
  type ListboxMoveItemsParameters,
} from '../sorting/useListboxSorting';

/** Enables keyboard sorting with Alt+Arrow keys. Renders a visually hidden announcement region. */
export function ListboxKeyboardSortableProvider<Value = any>(
  props: ListboxKeyboardSortableProvider.Props<Value>,
) {
  const sorting = useListboxSorting(props);
  return (
    <ListboxSortingContext.Provider value={sorting}>
      {props.children}
      <span role="status" aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {sorting.announcement}
      </span>
    </ListboxSortingContext.Provider>
  );
}
export interface ListboxKeyboardSortableProviderProps<
  Value = any,
> extends ListboxSortingParameters<Value> {
  children?: React.ReactNode;
}
export namespace ListboxKeyboardSortableProvider {
  export type Props<Value = any> = ListboxKeyboardSortableProviderProps<Value>;
  export type ItemsReorderEventDetails<Value = any> = ListboxItemsReorderEventDetails<Value>;
  export type MoveItemsParameters<Value = any> = ListboxMoveItemsParameters<Value>;
}
