import { cancelActiveDrag as cancelActivePointerDrag } from './synthetic/syntheticSensor';
import { cancelLifecycleDrag } from './core/lifecycleManager';

/**
 * Cancel the drag in progress, if any. Fires `onMoveEnd` with `canceled: true`
 * (and cancels any active pointer session), and
 * is a no-op when nothing is being dragged.
 *
 * Carries no per-instance state, like the primitives in `./registrations`: the
 * drag state is global, so the engine simply re-exposes this as `cancelDrag`.
 */
export function cancelDrag(): void {
  cancelActivePointerDrag();
  // During the synchronous start dispatches (`onGenerateDragPreview` /
  // `onMoveStart`) no sensor has recorded the session yet, so both calls above
  // no-op; the lifecycle-level cancel reaches the in-flight session directly.
  // It is itself a no-op once a sensor-owned cancel has torn the lifecycle down.
  cancelLifecycleDrag();
}
