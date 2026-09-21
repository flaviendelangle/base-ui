'use client';
import * as React from 'react';
import { Draggable } from '../../draggable';
import type {
  BaseDragEvent,
  DropTargetRecord,
  DropTargetChangeEventDetails,
} from '../../types/drag';

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

type Snapshot<T> = { payload: T; point: { x: number; y: number } };
type RenderTarget = (
  element: React.ReactElement,
  payload: unknown,
  external?: ExternalDropTargetProps,
  snap?: Draggable.Root.Props<unknown>['snap'],
) => React.ReactElement;
const TargetContext = React.createContext<RenderTarget | undefined>(undefined);

/** One row registration routes local sorting and external drops before acceptance. */
export function SortableDropProvider<T extends { collectionId: object }>(
  props: Draggable.CollisionProvider.Props<T> & { collectionId: object },
) {
  const { kind, collectionId, canCollide } = props;
  const [targetKind] = React.useState(() => Draggable.createKind<Snapshot<T>>('sortable-row'));
  const previous = React.useRef<Draggable.CollisionProvider.Collision<T> | null>(null);
  const previousRecord = React.useRef<DropTargetRecord | null>(null);
  const resolve = (record: DropTargetRecord | null | undefined, sourceElement: Element) => {
    if (!record || record.element === sourceElement || !targetKind.matches(record)) {
      return null;
    }
    return {
      target: {
        ...record,
        payload: record.payload.payload,
        getLocalPoint: () => record.payload.point,
      },
    };
  };
  const update = (event: BaseDragEvent<T>, details: DropTargetChangeEventDetails) => {
    if (event.source.payload.collectionId !== collectionId) {
      return;
    }
    const record = event.location.current.dropTargets[0] ?? null;
    if (record === previousRecord.current) {
      return;
    }
    previousRecord.current = record;
    const collision = resolve(record, event.source.element);
    const previousCollision = previous.current;
    previous.current = collision;
    props.onCollisionChange?.({ ...event, collision, previousCollision }, details);
  };
  Draggable.useDragMonitor({
    accept: kind,
    onMoveStart(event, details) {
      if (event.source.payload.collectionId === collectionId) {
        previous.current = null;
        previousRecord.current = null;
        props.onMoveStart?.(event, details);
      }
    },
    onMove: update,
    onTargetChange: update,
    onMoveEnd(event, details) {
      if (event.source.payload.collectionId !== collectionId) {
        return;
      }
      const collision = resolve(event.dropTarget, event.source.element);
      const previousCollision = previous.current;
      previous.current = null;
      previousRecord.current = null;
      props.onMoveEnd?.({ ...event, collision, previousCollision }, details);
    },
  });
  const renderTarget = React.useCallback<RenderTarget>(
    (element, payload, externalProps, snap) => {
      // The provider supplies every row payload using the same T as its drag kind.
      const item = payload as T;
      const owns = (source: Draggable.DragSource) =>
        kind.matches(source) && source.payload.collectionId === collectionId;
      return (
        <Draggable.Target<unknown, Snapshot<T>>
          render={element}
          trackDragOver={false}
          disabled={false}
          snap={snap}
          kind={targetKind}
          accept={Draggable.anyKind}
          canDrop={(context) => {
            if (kind.matches(context.source) && owns(context.source)) {
              return canCollide?.({ source: context.source, target: item }) ?? true;
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
          getPayload={({ element: node, input }) => {
            // Capture geometry before callbacks can reorder or unmount the row.
            const rect = node.getBoundingClientRect();
            return {
              payload: item,
              point: {
                x: rect.width ? (input.clientX - rect.left) / rect.width : 0,
                y: rect.height ? (input.clientY - rect.top) / rect.height : 0,
              },
            };
          }}
          onDraggableEnter={(event, details) => {
            if (!owns(event.source)) {
              externalProps?.onDraggableEnter?.(event, details);
            }
          }}
          onDraggableMove={(event, details) => {
            if (!owns(event.source)) {
              externalProps?.onDraggableMove?.(event, details);
            }
          }}
          onDraggableLeave={(event, details) => {
            if (!owns(event.source)) {
              externalProps?.onDraggableLeave?.(event, details);
            }
          }}
          onDraggableDrop={(event, details) => {
            if (!owns(event.source) && event.target.element === event.dropTarget.element) {
              externalProps?.onDraggableDrop?.(event, details);
            }
          }}
        />
      );
    },
    [kind, collectionId, canCollide, targetKind],
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

export function acceptsExternalDrop(
  accept: Draggable.AnyDragAccept | undefined,
  source: Draggable.DragSource,
): boolean {
  if (!accept) {
    return false;
  }
  const kinds = Array.isArray(accept) ? accept : [accept];
  return kinds.some((kind) => kind.id === Draggable.anyKind.id || kind.matches(source));
}
