import type { DraggableConfig } from '../utils/drag-and-drop/draggable';
import type { DragPreviewDeclaration } from '../utils/drag-and-drop/dragPreviewDeclaration';
import type { RegisterDropTargetParameters as InternalRegisterDropTargetParameters } from '../utils/drag-and-drop/dropTarget';
import type { RegisterAutoScrollerParameters as InternalRegisterAutoScrollerParameters } from '../utils/drag-and-drop/autoScroller';
import type { RegisterMonitorParameters } from '../utils/drag-and-drop/monitor';
import type {
  AcceptedDragPayload,
  AnyDragAccept,
  DragCleanupFn,
  DragKind,
  DraggablePayload,
  DropTargetPayload,
  DropTargetPayloadGetter,
} from './drag';

/** Requires exactly one of a parameter type's `payload` and `getPayload` fields. */
export type WithRequiredPayload<
  TParameters extends { payload?: unknown; getPayload?: unknown },
  TPayload = Exclude<TParameters['payload'], undefined>,
  TPayloadGetter = Exclude<TParameters['getPayload'], undefined>,
> = Omit<TParameters, 'payload' | 'getPayload'> &
  (
    | {
        /** Static payload data. Function values are preserved without being invoked. */
        payload: TPayload;
        /** Resolves payload data from the current drag context. */
        getPayload?: never | undefined;
      }
    | {
        payload?: never | undefined;
        getPayload: TPayloadGetter;
      }
  );

/** Allows at most one of a parameter type's `payload` and `getPayload` fields. */
export type WithOptionalPayload<TParameters extends { payload?: unknown; getPayload?: unknown }> =
  Omit<TParameters, 'payload' | 'getPayload'> &
    (
      | {
          /** Static payload data. Function values are preserved without being invoked. */
          payload?: TParameters['payload'] | undefined;
          /** Resolves payload data from the current drag context. */
          getPayload?: never | undefined;
        }
      | {
          payload?: never | undefined;
          getPayload?: TParameters['getPayload'] | undefined;
        }
    );

/** Parameters accepted by `Draggable.Root` and `registerDraggable`, except the element. */
// `onGenerateDragPreview` is omitted because the engine overwrites it to publish the
// preview it built.
export type RegisterDraggableParameters<TData = undefined> = Omit<
  DraggableConfig<TData>,
  | 'element'
  | 'onGenerateDragPreview'
  | 'getDragPreviewDeclaration'
  | 'styleNonce'
  | 'disableStyleElements'
>;

/**
 * `RegisterDraggableParameters` for the overload that infers `TData` from a required `payload`.
 * @public
 */
export type RegisterDraggableParametersWithPayload<TData> = Omit<
  RegisterDraggableParameters<TData>,
  'payload'
> & {
  payload: DraggablePayload<TData>;
};

/** Public drop-target parameters, whose `accept` declaration is required. */
export type RegisterDropTargetParameters<TSourceData = unknown, TLocalData = unknown> = Omit<
  InternalRegisterDropTargetParameters<TSourceData, TLocalData>,
  'accept'
> & {
  accept: NonNullable<InternalRegisterDropTargetParameters<TSourceData, TLocalData>['accept']>;
};

/**
 * Drop target registration parameters whose local payload is required.
 * @public
 */
export type RegisterDropTargetParametersWithPayload<TSourceData, TLocalData> = WithRequiredPayload<
  RegisterDropTargetParameters<TSourceData, NoInfer<TLocalData>>,
  DropTargetPayload<TSourceData, TLocalData>,
  DropTargetPayloadGetter<TSourceData, TLocalData>
>;

/**
 * Preserves the accepted kinds while inferring callback payload types.
 * @public
 */
export type WithInferredAccept<TParameters, TAccept extends AnyDragAccept> = TParameters & {
  accept?: TAccept | undefined;
};

/**
 * Preserves the accepted kinds while requiring `accept`.
 * @public
 */
export type WithRequiredAccept<TParameters, TAccept extends AnyDragAccept> = TParameters & {
  accept: TAccept;
};

/**
 * {@link DragDropManager} with a single, payload-optional `registerDraggable` signature.
 * `Draggable.Root` enforces the payload requirement at its own boundary and then
 * forwards a uniform parameters object, so the overloads would only get in the way.
 * @internal
 */
export interface InternalDragEngine extends Omit<
  DragDropManager,
  'registerDraggable' | 'registerDropTarget'
> {
  registerDraggable: <TData = undefined>(
    element: HTMLElement,
    getParameters: () => RegisterDraggableParameters<TData>,
    /** Whether parameter identity is an immutable revision key. React-backed registrations opt in. */
    cacheParameters?: boolean,
  ) => DragCleanupFn;
  registerDropTarget: <TSourceData = unknown, TLocalData = unknown>(
    element: HTMLElement,
    getParameters: () => InternalRegisterDropTargetParameters<TSourceData, TLocalData>,
  ) => DragCleanupFn;
}

/**
 * The public parameters plus the channel through which a `Draggable.Preview` reaches
 * the engine. Consumers never write that field, which is why it is absent from
 * `RegisterDraggableParameters`.
 * @internal
 */
export type InternalDraggableParameters<TData = undefined> = RegisterDraggableParameters<TData> & {
  getDragPreviewDeclaration?: (() => DragPreviewDeclaration<NoInfer<TData>> | null) | undefined;
};

