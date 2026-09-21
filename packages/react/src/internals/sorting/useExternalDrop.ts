'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { Draggable } from '../../draggable';
import { acceptsExternalDrop, type ExternalDropTargetProps } from './SortableDropProvider';

import { useExternalDropStore, useExternalDropPosition } from './externalDropPosition';

export function useExternalDrop<
  Position extends { id: string | number; placement: string; index?: number | undefined },
  Context extends { position: Position },
>(parameters: {
  accept?: Draggable.AnyDragAccept | undefined;
  collectionId: object;
  itemId: string | number | undefined;
  disabled: boolean;
  resolve: (context: Draggable.DropTargetResolutionContext) => Context | null;
  onDrop?: ((context: Context, details: Draggable.DragDropEventDetails) => void) | undefined;
  onDropPositionChange?: ((position: Position | null) => void) | undefined;
}) {
  const shared = useExternalDropStore(parameters.collectionId);
  const [owner] = React.useState(() => ({}));
  const position = useExternalDropPosition<Position>(
    parameters.collectionId,
    parameters.itemId,
    owner,
  );
  const lastPosition = React.useRef<Position | null>(null);
  const update = useStableCallback((next: Position | null) => {
    const previous = lastPosition.current;
    if (
      previous?.id === next?.id &&
      previous?.placement === next?.placement &&
      previous?.index === next?.index
    ) {
      return;
    }
    lastPosition.current = next;
    if (next || shared.owner === owner) {
      shared.position = next;
      shared.owner = next ? owner : null;
      shared.listeners.forEach((listener) => listener());
    }
    parameters.onDropPositionChange?.(next);
  });
  const clear = useStableCallback(() => update(null));
  const resolve = useStableCallback((context: Draggable.DropTargetResolutionContext) => {
    if (parameters.disabled || !acceptsExternalDrop(parameters.accept, context.source)) {
      return null;
    }
    const payload = context.source.payload;
    if (
      payload &&
      typeof payload === 'object' &&
      'collectionId' in payload &&
      payload.collectionId === parameters.collectionId
    ) {
      return null;
    }
    return parameters.resolve(context);
  });
  const show = useStableCallback((event: Draggable.DropTargetEvent<'onDraggableMove'>) => {
    if (event.location.current.dropTargets[0]?.element !== event.target.element) {
      clear();
      return;
    }
    const result = resolve({
      source: event.source,
      element: event.target.element,
      input: event.location.current.input,
    });
    update(result?.position ?? null);
  });
  useIsoLayoutEffect(() => clear, [clear]);
  useIsoLayoutEffect(() => {
    if (parameters.disabled) {
      clear();
    }
  }, [parameters.disabled, clear]);
  const targetProps: ExternalDropTargetProps = {
    accept: parameters.accept ?? Draggable.anyKind,
    disabled: parameters.disabled,
    trackDragOver: false,
    canDrop: (context) => {
      const payload = context.source.payload;
      if (
        payload &&
        typeof payload === 'object' &&
        'collectionId' in payload &&
        payload.collectionId === parameters.collectionId
      ) {
        return false;
      }
      return resolve(context) ? true : 'reject';
    },
    onDraggableEnter: show,
    onDraggableMove: show,
    onDraggableLeave: clear,
    onDraggableDrop: (event, details) => {
      if (event.target.element !== event.dropTarget.element) {
        return;
      }
      const result = resolve({
        source: event.source,
        element: event.target.element,
        input: event.location.current.input,
      });
      clear();
      if (result) {
        parameters.onDrop?.(result, details);
      }
    },
  };
  return { position, targetProps, isOwner: shared.owner === owner };
}
