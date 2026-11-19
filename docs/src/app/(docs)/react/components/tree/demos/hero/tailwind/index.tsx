'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';

const items: Tree.DefaultItem[] = [
  {
    id: 'getting-started',
    label: 'Getting started',
    children: [
      { id: 'installation', label: 'Installation' },
      { id: 'styling', label: 'Styling' },
    ],
  },
  {
    id: 'components',
    label: 'Components',
    children: [
      { id: 'dialog', label: 'Dialog' },
      { id: 'menu', label: 'Menu' },
      { id: 'tree', label: 'Tree' },
    ],
  },
  { id: 'releases', label: 'Releases' },
];

const ITEM_CLASS =
  'flex cursor-default items-center gap-2 py-1 pe-2 select-none text-sm/[1.5] outline-none ' +
  'ps-[calc(0.5rem+1.25rem*(var(--tree-item-level)-1))] ' +
  'not-data-expandable:ps-[calc(1.75rem+1.25rem*(var(--tree-item-level)-1))] ' +
  'border-s-2 border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 ' +
  'data-selected:border-neutral-950 data-selected:bg-neutral-200 ' +
  'dark:data-selected:border-white dark:data-selected:bg-neutral-700 ' +
  'focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 ' +
  'dark:focus-visible:outline-white ' +
  'forced-colors:border-[color:Canvas] forced-colors:data-selected:border-[color:Highlight]';

export default function ExampleTreeHero() {
  return (
    // @focus-start
    <Tree.Root items={items} defaultExpandedItems={['getting-started']}>
      <Tree.List
        aria-label="Documentation"
        className="box-content w-68 border border-neutral-200 bg-white p-1 text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-white"
      >
        {(item: Tree.DefaultItem) => (
          <Tree.Item itemId={item.id} className={ITEM_CLASS}>
            <Tree.ItemIndicator
              keepMounted
              className="inline-flex w-3 shrink-0 items-center justify-center text-neutral-500 dark:text-neutral-400 [&_svg]:size-3 [&_svg]:transition-transform data-expanded:[&_svg]:rotate-90"
            >
              <ChevronIcon />
            </Tree.ItemIndicator>
            <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
              {item.label}
            </span>
          </Tree.Item>
        )}
      </Tree.List>
    </Tree.Root>
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
