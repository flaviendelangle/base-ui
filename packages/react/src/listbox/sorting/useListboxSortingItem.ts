'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useId } from '@base-ui/utils/useId';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import type { CollectionItemId } from '../../types/collection';
import { ListboxSortingContext } from './ListboxSortingContext';

/**
 * Parameters for {@link useListboxSortingItem}.
 */
export interface UseListboxSortingItemParameters {
  /** Composite index of the item within the current listbox. */
  index: number;
  /** Value associated with the current item. */
  itemValue: any;
  /** Ref to the item's DOM element. */
  itemRef: React.RefObject<HTMLElement | null>;
  /** Whether sorting registration is enabled for the item. */
  enabled: boolean;
  /** Whether the item is disabled. */
  disabled: boolean;
  /**
   * Group ID metadata exposed to provider sorting predicates.
   */
  groupId: string | null;
}

/**
 * Wires a listbox item into `Listbox.KeyboardSortableProvider or Listbox.SortableProvider`.
 *
 * @param params Configuration for the current draggable item.
 * @returns The stable identifier used by the sorting provider.
 */
export function useListboxSortingItem(
  params: UseListboxSortingItemParameters,
): CollectionItemId | undefined {
  const { index, itemValue, itemRef, enabled, disabled, groupId } = params;

  const itemId = useId();
  const item = useValueAsRef({ value: itemValue, index, groupId, disabled });
  const sorting = React.useContext(ListboxSortingContext);

  const setupItem = sorting?.setupItem;
  useIsoLayoutEffect(() => {
    const element = itemRef.current;
    if (!setupItem || itemId === undefined || !element || !enabled) {
      return undefined;
    }

    return setupItem(itemId, element, item);
  }, [setupItem, enabled, itemId, item, itemRef]);

  useIsoLayoutEffect(() => {
    sorting?.scheduleReconcile();
  });

  return itemId;
}
