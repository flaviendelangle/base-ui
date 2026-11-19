'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './index.module.css';

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

export default function ExampleTreeHero() {
  return (
    // @focus-start
    <Tree.Root items={items} defaultExpandedItems={['getting-started']}>
      <Tree.List aria-label="Documentation" className={styles.Tree}>
        {(item: Tree.DefaultItem) => (
          <Tree.Item itemId={item.id} className={styles.Item}>
            <Tree.ItemIndicator keepMounted className={styles.Chevron}>
              <ChevronIcon />
            </Tree.ItemIndicator>
            <span className={styles.Label}>{item.label}</span>
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
