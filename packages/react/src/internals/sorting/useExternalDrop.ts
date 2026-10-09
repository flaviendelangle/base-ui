'use client';
import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { Store } from '@base-ui/utils/store';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { Draggable } from '../../draggable';
import {
  acceptsExternalDrop,
  getPayloadCollectionId,
  isSameDropPosition,
  omitDragRecords,
} from './SortableDropProvider';
import type { ExternalDropTargetProps, OmitDragRecords } from './SortableDropProvider';

type DropPosition = { id: string | number; placement: string; index?: number | undefined };
type DropPositionChangeEventDetails = OmitDragRecords<Draggable.Root.TargetChangeEventDetails>;

/** The collection store state shared by every external drop target of one collection. */
export interface ExternalDropState<Position extends DropPosition> {
  /** The active external destination and the target that resolved it. */
  externalDropPosition: { position: Position; owner: object } | null;
}

export function useExternalDrop<
  Position extends DropPosition,
  Context extends { dropPosition: Position },
>(parameters: {
  accept?: Draggable.Accept<unknown> | undefined;
  store: Store<ExternalDropState<Position>>;
  collectionId: object;
  disabled: boolean;
  resolve: (context: Draggable.Target.ResolutionContext) => Context | null;
  onDraggableDrop?:
    ((eventDetails: Draggable.Target.DropEventDetails & Context) => void) | undefined;
  onDropPositionChange?:
    ((position: Position | null, eventDetails: DropPositionChangeEventDetails) => void) | undefined;
}) {
  const { store } = parameters;
  const [owner] = React.useState(() => ({}));
  // The destination this target resolved, which can be another row.
  const position = useStore(store, selectOwnedPosition, owner) as Position | null;
  // The position last reported to `onDropPositionChange`.
  const lastPosition = React.useRef<Position | null>(null);
  const setShownPosition = useStableCallback((next: Position | null) => {
    const current = store.state.externalDropPosition;
    if (next) {
      if (current?.owner !== owner || !isSameDropPosition(current.position, next)) {
        store.set('externalDropPosition', { position: next, owner });
      }
    } else if (current?.owner === owner) {
      store.set('externalDropPosition', null);
    }
  });
  const update = useStableCallback(
    (next: Position | null, eventDetails: DropPositionChangeEventDetails) => {
      setShownPosition(next);
      if (!isSameDropPosition(lastPosition.current, next)) {
        lastPosition.current = next;
        parameters.onDropPositionChange?.(next, eventDetails);
      }
    },
  );
  // The engine validates the drop position before the source's terminal
  // callbacks, which can change the layout before the drop reaches this target,
  // so the drop uses that validated context instead of measuring again.
  const validated = React.useRef<{ input: unknown; context: Context | null } | null>(null);
  const clear = useStableCallback((eventDetails: DropPositionChangeEventDetails) => {
    validated.current = null;
    update(null, eventDetails);
  });
  // Unmounting or disabling a hovered target has no drag event to report. The engine
  // sends the target a leave afterwards, which reports the cleared position.
  const reset = useStableCallback(() => {
    validated.current = null;
    setShownPosition(null);
  });
  const isOwnCollection = (source: Draggable.Root.Record) =>
    getPayloadCollectionId(source.payload) === parameters.collectionId;
  const resolve = useStableCallback((context: Draggable.Target.ResolutionContext) => {
    if (
      parameters.disabled ||
      !acceptsExternalDrop(parameters.accept, context.source) ||
      isOwnCollection(context.source)
    ) {
      return null;
    }
    return parameters.resolve(context);
  });
  // Shared by `onDraggableEnter` and `onDraggableMove`, whose details differ only in `reason`.
  const show = useStableCallback(
    (eventDetails: Draggable.Target.EnterEventDetails | Draggable.Target.MoveEventDetails) => {
      const element = eventDetails.currentTarget.element;
      if (eventDetails.target.element !== element) {
        clear(omitDragRecords(eventDetails));
        return;
      }
      const result = resolve(getResolutionContext(eventDetails));
      update(result?.dropPosition ?? null, omitDragRecords(eventDetails));
    },
  );
  useIsoLayoutEffect(() => reset, [reset]);
  useIsoLayoutEffect(() => {
    if (parameters.disabled) {
      reset();
    }
  }, [parameters.disabled, reset]);
  const targetProps: ExternalDropTargetProps = {
    accept: parameters.accept ?? Draggable.anyKind,
    disabled: parameters.disabled,
    trackDragOver: false,
    canDrop: (context) => {
      if (isOwnCollection(context.source)) {
        return false;
      }
      const result = resolve(context);
      validated.current = { input: context.input, context: result };
      return result ? true : 'reject';
    },
    onDraggableEnter: show,
    onDraggableMove: show,
    onDraggableLeave: (eventDetails) => clear(omitDragRecords(eventDetails)),
    onDraggableDrop: (eventDetails) => {
      const { input } = eventDetails.location.current;
      const result =
        validated.current?.input === input
          ? validated.current.context
          : resolve(getResolutionContext(eventDetails));
      clear(omitDragRecords(eventDetails));
      if (result) {
        parameters.onDraggableDrop?.({ ...eventDetails, ...result });
      }
    },
  };
  return { position, targetProps };
}

/**
 * The resolution context of a target from its own event details. The record measures
 * the pointer as `canDrop` does, so its point readers stand in for the context's.
 */
function getResolutionContext(
  eventDetails: Pick<Draggable.Target.MoveEventDetails, 'source' | 'currentTarget' | 'location'>,
): Draggable.Target.ResolutionContext {
  return {
    source: eventDetails.source,
    input: eventDetails.location.current.input,
    element: eventDetails.currentTarget.element,
    getLocalPoint: eventDetails.currentTarget.getLocalPoint,
    getSnappedLocalPoint: eventDetails.currentTarget.getSnappedLocalPoint,
  };
}

function selectOwnedPosition(state: ExternalDropState<DropPosition>, owner: object) {
  const current = state.externalDropPosition;
  return current?.owner === owner ? current.position : null;
}
