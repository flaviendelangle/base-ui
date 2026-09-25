import * as React from 'react';
import { expectType } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { Listbox } from '@base-ui/react/listbox';

const text = Draggable.createKind<string>('text');
const count = Draggable.createKind<number>('count');

<Listbox.ItemExternalDropTarget
  value="a"
  accept={text}
  onDraggableDrop={(value, eventDetails) => {
    expectType<string, typeof value.source.payload>(value.source.payload);
    expectType<Listbox.ItemExternalDropTarget.DropValue<string, string>, typeof value>(value);
    expectType<Listbox.ItemExternalDropTarget.DropEventDetails, typeof eventDetails>(eventDetails);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={[text, count]}
  canDrop={({ source }) => {
    expectType<string | number, typeof source.payload>(source.payload);
    return true;
  }}
  onDraggableDrop={({ source }) => {
    expectType<string | number, typeof source.payload>(source.payload);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={Draggable.anyKind}
  onDraggableDrop={({ source }) => {
    expectType<unknown, typeof source.payload>(source.payload);
  }}
/>;

// @ts-expect-error External acceptance must be explicit.
<Listbox.ItemExternalDropTarget value="a" />;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={text}
  onDrop={(event) => {
    expectType<Parameters<NonNullable<Listbox.Item.Props['onDrop']>>[0], typeof event>(event);
  }}
/>;
