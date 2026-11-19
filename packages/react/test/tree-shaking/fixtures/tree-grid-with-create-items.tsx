import * as React from 'react';
import { TreeGrid } from '../../../src/tree-grid';

interface Item {
  key: string;
  name: string;
}

const items = TreeGrid.createItems<Item>([], {
  getId: (item) => item.key,
  getLabel: (item) => item.name,
});

export function App() {
  return <TreeGrid.Root items={items}>{null}</TreeGrid.Root>;
}
