'use client';
import * as React from 'react';
import { visuallyHidden } from '@base-ui/utils/visuallyHidden';
import { ListboxRootFeatureProvider, type ListboxRootFeature } from '../root/ListboxRootFeatures';
import { ListboxSortingContext } from '../sorting/ListboxSortingContext';
import { useListboxSorting, type ListboxSortingParameters } from '../sorting/useListboxSorting';

/**
 * Enables keyboard sorting with Alt+Arrow keys in the listbox it wraps.
 * Renders a visually hidden announcement region inside the listbox.
 */
export function ListboxKeyboardSortableProvider<Value = any>(
  props: ListboxKeyboardSortableProvider.Props<Value>,
) {
  const {
    children,
    disabled,
    onItemsReorder,
    canMoveItems,
    isItemSortingDisabled,
    getAnnouncement,
  } = props;
  const feature = React.useMemo(
    (): ListboxRootFeature => ({
      name: 'KeyboardSortableProvider',
      render: (rootChildren) => (
        <ListboxKeyboardSorting
          disabled={disabled}
          onItemsReorder={onItemsReorder}
          canMoveItems={canMoveItems}
          isItemSortingDisabled={isItemSortingDisabled}
          getAnnouncement={getAnnouncement}
        >
          {rootChildren}
        </ListboxKeyboardSorting>
      ),
    }),
    [disabled, onItemsReorder, canMoveItems, isItemSortingDisabled, getAnnouncement],
  );
  return <ListboxRootFeatureProvider feature={feature}>{children}</ListboxRootFeatureProvider>;
}

/** The keyboard sorting of `Listbox.KeyboardSortableProvider`, rendered inside the root it wraps. */
function ListboxKeyboardSorting<Value>(props: ListboxKeyboardSortableProvider.Props<Value>) {
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
}
