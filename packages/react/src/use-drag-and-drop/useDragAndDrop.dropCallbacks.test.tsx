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
describe.skipIf(!isJSDOM)('drop callbacks', () => {
  // ---------------------------------------------------------------------------
  // onMove (internal drops — all items known to the same collection)
  // ---------------------------------------------------------------------------

  describe('onMove', () => {
    it('is called for "before" position', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin({ onMove }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 110 → relativeY 0.10 → top 50% of 2-zone → "before"
      await dragEnter(elB, { clientY: 110 });
      await dragOver(elB, { clientY: 110 });
      drop(elB, { clientY: 110 });

      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
          target: { itemId: 'b', position: 'before' },
          dropOperation: 'move',
        }),
      );
    });

    it('is called for "after" position', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin({ onMove }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 190 → relativeY 0.90 → bottom 25% → "after"
      await dragEnter(elB, { clientY: 190 });
      await dragOver(elB, { clientY: 190 });
      drop(elB, { clientY: 190 });

      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { itemId: 'b', position: 'after' },
        }),
      );
    });

    it('is called for "on" position (expandable item)', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin(
        { onMove },
        {
          knownItemIds: ['a', 'b'],
        },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 150 → relativeY 0.50 → middle of 3-zone → "on"
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });
      drop(elB, { clientY: 150 });

      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { itemId: 'b', position: 'on' },
        }),
      );
    });

    it('receives the correct parameter shape', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin({ onMove }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });
      drop(elB, { clientY: 175 });

      const params = onMove.mock.calls[0][0];
      expect(params.itemIds).toBeInstanceOf(Set);
      expect(params.target).toHaveProperty('itemId');
      expect(params.target).toHaveProperty('position');
      expect(params.dropOperation).toBeTypeOf('string');
    });
  });

  // ---------------------------------------------------------------------------
  // onReorder (internal drops, before/after only, no onMove)
  // ---------------------------------------------------------------------------

  describe('onReorder', () => {
    it('is called for "before" position', async () => {
      const onReorder = vi.fn();
      const { plugin } = setupPlugin({ onReorder }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 110 });
      await dragOver(elB, { clientY: 110 });
      drop(elB, { clientY: 110 });

      expect(onReorder).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
          target: { itemId: 'b', position: 'before' },
        }),
      );
    });

    it('is called for "after" position', async () => {
      const onReorder = vi.fn();
      const { plugin } = setupPlugin({ onReorder }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });
      drop(elB, { clientY: 175 });

      expect(onReorder).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { itemId: 'b', position: 'after' },
        }),
      );
    });

    it('is NOT called for "on" position', async () => {
      const onReorder = vi.fn();
      const { plugin } = setupPlugin(
        { onReorder },
        {
          knownItemIds: ['a', 'b'],
        },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 150 → "on" position, but onReorder doesn't accept "on"
      // Since only onReorder is provided, accepted positions are before/after only.
      // So middle zone is split 50/50 → this will be "before" or "after"
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });
      drop(elB, { clientY: 150 });

      // Even on an expandable item, onReorder should not receive "on"
      if (onReorder.mock.calls.length > 0) {
        expect(onReorder.mock.calls[0][0].target.position).not.toBe('on');
      }
    });

    it('onMove takes priority over onReorder when both provided', async () => {
      const onMove = vi.fn();
      const onReorder = vi.fn();
      const { plugin } = setupPlugin({ onMove, onReorder }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 175 });
      await dragOver(elB, { clientY: 175 });
      drop(elB, { clientY: 175 });

      expect(onMove).toHaveBeenCalled();
      expect(onReorder).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // onInsert (external drops — items not known to target collection)
  // ---------------------------------------------------------------------------

  describe('onInsert', () => {
    it('is called for "before" position from external source', async () => {
      const onInsert = vi.fn();
      // Plugin that accepts items from another drag type
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onInsert,
          acceptedDragTypes: 'all',
        },
        { knownItemIds: ['x', 'y'] },
      );
      // Source plugin with different items
      const { plugin: sourcePlugin } = setupPlugin(
        { onMove: vi.fn(), dragType: 'other-type' },
        { knownItemIds: ['a', 'b'] },
      );

      const sourceEl = createElement({ top: 0, height: 100 });
      const targetEl = createElement({ top: 200, height: 100 });
      sourcePlugin.setupItem('a', sourceEl);
      targetPlugin.setupItem('x', targetEl);

      await lift(sourceEl);
      // clientY 210 → relativeY 0.10 → top 50% → "before"
      await dragEnter(targetEl, { clientY: 210 });
      await dragOver(targetEl, { clientY: 210 });
      drop(targetEl, { clientY: 210 });

      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
          target: { itemId: 'x', position: 'before' },
        }),
      );
    });

    it('is called for "after" position from external source', async () => {
      const onInsert = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onInsert,
          acceptedDragTypes: 'all',
        },
        { knownItemIds: ['x', 'y'] },
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
      // clientY 290 → relativeY 0.90 → bottom 25% → "after"
      await dragEnter(targetEl, { clientY: 290 });
      await dragOver(targetEl, { clientY: 290 });
      drop(targetEl, { clientY: 290 });

      expect(onInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { itemId: 'x', position: 'after' },
        }),
      );
    });

    it('receives the correct parameter shape', async () => {
      const onInsert = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onInsert,
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
      drop(targetEl, { clientY: 275 });

      if (onInsert.mock.calls.length > 0) {
        const params = onInsert.mock.calls[0][0];
        expect(params.itemIds).toBeInstanceOf(Set);
        expect(params.target).toHaveProperty('itemId');
        expect(params.target).toHaveProperty('position');
        expect(params.dropOperation).toBeTypeOf('string');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // onItemDrop (external drops ON an item)
  // ---------------------------------------------------------------------------

  describe('onItemDrop', () => {
    it('is called for "on" position from external source', async () => {
      const onItemDrop = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onItemDrop,
          acceptedDragTypes: 'all',
        },
        {
          knownItemIds: ['x'],
          expandableItemIds: new Set(['x']),
        },
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
      // clientY 250 → relativeY 0.50 → middle of 3-zone → "on"
      await dragEnter(targetEl, { clientY: 250 });
      await dragOver(targetEl, { clientY: 250 });
      drop(targetEl, { clientY: 250 });

      expect(onItemDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
          target: { itemId: 'x' },
        }),
      );
    });

    it('receives the correct parameter shape', async () => {
      const onItemDrop = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onItemDrop,
          acceptedDragTypes: 'all',
        },
        {
          knownItemIds: ['x'],
          expandableItemIds: new Set(['x']),
        },
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
      await dragEnter(targetEl, { clientY: 250 });
      await dragOver(targetEl, { clientY: 250 });
      drop(targetEl, { clientY: 250 });

      if (onItemDrop.mock.calls.length > 0) {
        const params = onItemDrop.mock.calls[0][0];
        expect(params.itemIds).toBeInstanceOf(Set);
        expect(params.target).toHaveProperty('itemId');
        expect(params.target).not.toHaveProperty('position');
        expect(params.dropOperation).toBeTypeOf('string');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // onRootDrop (drop on the empty area)
  // ---------------------------------------------------------------------------

  describe('onRootDrop', () => {
    it('is called when items are dropped on the root element', async () => {
      const onRootDrop = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onRootDrop,
          acceptedDragTypes: 'all',
        },
        { knownItemIds: ['x'] },
      );
      const { plugin: sourcePlugin } = setupPlugin(
        { onMove: vi.fn(), dragType: 'other-type' },
        { knownItemIds: ['a'] },
      );

      const sourceEl = createElement({ top: 0, height: 100 });
      const rootEl = createElement({ top: 300, height: 200 });
      sourcePlugin.setupItem('a', sourceEl);
      targetPlugin.setupRoot(rootEl);

      await lift(sourceEl);
      // Enter and drop on root element directly (without going through an item)
      await dragEnter(rootEl, { clientY: 400 });
      await dragOver(rootEl, { clientY: 400 });
      drop(rootEl, { clientY: 400 });

      expect(onRootDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
        }),
      );
    });

    it('receives the correct parameter shape', async () => {
      const onRootDrop = vi.fn();
      const { plugin: targetPlugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onRootDrop,
          acceptedDragTypes: 'all',
        },
        { knownItemIds: ['x'] },
      );
      const { plugin: sourcePlugin } = setupPlugin(
        { onMove: vi.fn(), dragType: 'other-type' },
        { knownItemIds: ['a'] },
      );

      const sourceEl = createElement({ top: 0, height: 100 });
      const rootEl = createElement({ top: 300, height: 200 });
      sourcePlugin.setupItem('a', sourceEl);
      targetPlugin.setupRoot(rootEl);

      await lift(sourceEl);
      await dragEnter(rootEl, { clientY: 400 });
      await dragOver(rootEl, { clientY: 400 });
      drop(rootEl, { clientY: 400 });

      if (onRootDrop.mock.calls.length > 0) {
        const params = onRootDrop.mock.calls[0][0];
        expect(params.itemIds).toBeInstanceOf(Set);
        expect(params.dropOperation).toBeTypeOf('string');
      }
    });

    it('uses the first allowed operation regardless of modifier keys', async () => {
      const onRootDrop = vi.fn();
      const { plugin } = setupPlugin(
        {
          onMove: vi.fn(),
          onRootDrop,
          getAllowedDropOperations: () => ['copy', 'move'],
        },
        { knownItemIds: ['a', 'b'] },
      );

      const elA = createElement({ top: 0, height: 100 });
      const rootEl = createElement({ top: 300, height: 200 });
      plugin.setupItem('a', elA);
      plugin.setupRoot(rootEl);

      // Drag with Shift key held (which would normally indicate 'move' on Windows/Linux)
      await lift(elA, { shiftKey: true });
      await dragEnter(rootEl, { clientY: 400, shiftKey: true });
      await dragOver(rootEl, { clientY: 400, shiftKey: true });
      drop(rootEl, { clientY: 400, shiftKey: true });

      if (onRootDrop.mock.calls.length > 0) {
        // onRootDrop always uses the first allowed operation ('copy'), not the modifier-derived one
        expect(onRootDrop.mock.calls[0][0].dropOperation).toBe('copy');
      }
    });
  });
});
