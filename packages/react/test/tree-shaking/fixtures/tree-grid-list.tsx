import * as React from 'react';
import { TreeGrid } from '../../../src/tree-grid';

export function App() {
  return (
    <TreeGrid.Root defaultItems={[]}>
      <TreeGrid.List>
        {(item) => (
          <TreeGrid.Item itemId={item.id}>
            <TreeGrid.ItemCheckbox />
            {item.label}
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
      <TreeGrid.Empty />
    </TreeGrid.Root>
  );
}
