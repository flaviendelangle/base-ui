import { ownerDocument, ownerWindow } from '@base-ui/utils/owner';
import { warn } from '@base-ui/utils/warn';
import { AnimationFrame } from '@base-ui/utils/useAnimationFrame';
import type {
  DragAccept,
  DragSource,
  DragInput,
  DraggableEventMap,
  DragLocationHistory,
} from '../../types/drag';
import { matchesAccept } from './dragKind';
import {
  monitorRegistry,
  engageMonitorIfDragging,
  removeMonitor,
  type RegisterMonitorParameters,
} from './monitor';
import { createGetterStackRegistry } from './getterStackRegistry';
import { getSharedSlot } from './sharedState';
import {
  safeCallConsumer,
  getComposedParentElement,
  getOverflowFlags,
  getViewportSize,
  isPointInRect,
  isRtlElement,
  type OverflowFlags,
} from './utils';
import { getRawActivePointerInput, notifyExternalScroll } from './synthetic/syntheticSensor';
import { dragSessionStore } from './dragSessionStore';
import { getMaxScrollOffset } from '../scrollEdges';

const EDGE_THRESHOLD = 0.25;
const MAX_EDGE_SIZE = 180;
const DEFAULT_MAX_SPEED = 900;
// Ramp the speed in over the first engaged frames rather than starting at
// `maxSpeed`: a pointer that merely clips a container's edge on its way past
// would otherwise lurch it, and the ramp restarts whenever the pointer leaves and
// re-enters the zone (see `engagementStart`). Documented on the auto-scroll page,
// because a high `maxSpeed` reads as a crawl for this long and looks broken.
const RAMP_UP_DURATION = 400;
// Cap the per-frame delta so a stalled/paused rAF (long consumer `onMove`, GC
// pause, throttled tab) can't produce one oversized `scrollBy` on resume.
const MAX_FRAME_DELTA_MS = 64;

/** A getter for a scroller's latest parameters, so `scrollLoop` reads the freshest callbacks each frame. */
type ScrollerGetter<TSourceData = any> = () => RegisterAutoScrollerParameters<TSourceData>;

const state = getSharedSlot<AutoScrollerState>('registerAutoScroller', () => ({
  scrollers: new Map<HTMLElement, ScrollerGetter[]>(),
  scrollLoopRaf: null,
  scrollWindow: null,
  enabled: false,
  scrollMonitorGetter: null,
  scrollMonitorRetainers: 0,
  lastTimestamp: 0,
  currentInput: null,
  currentReportedInput: null,
  currentSource: null,
  engagementStart: new Map<HTMLElement, number>(),
  sortedScrollers: null,
  engagedThisFrame: new Set<HTMLElement>(),
  idleMutationObserver: null,
  overflowCache: new WeakMap<HTMLElement, OverflowFlags>(),
  rtlCache: new WeakMap<HTMLElement, boolean>(),
}));
state.idleMutationObserver ??= null;
state.scrollMonitorRetainers ??= 0;

const holds = createGetterStackRegistry<HTMLElement, ScrollerGetter>({
  entries: state.scrollers,
});

/**
 * Register a scroll-container getter against `element`, ref-counted per node so
 * merged refs on one element don't clobber each other and the first unmount can't
 * delete the getter the second still needs — mirroring the draggable and
 * drop-target registries. The last-pushed getter is the active one.
 */
export function addScrollerRegistration(
  element: HTMLElement,
  getParameters: ScrollerGetter,
): () => void {
  const release = holds.hold(element, getParameters);
  invalidateScrollerOrder();
  // Registering mid-drag has to buy a frame: the loop parks itself whenever
  // nothing is engaged, and a container revealed under an already-stationary
  // pointer (a panel opening at the viewport edge) produces no input of its own
  // to wake it with — so without this it would sit still until the user moved.
  // The input the woken frame reads is not stale: the loop only parks after a
  // frame that saw the latest input, and any input since would have woken it.
  // A keyboard drag is filtered out by `enabled` inside `wakeScrollLoop`.
  wakeScrollLoop();
  return () => {
    release();
    invalidateScrollerOrder();
  };
}

/**
 * Re-evaluate live auto-scroll parameters for the current pointer position.
 * React registrations call this after a parameter change because the loop may
 * have parked while the element was disabled or dynamically declined scrolling.
 * @internal
 */
export function refreshAutoScroll(): void {
  if (!state.enabled) {
    return;
  }
  // A same-node class/style change can alter whether it scrolls and which side
  // is its inline end. Force the next frame to re-read computed-style facts.
  state.overflowCache = new WeakMap();
  state.rtlCache = new WeakMap();
  invalidateScrollerOrder();
  wakeScrollLoop();
}

/** Invalidate the cached inner-first ordering; recomputed lazily in `scrollLoop`. */
function invalidateScrollerOrder(): void {
  state.sortedScrollers = null;
}

function getEdgeSize(dimension: number): number {
  return Math.min(dimension * EDGE_THRESHOLD, MAX_EDGE_SIZE);
}

