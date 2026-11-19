import * as React from 'react';
import { TreeGrid } from '@base-ui/react/tree-grid';

const items: TreeGrid.DefaultItem[] = [
  {
    id: 'redesign',
    label: 'Website redesign',
    children: [
      { id: 'wireframes', label: 'Wireframes' },
      { id: 'homepage', label: 'Homepage copy' },
      { id: 'mockups', label: 'Archived mockups', disabled: true },
    ],
  },
];

export default function ItemControlsTreeGrid() {
  return (
    <TreeGrid.Root items={items} defaultExpandedItems={['redesign']}>
      <TreeGrid.List aria-label="Projects">
        {(item: TreeGrid.DefaultItem) => (
          <TreeGrid.Item
            itemId={item.id}
            aria-description={item.children ? undefined : 'Press Tab to reach the task controls'}
          >
            <TreeGrid.ItemContent
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                paddingInlineStart: 'calc((var(--tree-grid-item-level) - 1) * 1.5rem)',
              }}
            >
              <TreeGrid.ItemExpansionTrigger>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                  <path d="M4.5 2 8.5 6l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </TreeGrid.ItemExpansionTrigger>
              {item.children ? (
                item.label
              ) : (
                <React.Fragment>
                  <TreeGrid.ItemLink
                    href={`/tasks/${item.id}`}
                    onClick={(event) => event.preventDefault()}
                  >
                    {item.label}
                  </TreeGrid.ItemLink>
                  <TreeGrid.ItemInput
                    aria-label={`Estimate for ${item.label}, in hours`}
                    defaultValue="2"
                    style={{ width: '3rem' }}
                  />
                  <TreeGrid.ItemButton aria-label={`Remove ${item.label}`}>×</TreeGrid.ItemButton>
                </React.Fragment>
              )}
            </TreeGrid.ItemContent>
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
  );
}
