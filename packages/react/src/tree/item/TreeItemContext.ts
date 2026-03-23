'use client';
import * as React from 'react';
import type { CollectionItemId } from '../../types/collection';

export const TreeItemContext = React.createContext<CollectionItemId | undefined>(undefined);

export function useTreeItemContext(): CollectionItemId {
  const context = React.useContext(TreeItemContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TreeItemContext is missing. Tree item parts must be placed within <Tree.Item>.',
    );
  }
  return context;
}
