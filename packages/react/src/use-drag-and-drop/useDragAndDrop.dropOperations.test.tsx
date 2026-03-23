import { describe, it, expect, vi, afterEach } from 'vitest';
import { isJSDOM } from '#test-utils';
import {
  createElement,
  cleanupElements,
  setupPlugin,
  lift,
  dragEnter,
  dragOver,
  drop,
  resetDrag,
} from './testing';

afterEach(() => {
  resetDrag();
  cleanupElements();
});

// The drag-event polyfill only works in JSDOM (it's a no-op when native DragEvent exists),
// so synthetic drag events lack a dataTransfer in real browsers.
describe.skipIf(!isJSDOM)('drop operations', () => {
  // ---------------------------------------------------------------------------
  // getAllowedDropOperations
  // ---------------------------------------------------------------------------

  describe('getAllowedDropOperations', () => {
    it('defaults to ["move"] when not provided', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin({ onMove }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(lastState()?.dropOperation).toBe('move');
    });

    it('uses the value returned by getAllowedDropOperations', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['copy'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(lastState()?.dropOperation).toBe('copy');
    });

    it('is called with the dragged itemIds set', async () => {
      const getAllowedDropOperations = vi.fn().mockReturnValue(['move']);
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), getAllowedDropOperations },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      plugin.setupItem('a', elA);

      await lift(elA);

      expect(getAllowedDropOperations).toHaveBeenCalledWith(new Set(['a']));
    });
  });

  // ---------------------------------------------------------------------------
  // getDropOperation
  // ---------------------------------------------------------------------------

  describe('getDropOperation', () => {
    it('returns first allowed operation when not provided', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['link', 'copy'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(lastState()?.dropOperation).toBe('link');
    });

    it('calls getDropOperation with correct parameters', async () => {
      const getDropOperation = vi.fn().mockReturnValue('copy');
      const { plugin } = setupPlugin(
        {
          onMove: vi.fn(),
          getAllowedDropOperations: () => ['move', 'copy'],
          getDropOperation,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(getDropOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          draggedItemIds: new Set(['a']),
          target: expect.objectContaining({
            itemId: 'b',
            position: expect.any(String),
          }),
          allowedOperations: expect.any(Array),
          isInternal: true,
        }),
      );
    });

    it('"cancel" return prevents state update', async () => {
      const getDropOperation = vi.fn().mockReturnValue('cancel');
      const { plugin, states } = setupPlugin(
        {
          onMove: vi.fn(),
          getAllowedDropOperations: () => ['move', 'copy'],
          getDropOperation,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      const stateCountAfterLift = states.length;

      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      // No new state update with a drop target should have been emitted
      // (the cancel makes it not droppable)
      const statesAfterDrag = states.slice(stateCountAfterLift);
      const dropTargetStates = statesAfterDrag.filter((s) => s.dropTargetItemId != null);
      expect(dropTargetStates).toHaveLength(0);
    });

    it('passes isInternal=true when all items are in the collection', async () => {
      const getDropOperation = vi.fn().mockReturnValue('move');
      const { plugin } = setupPlugin(
        {
          onMove: vi.fn(),
          getDropOperation,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(getDropOperation).toHaveBeenCalledWith(expect.objectContaining({ isInternal: true }));
    });

    it('passes isInternal=false when items are external', async () => {
      const getDropOperation = vi.fn().mockReturnValue('move');
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onInsert: vi.fn(),
          getDropOperation,
          acceptedDragTypes: 'all',
        },
        { knownItemIds: ['x'] },
      );
      const { plugin: sourcePlugin } = setupPlugin(
        { onMove: vi.fn(), dragType: 'other-type' },
        { knownItemIds: ['a'] },
      );

      const sourceEl = createElement({ top: 0, height: 100 });
      const targetEl = createElement({ top: 200, height: 100 });
      sourcePlugin.setupItem('a', sourceEl);
      targetPlugin.setupItem('x', targetEl);

      await lift(sourceEl);
      await dragEnter(targetEl, { clientY: 275 });
      await dragOver(targetEl, { clientY: 275 });

      expect(getDropOperation).toHaveBeenCalledWith(expect.objectContaining({ isInternal: false }));
    });
  });

  // ---------------------------------------------------------------------------
  // canDrop
  // ---------------------------------------------------------------------------

  describe('canDrop', () => {
    it('prevents state update when returning false', async () => {
      const { plugin, states } = setupPlugin(
        {
          onMove: vi.fn(),
          canDrop: () => false,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      const stateCountAfterLift = states.length;

      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      // No state with a drop target should have been emitted
      const statesAfterDrag = states.slice(stateCountAfterLift);
      const dropTargetStates = statesAfterDrag.filter((s) => s.dropTargetItemId != null);
      expect(dropTargetStates).toHaveLength(0);
    });

    it('allows state update when returning true', async () => {
      const { plugin, lastState } = setupPlugin(
        {
          onMove: vi.fn(),
          canDrop: () => true,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(lastState()?.dropTargetItemId).toBe('b');
    });

    it('prevents drop callback when returning false at drop time', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin(
        {
          onMove,
          canDrop: () => false,
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });
      drop(elB, { clientY: 175 });

      expect(onMove).not.toHaveBeenCalled();
    });

    it('receives the correct parameters', async () => {
      const canDrop = vi.fn().mockReturnValue(true);
      const { plugin } = setupPlugin({ onMove: vi.fn(), canDrop }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(canDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          draggedItemIds: new Set(['a']),
          targetItemId: 'b',
          position: expect.any(String),
        }),
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Drop target validation (built-in)
  // ---------------------------------------------------------------------------

  describe('drop target validation', () => {
    it('cannot drop on the dragged item itself', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin({ onMove }, { knownItemIds: ['a'] });
      const elA = createElement({ top: 0, height: 100 });
      plugin.setupItem('a', elA);

      await lift(elA);
      await dragEnter(elA, { clientY: 50 });
      await dragOver(elA, { clientY: 50 });
      drop(elA, { clientY: 50 });

      expect(onMove).not.toHaveBeenCalled();
    });

    it('cannot drop on descendants of dragged items', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin(
        { onMove },
        {
          knownItemIds: ['parent', 'child'],
          parentMap: { child: 'parent' },
        },
      );
      const elParent = createElement({ top: 0, height: 100 });
      const elChild = createElement({ top: 100, height: 100 });
      plugin.setupItem('parent', elParent);
      plugin.setupItem('child', elChild);

      await lift(elParent);
      await dragEnter(elChild, { clientY: 150 });
      await dragOver(elChild, { clientY: 150 });
      drop(elChild, { clientY: 150 });

      expect(onMove).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Modifier keys
  // ---------------------------------------------------------------------------

  describe('modifier keys', () => {
    // Note: IS_MAC is determined at module load time from navigator.userAgent.
    // In JSDOM, userAgent does not contain "Mac" so we test non-Mac behavior.

    it('no modifier → uses first allowed operation', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['copy', 'move'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });

      expect(lastState()?.dropOperation).toBe('copy');
    });

    it('Ctrl → filters to "copy" (non-Mac)', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['move', 'copy', 'link'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175, ctrlKey: true });
      await dragOver(elB, { clientY: 175, ctrlKey: true });

      expect(lastState()?.dropOperation).toBe('copy');
    });

    it('Alt → filters to "link" (non-Mac)', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['move', 'copy', 'link'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175, altKey: true });
      await dragOver(elB, { clientY: 175, altKey: true });

      expect(lastState()?.dropOperation).toBe('link');
    });

    it('Shift → filters to "move" (non-Mac)', async () => {
      const onMove = vi.fn();
      const { plugin, lastState } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['copy', 'move', 'link'],
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175, shiftKey: true });
      await dragOver(elB, { clientY: 175, shiftKey: true });

      expect(lastState()?.dropOperation).toBe('move');
    });

    it('modifier requesting unavailable operation → "cancel"', async () => {
      const onMove = vi.fn();
      const { plugin, states } = setupPlugin(
        {
          onMove,
          getAllowedDropOperations: () => ['move'], // only move allowed
        },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      const stateCountAfterLift = states.length;

      // Ctrl requests "copy" which is not allowed
      await dragEnter(elB, { clientY: 175, ctrlKey: true });
      await dragOver(elB, { clientY: 175, ctrlKey: true });

      // No valid drop target state should have been set (cancel = not droppable)
      const statesAfterDrag = states.slice(stateCountAfterLift);
      const dropTargetStates = statesAfterDrag.filter((s) => s.dropTargetItemId != null);
      expect(dropTargetStates).toHaveLength(0);
    });
  });
});
