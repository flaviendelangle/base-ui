'use client';
import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import { Draggable } from '@base-ui/react/draggable';

const tracks = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', value: 'bohemian-rhapsody' },
  { title: 'Billie Jean', artist: 'Michael Jackson', value: 'billie-jean' },
  { title: 'Hotel California', artist: 'Eagles', value: 'hotel-california' },
  { title: 'Superstition', artist: 'Stevie Wonder', value: 'superstition' },
  { title: 'Dancing Queen', artist: 'ABBA', value: 'dancing-queen' },
];

const queueKind =
  Draggable.createKind<Listbox.SortableProvider.DragPayload<string>>('demo/queue-track');

export default function ExampleListboxCrossListDnd() {
  const [queues, setQueues] = React.useState([tracks.slice(0, 3), tracks.slice(3)]);
  function transfer(values: string[], destination: number, index: number) {
    setQueues((current) => {
      const moving = values.flatMap((value) =>
        current.flat().filter((track) => track.value === value),
      );
      const next = current.map((queue) => queue.filter((track) => !values.includes(track.value)));
      next[destination].splice(index, 0, ...moving);
      return next;
    });
  }
  return (
    <Draggable.Provider>
      <div className="flex flex-wrap items-start gap-6">
        {queues.map((items, queueIndex) => (
          <div key={queueIndex} className="flex flex-col gap-1">
            <Listbox.SortableProvider
              kind={queueKind}
              onItemsReorder={(order: string[]) => {
                setQueues((current) =>
                  current.map((queue, index) =>
                    index === queueIndex
                      ? order.map((value) => queue.find((track) => track.value === value)!)
                      : queue,
                  ),
                );
              }}
            >
              <Listbox.Root>
                <Listbox.Label className="cursor-default text-sm leading-5 font-medium text-neutral-900 dark:text-neutral-100">
                  {queueIndex === 0 ? 'Queue' : 'Up next'}
                </Listbox.Label>
                <Listbox.List
                  className="box-border w-64 max-h-80 overflow-y-auto py-1 rounded-md outline outline-1 outline-neutral-200 dark:outline-neutral-700 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-500"
                  style={{ minHeight: 48 }}
                  render={
                    <Draggable.Target
                      accept={queueKind}
                      canDrop={() => items.length === 0}
                      onDraggableDrop={({ source }) =>
                        transfer(source.payload.items, queueIndex, 0)
                      }
                    />
                  }
                >
                  {items.map(({ title, artist, value }) => (
                    <Listbox.ItemExternalDropTarget
                      accept={queueKind}
                      onDraggableDrop={({ source, destination }) =>
                        transfer(source.payload.items, queueIndex, destination.index)
                      }
                      key={value}
                      value={value}
                      className="relative grid cursor-default grid-cols-[1.5rem_0.75rem_1fr] items-center gap-1.5 py-2 pr-4 pl-1 text-sm leading-4 text-neutral-900 dark:text-neutral-100 outline-hidden select-none data-[highlighted]:z-0 data-[highlighted]:before:absolute data-[highlighted]:before:inset-x-1 data-[highlighted]:before:inset-y-0 data-[highlighted]:before:z-[-1] data-[highlighted]:before:rounded-xs data-[highlighted]:before:bg-neutral-100 dark:data-[highlighted]:before:bg-neutral-800 data-[disabled]:text-neutral-400 dark:data-[disabled]:text-neutral-500 data-[disabled]:data-[highlighted]:before:bg-neutral-200 dark:data-[disabled]:data-[highlighted]:before:bg-neutral-900 data-[moving]:opacity-50 data-[drop-position=before]:after:absolute data-[drop-position=before]:after:top-[-1px] data-[drop-position=before]:after:left-1 data-[drop-position=before]:after:right-1 data-[drop-position=before]:after:h-0.5 data-[drop-position=before]:after:bg-blue-500 data-[drop-position=before]:after:content-[''] data-[drop-position=after]:after:absolute data-[drop-position=after]:after:bottom-[-1px] data-[drop-position=after]:after:left-1 data-[drop-position=after]:after:right-1 data-[drop-position=after]:after:h-0.5 data-[drop-position=after]:after:bg-blue-500 data-[drop-position=after]:after:content-[''] pointer-coarse:py-2.5 pointer-coarse:text-[0.925rem]"
                    >
                      <Listbox.SortHandle
                        aria-label="Drag track"
                        className="col-start-1 flex w-6 shrink-0 items-center justify-center cursor-grab text-neutral-400 active:cursor-grabbing"
                      >
                        <GripIcon />
                      </Listbox.SortHandle>
                      <Listbox.ItemIndicator className="col-start-2">
                        <CheckIcon className="size-3" />
                      </Listbox.ItemIndicator>
                      <Listbox.ItemText className="col-start-3 flex flex-col gap-0.5">
                        <span className="font-semibold">{title}</span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {artist}
                        </span>
                      </Listbox.ItemText>
                    </Listbox.ItemExternalDropTarget>
                  ))}
                </Listbox.List>
              </Listbox.Root>
            </Listbox.SortableProvider>
          </div>
        ))}
      </div>
    </Draggable.Provider>
  );
}

function GripIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="currentcolor" {...props}>
      <circle cx="2" cy="2" r="1.25" />
      <circle cx="6" cy="2" r="1.25" />
      <circle cx="2" cy="7" r="1.25" />
      <circle cx="6" cy="7" r="1.25" />
      <circle cx="2" cy="12" r="1.25" />
      <circle cx="6" cy="12" r="1.25" />
    </svg>
  );
}

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg fill="currentcolor" width="10" height="10" viewBox="0 0 10 10" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}
