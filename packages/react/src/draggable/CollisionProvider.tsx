'use client';

import * as React from 'react';

/** Groups draggable elements that participate in collision-based interactions. Renders no element. */
export function DraggableCollisionProvider(
  props: DraggableCollisionProviderProps,
): React.ReactNode {
  return props.children;
}

export interface DraggableCollisionProviderProps {
  children?: React.ReactNode | undefined;
}

export namespace DraggableCollisionProvider {
  export type Props = DraggableCollisionProviderProps;
}
