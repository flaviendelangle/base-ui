'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './index.module.css';

const items: Tree.DefaultItem[] = [
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
    ],
  },
  { id: 'notes', label: 'Notes.txt' },
];

export default function ExampleTreeCheckboxItems() {
  return (
    <Tree.Root
      items={items}
      defaultExpandedItems={['documents']}
      // @highlight-start
      multiple
      checkboxSelectionPropagation={{ descendants: true, parents: true }}
      // @highlight-end
    >
      <Tree.List aria-label="Files to back up" className={styles.Tree}>
        {(item: Tree.DefaultItem) => (
          // @highlight-start
          <Tree.CheckboxItem itemId={item.id} className={styles.Item}>
            {/* @highlight-end */}
            <Tree.ItemIndicator keepMounted className={styles.Chevron}>
              <ChevronIcon />
            </Tree.ItemIndicator>
            <span className={styles.Checkbox}>
              {/* @highlight-start */}
              <Tree.CheckboxItemIndicator className={styles.CheckboxIndicator}>
                <CheckIcon className={styles.CheckIcon} />
                <MinusIcon className={styles.MinusIcon} />
              </Tree.CheckboxItemIndicator>
              {/* @highlight-end */}
            </span>
            <span className={styles.Label}>{item.label}</span>
          </Tree.CheckboxItem>
        )}
      </Tree.List>
      {/* Screen readers don't reliably announce selection changes in a tree */}
      <Tree.Status className={styles.VisuallyHidden} />
    </Tree.Root>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CheckIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M9.1603 1.12218C9.50684 1.34873 9.60427 1.81354 9.37792 2.16038L5.13603 8.66012C5.01614 8.8438 4.82192 8.96576 4.60451 8.99384C4.3871 9.02194 4.1683 8.95335 4.00574 8.80615L1.24664 6.30769C0.939709 6.02975 0.916013 5.55541 1.19372 5.24822C1.47142 4.94102 1.94536 4.91731 2.2523 5.19524L4.36085 7.10461L8.12299 1.33999C8.34934 0.993152 8.81376 0.895638 9.1603 1.12218Z" />
    </svg>
  );
}

function MinusIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" {...props}>
      <rect x="1.5" y="4.25" width="7" height="1.5" rx="0.75" />
    </svg>
  );
}
