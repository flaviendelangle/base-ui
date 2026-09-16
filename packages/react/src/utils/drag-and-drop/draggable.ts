import type {
  DragCleanupFn,
  DragHandle,
  DragKind,
  MoveStartContext,
  DraggablePayload,
  DragPreviewParameters,
  BeforeMoveStartEventDetails,
  DraggableEventDetailsMap,
  DraggableEventMap,
  DragPreviewRenderEvent,
  DragModifiers,
} from '../../types/drag';
import type { DragPreviewDeclaration } from './dragPreviewDeclaration';
import type { DragActivationConfig } from './activation';
import { bindPointerListeners, unbindPointerListeners } from './synthetic/syntheticSensor';
import { getDragEventRoot, onceCleanup, resolveElementReference } from './utils';

interface DraggableStaticSetupParameters {
  element: HTMLElement;
  dragHandle?: DragHandle | undefined;
  disabled?: boolean | undefined;
}

/** Apply the pointer gesture styles to the draggable (and restore them on cleanup). */
export function applyDraggableStaticSetup(
  parameters: DraggableStaticSetupParameters,
): DragCleanupFn {
  const { element, dragHandle, disabled } = parameters;
  const gestureElement =
    (resolveElementReference(dragHandle, undefined) as HTMLElement | null) ?? element;
  if (disabled) {
    return () => {};
  }
  const style = gestureElement.style as CSSStyleDeclaration & { webkitTouchCallout: string };
  const previous = {
    touchAction: style.touchAction,
    userSelect: style.userSelect,
    webkitUserSelect: style.webkitUserSelect,
    webkitTouchCallout: style.webkitTouchCallout,
  };
  style.touchAction = 'manipulation';
  style.userSelect = 'none';
  style.webkitUserSelect = 'none';
  style.webkitTouchCallout = 'none';
  return onceCleanup(() => {
    style.touchAction = previous.touchAction;
    style.userSelect = previous.userSelect;
    style.webkitUserSelect = previous.webkitUserSelect;
    style.webkitTouchCallout = previous.webkitTouchCallout;
  });
}

/**
 * Bind the pointer sensor at `element`'s document or shadow root. The binder is
 * reference-counted, so binding once per draggable is safe. Returns a cleanup
 * that unbinds them.
 */
export function bindDraggableSensors(element: Element): DragCleanupFn {
  const root = getDragEventRoot(element);
  bindPointerListeners(root);
  return onceCleanup(() => {
    unbindPointerListeners(root);
  });
}

