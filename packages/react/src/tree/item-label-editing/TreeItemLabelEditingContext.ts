'use client';
import * as React from 'react';

export interface TreeItemLabelEditingContextValue {
  save: (newLabel: string) => void;
  cancel: () => void;
  label: string;
}

export const TreeItemLabelEditingContext = React.createContext<
  TreeItemLabelEditingContextValue | undefined
>(undefined);

export function useTreeItemLabelEditingContext(): TreeItemLabelEditingContextValue {
  const context = React.useContext(TreeItemLabelEditingContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TreeItemLabelEditingContext is missing. ' +
        'Tree.ItemLabelEditingInput must be placed within <Tree.ItemLabelEditing>.',
    );
  }
  return context;
}
