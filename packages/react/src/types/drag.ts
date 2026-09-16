import type * as React from 'react';

export type DragCleanupFn = () => void;

/**
 * The input modality driving a drag.
 *
 * - `'pointer'`: a mouse, pen, or touch gesture.
 *
 * This event family covers Base UI registered draggable elements. Native
 * and external OS drags are outside it and would use a separate adapter and
 * event family rather than widening this union.
 */
export type DragMode = 'pointer';

/** Pointer device that initiated the drag. */
export type DragPointerType = 'mouse' | 'pen' | 'touch';

/** Pointer state captured at the moment a drag-and-drop event fires. */
export interface DragInput {
  /**
   * `MouseEvent.button` semantics: 0 = primary, 1 = middle, 2 = secondary.
   * Move-derived events (`onMove`, `onTargetChange`) carry `-1`, as no button changed.
   * Read `buttons` for what is held mid-drag.
   */
  button: number;
  /** `MouseEvent.buttons` bitmask. */
  buttons: number;
  /** Pointer X relative to the viewport, in CSS pixels. */
  clientX: number;
  /** Pointer Y relative to the viewport, in CSS pixels. */
  clientY: number;
  /** Pointer X relative to the document, in CSS pixels (includes scroll). */
  pageX: number;
  /** Pointer Y relative to the document, in CSS pixels (includes scroll). */
  pageY: number;
  /**
   * The pointer device that produced this input.
   */
  pointerType: DragPointerType;
  /** Whether the Control key was held. */
  ctrlKey: boolean;
  /** Whether the Shift key was held. */
  shiftKey: boolean;
  /** Whether the Alt key was held. */
  altKey: boolean;
  /** Whether the Meta (Command/Windows) key was held. */
  metaKey: boolean;
}

/**
 * The four modifier keys, as every event that carries them reports them.
 * @internal
 */
export type DragModifierKeys = Pick<DragInput, 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

/** A 2D coordinate in CSS pixels. */
export interface DragPosition {
  x: number;
  y: number;
}

/**
 * Where the pointer sat inside a drop target, as a fraction of that target's border box:
 * `0` at the left/top edge, `1` at the right/bottom. See `DropTargetRecord.getLocalPoint`.
 */
export interface DragLocalPoint {
  x: number;
  y: number;
}

/**
 * How many equal steps a drop target's local point quantizes to per axis, declared
 * with the target's `snap`. An axis left out (or a non-positive count) stays
 * unquantized. Counts are unitless fractions of the target's border box, so nothing
 * about the target's rendered size is needed to declare them: a day column is
 * `{ y: 96 }` (15-minute slots) however tall it ends up.
 */
export interface DragSnapSteps {
  x?: number | undefined;
  y?: number | undefined;
}

/** Options for `DropTargetRecord.getSnappedLocalPoint`. */
export interface DragSnappedLocalPointOptions {
  /**
   * The point being quantized: `'pointer'` is where the pointer sits; `'source'`
   * shifts it by the grab offset first (measured at the press, where the user took
   * hold), so the reported step is the one the dragged element's leading edges are
   * over. That is the value a *move* commits, since snapping the pointer and then
   * subtracting a grab offset would un-snap it. Falls back to `'pointer'` when no
   * grab offset is known.
   * @default 'pointer'
   */
  anchor?: 'pointer' | 'source' | undefined;
}

