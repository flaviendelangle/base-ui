import * as React from 'react';
import { TreeGrid } from '../../../src/tree-grid';

export function App() {
  return (
    <TreeGrid.Root defaultItems={[]}>
      <TreeGrid.List>
        {(item) => (
          <TreeGrid.Item itemId={item.id}>
            <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
      <TreeGrid.Status />
    </TreeGrid.Root>
  );
}