/**
 * React's native HTML5 drag-and-drop props, omitted from `Draggable.Root` and
 * `Draggable.Target`. The engine's handlers use distinct names
 * (`onDraggableStart`, `onDraggableDrop`, …), so native handlers remain available
 * through `render` without ambiguous prop types.
 *
 * The native events are still reachable through `render`, whose element props are
 * merged over the component's own:
 *
 * ```jsx
 * <Draggable.Target
 *   accept={card}
 *   onDraggableDrop={handleEngineDrop}
 *   render={<div onDrop={handleFileDrop} onDragOver={allowFileDrop} />}
 * />
 * ```
 */
export type NativeDragEventProps =
  | 'onDrag'
  | 'onDragCapture'
  | 'onDragEnd'
  | 'onDragEndCapture'
  | 'onDragEnter'
  | 'onDragEnterCapture'
  | 'onDragExit'
  | 'onDragExitCapture'
  | 'onDragLeave'
  | 'onDragLeaveCapture'
  | 'onDragOver'
  | 'onDragOverCapture'
  | 'onDragStart'
  | 'onDragStartCapture'
  | 'onDrop'
  | 'onDropCapture';

/**
 * Options for `Draggable.Viewport` and `registerAutoScroller`.
 * A viewport automatically scrolls its region during a drag. These options
 * customize which drags and directions it responds to, or connect it to a
 * custom surface through `onDragScroll`.
 */
export type RegisterAutoScrollerParameters<TSourceData = unknown> =
  InternalRegisterAutoScrollerParameters<TSourceData>;

export type { RegisterMonitorParameters };

/**
 * The page-global drag-and-drop manager returned by `useDragDropManager`.
 *
 * Each `register*` method takes a parameter getter and returns a cleanup that
 * unregisters. Callbacks and dynamic options are read when used; source identity,
 * preview settings, monitor eligibility, and idle DOM attributes have the timing
 * documented by their registration methods.
 */
export interface DragDropManager {
  /**
   * Registers a drag source and returns a cleanup that unregisters it.
   *
   * Behavior is read from the getter on every event, but the static DOM setup
   * (gesture styles and the `aria-roledescription` / `aria-describedby` a11y
   * attributes) is applied from the parameters read at registration and
   * refreshed when the engine next re-reads them — at the next interaction with
   * the element (a pointer press).
   * Until then, a screen reader inspecting the idle element still sees the
   * previous values; re-register to refresh them immediately.
   */
  // Overloaded so `payload` both drives inference and stays required once the
  // caller declares a `TData` of their own, mirroring `Draggable.Root`.
  registerDraggable: {
    <TData>(
      element: HTMLElement,
      getParameters: () => RegisterDraggableParametersWithPayload<TData>,
    ): DragCleanupFn;
    <TData>(
      element: HTMLElement,
      getParameters: () => RegisterDraggableParametersWithPayload<TData>,
    ): DragCleanupFn;
    (
      element: HTMLElement,
      getParameters: () => RegisterDraggableParameters<undefined>,
    ): DragCleanupFn;
  };
  /**
   * Registers a drop target, a place a matching drag can be released, and returns a
   * cleanup that unregisters it.
   */
  // Overloaded so `payload` both drives inference and stays required once the
  // caller declares a `TLocalData` of their own, mirroring `Draggable.Target`.
  registerDropTarget: {
    // Local data is `undefined` at the fallback, not `unknown`: `kind` is typed
    // from it, so a payload-carrying kind can't register without payload data.
    <TAccept extends AnyDragAccept = DragKind<unknown>>(
      element: HTMLElement,
      getParameters: () => WithRequiredAccept<
        Omit<
          InternalRegisterDropTargetParameters<AcceptedDragPayload<TAccept>, undefined>,
          'payload' | 'getPayload'
        >,
        TAccept
      > & { payload?: never | undefined; getPayload?: never | undefined },
    ): DragCleanupFn;
    <TAccept extends AnyDragAccept, TLocalData>(
      element: HTMLElement,
      getParameters: () => WithRequiredAccept<
        RegisterDropTargetParametersWithPayload<AcceptedDragPayload<TAccept>, TLocalData>,
        TAccept
      >,
    ): DragCleanupFn;
  };
  /**
   * Registers a custom auto-scroll region and returns a cleanup function.
   * Use this for imperative integrations; React consumers should generally use
   * `Draggable.Viewport` instead.
   */
  registerAutoScroller: <TAccept extends AnyDragAccept = DragKind<unknown>>(
    element: HTMLElement,
    getParameters: () => WithInferredAccept<
      RegisterAutoScrollerParameters<AcceptedDragPayload<TAccept>>,
      TAccept
    >,
  ) => DragCleanupFn;
  /**
   * Registers a monitor that observes every matching drag, and returns a cleanup
   * that unregisters it.
   */
  registerMonitor: <TAccept extends AnyDragAccept = DragKind<unknown>>(
    getParameters: () => WithInferredAccept<
      RegisterMonitorParameters<AcceptedDragPayload<TAccept>>,
      TAccept
    >,
  ) => DragCleanupFn;
  /**
   * Cancels the drag in progress, if any.
   * Fires `onMoveEnd` with `canceled: true`.
   */
  cancelDrag: () => void;
}