/** A drop target in the active hover stack. */
export interface DropTargetRecord<TLocalData = unknown> {
  /** The drop target's own DOM element. */
  element: Element;
  /**
   * Identity of the kind supplied by the drop target's `kind`, or `undefined` when the
   * target was registered without one. Test it with the kind's `matches`, which narrows
   * `payload` at the same time.
   */
  kind: symbol | undefined;
  /**
   * Data supplied by the drop target's `payload`.
   * `undefined` when the target was registered without one.
   */
  payload: TLocalData;
  /**
   * Where the pointer sat inside this target when the target was resolved, as a fraction
   * of the target's border box on each axis. Use it when the drop resolves to a value
   * spread across the target rather than to the target itself:
   *
   * ```tsx
   * <Draggable.Target
   *   accept={eventKind}
   *   onDrop={({ target }) => {
   *     schedule(target.getLocalPoint().y * MINUTES_PER_DAY);
   *   }}
   * />
   * ```
   *
   * The first call measures the target, so call it only where the number is needed.
   * Later calls on the same record are free, and records are rebuilt on every move.
   *
   * Not clamped: an ancestor in the stack can have the pointer outside its own box, so
   * clamp where the domain requires it. Both axes report `0` for a target with no extent,
   * including one detached since the drag began.
   */
  getLocalPoint: () => DragLocalPoint;
  /**
   * `getLocalPoint`, quantized to the target's `snap` steps with symmetric rounding
   * and clamped to `0`–`1`, so the result multiplies into an exact domain value:
   *
   * ```tsx
   * <Draggable.Target
   *   accept={eventKind}
   *   snap={{ y: 96 }}
   *   onDrop={({ source, target }) => {
   *     // Already a multiple of 15 minutes.
   *     schedule(source.payload.id, target.getSnappedLocalPoint().y * MINUTES_PER_DAY);
   *   }}
   * />
   * ```
   *
   * Pass `{ anchor: 'source' }` to quantize where the dragged element's leading edges
   * sit rather than the pointer: the value a move commits. An axis without declared
   * steps reports its clamped raw fraction. Shares `getLocalPoint`'s measurement, so
   * the same lazy-measure advice applies.
   */
  getSnappedLocalPoint: (options?: DragSnappedLocalPointOptions) => DragLocalPoint;
}

/**
 * Snapshot of the pointer state and the active drop targets at one moment.
 * Each event carries its own snapshot, so it keeps reporting the moment it fired.
 */
export interface DragLocation {
  input: DragInput;
  /** The active drop targets, innermost first. */
  dropTargets: readonly DropTargetRecord[];
}

/** The locations carried with every drag event. */
export interface DragLocationHistory {
  /** The pointer's offset from the draggable's top-left at pickup. */
  grabOffset?: DragPosition;
  /** The location when the drag began. */
  initial: DragLocation;
  /** The location at the moment this event fires. */
  current: DragLocation;
  /**
   * The location at the prior event. On the first event of a drag it holds the
   * pickup input and no drop targets, so a `current` vs `previous` diff reads as
   * no movement rather than a jump.
   */
  previous: DragLocation;
}

/**
 * The drag source carried with every event.
 * Survives the original element being unmounted, for example by a virtualizer.
 *
 * Every source in this event family is a registered Base UI draggable.
 * Native and external OS drags, which may have no source element, are outside
 * this contract and would use a separate adapter and event family.
 */
export interface DragSource<TData = unknown> {
  /** The draggable's own DOM element. */
  element: HTMLElement;
  /**
   * Identity of the kind supplied by the draggable's `kind`. Test it with the kind's
   * `matches`, which narrows `payload` at the same time.
   */
  kind: symbol;
  /** The element the user pressed. `null` when the whole draggable is its own handle. */
  dragHandle: Element | null;
  /**
   * Data supplied by the draggable's `payload`, captured when the drag starts.
   * `undefined` when the source was registered without one.
   */
  payload: TData;
}

/**
 * A kind of draggable item or drop target, created with `Draggable.createKind` or
 * `Draggable.createGlobalKind`.
 *
 * `TPayload` is the data things of this kind carry, so declaring it once on the kind
 * types `source.payload` and `target.payload` everywhere the kind is used.
 */
