'use client';
import * as React from 'react';
import type { TreeItemId } from '../store/types';

export interface TreeGroupTransitionContextValue {
  parentId: TreeItemId;
  animation: 'expanding' | 'collapsing';
}

export const TreeGroupTransitionContext =
  React.createContext<TreeGroupTransitionContextValue | null>(null);
