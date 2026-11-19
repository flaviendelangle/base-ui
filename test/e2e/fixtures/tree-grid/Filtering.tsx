import * as React from 'react';
import { TreeGrid } from '@base-ui/react/tree-grid';

const items: TreeGrid.DefaultItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      {
        id: 'invoices',
        label: 'Invoices',
        children: [
          { id: 'invoice-q1', label: 'Invoice Q1.pdf' },
          { id: 'invoice-q2', label: 'Invoice Q2.pdf' },
        ],
      },
    ],
  },
  { id: 'photos', label: 'Photos', children: [{ id: 'sunset', label: 'Sunset.jpg' }] },
  { id: 'notes', label: 'Notes.txt' },
];

const visuallyHidden: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export default function FilteringTreeGrid() {
  return (
    <TreeGrid.FilterProvider>
      <TreeGrid.Root items={items}>
        <TreeGrid.Input aria-label="Filter files" />
        <TreeGrid.Clear>×</TreeGrid.Clear>
        <TreeGrid.List aria-label="File system">
          {(item: TreeGrid.DefaultItem) => (
            <TreeGrid.Item itemId={item.id}>
              <TreeGrid.ItemContent
                style={{ paddingInlineStart: 'calc((var(--tree-grid-item-level) - 1) * 1.5rem)' }}
              >
                <TreeGrid.ItemExpansionTrigger>
                  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                    <path
                      d="M4.5 2 8.5 6l-4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </TreeGrid.ItemExpansionTrigger>
                {item.label}
              </TreeGrid.ItemContent>
            </TreeGrid.Item>
          )}
        </TreeGrid.List>
        <TreeGrid.Status style={visuallyHidden} />
        <TreeGrid.Empty>No files found.</TreeGrid.Empty>
      </TreeGrid.Root>
    </TreeGrid.FilterProvider>
  );
}
