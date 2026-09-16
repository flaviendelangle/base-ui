'use client';

import * as React from 'react';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { createKind } from '../utils/drag-and-drop/dragKind';
import { DraggableContext } from './DraggableContext';
import { DraggablePreviewProvider } from './preview-provider/DraggablePreviewProvider';

/**
 * Provides shared configuration for drag-and-drop interactions.
 */
export function DraggableProvider(props: DraggableProviderProps): React.ReactNode {
  const { children } = props;
  const defaultKind = useRefWithInit(() => createKind<undefined>('default')).current;
  const contextValue = React.useMemo(() => ({ defaultKind }), [defaultKind]);

  return (
    <DraggablePreviewProvider>
      <DraggableContext.Provider value={contextValue}>{children}</DraggableContext.Provider>
    </DraggablePreviewProvider>
  );
}

export interface DraggableProviderProps {
  children?: React.ReactNode | undefined;
}

export namespace DraggableProvider {
  export type Props = DraggableProviderProps;
}
