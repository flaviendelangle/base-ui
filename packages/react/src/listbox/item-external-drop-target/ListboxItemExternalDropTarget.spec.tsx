import * as React from 'react';
import { expectType } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { Listbox } from '@base-ui/react/listbox';

const text = Draggable.createKind<string>('text');
const count = Draggable.createKind<number>('count');

<Listbox.ItemExternalDropTarget
  value="a"
  accept={text}
  onDraggableDrop={(eventDetails) => {
    expectType<string, typeof eventDetails.source.payload>(eventDetails.source.payload);
    expectType<string, typeof eventDetails.item>(eventDetails.item);
    expectType<
      Listbox.ItemExternalDropTarget.DropEventDetails<string, string>,
      typeof eventDetails
    >(eventDetails);
    expectType<'drop', typeof eventDetails.reason>(eventDetails.reason);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={[text, count]}
  canDrop={({ source }) => {
    expectType<string | number, typeof source.payload>(source.payload);
    return true;
  }}
  onDraggableDrop={(eventDetails) => {
    expectType<string | number, typeof eventDetails.source.payload>(eventDetails.source.payload);
  }}
/>;

<Listbox.ItemExternalDropTarget
  value="a"
  accept={Draggable.anyKind}
  onDraggableDrop={(eventDetails) => {
    expectType<unknown, typeof eventDetails.source.payload>(eventDetails.source.payload);
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