/**
 * Edge-tests one axis and returns the signed engagement depth in `[-1, 1]`
 * (negative toward the home edge), or `0` when the pointer sits outside both
 * edge zones or the container has no room left in that direction.
 *
 * The limit checks are thunks so an off-edge frame never pays for them: on the
 * horizontal axis `canScrollEnd` resolves the container's direction, which costs
 * a `getComputedStyle`. `getEdgeSize` caps an edge zone at a quarter of the
 * dimension, so the two zones can never overlap and the order of the tests
 * doesn't matter.
 */
function getEdgeScrollDepth(
  relative: number,
  size: number,
  canScrollStart: () => boolean,
  canScrollEnd: () => boolean,
): number {
  const edge = getEdgeSize(size);
  if (relative < edge) {
    return canScrollStart() ? -(1 - relative / edge) : 0;
  }
  if (relative > size - edge) {
    return canScrollEnd() ? 1 - (size - relative) / edge : 0;
  }
  return 0;
}

/**
 * A throwing callback costs the scroller this drag frame, keeping one buggy
 * scroller from aborting the shared scroll loop for every other scroller.
 */
function safeCall<T>(
  callbackName: 'maxSpeed' | 'getParameters' | 'onDragScroll',
  element: Element,
  call: () => T,
  fallback: T,
): T {
  return safeCallConsumer('auto-scroller', callbackName, element, call, fallback);
}

/**
 * A speed that isn't a non-negative finite number falls back to the default: a
 * negative one would scroll the container backwards and a `NaN` would freeze it,
 * neither with anything to diagnose.
 */
function resolveMaxSpeed(
  registration: RegisterAutoScrollerParameters,
  element: HTMLElement,
  feedback: DragAutoScrollFrameContext,
): number {
  const { maxSpeed } = registration;
  if (maxSpeed === undefined) {
    return DEFAULT_MAX_SPEED;
  }
  const resolved =
    typeof maxSpeed === 'function'
      ? safeCall('maxSpeed', element, () => maxSpeed(feedback), DEFAULT_MAX_SPEED)
      : maxSpeed;
  return Number.isFinite(resolved) && resolved >= 0 ? resolved : DEFAULT_MAX_SPEED;
}

function canScrollUp(el: Element): boolean {
  return el.scrollTop > 0;
}

// `Math.ceil` for Chrome 115+ fractional scroll units.
function canScrollDown(el: Element): boolean {
  return Math.ceil(el.scrollTop) + el.clientHeight < el.scrollHeight;
}

// In RTL containers `scrollLeft` is 0 at the home position and grows negative
// toward the end, so a naive `scrollLeft > 0` never detects a leftward scroll
// and `scrollLeft + clientWidth < scrollWidth` always reads as scrollable. Work
// in a direction-normalized coordinate where the home edge is 0 and the far edge
// is the max scroll extent, so both edges are detected identically in LTR/RTL.
// Distance already scrolled away from the (right-hand) home edge in RTL, always
// ≥ 0 (RTL `scrollLeft` is ≤ 0). Only the RTL branches need this; the LTR
// branches read `el.scrollLeft` directly.
function getScrollFromStart(el: Element): number {
  return -el.scrollLeft;
}

// `Math.ceil`/`Math.floor` guard against Chrome 115+ fractional scroll units.
function canScrollLeft(el: Element, rtl: boolean): boolean {
  // Leftward in RTL means scrolling back toward the (right-hand) home edge;
  // in LTR it means scrolling away from the (left-hand) home edge.
  return rtl
    ? Math.ceil(getScrollFromStart(el)) < getMaxScrollOffset(el.scrollWidth, el.clientWidth)
    : el.scrollLeft > 0;
}

function canScrollRight(el: Element, rtl: boolean): boolean {
  return rtl
    ? Math.floor(getScrollFromStart(el)) > 0
    : Math.ceil(el.scrollLeft) + el.clientWidth < el.scrollWidth;
}

/**
 * Resolve a registration on the document's root to the element whose scroll
 * properties move the viewport (`scrollingElement`: `documentElement` in
 * standards mode, `body` in quirks mode), or `null` for a regular overflow
 * container. A default-styled `body` also maps to the page scroller in
 * standards mode — it is not an overflow container of its own, so a scroller
 * registered on it would otherwise be silently inert; a `body` the page styles
 * as a real overflow container (`overflow: auto`) keeps scrolling itself.
 * Environments that don't implement `scrollingElement` (jsdom) fall back to
 * the standards-mode answer, the document element.
 */
function resolvePageScroller(element: HTMLElement): HTMLElement | null {
  const doc = ownerDocument(element);
  const scrollingElement = (doc.scrollingElement ?? doc.documentElement) as HTMLElement | null;
  if (scrollingElement === null) {
    return null;
  }
  if (element === scrollingElement || element === doc.documentElement) {
    return scrollingElement;
  }
  if (element === doc.body) {
    // A `body` the page styles as a real overflow container scrolls itself;
    // otherwise it stands in for the viewport. A `body` set to `hidden`/`clip`
    // is not an overflow container either, so it maps to the page scroller —
    // where `readPageOverflowFlags` then reads that same value as "the page has
    // been stopped on this axis".
    const bodyOverflow = readOverflowFlags(element);
    if (!bodyOverflow.x && !bodyOverflow.y) {
      return scrollingElement;
    }
  }
  return null;
}

