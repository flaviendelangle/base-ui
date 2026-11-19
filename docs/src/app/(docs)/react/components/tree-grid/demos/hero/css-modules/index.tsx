'use client';
import * as React from 'react';
import { TreeGrid } from '@base-ui/react/tree-grid';
import styles from './index.module.css';

const items: TreeGrid.DefaultItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      { id: 'cover-letter', label: 'Cover Letter.docx' },
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
  { id: 'notes', label: 'Notes.txt' },
];

export default function ExampleTreeGridHero() {
  return (
    // @focus-start
    <TreeGrid.Root items={items} defaultExpandedItems={['documents']}>
      <TreeGrid.List aria-label="File system" className={styles.TreeGrid}>
        {(item: TreeGrid.DefaultItem) => (
          <TreeGrid.Item itemId={item.id} className={styles.Item}>
            <TreeGrid.ItemContent className={styles.ItemContent}>
              <TreeGrid.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                <ChevronIcon />
              </TreeGrid.ItemExpansionTrigger>
              <TreeGrid.ItemGroupIndicator className={styles.GroupIndicator}>
                <FolderIcon />
              </TreeGrid.ItemGroupIndicator>
              <span className={styles.Label}>{item.label}</span>
            </TreeGrid.ItemContent>
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
    // @focus-end
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M1.5 4.5A1.5 1.5 0 0 1 3 3h3.4l1.8 1.7H13a1.5 1.5 0 0 1 1.5 1.5v5.3A1.5 1.5 0 0 1 13 13H3a1.5 1.5 0 0 1-1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}
