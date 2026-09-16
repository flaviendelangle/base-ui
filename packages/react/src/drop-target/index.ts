export * as DropTarget from './index.parts';

export type * from './root/DropTargetRoot';

// The event and option types a `DropTarget.*` consumer needs to type extracted
// handlers and props, re-exported so this entry point is self-sufficient (they
// also remain available from `@base-ui/react/types`; both resolve to the
// same declarations, so the star exports stay unambiguous).
export type {
  BaseDragEvent,
  DragAccept,
  DragCanceledReason,
  DragCompletedReason,
  DragDropEvent,
  DragDropEventDetails,
  DragDropReason,
  DragEndReason,
  DragEventDetails,
  DropTargetEventDetailsMap,
  DropTargetEventMap,
  DragInput,
  DragKind,
  DragLocalPoint,
  DragLocation,
  DragLocationHistory,
  DragMode,
  MoveEventDetails,
  DragSnappedLocalPointOptions,
  DragSnapSteps,
  DragSource,
  MoveStartEventDetails,
  DropEvent,
  DropTargetChangeEvent,
  DropTargetChangeEventDetails,
  DropTargetChangeReason,
  DropTargetEvent,
  DropTargetPayload,
  DropTargetPayloadGetter,
  DropTargetRecord,
  DropTargetResolutionContext,
  DropTargetEventTarget,
} from '../types/drag';
