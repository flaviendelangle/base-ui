'use client';
import * as React from 'react';

export interface TreeCheckboxItemContextValue {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
}

export const TreeCheckboxItemContext = React.createContext<
  TreeCheckboxItemContextValue | undefined
>(undefined);

export function useTreeCheckboxItemContext(): TreeCheckboxItemContextValue {
  const context = React.useContext(TreeCheckboxItemContext);
  if (context === undefined) {
    throw new Error(
      'Base UI: TreeCheckboxItemContext is missing. ' +
        '<Tree.CheckboxItemIndicator> reads its state from <Tree.CheckboxItem> and cannot render outside it. ' +
        'Place <Tree.CheckboxItemIndicator> within <Tree.CheckboxItem>.',
    );
  }
  return context;
}
