import * as React from 'react';
import { TreeGrid } from '@base-ui/react/tree-grid';

const items: TreeGrid.DefaultItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume' },
      { id: 'cover-letter', label: 'Cover letter' },
    ],
  },
  {
    id: 'photos',
    label: 'Photos',
    children: [
      { id: 'sunset', label: 'Sunset' },
      { id: 'mountains', label: 'Mountains' },
    ],
  },
  { id: 'notes', label: 'Notes' },
];

export default function BasicTreeGrid() {
  return (
    <TreeGrid.Root items={items} defaultExpandedItems={['documents']}>
      <TreeGrid.List aria-label="File system">
        {(item: TreeGrid.DefaultItem) => (
          <TreeGrid.Item itemId={item.id}>
            <TreeGrid.ItemContent
              style={{ paddingInlineStart: 'calc((var(--tree-grid-item-level) - 1) * 1.5rem)' }}
            >
              <TreeGrid.ItemExpansionTrigger>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </TreeGrid.ItemExpansionTrigger>
              {item.label}
            </TreeGrid.ItemContent>
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
  );
}
