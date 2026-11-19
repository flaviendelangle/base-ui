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
      {
        id: 'invoices',
        label: 'Invoices',
        children: [
          { id: 'invoice-q1', label: 'Invoice_Q1.pdf' },
          { id: 'invoice-q2', label: 'Invoice_Q2.pdf' },
        ],
      },
    ],
  },
  {
    id: 'photos',
    label: 'Photos',
    children: [
      { id: 'sunset', label: 'Sunset.jpg' },
      { id: 'mountains', label: 'Mountains.png' },
      { id: 'family-dinner', label: 'Family Dinner.jpg' },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    children: [
      { id: 'blue-in-green', label: 'Blue in Green.mp3' },
      { id: 'moonlight-sonata', label: 'Moonlight Sonata.flac' },
    ],
  },
  { id: 'notes', label: 'Notes.txt' },
];

export default function ExampleTreeGridFiltering() {
  const [mode, setMode] = React.useState<TreeGrid.FilterMode>('hide-non-matches');

  return (
    <div className={styles.Demo}>
      <label className={styles.Field}>
        Show
        <select
          className={styles.ModeSelect}
          value={mode}
          onChange={(event) => setMode(event.target.value as TreeGrid.FilterMode)}
        >
          <option value="hide-non-matches">Only matching branches</option>
          <option value="collapse-non-matches">All branches, unrelated collapsed</option>
          <option value="expand-matches">Entire tree</option>
        </select>
      </label>
      {/* @focus-start */}
      {/* @highlight-start */}
      <TreeGrid.FilterProvider defaultValue="invoice" mode={mode}>
        {/* @highlight-end */}
        <TreeGrid.Root items={items}>
          <div className={styles.Panel}>
            <div className={styles.InputContainer}>
              {/* @highlight-start */}
              <TreeGrid.Input
                className={styles.Input}
                aria-label="Filter files"
                placeholder="e.g. invoice"
              />
              <TreeGrid.Clear className={styles.Clear}>
                <ClearIcon />
              </TreeGrid.Clear>
              {/* @highlight-end */}
              {/* @focus-end */}
            </div>
            <TreeGrid.List aria-label="File system" className={styles.TreeGrid}>
              {(item: TreeGrid.DefaultItem) => (
                <TreeGrid.Item itemId={item.id} className={styles.Item}>
                  <TreeGrid.ItemContent className={styles.ItemContent}>
                    <TreeGrid.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                      <ChevronIcon />
                    </TreeGrid.ItemExpansionTrigger>
                    <span className={styles.Label}>{item.label}</span>
                  </TreeGrid.ItemContent>
                </TreeGrid.Item>
              )}
            </TreeGrid.List>
            <TreeGrid.Status className={styles.VisuallyHidden} />
            {/* @highlight-start */}
            <TreeGrid.Empty className={styles.Empty}>No files found.</TreeGrid.Empty>
            {/* @highlight-end */}
          </div>
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>
    </div>
  );
}

function ChevronIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
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

function ClearIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" {...props}>
      <path d="m3.5 3.5 9 9m0-9-9 9" />
    </svg>
  );
}
