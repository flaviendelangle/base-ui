'use client';
import * as React from 'react';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import type { TreeGridFilterProvider } from './TreeGridFilterProvider';

export interface TreeGridFilterContext {
  value: string;
  onValueChange: (value: string, eventDetails: TreeGridFilterProvider.ChangeEventDetails) => void;
}

// The query reaches the input through React context rather than the store:
// the store syncs a commit later, which would move the caret of the controlled
// input on every keystroke.
export const TreeGridFilterContext = React.createContext<TreeGridFilterContext | null>(null);

/**
 * Returns the query and the filtering plugin of the tree a filter part renders
 * in, throwing when the tree is not wrapped in `TreeGrid.FilterProvider`.
 */
export function useTreeGridFilterPart(part: string) {
  const store = useTreeGridRootContext();
  const context = React.useContext(TreeGridFilterContext);
  const filtering = store.filtering;
  if (context === null || filtering === undefined) {
    throw new Error(
      `Base UI: <TreeGrid.${part}> must be placed in a tree wrapped in <TreeGrid.FilterProvider>. ` +
        'It reads the filter query from the provider, which a plain tree does not have. ' +
        'Wrap the <TreeGrid.Root> it belongs to in <TreeGrid.FilterProvider>. ' +
        'See https://base-ui.com/react/components/tree-grid#filtering',
    );
  }
  return { store, filtering, value: context.value, onValueChange: context.onValueChange };
}
