'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import { Switch } from '@base-ui/react/switch';
import styles from './index.module.css';

const items: Tree.DefaultItemModel[] = [
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

export default function ExampleTreeFiltering() {
  const [filterText, setFilterText] = React.useState('');
  const [autoExpand, setAutoExpand] = React.useState(false);
  const filter = Tree.useFilter();
  const result = Tree.useFilteredItems({
    items,
    filterText,
    filter,
    autoExpand: true,
  });

  return (
    <div className={styles.Demo}>
      <div className={styles.Toolbar}>
        <input
          className={styles.FilterInput}
          placeholder="Filter items…"
          value={filterText}
          onChange={(event) => setFilterText(event.target.value)}
        />
        <label className={styles.SwitchLabel}>
          <Switch.Root
            checked={autoExpand}
            onCheckedChange={setAutoExpand}
            className={styles.Switch}
          >
            <Switch.Thumb className={styles.SwitchThumb} />
          </Switch.Root>
          Auto-expand
        </label>
      </div>
      <Tree.Root
        items={result.items}
        expandedItems={autoExpand ? result.expandedItems : undefined}
        defaultExpandedItems={[]}
        className={styles.Tree}
      >
        <Tree.ItemList>
          {(item) => (
            <Tree.Item itemId={item.id} className={styles.Item}>
              <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                <ChevronIcon />
              </Tree.ItemExpansionTrigger>
              <Tree.ItemLabel className={styles.Label} />
            </Tree.Item>
          )}
        </Tree.ItemList>
        <Tree.Empty className={styles.Empty}>No results found.</Tree.Empty>
      </Tree.Root>
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
