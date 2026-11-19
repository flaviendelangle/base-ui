import * as React from 'react';
import { TreeGrid } from '../../../src/tree-grid';

export function App() {
  return (
    <TreeGrid.FilterProvider>
      <TreeGrid.Root defaultItems={[]}>
        <TreeGrid.Input aria-label="Filter" />
        <TreeGrid.Clear />
        <TreeGrid.List>
          {(item) => <TreeGrid.Item itemId={item.id}>{item.label}</TreeGrid.Item>}
        </TreeGrid.List>
        <TreeGrid.Empty />
      </TreeGrid.Root>
    </TreeGrid.FilterProvider>
  );
}
