'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import styles from './tree.module.css';

const ITEM_HEIGHT = 32;

export default function VirtualizedTree() {
  return (
    <div className={styles.wrapper}>
      <div>
        <h3 className={styles.heading}>Virtualized tree (10,000 items)</h3>
        <p className={styles.description}>
          Uses Tree.VirtualizedItemList powered by @mui/x-virtualizer.
        </p>
      </div>
      <Tree.Root items={items} expandOnClick className={styles.tree} style={{ height: 400 }}>
        <Tree.VirtualizedItemList itemHeight={ITEM_HEIGHT}>
          {(item) => (
            <Tree.Item itemId={item.id} className={styles.item} style={{ height: ITEM_HEIGHT }}>
              <Tree.ItemExpansionTrigger className={styles.expansionTrigger}>
                <ChevronIcon />
              </Tree.ItemExpansionTrigger>
              <Tree.ItemGroupIndicator className={styles.groupIndicator}>
                <FolderIcon />
              </Tree.ItemGroupIndicator>
              <Tree.ItemLabel className={styles.label} />
            </Tree.Item>
          )}
        </Tree.VirtualizedItemList>
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

function FolderIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" {...props}>
      <path d="M1 3.5A1.5 1.5 0 012.5 2h3.879a1.5 1.5 0 011.06.44l1.122 1.12A1.5 1.5 0 009.62 4H13.5A1.5 1.5 0 0115 5.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 011 12.5v-9z" />
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
