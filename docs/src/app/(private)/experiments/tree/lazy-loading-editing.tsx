'use client';
import * as React from 'react';
import { Tree } from '@base-ui/react/tree';
import type { CollectionItemId } from '@base-ui/react/types';
import styles from './tree.module.css';

interface LazyItem {
  id: CollectionItemId;
  label: string;
  childCount: number;
  children?: LazyItem[];
}

// Simulated server data
const serverData: Record<CollectionItemId, LazyItem[]> = {
  root: [
    { id: 'documents', label: 'Documents', childCount: 3 },
    { id: 'photos', label: 'Photos', childCount: 2 },
    { id: 'notes', label: 'Notes', childCount: 0 },
  ],
  documents: [
    { id: 'resume', label: 'Resume.pdf', childCount: 0 },
    { id: 'cover-letter', label: 'Cover Letter.docx', childCount: 0 },
    { id: 'projects', label: 'Projects', childCount: 2 },
  ],
  projects: [
    { id: 'project-a', label: 'Project A', childCount: 0 },
    { id: 'project-b', label: 'Project B', childCount: 0 },
  ],
  photos: [
    { id: 'vacation', label: 'Vacation', childCount: 0 },
    { id: 'family', label: 'Family', childCount: 0 },
  ],
};

// Mutable copy so edits persist across fetches
const mutableServerData = JSON.parse(JSON.stringify(serverData)) as typeof serverData;

async function fakeFetch(parentId?: CollectionItemId): Promise<LazyItem[]> {
  await new Promise((resolve) => {
    setTimeout(resolve, 300 + Math.random() * 200);
  });
  const key = parentId ?? 'root';
  return mutableServerData[key] ?? [];
}

export default function LazyLoadingEditingTree() {
  const actionsRef = React.useRef<Tree.Root.Actions<LazyItem> | null>(null);

  const lazyLoading = Tree.useLazyLoading<LazyItem>({
    fetchChildren: fakeFetch,
    getChildrenCount: (item) => item.childCount,
  });

  const handleItemsChange = React.useCallback((newItems: LazyItem[]) => {
    // Sync label changes back to the mutable server data
    for (const items of Object.values(mutableServerData)) {
      for (const item of items) {
        // Find matching item in new items and update server data
        const findItem = (searchItems: LazyItem[]): LazyItem | undefined => {
          for (const searchItem of searchItems) {
            if (searchItem.id === item.id) {
              return searchItem;
            }
            if (searchItem.children) {
              const found = findItem(searchItem.children);
              if (found) {
                return found;
              }
            }
          }
          return undefined;
        };
        const updated = findItem(newItems);
        if (updated && updated.label !== item.label) {
          item.label = updated.label;
        }
      }
    }
  }, []);

  const itemToStringLabel = React.useCallback((item: LazyItem) => item.label, []);

  return (
    <div className={styles.wrapper}>
      <div>
        <h3 className={styles.heading}>Lazy loading + editing</h3>
        <p className={styles.description}>
          Items load on expand. Double-click to edit a label. Edits update the server data and
          refresh the cache.
        </p>
      </div>
      <Tree.Root<undefined, LazyItem>
        items={[]}
        onItemsChange={handleItemsChange}
        isItemEditable
        className={styles.tree}
        lazyLoading={lazyLoading}
        actionsRef={actionsRef}
        itemToStringLabel={itemToStringLabel}
      >
        {(item) => (
          <Tree.Item itemId={item.id} className={styles.item}>
            <Tree.ItemExpansionTrigger className={styles.expansionTrigger}>
              <ChevronIcon />
            </Tree.ItemExpansionTrigger>
            <Tree.ItemLoadingIndicator className={styles.loadingIndicator}>
              <span className={styles.spinner} />
            </Tree.ItemLoadingIndicator>
            <Tree.ItemLabel className={styles.label} />
            <Tree.ItemLabelEditing>
              <Tree.ItemLabelEditingInput />
            </Tree.ItemLabelEditing>
          </Tree.Item>
        )}
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
