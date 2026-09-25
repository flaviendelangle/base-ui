import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import { expectType } from '#test-utils';

<Listbox.SortableProvider<string>
  getDropPosition={({ source, target }) => {
    expectType<string[], typeof source.payload.items>(source.payload.items);
    // @ts-expect-error Sorting callbacks expose the drag source record, not only its payload.
    source.items;
    expectType<Listbox.ItemId, typeof target.payload.id>(target.payload.id);
    return 'before';
  }}
  onSortEnd={({ itemIds }, eventDetails) => {
    expectType<Listbox.ItemId[], typeof itemIds>(itemIds);
    expectType<boolean, typeof eventDetails.canceled>(eventDetails.canceled);
  }}
/>;

<Listbox.KeyboardSortableProvider<string>
  canMoveItems={({ items }) => {
    // @ts-expect-error Disabled state is internal, not public movement metadata.
    items[0].disabled;
    return true;
  }}
/>;