/**
 * The element whose `direction` decides which way `scrollLeft` runs for
 * `scrollTarget`.
 *
 * For a regular overflow container that is the container itself. For the page
 * scroller it is not: HTML propagates `direction` from `<body>` to the viewport
 * the same way it propagates `background`, so a `<body dir="rtl">` page scrolls
 * RTL (`scrollLeft <= 0`) while `getComputedStyle(documentElement).direction` is
 * still `ltr`. Reading the root there leaves the left edge never auto-scrolling
 * and the right edge spinning against the home edge.
 */
function directionSourceFor(scrollTarget: HTMLElement): HTMLElement {
  const doc = ownerDocument(scrollTarget);
  const isPageScroller =
    scrollTarget === (doc.scrollingElement ?? doc.documentElement) ||
    scrollTarget === doc.documentElement;
  if (!isPageScroller) {
    return scrollTarget;
  }
  // Only when `body` carries a direction of its own: an unstyled `body` inherits
  // the root's, so reading either gives the same answer.
  const body = doc.body as HTMLElement | null;
  return body ?? scrollTarget;
}

function resolveRtl(scrollTarget: HTMLElement): boolean {
  return readCached(state.rtlCache, directionSourceFor(scrollTarget), isRtlElement);
}

// The viewport in client coordinates. `getViewportSize` is the engine's single
// viewport definition (scrollbar-excluding, with the detached-document/jsdom
// fallback), so the edge zones here agree with the keyboard cursor clamp and
// `restrictToWindowEdges` on where the edge is.
function getViewportRect(element: HTMLElement) {
  const { width, height } = getViewportSize(ownerWindow(element));
  return {
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
  };
}

// `getComputedStyle`-derived per-element facts (overflow, `isRtl`) are stable
// for the duration of a drag but cost a style resolve on every read; cache them
// per drag (the loop's start and stop reset the caches).
function readCached<T>(
  cache: WeakMap<HTMLElement, T>,
  element: HTMLElement,
  compute: (el: HTMLElement) => T,
): T {
  let cached = cache.get(element);
  if (cached === undefined) {
    cached = compute(element);
    cache.set(element, cached);
  }
  return cached;
}

const BOTH_AXES: OverflowFlags = { x: true, y: true, blockedX: false, blockedY: false };

function readOverflowFlags(element: HTMLElement): OverflowFlags {
  return readCached(state.overflowCache, element, getOverflowFlags);
}

/**
 * Which axes the *viewport* scrolls on. The page is scrollable by default —
 * `<html>` is not an overflow element yet the viewport still scrolls — so this
 * asks the opposite question from {@link readOverflowFlags}: which axes has the
 * page been stopped on. `<html>` and `<body>` are both consulted because the
 * viewport's overflow propagates from whichever of them sets it, which is what
 * keeps a scroll lock holding during a drag.
 */
function readPageOverflowFlags(element: HTMLElement): OverflowFlags {
  const doc = ownerDocument(element);
  const root = readOverflowFlags(doc.documentElement);
  const body = doc.body === null ? null : readOverflowFlags(doc.body);
  return {
    x: !root.blockedX && !body?.blockedX,
    y: !root.blockedY && !body?.blockedY,
    blockedX: false,
    blockedY: false,
  };
}

function sortByDepthDesc(elements: HTMLElement[]): HTMLElement[] {
  const depths = new Map<HTMLElement, number>();
  for (const el of elements) {
    let depth = 0;
    // Walk composed ancestors (piercing shadow boundaries) so a scroller nested
    // inside a shadow tree sorts deeper than its light-DOM ancestors, matching
    // the shadow-safe traversal used elsewhere in the engine.
    let node: Element | null = el;
    while (node) {
      depth += 1;
      node = getComposedParentElement(node);
    }
    depths.set(el, depth);
  }
  return elements.sort((a, b) => depths.get(b)! - depths.get(a)!);
}

/**
 * One loop frame, with the frame slot released if the body throws.
 *
 * Both resume paths (`startScrollLoop`, `wakeScrollLoop`) bail on
 * `scrollLoopRaf !== null`, so a throw out of the body — a consumer callback,
 * a drop-target getter behind a re-resolution — would strand this already-fired
 * (and therefore spent) id in the slot and leave auto-scroll wedged shut for the
 * rest of the drag.
 *
 * Cleared here on the way out rather than on the way in: the id has to stay set
 * *through* the body, because `wakeScrollLoop` reads it to tell "a frame is
 * already pending" from "the loop is parked". A consumer registering a scroller
 * mid-frame wakes the loop, and with the slot already nulled that wake would
 * schedule a second frame whose id the reschedule below then overwrites —
 * leaking an uncancellable frame and running the loop at double rate.
 */
function scrollLoop(timestamp: number): void {
  try {
    runScrollFrame(timestamp);
  } catch (error) {
    state.scrollLoopRaf = null;
    throw error;
  }
}

