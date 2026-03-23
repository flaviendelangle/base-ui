'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import type { CollectionItemId } from '@base-ui/react/types';
import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
import styles from './index.module.css';

const INBOX_ITEMS: Tree.DefaultItemModel[] = [
  {
    id: 'urgent',
    label: 'Urgent',
    children: [
      { id: 'bug-report', label: 'Bug report.md' },
      { id: 'outage-notes', label: 'Outage notes.txt' },
    ],
  },
  { id: 'meeting-notes', label: 'Meeting notes.md' },
  { id: 'feature-request', label: 'Feature request.md' },
  { id: 'feedback', label: 'Feedback.txt' },
];

const ARCHIVE_ITEMS: Tree.DefaultItemModel[] = [
  {
    id: 'q1',
    label: 'Q1',
    children: [{ id: 'q1-summary', label: 'Summary.pdf' }],
  },
  { id: 'old-notes', label: 'Old notes.txt' },
];

export default function ExampleTreeCrossTreeDnd() {
  const inboxActionsRef = React.useRef<Tree.Root.Actions>(null);
  const archiveActionsRef = React.useRef<Tree.Root.Actions>(null);

  return (
    <div className={styles.Layout}>
      <DndTree
        title="Inbox"
        defaultItems={INBOX_ITEMS}
        actionsRef={inboxActionsRef}
        defaultExpandedItems={['urgent']}
      />
      <DndTree
        title="Archive"
        defaultItems={ARCHIVE_ITEMS}
        actionsRef={archiveActionsRef}
        defaultExpandedItems={['q1']}
      />
    </div>
  );
}

function DndTree({
  title,
  defaultItems,
  actionsRef,
  defaultExpandedItems,
}: {
  title: string;
  defaultItems: Tree.DefaultItemModel[];
  actionsRef: React.RefObject<Tree.Root.Actions | null>;
  defaultExpandedItems: CollectionItemId[];
}) {
  const dragAndDrop = useDragAndDrop({
    getAllowedDropOperations: () => ['move', 'copy'],
    getDropOperation: ({ allowedOperations }) => allowedOperations[0] ?? 'cancel',
    onMove: ({ itemIds, target }) => {
      if (target.position === 'before') {
        actionsRef.current?.moveItemsBefore(itemIds, target.itemId);
      } else if (target.position === 'after') {
        actionsRef.current?.moveItemsAfter(itemIds, target.itemId);
      } else {
        actionsRef.current?.moveItems(itemIds, target.itemId, 0);
      }
    },
    onInsert: ({ items, target }) => {
      const models = items as Tree.DefaultItemModel[];
      if (target.position === 'before') {
        actionsRef.current?.addItemsBefore(models, target.itemId);
      } else {
        actionsRef.current?.addItemsAfter(models, target.itemId);
      }
    },
    onDragEnd: ({ itemIds, isInternal, dropOperation }) => {
      if (!isInternal && dropOperation === 'move') {
        actionsRef.current?.removeItems(itemIds);
      }
    },
    renderDragPreview: ({ draggedItem }) => {
      const model = draggedItem as Tree.DefaultItemModel;
      return <div className={styles.DragPreview}>{model.label}</div>;
    },
  });

  return (
    <div className={styles.Column}>
      <h3 className={styles.Heading}>{title}</h3>
      <Tree.Root
        defaultItems={defaultItems}
        actionsRef={actionsRef}
        selectionMode="multiple"
        defaultExpandedItems={defaultExpandedItems}
        dragAndDrop={dragAndDrop}
        className={styles.Tree}
      >
        {(item) => (
          <Tree.CheckboxItem itemId={item.id} className={styles.Item}>
            <Tree.ItemDragIndicator className={styles.DragHandle}>
              <GripIcon />
            </Tree.ItemDragIndicator>
            <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
              <ChevronIcon />
            </Tree.ItemExpansionTrigger>
            <Tree.CheckboxItemIndicator className={styles.CheckboxIndicator} keepMounted>
              <CheckIcon className={styles.CheckIcon} />
              <MinusIcon className={styles.MinusIcon} />
            </Tree.CheckboxItemIndicator>
            <Tree.ItemGroupIndicator className={styles.Icon}>
              <FolderIcon />
            </Tree.ItemGroupIndicator>
            <Tree.ItemLabel className={styles.Label} />
          </Tree.CheckboxItem>
        )}
      </Tree.Root>
    </div>
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

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M9.854 3.146a.5.5 0 010 .708l-4.5 4.5a.5.5 0 01-.708 0l-2-2a.5.5 0 01.708-.708L5 7.293l4.146-4.147a.5.5 0 01.708 0z" />
    </svg>
  );
}

function MinusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M2.5 6a.5.5 0 01.5-.5h6a.5.5 0 010 1H3a.5.5 0 01-.5-.5z" />
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
