'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';

export type ExternalDropTargetProps = Pick<
  Draggable.Target.Props<unknown, unknown>,
  | 'accept'
  | 'disabled'
  | 'canDrop'
  | 'trackDragOver'
  | 'onDraggableEnter'
  | 'onDraggableMove'
  | 'onDraggableLeave'
  | 'onDraggableDrop'
>;

type RenderTarget = (
  element: React.ReactElement,
  payload: unknown,
  external?: ExternalDropTargetProps,
  snap?: Draggable.Root.Props<unknown>['snap'],
) => React.ReactElement;
const TargetContext = React.createContext<RenderTarget | undefined>(undefined);

/** One row registration routes local sorting and external drops before acceptance. */
export function SortableDropProvider<T extends { collectionId: object }>(
  props: Omit<Draggable.CollisionProvider.Props<T>, 'canCollide'> & {
    collectionId: object;
    disabled: boolean;
    isTargetDisabled: (target: T) => boolean;
  },
) {
  const { kind, collectionId, disabled, isTargetDisabled } = props;
  const [targetKind] = React.useState(() => Draggable.createKind<T>('sortable-row'));
  const previous = React.useRef<Draggable.Target.Record<T> | null>(null);
  const previousRecord = React.useRef<Draggable.Target.Record | null>(null);
  const resolve = (record: Draggable.Target.Record | null, sourceElement: Element) => {
    if (!record || record.element === sourceElement || !targetKind.matches(record)) {
      return null;
    }
    // The record measures its geometry and resolves its snap steps on the first
    // read. Read them now, before a callback can reorder or unmount the row.
    record.getLocalPoint();
    record.getSnappedLocalPoint();
    return record;
  };
  const update = (eventDetails: Draggable.Root.TargetChangeEventDetails<T>) => {
    if (eventDetails.source.payload.collectionId !== collectionId) {
      return;
    }
    if (eventDetails.target === previousRecord.current) {
      return;
    }
    previousRecord.current = eventDetails.target;
    const collision = resolve(eventDetails.target, eventDetails.source.element);
    const previousTarget = previous.current;
    previous.current = collision;
    props.onCollisionChange?.({ ...eventDetails, target: collision, previousTarget });
  };
  Draggable.useMonitor({
    accept: kind,
    onMoveStart(eventDetails) {
      if (eventDetails.source.payload.collectionId === collectionId) {
        previous.current = null;
        previousRecord.current = null;
        props.onMoveStart?.({
          ...eventDetails,
          target: resolve(eventDetails.target, eventDetails.source.element),
        });
      }
    },
    onMove: update,
    onTargetChange: update,
    onMoveEnd(eventDetails) {
      if (eventDetails.source.payload.collectionId !== collectionId) {
        return;
      }
      const collision = resolve(eventDetails.target, eventDetails.source.element);
      const previousTarget = previous.current;
      previous.current = null;
      previousRecord.current = null;
      props.onMoveEnd?.({ ...eventDetails, target: collision, previousTarget });
    },
  });
  const renderTarget = React.useCallback<RenderTarget>(
    (element, payload, externalProps, snap) => {
      // The provider supplies every row payload using the same T as its drag kind.
      const item = payload as T;
      const owns = (source: Draggable.Root.Record) =>
        kind.matches(source) && source.payload.collectionId === collectionId;
      return (
        <Draggable.Target
          render={element}
          trackDragOver={false}
          disabled={false}
          snap={snap}
          kind={targetKind}
          accept={Draggable.anyKind}
          payload={item}
          canDrop={(context) => {
            if (owns(context.source)) {
              // Local sorting rejection must not fall through to ancestor targets.
              return disabled || isTargetDisabled(item) ? 'reject' : true;
            }
            if (
              !externalProps ||
              externalProps.disabled ||
              !acceptsExternalDrop(externalProps.accept, context.source)
            ) {
              return false;
            }
            return externalProps.canDrop?.(context) ?? true;
          }}
          onDraggableEnter={(eventDetails) => {
            if (!owns(eventDetails.source)) {
              externalProps?.onDraggableEnter?.(eventDetails);
            }
          }}
          onDraggableMove={(eventDetails) => {
            if (!owns(eventDetails.source)) {
              externalProps?.onDraggableMove?.(eventDetails);
            }
          }}
          onDraggableLeave={(eventDetails) => {
            if (!owns(eventDetails.source)) {
              externalProps?.onDraggableLeave?.(eventDetails);
            }
          }}
          onDraggableDrop={(eventDetails) => {
            if (!owns(eventDetails.source)) {
              externalProps?.onDraggableDrop?.(eventDetails);
            }
          }}
        />
      );
    },
    [kind, collectionId, disabled, isTargetDisabled, targetKind],
  );
  return <TargetContext.Provider value={renderTarget}>{props.children}</TargetContext.Provider>;
}

export function SortableDropTarget(props: {
  element: React.ReactElement;
  payload: unknown;
  external?: ExternalDropTargetProps | undefined;
  snap?: Draggable.Root.Props<unknown>['snap'] | undefined;
}) {
  const renderTarget = React.useContext(TargetContext)!;
  return renderTarget(props.element, props.payload, props.external, props.snap);
}

type DragRecordKey = 'source' | 'target' | 'previousTarget' | 'currentTarget';

/** Drag event details without their drag records, keeping each reason's own event type. */
export type OmitDragRecords<Details> = Details extends unknown
  ? Omit<Details, DragRecordKey>
  : never;

/**
 * Leaves out the drag records of the engine's events, which the collection's own events
 * don't expose: their targets are rows, not the dragged items.
 */
export function omitDragRecords<Details extends object>(eventDetails: Details) {
  const { source, target, previousTarget, currentTarget, ...details } = eventDetails as Details &
    Partial<Record<DragRecordKey, unknown>>;
  return details as OmitDragRecords<Details>;
}

/** Returns the collection that owns a sortable drag or row payload. */
export function getPayloadCollectionId(payload: unknown): unknown {
  return payload && typeof payload === 'object' && 'collectionId' in payload
    ? payload.collectionId
    : undefined;
}

export function isSameDropPosition(
  a: { id: unknown; placement: string; index?: number | undefined } | null,
  b: { id: unknown; placement: string; index?: number | undefined } | null,
): boolean {
  return a?.id === b?.id && a?.placement === b?.placement && a?.index === b?.index;
}

export function acceptsExternalDrop(
  accept: Draggable.Accept<unknown> | undefined,
  source: Draggable.Root.Record,
): boolean {
  if (!accept) {
    return false;
  }
  const kinds = Array.isArray(accept) ? accept : [accept];
  return kinds.some((kind) => kind.matches(source));
}
