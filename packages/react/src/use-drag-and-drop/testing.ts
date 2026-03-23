/**
 * Test utilities for `useDragAndDrop` tests.
 *
 * Uses the official `@atlaskit/pragmatic-drag-and-drop-unit-testing` polyfills
 * so that native drag events work in JSDOM.
 */
import '@atlaskit/pragmatic-drag-and-drop-unit-testing/drag-event-polyfill';
import '@atlaskit/pragmatic-drag-and-drop-unit-testing/dom-rect-polyfill';
import { vi } from 'vitest';
import { act, fireEvent } from '@mui/internal-test-utils';
import { renderHook } from '@testing-library/react';
import type { CollectionActions, CollectionItemId } from '../types/collection';
import { useDragAndDrop } from './useDragAndDrop';
import type {
  DragAndDropAttachConfig,
  DragAndDropState,
  useDragAndDrop as UseDragAndDropNS,
} from './useDragAndDrop';

// ---------------------------------------------------------------------------
// Mock context
// ---------------------------------------------------------------------------

interface MockContextOptions {
  /** Item ids that exist in this collection. */
  knownItemIds?: Array<string | number> | undefined;
  /** Map of parentId → childIds. `null` key = root children. */
  childrenMap?: Record<string, Array<string | number>> | undefined;
  /** Map of itemId → parentId. */
  parentMap?: Record<string, string | number | null> | undefined;
  /** Currently selected item ids. */
  selectedItemIds?: Set<string | number> | undefined;
  /** Item ids that are expandable. */
  expandableItemIds?: Set<string | number> | undefined;
  /** Overrides for individual context methods. */
  overrides?: Partial<CollectionActions> | undefined;
}

export interface MockContextResult {
  context: CollectionActions;
  config: DragAndDropAttachConfig;
  /** All states received via `onStateChange`, in order. */
  states: DragAndDropState[];
  /** The most recent state, or `null` if none yet. */
  lastState: () => DragAndDropState | null;
}

function isDescendantOf(
  parentMap: Record<string, string | number | null>,
  itemId: CollectionItemId,
  ancestorId: CollectionItemId,
): boolean {
  let current: string | number | null = parentMap[String(itemId)] ?? null;
  while (current != null) {
    if (current === ancestorId) {
      return true;
    }
    current = parentMap[String(current)] ?? null;
  }
  return false;
}

export function createMockContext(options: MockContextOptions = {}): MockContextResult {
  const {
    knownItemIds = [],
    childrenMap = {},
    parentMap = {},
    selectedItemIds = new Set<string | number>(),
    overrides = {},
  } = options;

  const knownSet = new Set<string | number>(knownItemIds);
  const states: DragAndDropState[] = [];
  const onStateChange = vi.fn((state: DragAndDropState) => {
    states.push(state);
  });

  const context: CollectionActions = {
    getItemIndex: (id) => {
      const parentId = parentMap[String(id)] ?? 'null';
      const siblings = childrenMap[String(parentId)] ?? childrenMap.null ?? knownItemIds;
      return siblings.indexOf(id);
    },
    hasItem: (id) => knownSet.has(id),
    getSelectedItemIds: () => selectedItemIds,
    getItemModel: (id) => (knownSet.has(id) ? id : undefined),
    getItemModels: (itemIds) => [...itemIds].filter((id) => knownSet.has(id)),
    ...overrides,
  };

  const config: DragAndDropAttachConfig = {
    onStateChange,
    pruneDraggedItems: (itemIds) => {
      const result = new Set<CollectionItemId>();
      for (const id of itemIds) {
        let isDesc = false;
        for (const otherId of itemIds) {
          if (otherId !== id && isDescendantOf(parentMap, id, otherId)) {
            isDesc = true;
            break;
          }
        }
        if (!isDesc) {
          result.add(id);
        }
      }
      return result;
    },
    isDropTargetInvalid: (dropTargetItemId, draggedItemIds) => {
      for (const id of draggedItemIds) {
        if (isDescendantOf(parentMap, dropTargetItemId, id)) {
          return true;
        }
      }
      return false;
    },
  };

  return {
    context,
    config,
    states,
    lastState: () => (states.length > 0 ? states[states.length - 1] : null),
  };
}

// ---------------------------------------------------------------------------
// Fake elements
// ---------------------------------------------------------------------------

const createdElements: HTMLElement[] = [];