export type DraggableConfig<TData = undefined> = {
  element: HTMLElement;
  /** CSP nonce for the drag cursor stylesheet, wired by the React layer. @internal */
  styleNonce?: string | undefined;
  /** Whether the React layer has disabled runtime style elements. @internal */
  disableStyleElements?: boolean | undefined;
  /**
   * The data to attach to this drag, surfaced as `source.payload` on every
   * drag-and-drop event.
   */
  // Optional here so the conditional requirement lives in one place: `Draggable.Root`
  // and `registerDraggable` re-impose it through an overload, which also keeps a
  // wrapper spreading their `Props` from hitting a deferred conditional.
  payload?: DraggablePayload<TData> | undefined;
  /**
   * Stable identity used to reconnect a settling cloned preview to this source
   * after it remounts. Use the same key for the same logical item across the move.
   * Static payload identity is used as a fallback when it is referentially stable.
   */
  previewKey?: string | number | undefined;
  /**
   * What this draggable is, created with `Draggable.createKind`. Omit this prop inside
   * `Draggable.Provider` to use its default no-payload drag kind. For a payload or a
   * separate drag type, pass the kind to the source and to the target's `accept` prop;
   * the kind's payload type then types `payload` and `source.payload` on every event.
   */
  kind: DragKind<TData>;
  /**
   * Restricts drag initiation to a specific child element, ref, or resolver.
   * The handle should be available when the draggable is registered so it receives
   * the gesture styles.
   *
   * For sources registered imperatively. A draggable component restricts pickup
   * by rendering a `Draggable.Handle` instead.
   */
  dragHandle?: DragHandle | undefined;
  /**
   * Whether the element should ignore pointer interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Event handler called when the active drop targets change,
   * because one was entered or left.
   */
  onTargetChange?:
    | ((
        parameters: DraggableEventMap<NoInfer<TData>>['onTargetChange'],
        eventDetails: DraggableEventDetailsMap['onTargetChange'],
      ) => void)
    | undefined;
  /**
   * Event handler called when a drag is about to start, once the activation condition
   * is met and before the preview is built.
   * Call `eventDetails.cancel()` to prevent the drag from starting. The
   * `eventDetails.activation` field identifies a double-click pickup.
   */
  onBeforeMoveStart?:
    | ((context: MoveStartContext, eventDetails: BeforeMoveStartEventDetails) => void)
    | undefined;
  /**
   * Determines when a press becomes a drag. Mouse and pen default to a 5px
   * distance, and touch to a 250ms press-hold. Providing this prop replaces the
   * defaults. Pass one activation or an array to enable multiple activation methods;
   * a single activation applies to all pointer types, or use a per-type map to
   * customize them individually.
   */
  activation?: DragActivationConfig | readonly DragActivationConfig[] | undefined;
  /**
   * Constrains pointer movement with one modifier or an array applied
   * in order. See {@link DragModifiers} and the exported modifier presets.
   */
  modifiers?: DragModifiers | undefined;
  /**
   * CSS cursor pinned across the whole document while a pointer drag is active.
   * The drag preview has `pointer-events: none`, so without this the cursor would
   * track whatever sits under the pointer. Touch drags ignore it.
   * Pass `false` to manage the cursor yourself.
   * @default 'grabbing'
   */
  dragCursor?: string | false | undefined;
  /**
   * The drag preview: what follows the pointer, and where it lives in the DOM.
   * Omit it to use a full-fidelity clone of the source.
   *
   * For sources registered imperatively. A draggable that renders a preview part
   * describes its preview there instead.
   */
  dragPreview?: DragPreviewParameters<NoInfer<TData>> | undefined;
  /**
   * The preview part declared for this draggable, if any. Wired by the React layer;
   * the engine reads it once at drag start, before React can run, to decide between
   * cloning the source and building a host for custom content.
   * @internal
   */
  getDragPreviewDeclaration?: (() => DragPreviewDeclaration<NoInfer<TData>> | null) | undefined;
  /**
   * Event handler called once at the start of a drag, before `onMoveStart`,
   * while the preview is being built. The React layer installs its preview
   * publisher here, so the public parameter types omit it.
   * @internal
   */
  onGenerateDragPreview?:
    | ((parameters: DragPreviewRenderEvent<NoInfer<TData>>) => void)
    | undefined;
  /**
   * Event handler called once, synchronously when the drag starts. The drag preview
   * has already been resolved by then, so it is safe to measure or restyle the
   * source from here.
   */
  onMoveStart?:
    | ((
        parameters: DraggableEventMap<NoInfer<TData>>['onMoveStart'],
        eventDetails: DraggableEventDetailsMap['onMoveStart'],
      ) => void)
    | undefined;
  /**
   * Event handler called, rAF-throttled, as the drag moves — a pointer move, or an
   * pointer movement. Not dispatched on
   * drop-target-stack changes, so hover logic belongs on the drop target's
   * `onMove`, not here.
   */
  onMove?:
    | ((
        parameters: DraggableEventMap<NoInfer<TData>>['onMove'],
        eventDetails: DraggableEventDetailsMap['onMove'],
      ) => void)
    | undefined;
  /**
   * Event handler called once when the drag ends, however it ended — dropped,
   * released over nothing, or canceled. Use it to commit a successful drop when
   * `dropTarget` is present, undo optimistic state, and clean up. `eventDetails.reason`
   * carries the exact outcome.
   */
  onMoveEnd?:
    | ((
        parameters: DraggableEventMap<NoInfer<TData>>['onMoveEnd'],
        eventDetails: DraggableEventDetailsMap['onMoveEnd'],
      ) => void)
    | undefined;
};