function runScrollFrame(timestamp: number): void {
  if (!state.currentInput || !state.currentSource) {
    // Defensive only (`stopScrollLoop` nulls these together with the frame):
    // clear the already-fired frame id so `startScrollLoop`'s null guard can't
    // wedge shut if this branch is ever reached.
    state.scrollLoopRaf = null;
    return;
  }
  // Snapshotted for the whole iteration. The loop below runs consumer-reachable
  // callbacks (the drop-target getters behind a re-resolution), any
  // of which can re-entrantly end the drag and null these — and every read after
  // that point would then dereference `null`.
  const currentInput = state.currentInput;
  const currentReportedInput = state.currentReportedInput;
  const currentSource = state.currentSource;

  // A drag can end abnormally — a consumer callback throwing tears down the
  // lifecycle via `clearActiveMonitors()` without ever dispatching `onMoveEnd` to
  // the scroll monitor, so `stopScrollLoop` never runs and this loop keeps
  // rescheduling itself (and scrolling) forever. Self-terminate the moment no
  // drag session is live.
  if (dragSessionStore.getSnapshot() === null) {
    stopScrollLoop();
    return;
  }

  const rawDeltaMs = state.lastTimestamp > 0 ? timestamp - state.lastTimestamp : 16;
  const deltaMs = Math.min(rawDeltaMs, MAX_FRAME_DELTA_MS);
  state.lastTimestamp = timestamp;

  let verticalConsumed = false;
  let horizontalConsumed = false;

  // Cache the inner-first ordering across frames. It only depends on the
  // explicitly registered viewports and is invalidated when the registry changes.
  if (state.sortedScrollers === null) {
    state.sortedScrollers = sortByDepthDesc([...state.scrollers.keys()]);
  }
  const sortedElements = state.sortedScrollers;
  const engagedThisFrame = state.engagedThisFrame;
  engagedThisFrame.clear();
  // Scrollers can be registered from another document (e.g. an iframe), but the
  // drag input's client coordinates are only meaningful in the source's
  // document — edge-testing a foreign scroller's frame-local rect against them
  // could scroll the wrong document's container on a coincidental overlap.
  const sourceDocument = ownerDocument(currentSource.element);

  for (const element of sortedElements) {
    // Inner-first ordering: once both axes are consumed no remaining (outer)
    // scroller can engage, so skip their rect reads and consumer callbacks.
    if (verticalConsumed && horizontalConsumed) {
      break;
    }
    if (ownerDocument(element) !== sourceDocument) {
      continue;
    }
    // A registration on the document's root scrolls the page itself;
    // `scrollTarget` is the element whose scroll properties drive it.
    const pageScroller = resolvePageScroller(element);
    const scrollTarget = pageScroller ?? element;

    // Geometry first, before anything consumer-supplied runs: on a dense board
    // most registered scrollers are nowhere near the pointer, and rejecting them
    // on a single rect read keeps the per-frame cost off the consumer callbacks
    // entirely. The page scroller's bounding rect spans the whole document (its
    // top goes negative once the page is scrolled), so its edge zones are
    // measured against the layout viewport instead.
    const rect = pageScroller ? getViewportRect(element) : element.getBoundingClientRect();
    const probe = resolveProbePoint(currentInput, currentReportedInput, rect);
    if (probe === null) {
      continue;
    }
    const relativeX = probe.clientX - rect.left;
    const relativeY = probe.clientY - rect.top;

    // Read the freshest parameters each frame so callbacks can change
    // dynamically during a drag; the last-registered getter wins.
    const getParameters = holds.getActive(element);
    // A consumer callback earlier in this frame may have unregistered a scroller
    // that still appears later in the cached order.
    if (getParameters === undefined) {
      continue;
    }
    const registration = safeCall<RegisterAutoScrollerParameters | null>(
      'getParameters',
      element,
      getParameters,
      null,
    );
    // `== null`: the `safeCall` fallback is `null`, but a consumer getter that
    // returns nothing hands back `undefined` — which would otherwise reach the
    // property reads below.
    if (registration == null) {
      continue;
    }
    // An explicit opt-out, checked before the overflow gate below so it also
    // silences the "registered on a non-scrolling element" warning: an element
    // the consumer disabled is not one they need advice about.
    if (registration.disabled) {
      continue;
    }
    // Cheap kind filter first, like a drop target's `accept`: a drag this
    // scroller doesn't react to must neither consume its axes nor run its
    // per-frame callbacks.
    if (!matchesAccept(registration.accept, currentSource)) {
      continue;
    }

    // A delegating element with no native overflow is only an edge-detection
    // viewport. Native scroll containers still use the normal overflow and
    // extent gates, while `onDragScroll` can observe and cancel their default
    // movement through the event.
    const onDragScroll = registration.onDragScroll;
    const nativeOverflow = pageScroller
      ? readPageOverflowFlags(element)
      : readOverflowFlags(element);
    const hasNativeScrollExtent = pageScroller
      ? true
      : element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    const delegated =
      onDragScroll !== undefined &&
      (!nativeOverflow.x || !nativeOverflow.y || !hasNativeScrollExtent);

    // Which axes this element may scroll at all. The page asks the inverted
    // question (scrollable unless something stopped it), and a delegating
    // surface answers for itself.
    const overflow = delegated ? BOTH_AXES : nativeOverflow;
    if (!overflow.x && !overflow.y) {
      if (process.env.NODE_ENV !== 'production') {
        if (getParameters !== undefined && !pageScroller) {
          warn(
            'Base UI: an auto-scroll container was registered on an element that does not scroll, ' +
              'so its parameters (including `disabled`) have no effect. ' +
              'Register the element whose own `overflow` clips the scrollable content, ' +
              'or provide `onDragScroll` if the surface moves its content some other way. ' +
              'See https://base-ui.com/react/utils/draggable.',
          );
        }
      }
      continue;
    }

    // `probe`, not the raw pointer: this is the point the engine just decided this
    // container's edge zones from, so a consumer re-deriving the same test
    // (`onDragScroll: (event, { input, element }) => isPointInRect(input…, element…)`)
    // reaches the same answer. Reporting the raw pointer would tell a consumer the
    // drag is outside a container the engine is busy scrolling.
    const feedback = { input: probe, source: currentSource, element };

    let scrollX = 0;
    let scrollY = 0;

    if (overflow.y && !verticalConsumed) {
      scrollY = getEdgeScrollDepth(
        relativeY,
        rect.height,
        () => delegated || canScrollUp(scrollTarget),
        () => delegated || canScrollDown(scrollTarget),
      );
    }

    if (overflow.x && !horizontalConsumed) {
      // The RTL resolution stays behind the `delegated` short-circuit: it only
      // picks which limit check runs, so delegating must not pay its
      // `getComputedStyle`.
      scrollX = getEdgeScrollDepth(
        relativeX,
        rect.width,
        () => delegated || canScrollLeft(scrollTarget, resolveRtl(scrollTarget)),
        () => delegated || canScrollRight(scrollTarget, resolveRtl(scrollTarget)),
      );
    }

    if (scrollX !== 0 || scrollY !== 0) {
      const maxSpeed = resolveMaxSpeed(registration, element, feedback);
      // A container pinned at zero speed never moves, so it must not engage
      // either: engaging would consume both axes from the outer container and
      // hold the loop awake for a scroll that can never happen.
      if (maxSpeed === 0) {
        continue;
      }

      engagedThisFrame.add(element);

      if (!state.engagementStart.has(element)) {
        state.engagementStart.set(element, timestamp);
      }
      const elementElapsed = timestamp - state.engagementStart.get(element)!;
      const rampFactor = Math.min(elementElapsed / RAMP_UP_DURATION, 1);
      const frameSpeed = (maxSpeed / 1000) * deltaMs * rampFactor;

      const finalScrollX = scrollX * frameSpeed;
      const finalScrollY = scrollY * frameSpeed;

      // A scroll container moves every axis it engaged, having only engaged the
      // ones it had room on. Each axis gets its own event so a handler can cancel
      // vertical or horizontal movement independently.
      let movedAxis: ConsumedAxis | null = 'all';
      if (onDragScroll !== undefined) {
        let consumedX = false;
        let consumedY = false;
        const axes = [
          { direction: 'horizontal' as const, engaged: scrollX !== 0, x: finalScrollX, y: 0 },
          { direction: 'vertical' as const, engaged: scrollY !== 0, x: 0, y: finalScrollY },
        ];
        for (const axis of axes) {
          if (!axis.engaged) {
            continue;
          }
          const eventData = {
            ...feedback,
            x: axis.x,
            y: axis.y,
            direction: axis.direction,
          } as DragAutoScrollEvent;
          const event = new CustomEvent('base-ui-autoscroll', {
            bubbles: true,
            cancelable: true,
            detail: eventData,
          });
          const eventDetails: DragAutoScrollEventDetails = {
            ...eventData,
            reason: 'pointer',
            event,
          };
          safeCall('onDragScroll', element, () => onDragScroll(event, eventDetails), undefined);
          if (!event.defaultPrevented && !delegated) {
            // `onDragScroll` is an interceptable event for native viewports:
            // leaving it uncancelled preserves the normal scroll behavior.
            scrollTarget.scrollBy({ left: axis.x, top: axis.y, behavior: 'instant' });
          }
          const consumed = event.cancelBubble || (!delegated && !event.defaultPrevented);
          if (axis.direction === 'horizontal') {
            consumedX = consumed;
          }
          if (axis.direction === 'vertical') {
            consumedY = consumed;
          }
        }
        movedAxis =
          consumedX && consumedY ? 'all' : consumedX ? 'horizontal' : consumedY ? 'vertical' : null;
      } else {
        // `behavior: 'instant'` so a CSS `scroll-behavior: smooth` on the container
        // can't turn each per-frame delta into a competing smooth animation.
        scrollTarget.scrollBy({ left: finalScrollX, top: finalScrollY, behavior: 'instant' });
      }

      // Consume the axis on engagement intent, not on the applied delta: on the
      // first engaged frame `frameSpeed` is 0 (ramp-up), so keying off
      // `finalScroll*` would leave the axis unconsumed and let an outer scroller
      // also scroll it for that frame.
      if (scrollY !== 0 && (movedAxis === 'all' || movedAxis === 'vertical')) {
        verticalConsumed = true;
      }
      if (scrollX !== 0 && (movedAxis === 'all' || movedAxis === 'horizontal')) {
        horizontalConsumed = true;
      }

      if (movedAxis === null) {
        // Nothing moved, so this element must not hold the loop awake: a surface
        // parked at its own bound would otherwise burn a frame forever under a
        // stationary pointer. Dropping it also lets the end-of-frame sweep reset
        // its ramp, so a callback that throws every frame can't accumulate speed
        // and then apply it all at once when it recovers.
        engagedThisFrame.delete(element);
      }
    }
  }

  for (const el of state.engagementStart.keys()) {
    if (!engagedThisFrame.has(el)) {
      state.engagementStart.delete(el);
    }
  }

  if (engagedThisFrame.size === 0) {
    // Nothing is edge-scrolling, so the next frame would recompute the same
    // answer. Park the loop; only new input can change which scroller engages,
    // and that input wakes it (see `wakeScrollLoop`). A pointer resting in the
    // middle of the page therefore costs no frames and no geometry reads.
    idleScrollLoop();
    return;
  }

  // `scroll` events are not composed, so a scrolled shadow-root container never
  // reaches the sensor's document-level listener — mark the frame dirty directly.
  notifyExternalScroll();

  state.scrollLoopRaf = requestScrollFrame();
}

