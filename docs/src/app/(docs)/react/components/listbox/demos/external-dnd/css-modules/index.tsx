'use client';
import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import { Draggable } from '@base-ui/react/draggable';
import styles from './index.module.css';

const tracks = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', value: 'bohemian-rhapsody' },
  { title: 'Billie Jean', artist: 'Michael Jackson', value: 'billie-jean' },
  { title: 'Hotel California', artist: 'Eagles', value: 'hotel-california' },
  { title: 'Superstition', artist: 'Stevie Wonder', value: 'superstition' },
  { title: 'Dancing Queen', artist: 'ABBA', value: 'dancing-queen' },
];

const queueKind =
  Draggable.createKind<Listbox.SortableProvider.DragPayload<string>>('demo/queue-track');
const paletteKind = Draggable.createKind<string>('demo/library-track');

export default function ExampleListboxExternalDnd() {
  const [items, setItems] = React.useState(tracks.slice(0, 2));
  const [archived, setArchived] = React.useState<string[]>([]);
  const available = tracks.filter((track) => !items.some((item) => item.value === track.value));
  function addTrack(value: string, index: number) {
    setItems((current) => {
      const track = tracks.find((item) => item.value === value);
      if (!track || current.some((item) => item.value === value)) {
        return current;
      }
      return [...current.slice(0, index), track, ...current.slice(index)];
    });
  }
  return (
    <Draggable.Provider>
      <div className={styles.Layout}>
        <div className={styles.Field}>
          <span className={styles.Label}>Library</span>
          {available.map((track) => (
            <Draggable.Root
              key={track.value}
              kind={paletteKind}
              payload={track.value}
              aria-label={track.title}
              className={styles.External}
            >
              {track.title}
            </Draggable.Root>
          ))}
        </div>
        <div className={styles.Field}>
          <Listbox.SortableProvider
            kind={queueKind}
            onItemsReorder={(order: string[]) => {
              setItems((current) =>
                order.map((value) => current.find((track) => track.value === value)!),
              );
            }}
          >
            <Listbox.Root>
              <Listbox.Label className={styles.Label}>Queue</Listbox.Label>
              <Listbox.List
                className={styles.List}
                style={{ minHeight: 48 }}
                render={
                  <Draggable.Target
                    accept={paletteKind}
                    canDrop={() => items.length === 0}
                    onDraggableDrop={({ source }) => addTrack(source.payload, 0)}
                  />
                }
              >
                {items.map(({ title, artist, value }) => (
                  <Listbox.ItemExternalDropTarget
                    accept={paletteKind}
                    onDraggableDrop={({ source, destination }) =>
                      addTrack(source.payload, destination.index)
                    }
                    key={value}
                    value={value}
                    className={styles.Item}
                  >
                    <Listbox.SortHandle aria-label="Drag track" className={styles.DragHandle}>
                      <GripIcon />
                    </Listbox.SortHandle>
                    <Listbox.ItemIndicator className={styles.ItemIndicator}>
                      <CheckIcon className={styles.ItemIndicatorIcon} />
                    </Listbox.ItemIndicator>
                    <Listbox.ItemText className={styles.ItemText}>
                      <span className={styles.ItemTitle}>{title}</span>
                      <span className={styles.ItemArtist}>{artist}</span>
                    </Listbox.ItemText>
                  </Listbox.ItemExternalDropTarget>
                ))}
              </Listbox.List>
            </Listbox.Root>
          </Listbox.SortableProvider>
        </div>
        <div className={styles.Field}>
          <span className={styles.Label}>Archive</span>
          <Draggable.Target
            accept={queueKind}
            aria-label="Archive tracks"
            className={styles.External}
            onDraggableDrop={({ source }) => {
              setArchived((current) => [
                ...current,
                ...source.payload.items.map(
                  (value) => tracks.find((track) => track.value === value)!.title,
                ),
              ]);
              setItems((current) =>
                current.filter((track) => !source.payload.items.includes(track.value)),
              );
            }}
          >
            {archived.length ? archived.join(', ') : 'Drop tracks here'}
          </Draggable.Target>
        </div>
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
