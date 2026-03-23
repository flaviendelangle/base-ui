'use client';
import * as React from 'react';
import type { CollectionItemId } from '../../types/collection';

export interface TreeGroupTransitionContextValue {
  parentId: CollectionItemId;
  animation: 'expanding' | 'collapsing';
}

export const TreeGroupTransitionContext =
  React.createContext<TreeGroupTransitionContextValue | null>(null);