// Schedule in the source window so popout drags are not throttled with their opener.
function requestScrollFrame(): number | null {
  const source = state.currentSource;
  if (source === null) {
    return null;
  }
  if (state.scrollWindow === null) {
    state.scrollWindow = ownerWindow(source.element);
  }
  return AnimationFrame.request(scrollLoop, state.scrollWindow);
}

/**
 * Suspend the loop until the next drag input, without dropping the drag state
 * `wakeScrollLoop` needs to resume. The frame clock resets so the first frame
 * after the pause isn't billed for the whole idle interval.
 */
function idleScrollLoop(): void {
  state.scrollLoopRaf = null;
  state.lastTimestamp = 0;
  observeIdleMutations();
}

function clearIdleMutationObserver(): void {
  state.idleMutationObserver?.disconnect();
  state.idleMutationObserver = null;
}

function observeIdleMutations(): void {
  if (state.idleMutationObserver !== null || state.currentSource === null) {
    return;
  }
  const doc = ownerDocument(state.currentSource.element);
  const root = doc.documentElement;
  if (!root) {
    return;
  }
  const observer = new (ownerWindow(root).MutationObserver)(() => {
    clearIdleMutationObserver();
    refreshAutoScroll();
  });
  observer.observe(root, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    childList: true,
    subtree: true,
  });
  state.idleMutationObserver = observer;
}

