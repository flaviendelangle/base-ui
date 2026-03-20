'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
import styles from './index.module.css';

const INITIAL_ITEMS: Tree.DefaultItemModel[] = [
  { id: 'resume', label: 'Resume.pdf' },
  { id: 'cover-letter', label: 'Cover Letter.docx' },
  { id: 'budget', label: 'Budget.xlsx' },
  { id: 'sunset', label: 'Sunset.jpg' },
  { id: 'mountains', label: 'Mountains.png' },
  { id: 'playlist', label: 'Playlist.m3u' },
  { id: 'notes', label: 'Notes.txt' },
];

export default function ExampleTreeReorderDnd() {
  const [items, setItems] = React.useState(INITIAL_ITEMS);
  const actionsRef = React.useRef<Tree.Root.Actions>(null);

  const dragAndDrop = useDragAndDrop({
    onReorder: ({ itemIds, target }) => {
      if (target.position === 'before') {
        actionsRef.current?.moveItemsBefore(itemIds, target.itemId);
      } else {
        actionsRef.current?.moveItemsAfter(itemIds, target.itemId);
      }
    },
  });

  return (
    <Tree.Root
      items={items}
      onItemsChange={setItems}
      actionsRef={actionsRef}
      dragAndDrop={dragAndDrop}
      className={styles.Tree}
    >
      {(item) => (
        <Tree.Item itemId={item.id} className={styles.Item}>
          <Tree.ItemDragIndicator className={styles.DragHandle}>
            <GripIcon />
          </Tree.ItemDragIndicator>
          <Tree.ItemLabel className={styles.Label} />
        </Tree.Item>
      )}
    </Tree.Root>
  );
}

function GripIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="4" cy="2.5" r="1" />
      <circle cx="8" cy="2.5" r="1" />
      <circle cx="4" cy="6" r="1" />
      <circle cx="8" cy="6" r="1" />
      <circle cx="4" cy="9.5" r="1" />
      <circle cx="8" cy="9.5" r="1" />
    </svg>
  );
}
