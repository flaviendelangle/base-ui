import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import { expectType } from '#test-utils';

<Listbox.SortableProvider<string>
  getDropPosition={({ source }) => {
    expectType<string[], typeof source.payload.items>(source.payload.items);
    // @ts-expect-error Sorting callbacks expose the DragSource, not only its payload.
    source.items;
    return 'before';
  }}
/>;

<Listbox.KeyboardSortableProvider<string>
  canMoveItems={({ items }) => {
    // @ts-expect-error Disabled state is internal, not public movement metadata.
    items[0].disabled;
    return true;
  }}
/>;