export interface DragKind<TPayload = unknown> {
  /**
   * The name or global key this kind was created with.
   */
  readonly name: string;
  /**
   * The kind's runtime identity. `createKind` creates a fresh symbol for each call;
   * `createGlobalKind` interns it on the namespaced key.
   */
  readonly id: symbol;
  /**
   * Whether this drag source is of this kind, narrowing its `payload` to `TPayload`.
   */
  matches(source: DragSource<unknown>): source is DragSource<TPayload>;
  /**
   * Whether this drop target record is of this kind, narrowing its `payload` to `TPayload`.
   */
  matches(target: DropTargetRecord<unknown>): target is DropTargetRecord<TPayload>;
}

/**
 * What a drop target's or monitor's `accept` takes: one kind, or an array of kinds.
 * `source.payload` is typed from it, as the payload of that kind or the union of theirs.
 */
export type DragAccept<TPayload> = DragKind<TPayload> | ReadonlyArray<DragKind<TPayload>>;

/**
 * A drag kind or array of kinds accepted by generic registration APIs.
 * @public
 */
export type AnyDragAccept = DragKind<unknown> | ReadonlyArray<DragKind<unknown>>;

/**
 * The payload promised by an `accept` declaration: the kind's own, the union of an
 * array's, or `unknown` when `accept` was omitted.
 * @public
 */
// Distributive on purpose, so both the array entries and an `accept` that is itself a
// union (a wrapper forwarding `DragAccept<T>`) resolve to the union of their payloads.
export type AcceptedDragPayload<TAccept> =
  TAccept extends DragKind<infer TPayload>
    ? TPayload
    : TAccept extends ReadonlyArray<infer TKind>
      ? TKind extends DragKind<infer TPayload>
        ? TPayload
        : never
      : unknown;

/** Fields included in every drag-and-drop event. */
export interface BaseDragEvent<TSourceData = unknown> {
  location: DragLocationHistory;
  source: DragSource<TSourceData>;
  /** The input modality driving the drag. */
  mode: DragMode;
}

/** Parameters passed to a drag preview's `offset` callback. */
export interface DragPreviewOffsetParameters {
  /** The preview element, after its content has rendered, so it has a size. */
  container: HTMLElement;
  /** The drag source element's bounding rect at drag start, in client coordinates. */
  sourceRect: DOMRect;
  /** Pointer state at drag start. */
  input: DragInput;
}

/**
 * Determines where the drag preview sits relative to the pointer.
 *
 * - `'source'`: Keep the grab point the element was picked up by, so the preview lifts
 *   off without shifting.
 * - `'pointer'`: Place the preview's top-left under the pointer. Use it for a preview
 *   that isn't shaped like the source, such as a small label chip.
 * - `DragPosition`: A fixed offset, in CSS pixels, from the preview's top-left to the pointer.
 * - `function`: Called at drag start with the rendered preview, the source rect, and the
 *   pointer state. Return the offset to use.
 */
export type DragPreviewOffset =
  | DragPosition
  | 'source'
  | 'pointer'
  | ((parameters: DragPreviewOffsetParameters) => DragPosition);

/**
 * Determines where the drag preview is injected in the DOM.
 *
 * - `HTMLElement`: Inject into this element.
 * - `RefObject`: Inject into the ref element.
 * - `function`: Called at drag start with the source element. Return the element to
 *   inject into, or `null`/`undefined` to use the default behavior.
 */
export type DragPreviewContainer =
  | HTMLElement
  | { current: HTMLElement | null }
  | ((source: HTMLElement) => HTMLElement | null | undefined);

/**
 * The event object of each drag-and-drop event, indexed by the event name.
 * `DraggableEventMap<TData>['onMove']` is the event object passed to `onMove` callbacks.
 * For a drop target's handlers use {@link DropTargetEvent} (or {@link DropEvent}),
 * which add the target's own `target` record.
 */
export interface DraggableEventMap<TSourceData = unknown> {
  onMoveStart: MoveStartEvent<TSourceData>;
  onMove: MoveEvent<TSourceData>;
  onTargetChange: DropTargetChangeEvent<TSourceData>;
  onMoveEnd: MoveEndEvent<TSourceData>;
}

