import { describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { createDndRenderer, testDragKind } from '#test-utils';
import { createElement, flushRaf, lift, setupDragEngineTests } from '../../test/dnd';
import { resetForTests as resetSyntheticDrag } from '../utils/drag-and-drop/synthetic/syntheticSensor';

setupDragEngineTests({ extraAfterEach: resetSyntheticDrag });

describe('engine.registerAutoScroller', () => {
  const { renderDnd } = createDndRenderer();
  type TestScroller = HTMLElement & { scrollByMock: ReturnType<typeof vi.fn> };

  function makeScroller(): TestScroller {
    const element = createElement({ top: 0, height: 200, left: 0, width: 200 });
    element.style.overflow = 'auto';
    const scrollByMock = vi.fn();
    element.scrollBy = scrollByMock as unknown as typeof element.scrollBy;
    Object.defineProperties(element, {
      scrollTop: { configurable: true, value: 400, writable: true },
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 200 },
      scrollWidth: { configurable: true, value: 1000 },
      clientWidth: { configurable: true, value: 200 },
    });
    return Object.assign(element, { scrollByMock });
  }
  async function dragIntoEdge(source: HTMLElement, scroller: HTMLElement): Promise<void> {
    await lift(source, { clientX: 100, clientY: 10 });
    fireEvent.dragOver(scroller, { clientX: 100, clientY: 190 });
    await flushRaf();
    await flushRaf();
  }

  it('returns a cleanup function', async () => {
    const { engine } = await renderDnd();
    const cleanup = engine.registerAutoScroller(makeScroller(), {});
    expect(cleanup).toEqual(expect.any(Function));
    cleanup();
  });

  it('scrolls an explicitly registered viewport', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const scroller = makeScroller();
    engine.registerDraggable(source, {});
    engine.registerAutoScroller(scroller, {});
    await dragIntoEdge(source, scroller);
    expect(scroller.scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ behavior: 'instant' }),
    );
  });

  it('does not scroll an unregistered overflow ancestor', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const scroller = makeScroller();
    scroller.append(source);
    engine.registerDraggable(source, {});
    await dragIntoEdge(source, scroller);
    expect(scroller.scrollBy).not.toHaveBeenCalled();
  });

  it('allows onDragScroll to prevent native scrolling', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const scroller = makeScroller();
    const onDragScroll = vi.fn((event: Event) => event.preventDefault());
    engine.registerDraggable(source, {});
    engine.registerAutoScroller(scroller, { onDragScroll });
    await dragIntoEdge(source, scroller);
    expect(onDragScroll).toHaveBeenCalled();
    expect(scroller.scrollBy).not.toHaveBeenCalled();
  });

  it('can cancel one axis without cancelling the other', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const scroller = makeScroller();
    engine.registerDraggable(source, {});
    engine.registerAutoScroller(scroller, {
      onDragScroll(event, details) {
        if (details.direction === 'vertical') event.preventDefault();
      },
    });
    await lift(source, { clientX: 10, clientY: 10 });
    fireEvent.dragOver(scroller, { clientX: 190, clientY: 190 });
    await flushRaf();
    await flushRaf();
    expect(scroller.scrollBy).toHaveBeenCalled();
    expect(scroller.scrollByMock.mock.calls.some(([value]) => value.top === 0)).toBe(true);
  });

  it('stops propagation when a nested viewport consumes movement', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const outer = makeScroller();
    const inner = makeScroller();
    outer.append(inner);
    inner.append(source);
    engine.registerDraggable(source, {});
    engine.registerAutoScroller(outer, {});
    engine.registerAutoScroller(inner, {
      onDragScroll(event) {
        event.preventDefault();
        event.stopPropagation();
      },
    });
    await dragIntoEdge(source, inner);
    expect(inner.scrollBy).not.toHaveBeenCalled();
    expect(outer.scrollBy).not.toHaveBeenCalled();
  });

  it('filters by accept', async () => {
    const { engine } = await renderDnd();
    const source = createElement();
    const scroller = makeScroller();
    const onDragScroll = vi.fn();
    engine.registerDraggable(source, {});
    engine.registerAutoScroller(scroller, { accept: testDragKind, onDragScroll });
    await dragIntoEdge(source, scroller);
    expect(onDragScroll).toHaveBeenCalled();
  });
});
