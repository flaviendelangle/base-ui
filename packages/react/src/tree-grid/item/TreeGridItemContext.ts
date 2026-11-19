'use client';
import * as React from 'react';
import type { TreeGridItemId } from '../store/types';

/** The item of the row a part renders in. */
export const TreeGridItemContext = React.createContext<TreeGridItemId | undefined>(undefined);

export function useTreeGridItemContext(): TreeGridItemId {
  const context = React.useContext(TreeGridItemContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TreeGridItemContext is missing. ' +
        'TreeGrid item parts read their item from <TreeGrid.Item> and cannot render outside it. ' +
        'Place TreeGrid item parts within <TreeGrid.Item>.',
    );
  }
  return context;
}