/** The event object passed to a drop target's handlers, indexed by event name. */
export interface DropTargetEventMap<TSourceData = unknown> {
  onDraggableStart: MoveStartEvent<TSourceData>;
  onDraggableMove: MoveEvent<TSourceData>;
  onDraggableEnter: BaseDragEvent<TSourceData>;
  onDraggableLeave: BaseDragEvent<TSourceData>;
  onDraggableDrop: DragDropEvent<TSourceData>;
}

/** The drag context passed to a drag preview's `render` callback at drag start. */
export type DragPreviewRenderEvent<TSourceData = unknown> = BaseDragEvent<TSourceData>;

/** The event object passed to `onMoveStart`. */
export type MoveStartEvent<TSourceData = unknown> = BaseDragEvent<TSourceData>;

/** The event object passed to `onMove`. */
export type MoveEvent<TSourceData = unknown> = BaseDragEvent<TSourceData>;

/** The event object passed to `onTargetChange`. */
export type DropTargetChangeEvent<TSourceData = unknown> = BaseDragEvent<TSourceData>;

/** The event object passed to `onMoveEnd`. */
export type MoveEndEvent<TSourceData = unknown> = BaseDragEvent<TSourceData> & {
  /**
   * Whether the drag was aborted instead of released by the user.
   * A drag released outside of any drop target is not canceled; read `dropTarget` for that,
   * or `eventDetails.reason` for the exact outcome.
   */
  canceled: boolean;
  /**
   * The innermost drop target the release landed on, or `null` when the release was
   * over no target or the drag was canceled.
   */
  dropTarget: DropTargetRecord | null;
};

/**
 * The event object passed to `onDrop`, which fires only for a drag released over an
 * accepting target — so `dropTarget` is never `null` here. On a drop target's own
 * `onDrop` it is that target's record, the same one as `target`.
 */
export type DragDropEvent<TSourceData = unknown> = BaseDragEvent<TSourceData> & {
  dropTarget: DropTargetRecord;
};

/** The event object passed to a drop target's `onDrop`. */
export type DropEvent<TSourceData = unknown, TLocalData = unknown> = Omit<
  DragDropEvent<TSourceData>,
  'dropTarget'
> &
  DropTargetEventTarget<TLocalData> & {
    dropTarget: DropTargetRecord<TLocalData>;
  };

/**
 * The event object passed to a drop target's event `K`.
 * Use it to type a handler extracted out of the JSX, which `DropTargetEventMap` alone
 * would leave without `target`:
 *
 * ```ts
 * function handleDraggableEnter(
 *   event: DropTargetEvent<'onDraggableEnter', CardPayload, SlotData>,
 * ) {}
 * ```
 */
export type DropTargetEvent<
  K extends keyof DropTargetEventMap,
  TSourceData = unknown,
  TLocalData = unknown,
> = DropTargetEventMap<TSourceData>[K] & DropTargetEventTarget<TLocalData>;

/** Context passed to a draggable's `onBeforeMoveStart` callback. */
export interface MoveStartContext {
  /** Pointer state at drag start. */
  input: DragInput;
  /** The draggable's own DOM element. */
  element: HTMLElement;
  /** The element the user pressed. `null` when the whole draggable is its own handle. */
  dragHandle: Element | null;
}

/** A draggable's payload value. */
// `NoInfer` because `kind` is what the payload type is inferred from: without it a
// `payload` that does not match the kind would widen `TData` instead of being rejected.
export type DraggablePayload<TData> = Exclude<NoInfer<TData>, (...args: any[]) => any>;

/**
 * Determines the element that must receive the press for a drag to start.
 *
 * - `Element`: This element is the handle.
 * - `RefObject`: The ref element is the handle.
 * - `function`: Return the handle element, or `null`/`undefined` to make the whole
 *   draggable its own handle.
 */
export type DragHandle = Element | { current: Element | null } | (() => Element | null | undefined);

/** The input modality about to drive the drag. */
export type DragStartReason = DragMode;

