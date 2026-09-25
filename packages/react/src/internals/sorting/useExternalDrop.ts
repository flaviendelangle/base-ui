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
  accept?: Draggable.Accept<unknown> | undefined;
  collectionId: object;
  itemId: string | number | undefined;
  disabled: boolean;
  resolve: (context: Draggable.Target.ResolutionContext) => Context | null;
  onDraggableDrop?:
    ((value: Context, eventDetails: Draggable.Target.DropEventDetails) => void) | undefined;
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
  const show = useStableCallback(
    (
      { source, target }: Draggable.Target.MoveValue,
      { location }: Draggable.Target.EnterEventDetails,
    ) => {
      if (location.current.targets[0]?.element !== target.element) {
        clear();
        return;
      }
      const result = resolve({ source, element: target.element, input: location.current.input });
      update(result?.position ?? null);
    },
  );
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
    onDraggableDrop: ({ source, target }, eventDetails) => {
      const result = resolve({
        source,
        element: target.element,
        input: eventDetails.location.current.input,
      });
      clear();
      if (result) {
        parameters.onDraggableDrop?.(result, eventDetails);
      }
    },
  };
  return { position, targetProps, isOwner: shared.owner === owner };
}
