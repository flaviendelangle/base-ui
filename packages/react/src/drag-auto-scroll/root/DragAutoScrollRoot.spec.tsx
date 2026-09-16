import * as React from 'react';
import { expectType } from '#test-utils';
import { DragAutoScroll } from '@base-ui/react/drag-auto-scroll';
import { Draggable } from '@base-ui/react/draggable';
import { DropTarget } from '@base-ui/react/drop-target';

interface CardPayload {
  id: string;
}

const card = Draggable.createKind<CardPayload>('card');

// The bare form compiles: every parameter is optional.
<DragAutoScroll.Root />;

// `maxSpeed` takes a static value or a callback keyed on `accept` like the rest.
<DragAutoScroll.Root maxSpeed={300} />;
<DragAutoScroll.Root
  accept={card}
  maxSpeed={({ source }) => {
    expectType<CardPayload, typeof source.payload>(source.payload);
    return 1800;
  }}
/>;

// @ts-expect-error a speed is a number, not a CSS length.
<DragAutoScroll.Root maxSpeed="300px" />;

<DragAutoScroll.Root
  className={(state) => {
    expectType<boolean, typeof state.disabled>(state.disabled);
    return '';
  }}
/>;

const ref: React.Ref<HTMLDivElement> = null;
<DragAutoScroll.Root ref={ref} />;

// One element, both roles: the scroll container composes onto a drop target.
<DropTarget.Root accept={card} render={<DragAutoScroll.Root />} />;

// A wrapper forwarding these props satisfies the component. Its type argument is
// the source payload, matching `DragAutoScroll.Root.Props`.
type CardScrollerProps = DragAutoScroll.Root.Props<CardPayload>;
function CardScroller(props: CardScrollerProps) {
  return <DragAutoScroll.Root<CardPayload> {...props} />;
}
// `onDragScroll` is keyed on `accept` like the other per-frame callbacks, and
// carries the frame's delta alongside the drag context.
<DragAutoScroll.Root
  accept={card}
  onDragScroll={(event, { source, element, x, y }) => {
    expectType<CardPayload, typeof source.payload>(source.payload);
    expectType<HTMLElement, typeof element>(element);
    expectType<number, typeof x>(x);
    expectType<number, typeof y>(y);
    event.stopPropagation();
  }}
/>;

<DragAutoScroll.Root
  onDragScroll={(_, { source }) => {
    expectType<unknown, typeof source.payload>(source.payload);
  }}
/>;

<DragAutoScroll.Root
  onDragScroll={(event, eventDetails) => {
    if (eventDetails.direction === 'vertical') {
      event.stopPropagation();
    }
  }}
/>;

// An extracted delegate types without reaching past this entry point.
const onPan: NonNullable<DragAutoScroll.Root.Props['onDragScroll']> = (event, { x, y }) => {
  expectType<number, typeof x>(x);
  expectType<number, typeof y>(y);
  event.stopPropagation();
};
<DragAutoScroll.Root onDragScroll={onPan} />;

const onCardPan: NonNullable<DragAutoScroll.Root.Props<CardPayload>['onDragScroll']> = (
  event,
  { source },
) => {
  expectType<CardPayload, typeof source.payload>(source.payload);
  event.stopPropagation();
};
<DragAutoScroll.Root accept={card} onDragScroll={onCardPan} />;

const readDelta = (
  context: Parameters<NonNullable<DragAutoScroll.Root.Props['onDragScroll']>>[1],
) => context.x + context.y;
<DragAutoScroll.Root
  onDragScroll={(event, context) => {
    void readDelta(context);
    event.stopPropagation();
  }}
/>;