type DragReasonToEvent<TReason extends string> = TReason extends 'pointer'
  ? PointerEvent
  : TReason extends 'pointer-canceled' | 'capture-lost' | 'missed-release'
    ? PointerEvent
    : TReason extends 'drop' | 'outside-release'
      ? PointerEvent
      : Event;

/** The event details passed to `onBeforeMoveStart`. Call `cancel()` to prevent the drag. */
export type BeforeMoveStartEventDetails = {
  [TReason in DragStartReason]: {
    /** The input modality attempting to start the drag. */
    reason: TReason;
    /** The pointer event that attempted the pickup. */
    event: DragReasonToEvent<TReason>;
    /** Prevents the drag from starting. */
    cancel: () => void;
    /** Allows the native event to propagate when the engine would stop it. */
    allowPropagation: () => void;
    /** Whether {@link cancel} has been called. */
    isCanceled: boolean;
    /** Whether {@link allowPropagation} has been called. */
    isPropagationAllowed: boolean;
    /** The element that initiated the pickup, when available. */
    trigger: Element | undefined;
    /** How the draggable was picked up. */
    activation: 'pointer' | 'double-click';
  };
}[DragStartReason];

/**
 * Why a drag finished without being aborted.
 *
 * - `'drop'`: released over an accepting drop target. `onDrop` fires for this one only.
 * - `'outside-release'`: released over no accepting target, so nothing was committed.
 */
export type DragCompletedReason = 'drop' | 'outside-release';

/**
 * Why a drag was aborted.
 *
 * The first group is the user acting deliberately; the rest are the environment taking
 * the drag away, and describe engine mechanics rather than intent — treat them as one
 * "interrupted" class unless you have a reason not to, and keep a default branch: a
 * future release can add members here.
 *
 * - `'imperative-action'`: the application called `cancelDrag()`.
 * - `'window-blur'` / `'page-hidden'`: the window lost focus, or the page was hidden.
 * - `'pointer-canceled'`: the browser or OS canceled the pointer stream.
 * - `'capture-lost'`: pointer capture moved away mid-gesture.
 * - `'missed-release'`: the button came up without a terminating event reaching the engine.
 * - `'handler-error'`: one of your own handlers threw, so the engine tore the drag
 *   down to avoid wedging. The original error is rethrown separately.
 * - `'document-detached'`: the drag's document lost its browsing context (iframe removed,
 *   popout closed).
 */
export type DragCanceledReason =
  | 'imperative-action'
  | 'window-blur'
  | 'page-hidden'
  | 'pointer-canceled'
  | 'capture-lost'
  | 'missed-release'
  | 'document-detached'
  | 'handler-error';

/** Why a drag ended, in full. `canceled` on the event is `reason` being a cancel one. */
export type DragEndReason = DragCompletedReason | DragCanceledReason;

/** Why `onDrop` fired. Narrowed to the one outcome that commits a drop. */
export type DragDropReason = Extract<DragCompletedReason, 'drop'>;

/**
 * Why the hovered drop targets changed: an input moved the drag, or the drag ended
 * and the targets are being released.
 */
export type DropTargetChangeReason = DragMode | DragEndReason;

/**
 * The details of a drag event, passed as the second argument to every handler.
 * Carries the `reason` the event fired for and the native `event` behind it, which
 * the payload itself doesn't expose. Not cancelable — by the time these fire the
 * engine has already acted; `onBeforeMoveStart` is the one that can be canceled.
 */
export type DragEventDetails<TReason extends string> = {
  [Reason in TReason]: {
    /** Why the event fired. */
    reason: Reason;
    /**
     * The native event behind the dispatch. Programmatic and lifecycle-only
     * reasons carry a generic `Event` placeholder.
     */
    event: DragReasonToEvent<Reason>;
  };
}[TReason];

