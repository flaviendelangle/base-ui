'use client';
import * as React from 'react';
import { TreeGrid } from '@base-ui/react/tree-grid';
import styles from './index.module.css';

const items: TreeGrid.DefaultItem[] = Array.from({ length: 3 }, (_, index) => ({
  id: `item-${index + 1}`,
  label: `Item ${index + 1}`,
  children: Array.from({ length: 3 }, (_, childIndex) => ({
    id: `item-${index + 1}-child-${childIndex + 1}`,
    label: `Item ${index + 1} / Child ${childIndex + 1}`,
  })),
}));

export default function ExampleTreeGridAnimated() {
  return (
    <TreeGrid.Root items={items} defaultExpandedItems={['item-1']}>
      <TreeGrid.List aria-label="File system" className={styles.TreeGrid}>
        {/* @focus-start */}
        {(item: TreeGrid.DefaultItem) => (
          <React.Fragment>
            <TreeGrid.Item itemId={item.id} className={styles.Item}>
              <TreeGrid.ItemContent className={styles.ItemContent}>
                <TreeGrid.ItemExpansionTrigger className={styles.ExpansionTrigger}>
                  <ChevronIcon />
                </TreeGrid.ItemExpansionTrigger>
                <span className={styles.Label}>{item.label}</span>
              </TreeGrid.ItemContent>
            </TreeGrid.Item>
            {/* @highlight-start */}
            <TreeGrid.GroupTransition className={styles.GroupTransition} />
            {/* @highlight-end */}
          </React.Fragment>
          // @focus-end
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
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