/** Resume a parked loop when fresh input may have moved the pointer into an edge zone. */
function wakeScrollLoop(): void {
  if (!state.enabled || state.scrollLoopRaf !== null) {
    return;
  }
  clearIdleMutationObserver();
  state.lastTimestamp = 0;
  state.scrollLoopRaf = requestScrollFrame();
}

function startScrollLoop(): void {
  clearIdleMutationObserver();
  state.enabled = true;
  if (state.scrollLoopRaf !== null) {
    return;
  }
  state.lastTimestamp = 0;
  state.engagementStart.clear();
  resetStyleCaches();
  state.scrollLoopRaf = requestScrollFrame();
}

/**
 * The style caches are `WeakMap`s, so they are replaced rather than cleared —
 * and holding them across a drag would keep every element the last drag crossed
 * alive until the next one.
 */
function resetStyleCaches(): void {
  state.overflowCache = new WeakMap();
  state.rtlCache = new WeakMap();
}

function stopScrollLoop(): void {
  const scrollLoopRaf = state.scrollLoopRaf;
  const scrollWindow = state.scrollWindow;
  // Release the state before reaching into a possibly closed iframe/popout.
  // Firefox can throw for a dead Window proxy; the callback cannot run once its
  // realm is gone, so cancellation is best-effort while the engine state must
  // always become reusable.
  state.scrollLoopRaf = null;
  state.scrollWindow = null;
  state.enabled = false;
  state.currentInput = null;
  state.currentReportedInput = null;
  state.currentSource = null;
  state.engagementStart.clear();
  // Scratch set from the last frame; it would otherwise pin those containers
  // until the next drag's first frame cleared it.
  state.engagedThisFrame.clear();
  clearIdleMutationObserver();
  resetStyleCaches();
  if (scrollLoopRaf !== null && scrollWindow !== null) {
    AnimationFrame.cancel(scrollLoopRaf, scrollWindow);
  }
}

/**
 * Tear the loop down between tests. `reset()` clears the active monitors without
 * dispatching `onMoveEnd`, so the scroll monitor never runs `stopScrollLoop` and
 * a still-engaged loop would keep calling `scrollBy` into the next test's
 * document — while `currentSource` pinned the previous test's detached DOM.
 */
export function resetForTests(): void {
  // The registry is deliberately left alone: those entries are owned by the
  // cleanups the consumer still holds, and dropping them here would unregister a
  // scroller out from under a live test.
  stopScrollLoop();
  if (state.scrollMonitorGetter) {
    removeMonitor(state.scrollMonitorGetter);
    state.scrollMonitorGetter = null;
  }
  state.scrollMonitorRetainers = 0;
}

