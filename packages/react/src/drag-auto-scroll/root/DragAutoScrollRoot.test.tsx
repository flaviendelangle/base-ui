import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { act } from '@mui/internal-test-utils';
import { createDndRenderer, describeConformance, testDragKind } from '#test-utils';
import { DragAutoScroll } from '@base-ui/react/drag-auto-scroll';
import { createElement, flushRaf, lift, setupDragEngineTests } from '../../../test/dnd';
import { createKind } from '../../utils/drag-and-drop/dragKind';

type RootProps = DragAutoScroll.Root.Props;
type MaxSpeedFn = Extract<RootProps['maxSpeed'], (...args: never) => unknown>;
type DragScrollFn = NonNullable<RootProps['onDragScroll']>;

setupDragEngineTests();

// jsdom implements none of the scroll metrics the loop reads, so every scroller
// is stubbed into a 200x100 viewport over 1000x1000 of content, scrolled
// mid-range on both axes so every direction has room to scroll.
function stubScrollMetrics(node: HTMLElement, scrollByMock?: () => void): void {
  node.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
  Object.defineProperty(node, 'scrollHeight', { configurable: true, value: 1000 });
  Object.defineProperty(node, 'clientHeight', { configurable: true, value: 100 });
  Object.defineProperty(node, 'scrollWidth', { configurable: true, value: 1000 });
  Object.defineProperty(node, 'clientWidth', { configurable: true, value: 200 });
  Object.defineProperty(node, 'scrollTop', { configurable: true, value: 400, writable: true });
  Object.defineProperty(node, 'scrollLeft', { configurable: true, value: 400, writable: true });
  // jsdom doesn't implement scrollBy; always install a stub so the scroll loop
  // doesn't explode when we're not asserting on scrolls.
  node.scrollBy = scrollByMock ?? (() => {});
  node.style.overflow = 'auto';
}

function Scroller(props: RootProps & { scrollByMock?: () => void }) {
  const { scrollByMock, ...rootProps } = props;
  const ref = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        stubScrollMetrics(node, scrollByMock);
      }
    },
    [scrollByMock],
  );
  return <DragAutoScroll.Root ref={ref} data-testid="scroller" {...rootProps} />;
}