/** The event details passed to `onMoveStart`. */
export type MoveStartEventDetails = DragEventDetails<DragStartReason>;
/** The event details passed to `onMove`. */
export type MoveEventDetails = DragEventDetails<DragMode>;
/** The event details passed to `onTargetChange`, `onDraggableEnter` and `onDraggableLeave`. */
export type DropTargetChangeEventDetails = DragEventDetails<DropTargetChangeReason>;
/** The event details passed to a drop target's `onDraggableDrop` handler. */
export type DragDropEventDetails = DragEventDetails<DragDropReason>;
/** The event details passed to `onMoveEnd`. */
export type MoveEndEventDetails = DragEventDetails<DragEndReason>;

/**
 * Maps each drag event to the details object its handler receives second.
 * The event details passed to a draggable's handlers, indexed by event name.
 */
export interface DraggableEventDetailsMap {
  onMoveStart: MoveStartEventDetails;
  onMove: MoveEventDetails;
  onTargetChange: DropTargetChangeEventDetails;
  onMoveEnd: MoveEndEventDetails;
}

/** The event details passed to a drop target's handlers, indexed by event name. */
export interface DropTargetEventDetailsMap {
  onDraggableStart: MoveStartEventDetails;
  onDraggableMove: MoveEventDetails;
  onDraggableEnter: DropTargetChangeEventDetails;
  onDraggableLeave: DropTargetChangeEventDetails;
  onDraggableDrop: DragDropEventDetails;
}

/** Context passed to a drop target's `canDrop` and `getPayload` callbacks. */
export interface DropTargetResolutionContext<TSourceData = unknown> {
  /** Pointer state at the moment this callback runs. */
  input: DragInput;
  /** The drag source being evaluated against this target. */
  source: DragSource<TSourceData>;
  /** This drop target's own DOM element. */
  element: Element;
}

/** A drop target's payload value. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type DropTargetPayload<TSourceData, TLocalData> = TLocalData;

/** Resolves a drop target's payload each time the target is evaluated. */
export type DropTargetPayloadGetter<TSourceData, TLocalData> = (
  context: DropTargetResolutionContext<NoInfer<TSourceData>>,
) => TLocalData;

/** Extra fields included in the events of a drop target. */
export interface DropTargetEventTarget<TLocalData = unknown> {
  /** This drop target's own record. */
  target: DropTargetRecord<TLocalData>;
}

/**
 * A reference to an element: the element itself, a ref object holding it, or a
 * function returning it. It is re-resolved on every constrained move, so a ref that
 * fills in late is picked up mid-drag.
 */
export type DragElementReference =
  | HTMLElement
  | { current: HTMLElement | null }
  | (() => HTMLElement | null | undefined);

/** Parameters passed to a {@link DragModifier} on every frame of a drag. */
export interface DragModifierContext {
  /**
   * The point being constrained, in client coordinates. On `Draggable.Root` this is
   * the cursor; on a preview part it is the preview's proposed top-left.
   */
  point: DragPosition;
  /** The same measure when the drag began, the reference an axis lock or grid snaps against. */
  initialPoint: DragPosition;
  /**
   * The cursor this frame, in client coordinates. Identical to `point` on
   * `Draggable.Root`; on a preview part it stays the cursor while `point` is the
   * preview's proposed top-left.
   */
  input: DragPosition;
  /** The drag source element. */
  sourceElement: HTMLElement;
  /** The source element's bounding rect at drag start. */
  sourceRect: DOMRect;
  /**
   * The scale a CSS transform (or a `zoom`) applies to the source, measured at drag start
   * over the source and every ancestor.
   *
   * `1` when nothing scales the source, and `1` for a rotation, which is not a scale. On a
   * zoomable surface it is the zoom, which is what turns a step expressed in the source's own
   * coordinates into client pixels: the prebuilt `snapToGrid` multiplies by it, and a custom
   * modifier working in surface units should too.
   */
  scale: DragPosition;
  /** The preview element's current rect, or `null` when there is no preview. */
  previewRect: DOMRect | null;
  /**
   * The offset from the preview's top-left to `point`, so the preview is drawn at
   * `point − previewOffset`. `(0, 0)` on a preview part and when there is no preview.
   */
  previewOffset: DragPosition;
  /** The input modality driving the drag. */
  mode: DragMode;
  /**
   * Whether the Control key was held by the event that produced this move.
   *
   * During a pointer drag the four flags are live: pressing or releasing one re-applies
   * the modifiers on the next frame without waiting for the pointer to move, so a
   * key-gated constraint engages the moment the key goes down. A keyboard drag reports
   * the keys of each arrow press instead, and never sees Ctrl, Alt or Meta — a chord is
   * left to the shortcut it belongs to rather than moving the drag.
   *
   * Read `mode` alongside them. The same key routinely means different things per
   * modality — Shift already means "travel further" to `fixedStepKeyboardMovement` — so
   * a gesture bound to Shift on the pointer usually wants `mode === 'pointer'` too.
   */
  ctrlKey: boolean;
  /** Whether the Shift key was held by the event that produced this move. See `ctrlKey`. */
  shiftKey: boolean;
  /** Whether the Alt key was held by the event that produced this move. See `ctrlKey`. */
  altKey: boolean;
  /**
   * Whether the Meta (Command/Windows) key was held by the event that produced this move.
   * See `ctrlKey`.
   */
  metaKey: boolean;
  /** The document's window, for viewport-relative modifiers. */
  ownerWindow: Window;
}