/**
 * Create a `<div>` appended to `document.body` with a controlled bounding rect.
 * All created elements are automatically removed by `cleanupElements()`.
 */
export function createElement(
  rect: { top: number; height: number; left?: number | undefined; width?: number | undefined } = {
    top: 0,
    height: 100,
  },
): HTMLElement {
  const el = document.createElement('div');
  const { top, height, left = 0, width = 200 } = rect;
  el.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  document.body.appendChild(el);
  createdElements.push(el);
  return el;
}

export function cleanupElements(): void {
  for (const el of createdElements) {
    el.remove();
  }
  createdElements.length = 0;
}

// ---------------------------------------------------------------------------
// Drag event helpers (matching atlaskit's own _util.ts patterns)
// ---------------------------------------------------------------------------

interface InputOverrides {
  altKey?: boolean | undefined;
  ctrlKey?: boolean | undefined;
  shiftKey?: boolean | undefined;
  metaKey?: boolean | undefined;
  clientX?: number | undefined;
  clientY?: number | undefined;
}

function getDefaultInput(overrides: InputOverrides = {}): InputOverrides {
  return {
    altKey: false,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    clientX: 0,
    clientY: 0,
    ...overrides,
  };
}

/**
 * Simulate lifting (starting a drag on) an element.
 * Fires `dragstart` and flushes the rAF that pragmatic-dnd uses internally.
 */
export async function lift(element: HTMLElement, input?: InputOverrides): Promise<void> {
  fireEvent.dragStart(element, getDefaultInput(input));
  // pragmatic-dnd defers onDragStart to the next animation frame
  await flushRaf();
}

/**
 * Simulate dragging over a drop target (fires dragEnter).
 */
export async function dragEnter(element: HTMLElement, input?: InputOverrides): Promise<void> {
  fireEvent.dragEnter(element, getDefaultInput(input));
}

/**
 * Simulate continued dragging over a drop target (fires dragOver).
 * pragmatic-dnd throttles dragOver to one per rAF.
 */
export async function dragOver(element: HTMLElement, input?: InputOverrides): Promise<void> {
  fireEvent.dragOver(element, getDefaultInput(input));
  await flushRaf();
}

/**
 * Simulate dropping on a target.
 */
export function drop(element: HTMLElement, input?: InputOverrides): void {
  fireEvent.drop(element, getDefaultInput(input));
}

/**
 * Cancel a drag (escape / drop outside window).
 */
export function cancel(element: HTMLElement = document.body): void {
  fireEvent.dragLeave(element);
  fireEvent.dragEnd(element);
}

/**
 * Clean up any pending drag state. Call in `afterEach`.
 */
export function resetDrag(): void {
  fireEvent.dragEnd(window);
  // Cleaning up post-drop fix in pragmatic-dnd
  fireEvent.pointerMove(window);
}

/**
 * Flush one requestAnimationFrame tick.
 * In base-ui's JSDOM setup, rAF is mapped to `setTimeout(cb, 0)`.
 */
export async function flushRaf(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

// ---------------------------------------------------------------------------
// Full drag sequence helper
// ---------------------------------------------------------------------------

/**
 * Execute a complete drag-and-drop sequence: lift → enter target → drop.
 */
export async function dragAndDrop(
  source: HTMLElement,
  target: HTMLElement,
  input?: InputOverrides,
): Promise<void> {
  await lift(source, input);
  await dragEnter(target, input);
  await dragOver(target, input);
  drop(target, input);
}

// ---------------------------------------------------------------------------
// Plugin setup helper
// ---------------------------------------------------------------------------

export interface SetupResult {
  plugin: ReturnType<typeof useDragAndDrop>;
  context: CollectionActions;
  states: DragAndDropState[];
  lastState: () => DragAndDropState | null;
  cleanup: () => void;
}

/**
 * Create a `useDragAndDrop` plugin, attach it to a mock context, and return
 * everything needed for test assertions.
 */
export function setupPlugin(
  params: UseDragAndDropNS.Parameters,
  contextOptions?: MockContextOptions,
): SetupResult {
  const { result } = renderHook(() => useDragAndDrop(params));
  const plugin = result.current;
  const { context, config, states, lastState } = createMockContext(contextOptions);
  const detach = plugin.attach(context, config);

  return {
    plugin,
    context,
    states,
    lastState,
    cleanup: detach,
  };
}
