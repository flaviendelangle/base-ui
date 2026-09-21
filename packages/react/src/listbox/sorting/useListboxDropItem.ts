'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import type { useListboxRootContext } from '../root/ListboxRootContext';
import type { ListboxSortingItem } from './ListboxSortingContext';
import type { ListboxItemId } from '../utils/ListboxItemId';

type Store = ReturnType<typeof useListboxRootContext>;
type Item = ListboxSortingItem<unknown>;
const collections = new WeakMap<Store, Map<ListboxItemId, () => Item>>();

export function getListboxDropItems(store: Store) {
  let records = collections.get(store);
  if (!records) {
    records = new Map();
    collections.set(store, records);
  }
  return records;
}

export function useListboxDropItem(
  store: Store,
  item: Omit<Item, 'id'> & { id: ListboxItemId | undefined },
) {
  const records = React.useMemo(() => getListboxDropItems(store), [store]);
  const readItem = useStableCallback((): Item => ({ ...item, id: item.id! }));
  useIsoLayoutEffect(() => {
    if (item.id === undefined || item.index < 0) {
      return undefined;
    }
    const id = item.id;
    records.set(id, readItem);
    return () => {
      records.delete(id);
    };
  }, [item.id, item.index, records, readItem]);
}
