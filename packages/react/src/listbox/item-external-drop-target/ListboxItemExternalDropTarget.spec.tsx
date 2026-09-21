import * as React from 'react';
import { expectType } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { Listbox } from '@base-ui/react/listbox';

const text = Draggable.createKind<string>('text');
const count = Draggable.createKind<number>('count');

<Listbox.ItemExternalDropTarget
  value="a"
  accept={text}
  onDrop={({ source }) => {
    expectType<string, typeof source.payload>(source.payload);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={[text, count]}
  canDrop={({ source }) => {
    expectType<string | number, typeof source.payload>(source.payload);
    return true;
  }}
  onDrop={({ source }) => {
    expectType<string | number, typeof source.payload>(source.payload);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={Draggable.anyKind}
  onDrop={({ source }) => {
    expectType<unknown, typeof source.payload>(source.payload);
  }}
/>;

// @ts-expect-error External acceptance must be explicit.
<Listbox.ItemExternalDropTarget value="a" />;