/**
 * Modifies a drag's movement: an axis lock, a grid snap, an element or window clamp.
 * Given the point that would be used this frame, returns the point to use instead.
 *
 * Prebuilt modifiers: `restrictToVerticalAxis`, `restrictToHorizontalAxis`,
 * `restrictToWindowEdges`, `restrictToParentElement`, `restrictToElement`, `snapToGrid`.
 */
export type DragModifier = (context: DragModifierContext) => DragPosition;

/**
 * One or more {@link DragModifier}s, applied in order, each constraining the previous
 * one's result. Falsy array entries are skipped, so a modifier can be applied
 * conditionally: `[locked && restrictToVerticalAxis, snapToGrid(8)]`.
 */
export type DragModifiers = DragModifier | ReadonlyArray<DragModifier | false | null | undefined>;

/**
 * How the drag preview is placed and constrained.
 * Every field is read once, at drag start.
 */
export interface DragPreviewSettings {
  /**
   * Determines where the preview sits relative to the pointer. See
   * {@link DragPreviewOffset} for the supported values.
   * @default 'source'
   */
  offset?: DragPreviewOffset | undefined;
  /**
   * Constrains where the preview is drawn, without affecting the drag itself: which
   * drop target resolves, and what `location.current.input` reports, are unchanged.
   * Here the modifier's `point` is the preview's proposed top-left and `input` is the
   * cursor. Runs on every positioned frame, so keep modifiers cheap.
   *
   * To constrain the drag itself, use `modifiers` on `Draggable.Root`.
   */
  modifiers?: DragModifiers | undefined;
  /**
   * Whether to build no preview at all, so nothing follows the pointer. The drag
   * itself still runs.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Determines where the preview is injected in the DOM.
   * Defaults to the source's own parent, so the app's CSS still applies to it.
   *
   * Pass a container to opt out of that: it keeps the source's siblings' structural
   * selectors (`:nth-child`, `:last-child`) intact and survives the source's subtree
   * being torn out mid-drag, at the cost of the contextual rules.
   */
  container?: DragPreviewContainer | undefined;
}

/**
 * The drag preview of a source registered imperatively.
 * Omit it to use a full-fidelity clone of the source.
 *
 * Components describe the preview with `Draggable.Preview` or
 * `Draggable.Preview` with no children instead.
 */
export interface DragPreviewParameters<TSourceData = unknown> extends DragPreviewSettings {
  /**
   * Renders the preview content, replacing the default clone of the source.
   * Return `null` or `false` to show no preview for this drag.
   */
  render?: ((parameters: DragPreviewRenderEvent<TSourceData>) => React.ReactNode) | undefined;
}
