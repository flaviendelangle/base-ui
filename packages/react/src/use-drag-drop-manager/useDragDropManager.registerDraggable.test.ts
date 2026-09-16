import { describe, it, expect, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { createDndRenderer } from '#test-utils';
import { createElement, flushRaf, setupDragEngineTests } from '../../test/dnd';
import { dragSessionStore } from '../utils/drag-and-drop/dragSessionStore';
import type { MoveStartContext, BeforeMoveStartEventDetails } from '../types/drag';

setupDragEngineTests();

describe('engine.registerDraggable', () => {
  const { renderDnd } = createDndRenderer();

  it('applies gesture styles to the element', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const cleanup = engine.registerDraggable(el, {});
    expect(el.style.touchAction).toBe('manipulation');
    expect(el.style.userSelect).toBe('none');
    cleanup();
  });

  it('restores styles on cleanup', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const cleanup = engine.registerDraggable(el, {});
    cleanup();
    expect(el.style.touchAction).toBe('');
    expect(el.style.userSelect).toBe('');
  });

  it('preserves ordinary interaction styles while disabled', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const style = el.style as CSSStyleDeclaration & Record<string, string>;
    style.touchAction = 'auto';
    style.userSelect = 'text';
    style.webkitUserSelect = 'text';
    style.webkitTouchCallout = 'default';

    const cleanup = engine.registerDraggable(el, { disabled: true });

    expect(style.touchAction).toBe('auto');
    expect(style.userSelect).toBe('text');
    expect(style.webkitUserSelect).toBe('text');
    expect(style.webkitTouchCallout).toBe('default');
    cleanup();
  });

  it('does not restore over consumer changes made while a disabled registration is held', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const style = el.style as CSSStyleDeclaration & Record<string, string>;
    style.touchAction = 'auto';
    el.setAttribute('aria-roledescription', 'original role');

    const cleanup = engine.registerDraggable(el, {
      disabled: true,
      ariaRoleDescription: 'unused role',
    });

    style.touchAction = 'pan-y';
    el.setAttribute('aria-roledescription', 'consumer role');
    cleanup();

    expect(style.touchAction).toBe('pan-y');
    expect(el.getAttribute('aria-roledescription')).toBe('consumer role');
  });

  it('restores gesture styles when only disabled registrants remain', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const cleanupDisabled = engine.registerDraggable(el, { disabled: true });
    const cleanupEnabled = engine.registerDraggable(el, {});

    expect(el.style.touchAction).toBe('manipulation');
    expect(el.style.userSelect).toBe('none');

    cleanupEnabled();

    expect(el.style.touchAction).toBe('');
    expect(el.style.userSelect).toBe('');
    cleanupDisabled();
  });

  it('deregisters on cleanup: a later gesture starts no drag', async () => {
    // Cleanup must unregister, not just restore styles — a style-only teardown
    // would leave the element silently draggable.
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    const cleanup = engine.registerDraggable(el, { onMoveStart });
    cleanup();

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStart).not.toHaveBeenCalled();
    expect(dragSessionStore.getSnapshot()).toBeNull();
  });

  it('cleanup is safe to call twice', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const cleanup = engine.registerDraggable(el, {});
    cleanup();
    cleanup();
    expect(el.style.touchAction).toBe('');
  });

  it('onBeforeMoveStart canceling prevents the drag', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    const onBeforeMoveStart = vi.fn(
      (_: MoveStartContext, eventDetails: BeforeMoveStartEventDetails) => eventDetails.cancel(),
    );
    engine.registerDraggable(el, {
      onBeforeMoveStart,
      onMoveStart,
    });

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onBeforeMoveStart).toHaveBeenCalledTimes(1);
    expect(onMoveStart).not.toHaveBeenCalled();
  });

  it('disabled prevents the drag', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, {
      disabled: true,
      onMoveStart,
    });

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStart).not.toHaveBeenCalled();
  });

  it('a nested draggable wins pickup over its draggable ancestor', async () => {
    const { engine } = await renderDnd();
    // Register an outer draggable and an inner draggable nested inside it.
    const outer = createElement();
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const onOuterStart = vi.fn();
    const onInnerStart = vi.fn();
    engine.registerDraggable(outer, { onMoveStart: onOuterStart });
    engine.registerDraggable(inner, { onMoveStart: onInnerStart });

    // The gesture begins on the inner element: pickup resolves the innermost
    // registered ancestor, so the inner draggable claims the drag.
    fireEvent.dragStart(inner);
    await flushRaf();

    expect(onInnerStart).toHaveBeenCalledTimes(1);
    expect(onInnerStart.mock.calls[0][0].source.element).toBe(inner);
    expect(onOuterStart).not.toHaveBeenCalled();
  });

  it('a disabled nested draggable falls through to its draggable ancestor', async () => {
    const { engine } = await renderDnd();
    // A disabled card inside a draggable list item: pressing on the card must
    // start the outer drag, not make the region drag-inert.
    const outer = createElement();
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const onOuterStart = vi.fn();
    const onInnerStart = vi.fn();
    engine.registerDraggable(outer, { onMoveStart: onOuterStart });
    engine.registerDraggable(inner, { disabled: true, onMoveStart: onInnerStart });

    fireEvent.dragStart(inner);
    await flushRaf();

    expect(onInnerStart).not.toHaveBeenCalled();
    expect(onOuterStart).toHaveBeenCalledTimes(1);
    expect(onOuterStart.mock.calls[0][0].source.element).toBe(outer);
  });

  it('restores the surviving registrant’s aria-roledescription when a later one unregisters', async () => {
    const { engine } = await renderDnd();
    // Two registrations sharing one gesture element with different role
    // descriptions: the most recent wins while both are held, and unregistering
    // it must revert to the survivor's — not strand the unregistered value.
    const el = createElement();
    engine.registerDraggable(el, { ariaRoleDescription: 'sortable card' });
    const cleanupSecond = engine.registerDraggable(el, { ariaRoleDescription: 'kanban card' });

    expect(el.getAttribute('aria-roledescription')).toBe('kanban card');

    cleanupSecond();

    expect(el.getAttribute('aria-roledescription')).toBe('sortable card');
  });

  it('re-applies the static a11y setup at the next interaction after the parameters change', async () => {
    // The getter contract re-reads behavior on every event, but the static DOM
    // setup is applied from the registration-time read. An imperative consumer
    // whose parameters change afterwards must not keep stale attributes past
    // the next interaction (the React layer re-registers instead).
    const { engine } = await renderDnd();
    const el = createElement();
    el.tabIndex = 0;
    let role = 'sortable card';
    let disabled = false;
    engine.registerDraggable(el, () => ({ ariaRoleDescription: role, disabled }));

    expect(el.getAttribute('aria-roledescription')).toBe('sortable card');
    expect(el.getAttribute('aria-describedby')).toBeTruthy();

    // A later change is not re-applied eagerly (nothing re-reads the getter)...
    role = 'kanban card';
    expect(el.getAttribute('aria-roledescription')).toBe('sortable card');

    // ...but the next pointer interaction re-reads the parameters and refreshes it.
    fireEvent.pointerDown(el);
    expect(el.getAttribute('aria-roledescription')).toBe('kanban card');

    // Disabling drops the keyboard-drag hints once keyboard focus lands.
    disabled = true;
    el.focus();
    expect(el.hasAttribute('aria-roledescription')).toBe(false);
    expect(el.hasAttribute('aria-describedby')).toBe(false);

    // Re-enabling restores them at the next interaction.
    disabled = false;
    el.blur();
    el.focus();
    expect(el.getAttribute('aria-roledescription')).toBe('kanban card');
    expect(el.getAttribute('aria-describedby')).toBeTruthy();
  });

  it('re-applies the keyboard-instructions idref a consumer rewrite dropped', async () => {
    // `aria-describedby` is shared DOM: a consumer that controls it (React
    // re-rendering the prop) overwrites the engine's token wholesale. The refresh
    // early-returns when none of the setup's *inputs* changed — which is exactly
    // this case — so without an idempotent re-apply the idref is gone for good and
    // a screen-reader user silently loses the gesture hint.
    const { engine } = await renderDnd();
    const el = createElement();
    el.tabIndex = 0;
    engine.registerDraggable(el, {});

    const instructionsId = el.getAttribute('aria-describedby');
    expect(instructionsId).toBeTruthy();

    // A consumer-controlled rewrite, with nothing about the registration changed.
    el.setAttribute('aria-describedby', 'consumer-hint');

    fireEvent.pointerDown(el);

    // Both tokens survive: the engine re-adds its own without dropping the
    // consumer's.
    const describedBy = el.getAttribute('aria-describedby')!.split(/\s+/);
    expect(describedBy).toContain('consumer-hint');
    expect(describedBy).toContain(instructionsId);
  });

  it('keeps refreshing the surviving registrant after a merged-ref hold is released', async () => {
    // The refresh callbacks are held per registration, like every other
    // per-element registry in the engine. A single slot per element let the
    // second registration overwrite the first's callback, and the second
    // cleanup then deleted the survivor's — freezing its attributes silently.
    const { engine } = await renderDnd();
    const el = createElement();
    let role = 'sortable card';
    engine.registerDraggable(el, () => ({ ariaRoleDescription: role }));
    const cleanupSecond = engine.registerDraggable(el, { ariaRoleDescription: 'kanban card' });

    cleanupSecond();
    expect(el.getAttribute('aria-roledescription')).toBe('sortable card');

    role = 'renamed card';
    fireEvent.pointerDown(el);

    expect(el.getAttribute('aria-roledescription')).toBe('renamed card');
  });

  it('refreshes from an interaction on a descendant, and refreshes nested draggables together', async () => {
    // The per-document listener walks up from the event target, so a press on a
    // handle or label inside the draggable still refreshes it — and every
    // registered ancestor on the way, since draggables nest.
    const { engine } = await renderDnd();
    const outer = createElement();
    const inner = document.createElement('div');
    const label = document.createElement('span');
    inner.appendChild(label);
    outer.appendChild(inner);

    let outerRole = 'outer card';
    let innerRole = 'inner card';
    engine.registerDraggable(outer, () => ({ ariaRoleDescription: outerRole }));
    engine.registerDraggable(inner, () => ({ ariaRoleDescription: innerRole }));

    outerRole = 'outer renamed';
    innerRole = 'inner renamed';
    // The press lands on a plain descendant of the *inner* draggable.
    fireEvent.pointerDown(label);

    expect(inner.getAttribute('aria-roledescription')).toBe('inner renamed');
    expect(outer.getAttribute('aria-roledescription')).toBe('outer renamed');
  });

  it('attaches a value payload without calling anything', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, { payload: { key: 'value' }, onMoveStart });

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStart.mock.calls[0][0].source.payload).toEqual({ key: 'value' });
  });

  it('includes the pickup grab offset in drag locations', async () => {
    const { engine } = await renderDnd();
    const el = createElement({ left: 10, top: 20 });
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, { onMoveStart });

    fireEvent.dragStart(el, { clientX: 35, clientY: 50 });
    await flushRaf();

    expect(onMoveStart.mock.calls[0][0].location.grabOffset).toEqual({ x: 25, y: 30 });
  });

  // A falsy static value survives instead of being replaced by a stand-in.
  it.each([
    ['a number', 0],
    ['an empty string', ''],
    ['false', false],
    ['null', null],
  ])('attaches %s payload as-is', async (_label, value) => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, { payload: value, onMoveStart });

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStart.mock.calls[0][0].source.payload).toBe(value);
  });

  it('leaves the payload undefined when none is declared', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, { onMoveStart });

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStart.mock.calls[0][0].source.payload).toBe(undefined);
  });

  it('fires onMoveStart synchronously at drag start', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStart = vi.fn();
    engine.registerDraggable(el, { onMoveStart });

    // Fires within the dragStart dispatch, no frame wait.
    fireEvent.dragStart(el);
    expect(onMoveStart).toHaveBeenCalledTimes(1);
  });

  it('fires onMoveEnd when drop occurs', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const target = createElement();
    const onMoveEnd = vi.fn();
    engine.registerDraggable(el, { onMoveEnd });
    engine.registerDropTarget(target, {});

    fireEvent.dragStart(el);
    await flushRaf();
    fireEvent.dragEnter(target);
    fireEvent.dragOver(target);
    await flushRaf();
    fireEvent.drop(target);

    expect(onMoveEnd).toHaveBeenCalledTimes(1);
  });

  it('forwards onMove during a drag', async () => {
    const { engine } = await renderDnd();
    const el = createElement();
    const target = createElement();
    const onMove = vi.fn();
    engine.registerDraggable(el, { onMove });
    engine.registerDropTarget(target, {});

    fireEvent.dragStart(el);
    await flushRaf();

    fireEvent.dragOver(target);
    await flushRaf();

    expect(onMove).toHaveBeenCalled();
    expect(onMove).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: expect.objectContaining({ element: el }),
      }),
      expect.objectContaining({ reason: 'pointer' }),
    );
  });

  it('releasing a non-last merged-ref hold keeps the surviving hook active', async () => {
    // Two `useDraggable` hooks whose refs land on one node (merged-ref
    // composition), registered A then B. B unmounts (e.g. a conditional wrapper)
    // while A stays. The next drag must read A's parameters, not B's stale ones.
    const { engine } = await renderDnd();
    const el = createElement();
    const onMoveStartA = vi.fn();
    const onMoveStartB = vi.fn();
    engine.registerDraggable(el, { onMoveStart: onMoveStartA });
    const cleanupB = engine.registerDraggable(el, { onMoveStart: onMoveStartB });

    cleanupB();

    fireEvent.dragStart(el);
    await flushRaf();

    expect(onMoveStartA).toHaveBeenCalledTimes(1);
    expect(onMoveStartB).not.toHaveBeenCalled();
  });

  it('prevents concurrent drags (only one at a time)', async () => {
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

  // Type-level regression guard. Never executes.
  it.skip('type test: TData threads through payload and every source event', async () => {
    interface MyData extends Record<string, unknown> {
      foo: string;
      count: number;
    }
    const { engine } = await renderDnd();
    const el = createElement();

    engine.registerDraggable<MyData>(el, {
      payload: () => ({ foo: 'bar', count: 1 }),
      onMoveStart: ({ source }) => {
        source.payload.foo.toUpperCase();
        source.payload.count.toFixed();
      },
      onMoveEnd: ({ source }) => {
        source.payload.foo.toUpperCase();
      },
    });

    engine.registerDraggable<MyData>(el, {
      // @ts-expect-error - returned object is missing required `count`
      payload: () => ({ foo: 'bar' }),
    });
  });
});
