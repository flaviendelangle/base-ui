'use client';
import * as React from 'react';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { createDragPreviewStore } from '../../utils/drag-and-drop/overlay/dragPreviewStore';
import { DragPreviewContext } from '../../utils/drag-and-drop/overlay/DragPreviewContext';
import { PreviewOverlayRenderer } from '../../utils/drag-and-drop/overlay/PreviewOverlayRenderer';

/**
 * The React tree custom drag previews render in. Preview content receives context
 * from providers above this component, but not from providers nested between it
 * and an individual draggable. Place it inside every local context boundary the
 * preview needs. Renders no element of its own.
 *
 * This implementation is mounted internally by `Draggable.Provider`; consumers
 * configure its behavior through `Draggable.Preview`. It is intentionally not
 * exported as a public Draggable part.
 *
 * Documentation: [Base UI Draggable](https://base-ui.com/react/utils/draggable)
 */
export const DraggablePreviewProvider: React.FC<DraggablePreviewProvider.Props> =
  function DraggablePreviewProvider(props) {
    const { children } = props;

    const previewStore = useRefWithInit(createDragPreviewStore).current;

    const contextValue = React.useMemo(() => ({ previewStore }), [previewStore]);

    return (
      <DragPreviewContext.Provider value={contextValue}>
        {children}
        <PreviewOverlayRenderer previewStore={previewStore} />
      </DragPreviewContext.Provider>
    );
  };

export interface DraggablePreviewProviderState {}

export interface DraggablePreviewProviderProps {
  /**
   * The part of your app whose custom drag previews render in this provider.
   */
  children?: React.ReactNode | undefined;
}

export namespace DraggablePreviewProvider {
  export type State = DraggablePreviewProviderState;
  export type Props = DraggablePreviewProviderProps;
}
