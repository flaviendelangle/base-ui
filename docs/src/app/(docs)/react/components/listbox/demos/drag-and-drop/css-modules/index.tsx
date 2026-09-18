'use client';
import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import styles from './index.module.css';

const initialItems = [
  { title: 'Bohemian Rhapsody', artist: 'Queen', value: 'bohemian-rhapsody' },
  { title: 'Billie Jean', artist: 'Michael Jackson', value: 'billie-jean' },
  { title: 'Hotel California', artist: 'Eagles', value: 'hotel-california' },
  { title: 'Superstition', artist: 'Stevie Wonder', value: 'superstition' },
  { title: 'Dancing Queen', artist: 'ABBA', value: 'dancing-queen' },
];

export default function ExampleListboxDragAndDrop() {
  const [items, setItems] = React.useState(initialItems);

  return (
    <div className={styles.Field}>
      <Listbox.Root defaultValue={['bohemian-rhapsody']}>
        <Listbox.Label className={styles.Label}>Queue</Listbox.Label>
        <Listbox.SortableProvider
          onItemsReorder={(order) => {
            setItems((prev) => {
              const itemsByValue = new Map(prev.map((item) => [item.value, item]));
              return order.map((value) => itemsByValue.get(value)!);
            });
          }}
        >
          <Listbox.List className={styles.List}>
            {items.map(({ title, artist, value }) => (
              <Listbox.Item key={value} value={value} className={styles.Item}>
                <Listbox.SortHandle className={styles.DragHandle}>
                  <GripIcon />
                </Listbox.SortHandle>
                <Listbox.ItemIndicator className={styles.ItemIndicator}>
                  <CheckIcon className={styles.ItemIndicatorIcon} />
                </Listbox.ItemIndicator>
                <Listbox.ItemText className={styles.ItemText}>
                  <span className={styles.ItemTitle}>{title}</span>
                  <span className={styles.ItemArtist}>{artist}</span>
                </Listbox.ItemText>
              </Listbox.Item>
            ))}
          </Listbox.List>
        </Listbox.SortableProvider>
      </Listbox.Root>
    </div>
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
