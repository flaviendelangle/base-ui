'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { Draggable } from '../../draggable';
import { acceptsExternalDrop } from './SortableDropProvider';
import type { ExternalDropTargetProps } from './SortableDropProvider';

import { useExternalDropStore, useExternalDropPosition } from './externalDropPosition';

export function useExternalDrop<
  Position extends { id: string | number; placement: string; index?: number | undefined },
  Context extends { dropPosition: Position },
>(parameters: {
  accept?: Draggable.Accept<unknown> | undefined;
  collectionId: object;
  itemId: string | number | undefined;
  disabled: boolean;
  resolve: (context: Draggable.Target.ResolutionContext) => Context | null;
  onDraggableDrop?:
    ((eventDetails: Draggable.Target.DropEventDetails & Context) => void) | undefined;
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
  const resolve = useStableCallback((context: Draggable.Target.ResolutionContext) => {
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
  // `onDraggableEnter` details cover every reason `onDraggableMove` can report.
  const show = useStableCallback((eventDetails: Draggable.Target.EnterEventDetails) => {
    const element = eventDetails.currentTarget.element;
    // A drop target nested in this item owns the pointer.
    if (eventDetails.target.element !== element) {
      clear();
      return;
    }
    const result = resolve(getResolutionContext(eventDetails));
    update(result?.dropPosition ?? null);
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
    onDraggableDrop: (eventDetails) => {
      const result = resolve(getResolutionContext(eventDetails));
      clear();
      if (result) {
        parameters.onDraggableDrop?.({ ...eventDetails, ...result });
      }
    },
  };
  return { position, targetProps, isOwner: shared.owner === owner };
}

/**
 * The resolution context of a target from its own event details. The record measures
 * the pointer as `canDrop` does, so its point readers stand in for the context's.
 */
function getResolutionContext(
  eventDetails: Pick<Draggable.Target.EnterEventDetails, 'source' | 'currentTarget' | 'location'>,
): Draggable.Target.ResolutionContext {
  return {
    source: eventDetails.source,
    input: eventDetails.location.current.input,
    element: eventDetails.currentTarget.element,
    getLocalPoint: eventDetails.currentTarget.getLocalPoint,
    getSnappedLocalPoint: eventDetails.currentTarget.getSnappedLocalPoint,
  };
}
