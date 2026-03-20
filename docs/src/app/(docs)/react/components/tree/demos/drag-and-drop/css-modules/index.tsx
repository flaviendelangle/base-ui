'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
import styles from './index.module.css';

const INITIAL_ITEMS: Tree.DefaultItemModel[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      { id: 'cover-letter', label: 'Cover Letter.docx' },
      { id: 'budget', label: 'Budget.xlsx' },
    ],
  },
  {
    id: 'photos',
    label: 'Photos',
    children: [
      { id: 'sunset', label: 'Sunset.jpg' },
      { id: 'mountains', label: 'Mountains.png' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    children: [{ id: 'playlist', label: 'Playlist.m3u' }],
  },
  { id: 'notes', label: 'Notes.txt' },
];

export default function ExampleTreeDragAndDrop() {
  const [items, setItems] = React.useState(INITIAL_ITEMS);
  const actionsRef = React.useRef<Tree.Root.Actions>(null);

  const dragAndDrop = useDragAndDrop({
    onMove: ({ itemIds, target }) => {
      if (target.position === 'before') {
        actionsRef.current?.moveItemsBefore(itemIds, target.itemId);
      } else if (target.position === 'after') {
        actionsRef.current?.moveItemsAfter(itemIds, target.itemId);
      } else {
        actionsRef.current?.moveItems(itemIds, target.itemId, 0);
      }
    },
    renderDragPreview: ({ itemIds, draggedItemId }) => {
      return (
        <div className={styles.DragPreview}>
          {itemIds.size === 1
            ? (actionsRef.current?.getItemModel(draggedItemId)?.label ?? '')
            : `${itemIds.size} items`}
        </div>
      );
    },
  });

  return (
    <Tree.Root
      items={items}
      onItemsChange={setItems}
      actionsRef={actionsRef}
      expandOnClick
      selectionMode="multiple"
      defaultExpandedItems={['documents', 'photos', 'music']}
      dragAndDrop={dragAndDrop}
      className={styles.Tree}
    >
      {(item) => (
        <Tree.Item itemId={item.id} className={styles.Item}>
          <Tree.ItemDragIndicator className={styles.DragHandle}>
            <GripIcon />
          </Tree.ItemDragIndicator>
          <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
            <ChevronIcon />
          </Tree.ItemExpansionTrigger>
          <Tree.ItemGroupIndicator className={styles.Icon}>
            <FolderIcon />
          </Tree.ItemGroupIndicator>
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

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor">
      <path
        d="M4.5 2L8.5 6L4.5 10"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor">
      <path
        d="M2 4.5C2 3.67 2.67 3 3.5 3H6.38a1 1 0 01.7.29l1.13 1.13a1 1 0 00.7.29H12.5c.83 0 1.5.67 1.5 1.5V12c0 .83-.67 1.5-1.5 1.5h-9A1.5 1.5 0 012 12V4.5z"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
