'use client';
import * as React from 'react';
import { visuallyHidden } from '@base-ui/utils/visuallyHidden';
import { ListboxRootFeatureProvider } from '../root/ListboxRootFeatures';
import type { ListboxRootFeature } from '../root/ListboxRootFeatures';
import { ListboxSortingContext } from '../sorting/ListboxSortingContext';
import { useListboxSorting } from '../sorting/useListboxSorting';
import type { ListboxReorderParameters } from '../sorting/useListboxSorting';

/**
 * Enables keyboard reordering with Alt+Arrow keys in the listbox it wraps.
 * Renders a visually hidden announcement region inside the listbox.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxKeyboardReorderProvider<Value = any>(
  props: ListboxKeyboardReorderProvider.Props<Value>,
) {
  const { children, disabled, onItemsReorder, canMoveItems, isItemReorderable, getAnnouncement } =
    props;
  const feature = React.useMemo(
    (): ListboxRootFeature => ({
      name: 'KeyboardReorderProvider',
      render: (rootChildren) => (
        <ListboxKeyboardSorting
          disabled={disabled}
          onItemsReorder={onItemsReorder}
          canMoveItems={canMoveItems}
          isItemReorderable={isItemReorderable}
          getAnnouncement={getAnnouncement}
        >
          {rootChildren}
        </ListboxKeyboardSorting>
      ),
    }),
    [disabled, onItemsReorder, canMoveItems, isItemReorderable, getAnnouncement],
  );
  return <ListboxRootFeatureProvider feature={feature}>{children}</ListboxRootFeatureProvider>;
}

/** The keyboard reordering of `Listbox.KeyboardReorderProvider`, rendered inside the root it wraps. */
function ListboxKeyboardSorting<Value>(props: ListboxKeyboardReorderProvider.Props<Value>) {
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

export interface ListboxKeyboardReorderProviderProps<
  Value = any,
> extends ListboxReorderParameters<Value> {
  children?: React.ReactNode;
}
export namespace ListboxKeyboardReorderProvider {
  export type Props<Value = any> = ListboxKeyboardReorderProviderProps<Value>;
}