describe('DragAutoScroll.Root', () => {
  const { renderDnd } = createDndRenderer();

  // Start the drag OUTSIDE the scroller's 200x100 box, so the loop only sees
  // the scroller once a `dragOver` delivers coordinates inside it — the loop
  // consults a scroller's callbacks whenever the pointer is inside its rect.
  async function liftOutside(source: HTMLElement): Promise<void> {
    await lift(source, { clientX: 300, clientY: 300 });
  }

  // Deliver pointer coordinates and let them travel the pipeline: the sensor's
  // frame, the lifecycle's rAF-coalesced `onMove`, and the woken loop frame.
  // The event must be dispatched on an element — the test bridge listens on
  // `document` with capture, so an event fired at `window` never reaches it.
  async function dragTo(target: HTMLElement, clientX: number, clientY: number): Promise<void> {
    fireEvent.dragOver(target, { clientX, clientY });
    await flushRaf();
    await flushRaf();
    await flushRaf();
  }

  describeConformance(<DragAutoScroll.Root />, () => ({
    refInstanceof: window.HTMLDivElement,
    render(node) {
      return renderDnd(node);
    },
  }));

  it('attaches and detaches cleanly without an active drag', async () => {
    const { unmount } = await renderDnd(<Scroller />);
    expect(screen.getByTestId('scroller')).toBeInTheDocument();
    expect(() => unmount()).not.toThrow();
  });

  it('defaults to an auto-scrolling overflow region while allowing styles to override it', async () => {
    await renderDnd(<DragAutoScroll.Root data-testid="default" />);
    expect(screen.getByTestId('default')).toHaveStyle({ overflow: 'auto' });

    await renderDnd(<DragAutoScroll.Root data-testid="custom" style={{ overflow: 'hidden' }} />);
    expect(screen.getByTestId('custom')).toHaveStyle({ overflow: 'hidden' });
  });

  it('does not wake a parked loop after an unchanged re-render', async () => {
    const scrollBy = vi.fn();
    const { engine, rerender } = await renderDnd(<Scroller scrollByMock={scrollBy} />);
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');

    await liftOutside(source);
    // The center is outside every edge zone, so this input parks the loop.
    await dragTo(scroller, 100, 50);
    const measure = vi.spyOn(scroller, 'getBoundingClientRect');

    await rerender(<Scroller scrollByMock={scrollBy} />);
    await flushRaf();

    expect(measure).not.toHaveBeenCalled();
    fireEvent.drop(source);
  });

  it('scrolls the container while the pointer parks in an edge zone', async () => {
    // Positive control for every `not.toHaveBeenCalled()` in this suite: the
    // shared fixture at these coordinates genuinely reaches `scrollBy`, so a
    // non-call elsewhere is the gate under test, not a dead loop.
    const scrollBy = vi.fn();
    const { engine } = await renderDnd(<Scroller scrollByMock={scrollBy} />);
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');

    await liftOutside(source);

    // Bottom edge zone (y > 75 of the 100px box).
    await dragTo(scroller, 100, 95);
    expect(scrollBy).toHaveBeenCalled();

    // Top edge zone: scrolling up needs the mid-range `scrollTop` stub — at the
    // jsdom default of 0 there is nothing to scroll back toward.
    scrollBy.mockClear();
    await dragTo(scroller, 100, 5);
    expect(scrollBy).toHaveBeenCalled();

    // Left edge zone: same for `scrollLeft`.
    scrollBy.mockClear();
    await dragTo(scroller, 10, 50);
    expect(scrollBy).toHaveBeenCalled();
  });

  it('allows onDragScroll to prevent the native scroll', async () => {
    const scrollBy = vi.fn();
    const onDragScroll: DragScrollFn = (event) => {
      event.preventDefault();
    };
    const { engine } = await renderDnd(
      <Scroller scrollByMock={scrollBy} onDragScroll={onDragScroll} />,
    );
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');

    await liftOutside(source);
    await dragTo(scroller, 100, 95);

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('can prevent one scroll direction without blocking the other', async () => {
    const scrollBy = vi.fn();
    const onDragScroll: DragScrollFn = (event, { direction }) => {
      if (direction === 'vertical') {
        event.preventDefault();
      }
    };
    const { engine } = await renderDnd(
      <Scroller scrollByMock={scrollBy} onDragScroll={onDragScroll} />,
    );
    const source = createElement();
    engine.registerDraggable(source, {});

    await liftOutside(source);
    await dragTo(screen.getByTestId('scroller'), 190, 95);

    expect(scrollBy.mock.calls.some(([delta]) => delta.top > 0)).toBe(false);
    expect(scrollBy.mock.calls.some(([delta]) => delta.left > 0)).toBe(true);
  });

  it('can start another scroll loop after a dead window rejects frame cancellation', async () => {
    const scrollBy = vi.fn();
    const { engine } = await renderDnd(<Scroller scrollByMock={scrollBy} />);
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');

    await liftOutside(source);
    await dragTo(scroller, 100, 95);
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    window.cancelAnimationFrame = () => {
      throw new DOMException('The browsing context is gone', 'InvalidStateError');
    };
    try {
      expect(() => fireEvent.drop(source)).not.toThrow();
    } finally {
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }

    scrollBy.mockClear();
    await liftOutside(source);
    await dragTo(scroller, 100, 95);
    expect(scrollBy).toHaveBeenCalled();
  });

  describe('disabled', () => {
    it('does not infer unregistered scroll containers', async () => {
      const outerScrollBy = vi.fn();
      const innerScrollBy = vi.fn();

      // A scrollable box inside another one. Only an explicit Viewport
      // registration can participate in auto-scroll.
      function Nested(props: { disabled?: boolean }) {
        const outerRef = React.useCallback((node: HTMLDivElement | null) => {
          if (node) {
            stubScrollMetrics(node, outerScrollBy);
          }
        }, []);
        return (
          <div ref={outerRef} data-testid="outer">
            <Scroller disabled={props.disabled} scrollByMock={innerScrollBy} />
          </div>
        );
      }

      const { engine, rerender } = await renderDnd(<Nested disabled />);
      const scroller = screen.getByTestId('scroller');
      const source = createElement();
      scroller.appendChild(source);
      engine.registerDraggable(source, {});

      await liftOutside(source);
      await dragTo(scroller, 100, 95);

      // Only explicitly registered containers participate, so disabling the inner one leaves both
      // containers inactive.
      expect(innerScrollBy).not.toHaveBeenCalled();
      expect(outerScrollBy).not.toHaveBeenCalled();

      // Enabling the explicitly registered inner viewport makes it active.
      await rerender(<Nested />);
      innerScrollBy.mockClear();
      outerScrollBy.mockClear();
      await dragTo(scroller, 100, 95);
      expect(innerScrollBy).toHaveBeenCalled();
      expect(outerScrollBy).not.toHaveBeenCalled();
    });
  });

  it('re-reads overflow when the same scroller becomes scrollable after a render', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const scrollBy = vi.fn();

    function RestyledScroller({ open }: { open: boolean }) {
      const ref = React.useCallback((node: HTMLDivElement | null) => {
        if (node) {
          stubScrollMetrics(node, scrollBy);
          node.style.overflow = 'hidden';
        }
      }, []);
      return (
        <DragAutoScroll.Root
          ref={ref}
          data-testid="scroller"
          style={{ overflow: open ? 'auto' : 'hidden' }}
        />
      );
    }

    const { engine, rerender } = await renderDnd(<RestyledScroller open={false} />);
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');

    await liftOutside(source);
    await dragTo(scroller, 100, 95);
    expect(scrollBy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('registered on an element that does not scroll'),
    );

    // No new pointer input: the post-commit refresh must invalidate the cached
    // `overflow: hidden` result and wake the parked loop at the same coordinates.
    await rerender(<RestyledScroller open />);
    await flushRaf();
    await flushRaf();

    expect(screen.getByTestId('scroller')).toBe(scroller);
    expect(scrollBy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('wakes a parked loop when content growth creates scroll room', async () => {
    const scrollBy = vi.fn();
    const { engine } = await renderDnd(<Scroller scrollByMock={scrollBy} />);
    const source = createElement();
    engine.registerDraggable(source, {});
    const scroller = screen.getByTestId('scroller');
    let scrollHeight = 100;
    Object.defineProperty(scroller, 'scrollHeight', {
      configurable: true,
      get: () => scrollHeight,
    });
    scroller.scrollTop = 0;

    await liftOutside(source);
    await dragTo(scroller, 100, 95);
    expect(scrollBy).not.toHaveBeenCalled();

    await act(async () => {
      scrollHeight = 1000;
      scroller.appendChild(document.createElement('div'));
      await Promise.resolve();
    });
    await flushRaf();
    await flushRaf();

    expect(scrollBy).toHaveBeenCalled();
    fireEvent.drop(source);
  });

  it('observes class and style changes on a replacement render node', async () => {
    const scrollBy = vi.fn();
    const ref = (node: HTMLElement | null) => {
      if (node) {
        stubScrollMetrics(node, scrollBy);
        node.style.overflow = 'hidden';
      }
    };
    const { engine, rerender } = await renderDnd(
      <DragAutoScroll.Root ref={ref} render={<div />} data-testid="scroller" />,
    );
    const source = createElement();
    engine.registerDraggable(source, {});
    const first = screen.getByTestId('scroller');

    await liftOutside(source);
    await dragTo(first, 100, 95);
    expect(scrollBy).not.toHaveBeenCalled();

    await rerender(<DragAutoScroll.Root ref={ref} render={<section />} data-testid="scroller" />);
    const replacement = screen.getByTestId('scroller');
    expect(replacement).not.toBe(first);
    await flushRaf();
    scrollBy.mockClear();

    await act(async () => {
      replacement.style.overflow = 'auto';
      await Promise.resolve();
    });
    await flushRaf();
    await flushRaf();

    expect(scrollBy).toHaveBeenCalled();
    fireEvent.drop(source);
  });

  describe('accept', () => {
    const otherKind = createKind<unknown>('base-ui-test/other');

    it('does not render accept as a DOM attribute', async () => {
      await renderDnd(<DragAutoScroll.Root accept={testDragKind} data-testid="scroller" />);
      expect(screen.getByTestId('scroller')).not.toHaveAttribute('accept');
    });

    it('does not render maxSpeed as a DOM attribute', async () => {
      await renderDnd(<DragAutoScroll.Root maxSpeed={300} data-testid="scroller" />);
      expect(screen.getByTestId('scroller')).not.toHaveAttribute('maxspeed');
    });

    it('forwards maxSpeed to the engine', async () => {
      // The root rebuilds the engine parameters by hand, so a prop dropped from
      // that object still typechecks and still stays off the DOM — the sibling
      // test above would keep passing while the container silently reverted to
      // the default speed. The callback form proves it arrived.
      const maxSpeed = vi.fn<MaxSpeedFn>(() => 300);
      const scrollBy = vi.fn();
      const { engine } = await renderDnd(<Scroller maxSpeed={maxSpeed} scrollByMock={scrollBy} />);
      const source = createElement();
      engine.registerDraggable(source, {});
      const scroller = screen.getByTestId('scroller');

      await liftOutside(source);
      await dragTo(scroller, 100, 95);

      expect(maxSpeed).toHaveBeenCalled();
      expect(maxSpeed.mock.calls[0][0].element).toBe(scroller);
    });
  });

  describe('onDragScroll', () => {
    it('lets a custom surface stop propagation to an outer viewport', async () => {
      const outerScrollBy = vi.fn();
      const onDragScroll = vi.fn<DragScrollFn>();

      function CustomViewport(props: { stopPropagation?: boolean }) {
        const ref = React.useCallback((node: HTMLDivElement | null) => {
          if (node) {
            node.getBoundingClientRect = () => new DOMRect(0, 0, 200, 100);
          }
        }, []);
        return (
          <DragAutoScroll.Root
            ref={ref}
            data-testid="custom-viewport"
            onDragScroll={(event, eventDetails) => {
              onDragScroll(event, eventDetails);
              if (props.stopPropagation) {
                event.stopPropagation();
              }
            }}
          />
        );
      }

      const outerRef = (node: HTMLDivElement | null) => {
        if (node) {
          stubScrollMetrics(node, outerScrollBy);
        }
      };

      function Nested(props: { stopPropagation?: boolean }) {
        return (
          <div ref={outerRef} data-testid="outer">
            <CustomViewport stopPropagation={props.stopPropagation} />
          </div>
        );
      }

      const { engine, rerender } = await renderDnd(<Nested />);
      const customViewport = screen.getByTestId('custom-viewport');
      const outer = screen.getByTestId('outer');
      engine.registerAutoScroller(outer, {});
      const source = createElement();
      customViewport.appendChild(source);
      engine.registerDraggable(source, {});

      await liftOutside(source);
      await dragTo(customViewport, 100, 95);

      expect(onDragScroll).toHaveBeenCalled();
      expect(onDragScroll.mock.calls[0][0].detail.direction).toBe('vertical');
      expect(onDragScroll.mock.calls[0][1].event).toBeInstanceOf(CustomEvent);
      expect(outerScrollBy).toHaveBeenCalled();

      await rerender(<Nested stopPropagation />);
      onDragScroll.mockClear();
      outerScrollBy.mockClear();
      await dragTo(customViewport, 100, 95);

      expect(onDragScroll).toHaveBeenCalled();
      expect(outerScrollBy).not.toHaveBeenCalled();
    });
  });
});
