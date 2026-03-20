'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
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
  const [inboxItems, setInboxItems] = React.useState(INBOX_ITEMS);
  const [archiveItems, setArchiveItems] = React.useState(ARCHIVE_ITEMS);
  const inboxActionsRef = React.useRef<Tree.Root.Actions>(null);
  const archiveActionsRef = React.useRef<Tree.Root.Actions>(null);

  return (
    <div className={styles.Layout}>
      <DndTree
        title="Inbox"
        items={inboxItems}
        onItemsChange={setInboxItems}
        actionsRef={inboxActionsRef}
        otherActionsRef={archiveActionsRef}
        defaultExpandedItems={['urgent']}
      />
      <DndTree
        title="Archive"
        items={archiveItems}
        onItemsChange={setArchiveItems}
        actionsRef={archiveActionsRef}
        otherActionsRef={inboxActionsRef}
        defaultExpandedItems={['q1']}
      />
    </div>
  );
}

function DndTree({
  title,
  items,
  onItemsChange,
  actionsRef,
  otherActionsRef,
  defaultExpandedItems,
}: {
  title: string;
  items: Tree.DefaultItemModel[];
  onItemsChange: (items: Tree.DefaultItemModel[]) => void;
  actionsRef: React.RefObject<Tree.Root.Actions | null>;
  otherActionsRef: React.RefObject<Tree.Root.Actions | null>;
  defaultExpandedItems: Tree.ItemId[];
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
    onInsert: ({ itemIds, target }) => {
      const models: Tree.DefaultItemModel[] = [];
      for (const id of itemIds) {
        const item = otherActionsRef.current?.getItemModel(id);
        if (item) {
          models.push(item);
        }
      }
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
    renderDragPreview: ({ draggedItemId }) => {
      return (
        <div className={styles.DragPreview}>
          {actionsRef.current?.getItemModel(draggedItemId)?.label ??
            otherActionsRef.current?.getItemModel(draggedItemId)?.label}
        </div>
      );
    },
  });

  return (
    <div className={styles.Column}>
      <h3 className={styles.Heading}>{title}</h3>
      <Tree.Root
        items={items}
        onItemsChange={onItemsChange}
        actionsRef={actionsRef}
        expandOnClick
        defaultExpandedItems={defaultExpandedItems}
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