/**
 * The physical pointer, kept alongside the `modifiers`-constrained point the
 * lifecycle reports so {@link resolveProbePoint} can pick between them per
 * container. A modifier pins the reported point where the item may go, which need
 * not be anywhere near the container the user is pushing against — an axis lock
 * holds it on the row the drag started from. Falls back to the reported input for
 * a drag the synthetic sensor doesn't own.
 */
function resolveScrollInput(reported: DragInput): DragInput {
  return getRawActivePointerInput() ?? reported;
}

/**
 * The point to measure `rect`'s edge zones from, or `null` when the candidate is
 * nowhere near either one.
 *
 * Two positions describe the same frame: the physical pointer, and the
 * `modifiers`-constrained point the lifecycle reports. Neither alone is right.
 * Prefer the physical one — an axis lock pins the reported point on the row the
 * drag started from, so a container the user is genuinely pushing against would
 * never see its edge zone entered. But a *clamping* modifier
 * (`restrictToElement`) moves the physical pointer out of the very container it
 * confined the drag to, while the candidate chain is anchored at the modified
 * point — testing raw edges against a chain built at the modified point compares
 * two different coordinate spaces,
 * and the container silently drops out. So fall back to the reported point when
 * the raw one has left the rect, and reject the candidate only when neither is
 * inside it.
 */
function resolveProbePoint(
  raw: DragInput,
  reported: DragInput | null,
  rect: { left: number; top: number; right: number; bottom: number },
): DragInput | null {
  if (isPointInRect(raw.clientX, raw.clientY, rect)) {
    return raw;
  }
  if (reported !== null && isPointInRect(reported.clientX, reported.clientY, rect)) {
    return reported;
  }
  return null;
}

// Re-seed the loop from any fresh drag input; shared by `onMove` and
// `onTargetChange`, which need identical handling.
function refreshDragInput({
  location,
  source,
}: DraggableEventMap['onMove'] | DraggableEventMap['onTargetChange']): void {
  if (!state.enabled) {
    return;
  }
  state.currentInput = resolveScrollInput(location.current.input);
  state.currentReportedInput = location.current.input;
  state.currentSource = source;
  wakeScrollLoop();
}

function startScrollSession({
  location,
  source,
  mode,
}: Pick<DraggableEventMap['onMoveStart'], 'location' | 'source' | 'mode'>): void {
  // A drag that ended abnormally with the loop *parked* leaves `enabled` set
  // and the last input/source referenced: the loop's own no-session
  // self-termination only runs when a frame fires. Clear that state before
  // this drag decides anything.
  stopScrollLoop();
  state.currentInput = resolveScrollInput(location.current.input);
  state.currentReportedInput = location.current.input;
  state.currentSource = source;
  startScrollLoop();
}

// The engine-internal monitor that drives the scroll loop, registered from the
// first auto-scroller registration.
const SCROLL_MONITOR_PARAMS: RegisterMonitorParameters = {
  onMoveStart: startScrollSession,
  onMove: refreshDragInput,
  onTargetChange: refreshDragInput,
  onMoveEnd: () => {
    stopScrollLoop();
  },
};

/**
 * Retain the engine scroll-monitor, which arms auto-scroll while at least one
 * explicit viewport registration exists. The loop only runs between a drag's
 * start and end, parks whenever no container is engaged, and is removed with the
 * last registration.
 */
export function retainScrollMonitor(): () => void {
  state.scrollMonitorRetainers += 1;
  if (!state.scrollMonitorGetter) {
    const getMonitor = () => SCROLL_MONITOR_PARAMS;
    state.scrollMonitorGetter = getMonitor;
    monitorRegistry.add(getMonitor);
    // A scroller mounting mid-drag activates the monitor for the in-progress drag.
    engageMonitorIfDragging(getMonitor);
    const session = dragSessionStore.getSnapshot();
    if (session) {
      startScrollSession(session);
    }
  }
  const retainedMonitor = state.scrollMonitorGetter;
  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    // Test teardown can reset the shared feature boundary before a mounted
    // consumer's cleanup runs. That stale cleanup must not release a monitor
    // installed by the following test.
    if (state.scrollMonitorGetter !== retainedMonitor) {
      return;
    }
    state.scrollMonitorRetainers -= 1;
    if (state.scrollMonitorRetainers === 0 && state.scrollMonitorGetter) {
      const getMonitor = state.scrollMonitorGetter;
      // React detaches an old render node before attaching its replacement in
      // the same commit. Defer the last release so that swap keeps the live drag
      // input and loop; a replacement registration cancels this retirement by
      // incrementing the retain count before the microtask runs.
      queueMicrotask(() => {
        if (state.scrollMonitorRetainers === 0 && state.scrollMonitorGetter === getMonitor) {
          state.scrollMonitorGetter = null;
          stopScrollLoop();
          removeMonitor(getMonitor);
        }
      });
    }
  };
}

/** @internal */
type ConsumedAxis = 'vertical' | 'horizontal' | 'all';

