'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';

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

const ITEM_CLASS =
  'group flex cursor-default items-center gap-2 py-1 pe-2 select-none text-sm/[1.5] outline-none ' +
  'ps-[calc(0.5rem+1.25rem*(var(--tree-item-level)-1))] ' +
  'not-data-expandable:ps-[calc(1.75rem+1.25rem*(var(--tree-item-level)-1))] ' +
  'hover:bg-neutral-100 dark:hover:bg-neutral-800 ' +
  'focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 ' +
  'dark:focus-visible:outline-white';

const CHECKBOX_CLASS =
  'flex size-4 shrink-0 items-center justify-center border border-neutral-300 dark:border-neutral-600 ' +
  'group-data-checked:border-neutral-950 group-data-checked:bg-neutral-950 group-data-checked:text-white ' +
  'group-data-indeterminate:border-neutral-950 group-data-indeterminate:bg-neutral-950 group-data-indeterminate:text-white ' +
  'dark:group-data-checked:border-white dark:group-data-checked:bg-white dark:group-data-checked:text-neutral-950 ' +
  'dark:group-data-indeterminate:border-white dark:group-data-indeterminate:bg-white dark:group-data-indeterminate:text-neutral-950 ' +
  'forced-colors:group-data-checked:border-[color:Highlight] forced-colors:group-data-checked:bg-[color:Highlight] ' +
  'forced-colors:group-data-indeterminate:border-[color:Highlight] forced-colors:group-data-indeterminate:bg-[color:Highlight]';

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
      <Tree.List
        aria-label="Files to back up"
        className="box-content w-68 border border-neutral-200 bg-white p-1 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
      >
        {(item: Tree.DefaultItem) => (
          // @highlight-start
          <Tree.CheckboxItem itemId={item.id} className={ITEM_CLASS}>
            {/* @highlight-end */}
            <Tree.ItemIndicator
              keepMounted
              className="inline-flex w-3 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400 [&_svg]:size-3 [&_svg]:transition-transform data-expanded:[&_svg]:rotate-90"
            >
              <ChevronIcon />
            </Tree.ItemIndicator>
            <span className={CHECKBOX_CLASS}>
              {/* @highlight-start */}
              <Tree.CheckboxItemIndicator className="group/indicator flex">
                <CheckIcon className="size-2.5 group-data-indeterminate/indicator:hidden" />
                <MinusIcon className="hidden size-2.5 group-data-indeterminate/indicator:block" />
              </Tree.CheckboxItemIndicator>
              {/* @highlight-end */}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {item.label}
            </span>
          </Tree.CheckboxItem>
        )}
      </Tree.List>
      {/* Screen readers don't reliably announce selection changes in a tree */}
      <Tree.Status className="sr-only" />
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
