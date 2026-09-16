import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { act } from '@mui/internal-test-utils';
import { createDndRenderer } from '#test-utils';
import { cancel, createElement, flushRaf, setupDragEngineTests } from '../../../../test/dnd';
import type {
  DropTargetChangeEvent,
  DragDropEvent,
  DragDropEventDetails,
  MoveEndEvent,
  MoveEndEventDetails,
  DragInput,
} from '../../../types/drag';
import { addDropTargetRegistration, removeDropTargetRegistration } from '../dropTarget';
import { engageMonitorIfDragging, monitorRegistry, removeMonitor } from '../monitor';
import { cancelDrag } from '../cancelDrag';
import { dragSessionStore } from '../dragSessionStore';
import { reset, start, canStart, isActive } from './lifecycleManager';
import type { DragSessionHandle, SourceHandlers } from './lifecycleManager';
import { createKind } from '../dragKind';

setupDragEngineTests();

const TEST_KIND = createKind('lifecycle-test');

describe('lifecycle manager', () => {
  const { renderDnd } = createDndRenderer();

  function makeInput(): DragInput {
    return {
      button: 0,
      buttons: 1,
      clientX: 0,
      clientY: 0,
      pageX: 0,
      pageY: 0,
      pointerType: 'mouse',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    };
  }

  /**
   * Start a drag whose source handlers are `handlers`, driving the lifecycle
   * directly (no sensor). Returns whatever `start()` returns, so a handler that
   * throws or cancels synchronously in `start()` can be exercised — the caller
   * wraps the `start()` call in `expect(...).toThrow()` or asserts on `null`.
   */
  function startDragWithHandlers(
    handlers: SourceHandlers,
    initialTarget: Element | null = null,
  ): DragSessionHandle | null {
    const element = createElement();
    return start({
      mode: 'pointer',
      payload: { element, kind: TEST_KIND.id, dragHandle: null, payload: {} },
      getSourceHandlers: () => handlers,
      initialInput: makeInput(),
      initialTarget,
      synthetic: { getPreviewElement: () => null },
    });
  }

  describe('drag session', () => {
    it('prevents concurrent drags', async () => {
      const { engine } = await renderDnd();
      const el1 = createElement();
      const el2 = createElement();
      const onMoveStart1 = vi.fn();
      const onMoveStart2 = vi.fn();

      engine.registerDraggable(el1, { onMoveStart: onMoveStart1 });
      engine.registerDraggable(el2, { onMoveStart: onMoveStart2 });

      fireEvent.dragStart(el1);
      await flushRaf();
      expect(onMoveStart1).toHaveBeenCalledTimes(1);

      fireEvent.dragStart(el2);
      await flushRaf();
      expect(onMoveStart2).not.toHaveBeenCalled();
    });

    it('resets state after drop, allowing new drag', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const onMoveStart = vi.fn();

      engine.registerDraggable(el, { onMoveStart });
      engine.registerDropTarget(target, {});

      fireEvent.dragStart(el);
      await flushRaf();
      expect(onMoveStart).toHaveBeenCalledTimes(1);

      fireEvent.drop(target);

      fireEvent.dragStart(el);
      await flushRaf();
      expect(onMoveStart).toHaveBeenCalledTimes(2);
    });
  });

  describe('event ordering', () => {
    it('fires the internal onGenerateDragPreview then onMoveStart synchronously at drag start', () => {
      // The preview hook is engine-internal (the sensors' preview publisher —
      // see `SourceHandlers`), so the ordering is observable only by driving
      // the lifecycle directly.
      const order: string[] = [];

      const handle = startDragWithHandlers({
        onGenerateDragPreview: () => order.push('preview'),
        onMoveStart: () => order.push('start'),
      });

      expect(order).toEqual(['preview', 'start']);
      expect(handle).not.toBeNull();
      act(() => {
        reset();
      });
    });

    it('dispatches onMoveStart before onMoveEnd on a same-tick cancel', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const order: string[] = [];

      engine.registerDraggable(el, {
        onMoveStart: () => order.push('start'),
        onMoveEnd: () => order.push('drop'),
      });

      // onMoveStart already fired during dragStart, so it precedes the cancel's
      // onMoveEnd — a collection never sees a drop for a drag it never saw start.
      fireEvent.dragStart(el);
      cancel(el);

      expect(order).toEqual(['start', 'drop']);
    });

    it('delivers onMove with the expected payload', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const onMove = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerDropTarget(target, {});
      engine.registerMonitor({ onMove });

      fireEvent.dragStart(el);
      await flushRaf();

      fireEvent.dragOver(target);
      await flushRaf();

      expect(onMove).toHaveBeenCalled();
      const payload = onMove.mock.calls[0][0];
      expect(payload.source.element).toBe(el);
    });

    it('fires onMoveStart only on drop targets already under the pointer at pickup', async () => {
      // The initial stack is resolved from the element the drag starts on, so a drop
      // target's `onMoveStart` is not a global "a drag began" hook — that's a monitor.
      await renderDnd();
      const under = createElement();
      const elsewhere = createElement();
      const onUnder = vi.fn();
      const onElsewhere = vi.fn();
      const getUnderParams = () => ({ onMoveStart: onUnder });
      const getElsewhereParams = () => ({ onMoveStart: onElsewhere });
      addDropTargetRegistration(under, getUnderParams);
      addDropTargetRegistration(elsewhere, getElsewhereParams);

      const source = createElement();
      under.appendChild(source);
      // The mounted overlay subscribes to the preview store, so starting a session
      // commits React state.
      act(() => {
        start({
          mode: 'pointer',
          payload: {
            element: source,
            kind: TEST_KIND.id,
            dragHandle: null,
            payload: {},
          },
          getSourceHandlers: () => ({}),
          initialInput: {
            button: 0,
            buttons: 1,
            clientX: 0,
            clientY: 0,
            pageX: 0,
            pageY: 0,
            pointerType: 'mouse',
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
          },
          // What `elementFromPoint` resolves to at pickup: the source, inside `under`.
          initialTarget: source,
          synthetic: { getPreviewElement: () => null },
        });
      });

      expect(onUnder).toHaveBeenCalledTimes(1);
      expect(onElsewhere).not.toHaveBeenCalled();

      act(() => {
        reset();
      });
      removeDropTargetRegistration(under, getUnderParams);
      removeDropTargetRegistration(elsewhere, getElsewhereParams);
    });

    it('fires onDragEnter on the drop targets already under the pointer at pickup', async () => {
      // The initial stack is seeded straight into the hovered bookkeeping, so no
      // `onTargetChange` round ever diffs it into existence — yet it is
      // published in `dropTargetElements` (`data-over` is set) and is owed a
      // terminal `onDragLeave`. Without an enter of its own, the pair never opens.
      await renderDnd();
      const under = createElement();
      const onMoveStart = vi.fn();
      const onDragEnter = vi.fn();
      const onDragLeave = vi.fn();
      const getUnderParams = () => ({ onMoveStart, onDragEnter, onDragLeave });
      addDropTargetRegistration(under, getUnderParams);

      const source = createElement();
      under.appendChild(source);
      act(() => {
        start({
          mode: 'pointer',
          payload: {
            element: source,
            kind: TEST_KIND.id,
            dragHandle: null,
            payload: {},
          },
          getSourceHandlers: () => ({}),
          initialInput: makeInput(),
          initialTarget: source,
          synthetic: { getPreviewElement: () => null },
        });
      });

      expect(onDragEnter).toHaveBeenCalledTimes(1);
      expect(onDragEnter).toHaveBeenCalledWith(
        expect.objectContaining({ target: expect.objectContaining({ element: under }) }),
        expect.objectContaining({ reason: 'pointer' }),
      );
      // `onMoveStart` stays ahead of every enter, so a collection that keys off it
      // has its dragged-item set built before any target reacts.
      expect(onMoveStart.mock.invocationCallOrder[0]).toBeLessThan(
        onDragEnter.mock.invocationCallOrder[0],
      );
      expect(onDragLeave).not.toHaveBeenCalled();

      // The enter is balanced exactly once by the terminal leave.
      act(() => {
        cancelDrag();
      });
      expect(onDragEnter).toHaveBeenCalledTimes(1);
      expect(onDragLeave).toHaveBeenCalledTimes(1);

      removeDropTargetRegistration(under, getUnderParams);
    });

    it('owes no leave to a target whose initial enter never ran', async () => {
      // The stack is entered one record at a time, so a handler that cancels the
      // drag from *its* enter leaves the outer targets behind it un-entered. They
      // must not then receive a terminal `onDragLeave`: an enter/leave pair that
      // opens is closed, and one that never opened stays shut.
      await renderDnd();
      const outer = createElement();
      const inner = createElement();
      outer.appendChild(inner);

      const outerEnter = vi.fn();
      const outerLeave = vi.fn();
      const innerEnter = vi.fn(() => cancelDrag());
      const innerLeave = vi.fn();
      // Innermost first, which is the order the stack is resolved and entered in.
      const getInnerParams = () => ({ onDragEnter: innerEnter, onDragLeave: innerLeave });
      const getOuterParams = () => ({ onDragEnter: outerEnter, onDragLeave: outerLeave });
      addDropTargetRegistration(inner, getInnerParams);
      addDropTargetRegistration(outer, getOuterParams);

      const source = createElement();
      inner.appendChild(source);
      act(() => {
        start({
          mode: 'pointer',
          payload: {
            element: source,
            kind: TEST_KIND.id,
            dragHandle: null,
            payload: {},
          },
          getSourceHandlers: () => ({}),
          initialInput: makeInput(),
          initialTarget: source,
          synthetic: { getPreviewElement: () => null },
        });
      });

      expect(innerEnter).toHaveBeenCalledTimes(1);
      expect(innerLeave).toHaveBeenCalledTimes(1);
      expect(outerEnter).not.toHaveBeenCalled();
      expect(outerLeave).not.toHaveBeenCalled();

      removeDropTargetRegistration(inner, getInnerParams);
      removeDropTargetRegistration(outer, getOuterParams);
    });
  });

  describe('drop target hierarchy changes', () => {
    it('fires onTargetChange when hierarchy changes', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target1 = createElement();
      const target2 = createElement();
      const onTargetChange = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerDropTarget(target1, {});
      engine.registerDropTarget(target2, {});
      engine.registerMonitor({ onTargetChange });

      fireEvent.dragStart(el);
      await flushRaf();

      fireEvent.dragEnter(target1);
      await flushRaf();
      expect(onTargetChange).toHaveBeenCalledTimes(1);

      fireEvent.dragEnter(target2);
      await flushRaf();
      expect(onTargetChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('mid-drag drop-target refresh', () => {
    it('an unrelated refresh does not discard a queued real-movement onMove', async () => {
      const { engine } = await renderDnd();
      const target = createElement();
      const cleanupTarget = engine.registerDropTarget(target, {});

      // Capture coordinates at dispatch time: the payload's `location` is
      // mutated in place, so a stashed payload always reads the latest state.
      const dragInputs: Array<{ x: number; y: number }> = [];
      let handle: DragSessionHandle | null = null;
      act(() => {
        handle = startDragWithHandlers(
          {
            onMove: ({ location }) => {
              dragInputs.push({
                x: location.current.input.clientX,
                y: location.current.input.clientY,
              });
            },
          },
          target,
        );
      });
      const controller = handle!.controller;

      // A real pointer movement queues the rAF-throttled onMove.
      const movedInput = { ...makeInput(), clientX: 40, clientY: 40 };
      act(() => {
        controller.update(movedInput, target);
      });
      expect(dragInputs).toEqual([]);

      // The hovered target unregisters before the queued onMove is delivered (a
      // virtualizer recycling its row). The synchronous refresh re-resolves the
      // stack with the *same* input object, so it must not cancel the queued
      // real-movement onMove — the `input !== previousInput` guard.
      act(() => {
        cleanupTarget();
      });
      expect(dragInputs).toEqual([]);

      await flushRaf();
      expect(dragInputs).toContainEqual({ x: 40, y: 40 });

      act(() => {
        controller.cancel();
      });
    });
  });

  describe('drag cancellation', () => {
    it('fires onMoveEnd on a cancel, naming the key that caused it', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const onMoveEnd = vi.fn();
      const onDrop = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerMonitor({ onMoveEnd, onDrop });

      fireEvent.dragStart(el);
      await flushRaf();

      // The bridge replays a `dragend` with no preceding `drop` as Escape.
      fireEvent.dragEnd(el);

      expect(onDrop).not.toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          canceled: true,
          dropTarget: null,
          location: expect.objectContaining({
            current: expect.objectContaining({
              dropTargets: [],
            }),
          }),
        }),
        expect.objectContaining({ reason: 'escape-key' }),
      );
    });

    it('reports a release over no target as outside-release, not a cancel', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const onMoveEnd = vi.fn();
      const onDrop = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerMonitor({ onMoveEnd, onDrop });

      fireEvent.dragStart(el);
      await flushRaf();

      // Released deliberately, but over no accepting target — the third terminal
      // outcome. It is *not* `canceled`, which is why committing on `!canceled`
      // alone is wrong; `onDrop` is what marks a drop worth committing, and it
      // stays silent here.
      fireEvent.drop(el);

      expect(onDrop).not.toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd).toHaveBeenCalledWith(
        expect.objectContaining({ canceled: false, dropTarget: null }),
        expect.objectContaining({ reason: 'outside-release' }),
      );
    });

    it('does not fire target onDrop when drag is cancelled', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const targetOnDrop = vi.fn();
      const targetOnDragLeave = vi.fn();
      const monitorOnDrop = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerDropTarget(target, {
        onDrop: targetOnDrop,
        onDragLeave: targetOnDragLeave,
      });
      engine.registerMonitor({ onMoveEnd: monitorOnDrop });

      fireEvent.dragStart(el);
      await flushRaf();

      fireEvent.dragEnter(target);
      await flushRaf();

      fireEvent.dragEnd(el);

      expect(targetOnDrop).not.toHaveBeenCalled();
      // Not the discriminator: on the cancel path the terminal leave runs *before*
      // the source's `onMoveEnd`, so it is delivered with or without the fix. The
      // monitor dispatch below is what the containment actually buys.
      expect(targetOnDragLeave).toHaveBeenCalledTimes(1);
      expect(monitorOnDrop).toHaveBeenCalledTimes(1);
      const payload = monitorOnDrop.mock.calls[0][0];
      expect(payload.location.current.dropTargets).toEqual([]);
    });
  });

  describe('drop event handling', () => {
    it('re-computes drop targets from the drop event target', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const onDrop = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerDropTarget(target, {});
      engine.registerMonitor({ onDrop });

      fireEvent.dragStart(el);
      await flushRaf();

      fireEvent.dragEnter(target);
      fireEvent.dragOver(target);
      await flushRaf();

      fireEvent.drop(target);

      expect(onDrop).toHaveBeenCalledTimes(1);
      const dropPayload = onDrop.mock.calls[0][0];
      // `onDrop` names the recipient directly, so the stack only has to confirm
      // the drop resolved against the released-on target rather than a stale one.
      expect(dropPayload.dropTarget.element).toBe(target);
      expect(dropPayload.location.current.dropTargets).toHaveLength(1);
      expect(dropPayload.location.current.dropTargets[0].element).toBe(target);
    });

    it('enters a never-hovered target at drop, before its onDrop', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const events: string[] = [];

      engine.registerDraggable(el, { onMoveEnd: () => events.push('end') });
      engine.registerDropTarget(target, {
        onDragEnter: () => events.push('enter'),
        onDrop: () => events.push('drop'),
      });

      // Lift and release directly on the target with no hover in between: the
      // drop-time reconcile (fresh stack ≠ last-updated stack) owes the target
      // an `onDragEnter` before the drop is delivered to it.
      fireEvent.dragStart(el);
      await flushRaf();
      fireEvent.drop(target);

      expect(events.indexOf('enter')).toBeGreaterThanOrEqual(0);
      expect(events.indexOf('enter')).toBeLessThan(events.indexOf('drop'));
      expect(events).toContain('end');
    });

    it("fires the source's own onDrop before onMoveEnd, with a non-null dropTarget", async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const events: string[] = [];
      // Typed through the parameter list so `mock.calls[0]` keeps both arguments.
      const onDrop = vi.fn((_: DragDropEvent, __: DragDropEventDetails) => {
        events.push('source-drop');
      });
      const onMoveEnd = vi.fn((_: MoveEndEvent, __: MoveEndEventDetails) => {
        events.push('source-end');
      });

      engine.registerDraggable(el, { onDrop, onMoveEnd });
      engine.registerDropTarget(target, { onDrop: () => events.push('target-drop') });

      fireEvent.dragStart(el);
      await flushRaf();
      fireEvent.drop(target);

      // Commit first, clean up second — and the existing source-end-before-
      // target-drop ordering is untouched.
      expect(events).toEqual(['source-drop', 'source-end', 'target-drop']);
      expect(onDrop.mock.calls[0][0].dropTarget.element).toBe(target);
      expect(onDrop.mock.calls[0][1].reason).toBe('drop');
      expect(onMoveEnd.mock.calls[0][1].reason).toBe('drop');
    });

    it("pins the source's own onTargetChange payload and ordering", async () => {
      // The only test exercising the source's handler was the throw-recovery
      // one, so deleting the source dispatch left the suite green.
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const order: string[] = [];
      const onTargetChange = vi.fn((_: DropTargetChangeEvent) => {
        order.push('source');
      });

      engine.registerDraggable(el, { onTargetChange });
      engine.registerDropTarget(target, {
        onDragEnter: () => order.push('enter'),
      });

      fireEvent.dragStart(el);
      await flushRaf();
      fireEvent.dragEnter(target);
      fireEvent.dragOver(target);
      await flushRaf();

      expect(onTargetChange).toHaveBeenCalled();
      const payload = onTargetChange.mock.calls[0][0];
      expect(payload.source.element).toBe(el);
      expect(payload.location.current.dropTargets[0].element).toBe(target);
      // The source hears about the change before the target's enter callback.
      expect(order[0]).toBe('source');
      expect(order).toContain('enter');

      act(() => {
        cancelDrag();
      });
    });

    it('every drag handler receives the details object second', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const target = createElement();
      const reasons: Record<string, string> = {};
      const record = (name: string) => (_: unknown, eventDetails: { reason: string }) => {
        reasons[name] = eventDetails.reason;
      };

      engine.registerDraggable(el, {
        onMoveStart: record('start'),
        onMove: record('drag'),
        onTargetChange: record('change'),
      });
      engine.registerDropTarget(target, {
        onDragEnter: record('enter'),
        onDragLeave: record('leave'),
      });

      fireEvent.dragStart(el);
      await flushRaf();
      fireEvent.dragEnter(target);
      fireEvent.dragOver(target);
      await flushRaf();
      fireEvent.drop(target);

      expect(reasons.start).toBe('pointer');
      expect(reasons.drag).toBe('pointer');
      expect(reasons.enter).toBe('pointer');
      // The terminal leave is caused by the drag ending, not by an input moving,
      // which is exactly what its reason has to say.
      expect(reasons.leave).toBe('drop');
    });
  });

  describe('force-cleanup', () => {
    it('reset() called mid-drag tears the engine down so a fresh drag can start', async () => {
      const { engine } = await renderDnd();
      const el1 = createElement();
      const el2 = createElement();
      const onMoveStart1 = vi.fn();
      const onMoveStart2 = vi.fn();
      const onMoveEnd1 = vi.fn();

      engine.registerDraggable(el1, { onMoveStart: onMoveStart1, onMoveEnd: onMoveEnd1 });
      engine.registerDraggable(el2, { onMoveStart: onMoveStart2 });

      // Start the first drag and let onMoveStart fire.
      fireEvent.dragStart(el1);
      await flushRaf();
      expect(onMoveStart1).toHaveBeenCalledTimes(1);

      // Simulate the engine's recovery path: external code (e.g. the
      // lifecycle's catch handler when a consumer throws, or the test
      // suite's afterEach) calls `reset()` while a drag is in-flight.
      act(() => {
        reset();
      });

      // The lifecycle is fully unstuck — a subsequent drag must start
      // cleanly. Without the unified teardown, `state.isActive` would have
      // stayed true and this second drag would silently no-op.
      fireEvent.dragStart(el2);
      await flushRaf();
      expect(onMoveStart2).toHaveBeenCalledTimes(1);
    });

    it('reset() invokes onForceCleanup so a sensor-side teardown can run', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const onMoveStart = vi.fn();
      engine.registerDraggable(el, { onMoveStart });

      fireEvent.dragStart(el);
      await flushRaf();
      expect(onMoveStart).toHaveBeenCalledTimes(1);

      // No throw needed — `reset()` runs the same teardown the consumer-throw
      // catch path takes. After it, the engine accepts a brand-new drag with
      // no leaked state.
      act(() => {
        reset();
      });

      // No second drag here, but verify registerMonitor doesn't see the
      // old drag any longer: register a monitor and start a new drag.
      const monitorCalls = vi.fn();
      engine.registerMonitor({ onMoveStart: monitorCalls });
      fireEvent.dragStart(el);
      await flushRaf();
      expect(monitorCalls).toHaveBeenCalledTimes(1);
    });

    it('reset() calls the session onForceCleanup so the sensor releases its state', () => {
      const element = createElement();
      const onForceCleanup = vi.fn();
      const handle = start({
        mode: 'pointer',
        payload: { element, kind: TEST_KIND.id, dragHandle: null, payload: {} },
        initialInput: {
          button: 0,
          buttons: 1,
          clientX: 0,
          clientY: 0,
          pageX: 0,
          pageY: 0,
          pointerType: 'mouse',
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
          metaKey: false,
        },
        initialTarget: null,
        synthetic: { getPreviewElement: () => null },
        onForceCleanup,
      });
      expect(handle).not.toBeNull();
      expect(isActive()).toBe(true);

      act(() => {
        reset();
      });

      // The named contract: reset() runs the sensor's force-cleanup hook (its
      // `clearActive`) so listeners, capture and the drag-root lock are released.
      expect(onForceCleanup).toHaveBeenCalledTimes(1);
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);
    });
  });

  describe('consumer-throw recovery', () => {
    // The drop/cancel/update paths run consumer dispatch inside a try/catch that
    // reruns the full teardown (`reset`) before rethrowing. Without it, a thrown
    // handler would leave `isActive` true and every later drag would silently
    // no-op (a page-wide wedge). Driven through the lifecycle controller directly
    // so the rethrow can be asserted synchronously (a throw through a real event
    // listener surfaces as an unhandled error under jsdom).
    function startThrowingDrag(): DragSessionHandle {
      const handle = startDragWithHandlers({
        onMoveEnd: () => {
          throw new Error('boom from onDrop');
        },
      });
      expect(handle).not.toBeNull();
      // The drag is now active, so nothing else can start until it ends.
      expect(canStart()).toBe(false);
      return handle!;
    }

    /** After a thrown handler, the engine must be fully unstuck and re-armable. */
    function expectEngineRecovered(): void {
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);
      // A fresh drag must actually start — proves nothing leaked to wedge it.
      const onMoveStart = vi.fn();
      const handle = startDragWithHandlers({ onMoveStart });
      expect(handle).not.toBeNull();
      expect(isActive()).toBe(true);
      act(() => {
        reset();
      });
    }

    it('delivers a best-effort onMoveEnd before tearing down, so start/end still pairs', () => {
      const target = createElement();
      const onMoveEnd = vi.fn();
      const monitorEnd = vi.fn();
      const getTargetParams = () => ({
        onDragEnter: () => {
          throw new Error('boom from onDragEnter');
        },
      });
      addDropTargetRegistration(target, getTargetParams);
      const getMonitor = () => ({ onMoveEnd: monitorEnd });
      monitorRegistry.add(getMonitor);
      engageMonitorIfDragging(getMonitor);

      const handle = startDragWithHandlers({ onMoveEnd });
      expect(handle).not.toBeNull();

      // A target handler throws mid-drag. The engine tears down either way, but
      // consumer state keyed on the start/end pair must still be closed out.
      act(() => {
        expect(() => handle!.controller.update(makeInput(), target)).toThrow(
          'boom from onDragEnter',
        );
      });

      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(onMoveEnd.mock.calls[0][0].location.current.dropTargets).toEqual([]);
      expect(onMoveEnd.mock.calls[0][1].reason).toBe('handler-error');
      expect(monitorEnd).toHaveBeenCalledTimes(1);
      expect(isActive()).toBe(false);

      removeDropTargetRegistration(target, getTargetParams);
      removeMonitor(getMonitor);
    });

    it('delivers a terminal leave to hovered targets before handler-error teardown', () => {
      const target = createElement();
      const onDragEnter = vi.fn();
      const onDragLeave = vi.fn();
      const getTargetParams = () => ({ onDragEnter, onDragLeave });
      addDropTargetRegistration(target, getTargetParams);

      const handle = startDragWithHandlers({
        onMove: () => {
          throw new Error('boom from onMove');
        },
      });
      expect(handle).not.toBeNull();

      act(() => {
        handle!.controller.update(makeInput(), target);
      });
      expect(onDragEnter).toHaveBeenCalledTimes(1);

      act(() => {
        expect(() => handle!.controller.flushDrag()).toThrow('boom from onMove');
      });

      expect(onDragLeave).toHaveBeenCalledTimes(1);
      expect(onDragLeave.mock.calls[0][1].reason).toBe('handler-error');
      expectEngineRecovered();

      removeDropTargetRegistration(target, getTargetParams);
    });

    it('does not double-dispatch onMoveEnd when onMoveEnd itself throws', () => {
      const onMoveEnd = vi.fn(() => {
        throw new Error('boom from onMoveEnd');
      });
      const handle = startDragWithHandlers({ onMoveEnd });

      act(() => {
        expect(() => handle!.controller.cancel(makeInput())).toThrow('boom from onMoveEnd');
      });

      // The recovery path must not deliver a second terminal event for the same drag.
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(isActive()).toBe(false);
    });

    it("a throwing source onDrop still lets the target's onDrop and the terminal leave run", () => {
      const target = createElement();
      const targetOnDrop = vi.fn();
      const targetOnDragLeave = vi.fn();
      const monitorDrop = vi.fn();
      const monitorEnd = vi.fn();
      const getTargetParams = () => ({ onDrop: targetOnDrop, onDragLeave: targetOnDragLeave });
      addDropTargetRegistration(target, getTargetParams);
      const getMonitor = () => ({ onDrop: monitorDrop, onMoveEnd: monitorEnd });
      monitorRegistry.add(getMonitor);
      engageMonitorIfDragging(getMonitor);

      const sourceOnDragEnd = vi.fn();
      const handle = startDragWithHandlers({
        onDrop: () => {
          throw new Error('boom from source onDrop');
        },
        onMoveEnd: sourceOnDragEnd,
      });
      expect(handle).not.toBeNull();

      // Everywhere else in the engine a broken consumer costs only its own
      // callback. The source's terminal handlers were the exception: an
      // uncontained throw here used to skip everything below it, and
      // `dispatchRecoveryEnd` can't make up for it once `endDispatched` is
      // latched. The error must still surface — just last.
      act(() => {
        expect(() => handle!.controller.drop(makeInput(), target)).toThrow(
          'boom from source onDrop',
        );
      });

      expect(sourceOnDragEnd).toHaveBeenCalledTimes(1);
      expect(targetOnDrop).toHaveBeenCalledTimes(1);
      expect(monitorDrop).toHaveBeenCalledTimes(1);
      expect(monitorEnd).toHaveBeenCalledTimes(1);
      expect(targetOnDragLeave).toHaveBeenCalledTimes(1);
      expectEngineRecovered();

      removeDropTargetRegistration(target, getTargetParams);
      removeMonitor(getMonitor);
    });

    it('a throwing source onMoveEnd on cancel still reaches the monitors', () => {
      const target = createElement();
      const targetOnDragLeave = vi.fn();
      const monitorEnd = vi.fn();
      const getTargetParams = () => ({ onDragLeave: targetOnDragLeave });
      addDropTargetRegistration(target, getTargetParams);
      const getMonitor = () => ({ onMoveEnd: monitorEnd });
      monitorRegistry.add(getMonitor);
      engageMonitorIfDragging(getMonitor);

      const handle = startDragWithHandlers({
        onMoveEnd: () => {
          throw new Error('boom from source onMoveEnd');
        },
      });

      // Enter the target so it holds hover state and is owed a terminal leave.
      act(() => {
        handle!.controller.update(makeInput(), target);
      });
      expect(targetOnDragLeave).not.toHaveBeenCalled();

      act(() => {
        expect(() => handle!.controller.cancel(makeInput())).toThrow('boom from source onMoveEnd');
      });

      expect(monitorEnd).toHaveBeenCalledTimes(1);
      expect(targetOnDragLeave).toHaveBeenCalledTimes(1);
      expectEngineRecovered();

      removeDropTargetRegistration(target, getTargetParams);
      removeMonitor(getMonitor);
    });

    it('a throwing monitor is contained and does not starve the others', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const second = vi.fn();

      engine.registerDraggable(el, {});
      engine.registerMonitor({
        onMoveStart: () => {
          throw new Error('boom from a monitor');
        },
      });
      engine.registerMonitor({ onMoveStart: second });

      // Contained per monitor, exactly like each drop target's dispatch.
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      fireEvent.dragStart(el);
      await flushRaf();

      expect(second).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
      act(() => {
        cancelDrag();
      });
    });

    it('a throwing onDrop on drop tears the session down (not wedged)', () => {
      const handle = startThrowingDrag();
      expect(() => handle.controller.drop(makeInput(), null)).toThrow('boom from onDrop');
      // The catch ran the full teardown before rethrowing, so the engine is
      // unstuck and a fresh drag may start.
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);
    });

    it('a throwing onDrop on cancel tears the session down (not wedged)', () => {
      const handle = startThrowingDrag();
      expect(() => handle.controller.cancel(makeInput())).toThrow('boom from onDrop');
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);
    });

    it('a throwing onGenerateDragPreview (synchronous in start) tears the session down', () => {
      // `onGenerateDragPreview` is dispatched synchronously inside `start()`,
      // before the session ever returns a handle. A throw there leaves the engine
      // half-built (`isActive=true`, monitors registered); the catch in `start()`
      // must tear it all down and rethrow so `start()` throws and nothing wedges.
      expect(() =>
        startDragWithHandlers({
          onGenerateDragPreview: () => {
            throw new Error('boom from onGenerateDragPreview');
          },
        }),
      ).toThrow('boom from onGenerateDragPreview');
      expectEngineRecovered();
    });

    it('a throwing onMoveStart (synchronous in start) tears the session down', () => {
      // `onMoveStart` is dispatched synchronously at the end of `start()`. A throw
      // there runs `reset()` in the catch and rethrows, so `start()` throws and
      // nothing wedges.
      expect(() =>
        startDragWithHandlers({
          onMoveStart: () => {
            throw new Error('boom from onMoveStart');
          },
        }),
      ).toThrow('boom from onMoveStart');
      expectEngineRecovered();
    });

    it('a throwing onMove (rAF-throttled, flushed via flushDrag) tears the session down', () => {
      const handle = startDragWithHandlers({
        onMove: () => {
          throw new Error('boom from onMove');
        },
      });
      expect(handle).not.toBeNull();
      // `update` schedules the throttled onMove; `flushDrag` dispatches it now.
      handle!.controller.update(makeInput(), null);
      expect(() => handle!.controller.flushDrag()).toThrow('boom from onMove');
      expectEngineRecovered();
    });

    it('a throwing onTargetChange tears the session down', () => {
      // A stack change is required to reach `onTargetChange`. Register a real
      // drop target and update onto it so the source handler fires and throws.
      const targetEl = createElement();
      const getParameters = () => ({});
      addDropTargetRegistration(targetEl, getParameters);

      const handle = startDragWithHandlers({
        onTargetChange: () => {
          throw new Error('boom from onTargetChange');
        },
      });
      expect(handle).not.toBeNull();
      expect(() => handle!.controller.update(makeInput(), targetEl)).toThrow(
        'boom from onTargetChange',
      );

      removeDropTargetRegistration(targetEl, getParameters);
      expectEngineRecovered();
    });
  });

  describe('programmatic cancel during start dispatches', () => {
    it('cancelDrag() from a source onMoveStart ends the drag as canceled', async () => {
      // The sensors record their session only after `start()` returns, so a
      // cancel from the synchronous start dispatches can only reach the session
      // through the lifecycle-level fallback.
      const { engine } = await renderDnd();
      const el = createElement();
      const onMoveStart = vi.fn(() => cancelDrag());
      const onMoveEnd = vi.fn();
      const monitorOnDragStart = vi.fn();
      const monitorOnDragEnd = vi.fn();
      engine.registerDraggable(el, { onMoveStart, onMoveEnd });
      engine.registerMonitor({ onMoveStart: monitorOnDragStart, onMoveEnd: monitorOnDragEnd });

      fireEvent.dragStart(el);

      expect(onMoveStart).toHaveBeenCalledTimes(1);
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(monitorOnDragEnd).toHaveBeenCalledTimes(1);
      // The drag ended before the start fan-out reached the monitors; a start
      // after the end would invert the lifecycle order.
      expect(monitorOnDragStart).not.toHaveBeenCalled();
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);

      // The sensor released its resources through the refused-session path, so
      // a fresh drag starts cleanly.
      const el2 = createElement();
      const onMoveStart2 = vi.fn();
      engine.registerDraggable(el2, { onMoveStart: onMoveStart2 });
      fireEvent.dragStart(el2);
      await flushRaf();
      expect(onMoveStart2).toHaveBeenCalledTimes(1);
    });

    it('cancelDrag() from the internal onGenerateDragPreview cancels before onMoveStart', async () => {
      // The engine's own preview hook (the sensors' preview publisher, which
      // runs the consumer's preview `render`) is dispatched synchronously inside
      // `start()`, before the sensor records its session, so its cancel reaches
      // the session only through the lifecycle-level fallback. The start fan-out
      // must then be skipped and `start()` must hand back `null`.
      const { engine } = await renderDnd();
      const onMoveStart = vi.fn();
      const onMoveEnd = vi.fn();
      const monitorOnDragStart = vi.fn();
      engine.registerMonitor({ onMoveStart: monitorOnDragStart });

      const handle = startDragWithHandlers({
        onGenerateDragPreview: () => cancelDrag(),
        onMoveStart,
        onMoveEnd,
      });

      expect(handle).toBeNull();
      expect(onMoveStart).not.toHaveBeenCalled();
      expect(monitorOnDragStart).not.toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(isActive()).toBe(false);
      expect(canStart()).toBe(true);
    });

    it('cancelDrag() from a monitor onMoveStart stops the fan-out to later monitors', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const firstMonitorStart = vi.fn(() => cancelDrag());
      const secondMonitorStart = vi.fn();
      const onMoveEnd = vi.fn();
      engine.registerDraggable(el, {});
      engine.registerMonitor({ onMoveStart: firstMonitorStart, onMoveEnd });
      engine.registerMonitor({ onMoveStart: secondMonitorStart });

      fireEvent.dragStart(el);

      expect(firstMonitorStart).toHaveBeenCalledTimes(1);
      // The cancel cleared the active-monitor list mid-fan-out.
      expect(secondMonitorStart).not.toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(canStart()).toBe(true);
    });
  });

  describe('re-entrant cancel mid-dispatch', () => {
    it('does not republish a session canceled from canDrop resolution', async () => {
      const { engine } = await renderDnd();
      const source = createElement();
      const target = createElement();
      const onMoveEnd = vi.fn();
      const onTargetChange = vi.fn();
      engine.registerDraggable(source, { onMoveEnd, onTargetChange });
      engine.registerDropTarget(target, {
        canDrop: () => {
          cancelDrag();
          return 'reject';
        },
      });

      fireEvent.dragStart(source);
      await flushRaf();
      fireEvent.dragEnter(target);
      await flushRaf();

      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onTargetChange).not.toHaveBeenCalled();
      expect(dragSessionStore.getSnapshot()).toBeNull();
      expect(canStart()).toBe(true);
    });

    it('stops final resolution when canDrop cancels during release', async () => {
      const { engine } = await renderDnd();
      const source = createElement();
      const target = createElement();
      const onMoveEnd = vi.fn();
      const onTargetChange = vi.fn();
      let cancelOnResolve = false;
      engine.registerDraggable(source, { onMoveEnd, onTargetChange });
      engine.registerDropTarget(target, {
        canDrop: () => {
          if (cancelOnResolve) {
            cancelDrag();
            return 'reject';
          }
          return true;
        },
      });

      fireEvent.dragStart(source);
      await flushRaf();
      fireEvent.dragEnter(target);
      await flushRaf();
      onTargetChange.mockClear();
      cancelOnResolve = true;

      fireEvent.drop(target);

      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      // The cancel's terminal leave is the only change round; final resolution
      // must not dispatch a second one after teardown.
      expect(onTargetChange).toHaveBeenCalledTimes(1);
      expect(dragSessionStore.getSnapshot()).toBeNull();
    });

    it('cancelDrag() from onDragLeave delivers nothing to the entering target', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const targetA = createElement();
      const targetC = createElement();
      const onDragEnterC = vi.fn();
      const onTargetChangeC = vi.fn();
      const onDragC = vi.fn();
      const onMoveEnd = vi.fn();
      engine.registerDraggable(el, {});
      engine.registerDropTarget(targetA, { onDragLeave: () => cancelDrag() });
      engine.registerDropTarget(targetC, {
        onDragEnter: onDragEnterC,
        onTargetChange: onTargetChangeC,
        onMove: onDragC,
      });
      engine.registerMonitor({ onMoveEnd });

      fireEvent.dragStart(el);
      await flushRaf();
      fireEvent.dragEnter(targetA);
      await flushRaf();
      // Moving A → C runs A's leave mid-change-dispatch; the cancel it issues
      // must stop the fan-out so C never learns about a drag that just ended
      // (a post-teardown enter would stick its hover state forever).
      fireEvent.dragEnter(targetC);
      await flushRaf();

      expect(onDragEnterC).not.toHaveBeenCalled();
      expect(onTargetChangeC).not.toHaveBeenCalled();
      expect(onDragC).not.toHaveBeenCalled();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(canStart()).toBe(true);

      const el2 = createElement();
      const onMoveStart2 = vi.fn();
      engine.registerDraggable(el2, { onMoveStart: onMoveStart2 });
      fireEvent.dragStart(el2);
      await flushRaf();
      expect(onMoveStart2).toHaveBeenCalledTimes(1);
    });

    it('cancelDrag() from the innermost onMove stops the fan-out to ancestor targets', async () => {
      const { engine } = await renderDnd();
      const el = createElement();
      const parent = createElement();
      const child = createElement();
      parent.appendChild(child);
      const childOnDrag = vi.fn(() => cancelDrag());
      const parentOnDrag = vi.fn();
      const parentOnDragLeave = vi.fn();
      const onMoveEnd = vi.fn();
      engine.registerDraggable(el, {});
      engine.registerDropTarget(parent, { onMove: parentOnDrag, onDragLeave: parentOnDragLeave });
      engine.registerDropTarget(child, { onMove: childOnDrag });
      engine.registerMonitor({ onMoveEnd });

      fireEvent.dragStart(el);
      await flushRaf();
      // Entering the child dispatches the synchronous entering-frame onMove to
      // the stack innermost-first; the child's cancel must stop it there.
      fireEvent.dragEnter(child);
      await flushRaf();

      expect(childOnDrag).toHaveBeenCalledTimes(1);
      expect(parentOnDrag).not.toHaveBeenCalled();
      // The cancel's terminal dispatch still cleared the ancestor's hover state.
      expect(parentOnDragLeave).toHaveBeenCalledTimes(1);
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0][0].canceled).toBe(true);
      expect(canStart()).toBe(true);
    });
  });
});