/** Live drag context passed to the per-frame callbacks. */
export interface DragAutoScrollFrameContext<TSourceData = unknown> {
  /**
   * The position this container's edge zones were measured from, which is the
   * physical pointer whenever it is inside the container. A `modifiers` clamp can
   * hold the reported drag point inside a container the physical pointer has
   * already left — and the reverse — so the engine probes both and reports
   * whichever one it used here.
   */
  input: DragInput;
  source: DragSource<TSourceData>;
  element: HTMLElement;
}

/** The data passed to a custom viewport's `onDragScroll` handler. */
export interface DragAutoScrollEvent<
  TSourceData = unknown,
> extends DragAutoScrollFrameContext<TSourceData> {
  /**
   * How far to move horizontally this frame, in CSS pixels, with `scrollBy`
   * semantics: a positive value moves the view right, so the content slides left
   * under the pointer. Already ramped and scaled by the frame's elapsed time.
   * `0` when the horizontal axis isn't engaged this frame.
   */
  x: number;
  /** How far to move vertically this frame, in CSS pixels. A positive value moves the view down. */
  y: number;
  direction: DragAutoScrollDirection;
}

export type DragAutoScrollDirection = 'horizontal' | 'vertical';

/** Details passed as the second argument to `onDragScroll`. */
export interface DragAutoScrollEventDetails<
  TSourceData = unknown,
> extends DragAutoScrollEvent<TSourceData> {
  reason: 'pointer';
  event: CustomEvent<DragAutoScrollEvent<TSourceData>>;
}

export type DragAutoScrollHandler<TSourceData = unknown> = (
  event: CustomEvent<DragAutoScrollEvent<TSourceData>>,
  eventDetails: DragAutoScrollEventDetails<TSourceData>,
) => void;

interface AutoScrollerState {
  /** Each scroll container maps to the stack of getters held against it (merged refs). */
  scrollers: Map<HTMLElement, ScrollerGetter[]>;
  scrollLoopRaf: number | null;
  scrollWindow: Window | null;
  /**
   * Auto-scroll is armed for the current drag — set by the scroll monitor's
   * `onMoveStart`, and so the one place keyboard drags are filtered out: every
   * other entry point (`wakeScrollLoop`, `refreshDragInput`) reads this rather
   * than re-testing the mode. Distinct from `scrollLoopRaf !== null`, which is
   * false while the loop is merely parked between edge engagements (see
   * `idleScrollLoop`).
   */
  enabled: boolean;
  scrollMonitorGetter: (() => RegisterMonitorParameters) | null;
  scrollMonitorRetainers: number;
  lastTimestamp: number;
  currentInput: DragInput | null;
  /** The `modifiers`-constrained point the lifecycle reported, kept alongside the physical one. */
  currentReportedInput: DragInput | null;
  currentSource: DragSource | null;
  /** When the pointer first entered each element's edge zone. */
  engagementStart: Map<HTMLElement, number>;
  /** Cached inner-first ordering of explicit viewport registrations; `null` when stale. */
  sortedScrollers: HTMLElement[] | null;
  /** Scratch set of scrollers engaged in the current frame, reused across frames. */
  engagedThisFrame: Set<HTMLElement>;
  /** Watches for content/style changes only while the frame loop is parked. */
  idleMutationObserver: MutationObserver | null;
  /** Per-drag per-axis overflow cache (see `readCached`). */
  overflowCache: WeakMap<HTMLElement, OverflowFlags>;
  /** Per-drag `isRtl` cache (see `readCached`). */
  rtlCache: WeakMap<HTMLElement, boolean>;
}

export interface RegisterAutoScrollerParameters<TSourceData = unknown> {
  /**
   * The kinds of drag source this scroller reacts to: one kind, or an array of them.
   * Omit it to scroll for every drag.
   *
   * A drag whose kind isn't accepted does not scroll this viewport. The payload
   * the per-frame callbacks see is typed from it.
   */
  accept?: DragAccept<TSourceData> | undefined;
  /**
   * Whether this viewport should auto-scroll during a drag.
   *
   * Read every frame, and the registration is kept — so toggling it mid-drag
   * suspends and resumes scrolling without the container having to re-join the drag.
   *
   * Use `onDragScroll` when the decision depends on the current drag or direction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Return `false` to disable scrolling on this element for the current drag.
   * Evaluated every frame, so scrolling can be suspended dynamically.
   */
  /**
   * How fast the container moves at the deepest point of an edge zone, in CSS
   * pixels per second. Accepts a static value or a callback evaluated every
   * frame the container is engaged.
   *
   * The default suits a container a few hundred pixels across: raise it for one
   * holding much more content, lower it for a short list. A speed of `0` leaves
   * this viewport still so an outer viewport can take over.
   * @default 900
   */
  maxSpeed?: number | ((parameters: DragAutoScrollFrameContext<TSourceData>) => number) | undefined;
  /**
   * Observes each proposed scroll. The viewport performs its native scroll unless
   * `event.preventDefault()` is called. For a custom surface such as a canvas or
   * zoomable board, prevent the default and apply the movement yourself; call
   * `event.stopPropagation()` when the surface consumed the movement so an outer
   * viewport does not handle the same direction.
   */
  onDragScroll?: DragAutoScrollHandler<TSourceData> | undefined;
}
