'use client';
import * as React from 'react';
import type { TreeGridStore } from '../store/TreeGridStore';

export const TreeGridRootContext = React.createContext<TreeGridStore<any, any> | undefined>(
  undefined,
);

export function useTreeGridRootContext(): TreeGridStore<any, any> {
  const context = React.useContext(TreeGridRootContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TreeGridRootContext is missing. ' +
        'TreeGrid parts read their state from <TreeGrid.Root> and cannot render outside it. ' +
        'Place TreeGrid parts within <TreeGrid.Root>.',
    );
  }
  return context;
}
