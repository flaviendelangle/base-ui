'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './index.module.css';

export default function ExampleVirtualizedTree() {
  return (
    <Tree.Root items={items} expandOnClick className={styles.Tree}>
      <Tree.VirtualizedItemList itemHeight={32}>
        {(item) => (
          <Tree.Item itemId={item.id} className={styles.Item}>
            <Tree.ItemExpansionTrigger className={styles.ExpansionTrigger}>
              <ChevronIcon />
            </Tree.ItemExpansionTrigger>
            <Tree.ItemGroupIndicator className={styles.Icon}>
              <FolderIcon />
            </Tree.ItemGroupIndicator>
            <Tree.ItemLabel className={styles.Label} />
          </Tree.Item>
        )}
      </Tree.VirtualizedItemList>
    </Tree.Root>
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

// Generate 10,000 top-level items, 10 of which are expandable with 100 children each
function generateItems(): Tree.DefaultItemModel[] {
  const expandableIndices = new Set([0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000]);
  const rootItems: Tree.DefaultItemModel[] = [];

  for (let i = 0; i < 10000; i += 1) {
    const id = `item-${i}`;
    const label = `Item ${String(i + 1).padStart(5, '0')}`;

    if (expandableIndices.has(i)) {
      const children: Tree.DefaultItemModel[] = [];
      for (let j = 0; j < 100; j += 1) {
        children.push({
          id: `${id}-child-${j}`,
          label: `${label} / Child ${String(j + 1).padStart(3, '0')}`,
        });
      }
      rootItems.push({ id, label, children });
    } else {
      rootItems.push({ id, label });
    }
  }

  return rootItems;
}

const items = generateItems();
