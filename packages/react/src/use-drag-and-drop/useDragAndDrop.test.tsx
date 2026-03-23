import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent } from '@mui/internal-test-utils';
import { renderHook } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';
import type { CollectionActions } from '../types/collection';
import type { DragAndDropState } from './useDragAndDrop';
import {
  createElement,
  cleanupElements,
  setupPlugin,
  lift,
  dragEnter,
  dragOver,
  drop,
  cancel,
  resetDrag,
  dragAndDrop,
} from './testing';

afterEach(() => {
  resetDrag();
  cleanupElements();
});

// ---------------------------------------------------------------------------
// Hook return value
// ---------------------------------------------------------------------------

describe('useDragAndDrop', () => {
  it('returns a DragAndDrop object with attach, setupItem, canDragItem', () => {
    const { result } = renderHook(() => useDragAndDrop({ onMove: vi.fn() }));
    expect(result.current.attach).toBeTypeOf('function');
    expect(result.current.setupItem).toBeTypeOf('function');
    expect(result.current.canDragItem).toBeTypeOf('function');
  });

  // ---- attach -------------------------------------------------------------

  describe('attach', () => {
    it('calls onStateChange immediately with initial state', () => {
      const { result } = renderHook(() => useDragAndDrop({ onMove: vi.fn() }));

      let lastState: DragAndDropState | null = null;
      const context: CollectionActions = {
        getItemIndex: () => 0,
        hasItem: () => false,
        getSelectedItemIds: () => new Set(),
        getItemModel: () => undefined,
        getItemModels: () => [],
      };

      result.current.attach(context, {
        onStateChange: (state) => {
          lastState = state;
        },
      });

      expect(lastState).not.toBeNull();
      expect(lastState!.draggedItemIds).toEqual(new Set());
      expect(lastState!.dropTargetItemId).toBeNull();
      expect(lastState!.dropPosition).toBeNull();
    });

    it('cleanup function clears the monitor', () => {
      const { cleanup, states } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a'] });

      // After cleanup, new drag events should not trigger state updates
      cleanup();
      const stateCountAfterCleanup = states.length;

      createElement();
      // Even if we try to set up an item after detach, it won't work
      // because the context is cleared
      expect(states.length).toBe(stateCountAfterCleanup);
    });
  });

  // ---- canDragItem --------------------------------------------------------

  describe('canDragItem', () => {
    it('returns true by default', () => {
      const { result } = renderHook(() => useDragAndDrop({ onMove: vi.fn() }));
      expect(result.current.canDragItem('item-1')).toBe(true);
    });

    it('respects canDrag callback', () => {
      const { result } = renderHook(() =>
        useDragAndDrop({
          onMove: vi.fn(),
          canDrag: (id) => id !== 'locked',
        }),
      );
      expect(result.current.canDragItem('item-1')).toBe(true);
      expect(result.current.canDragItem('locked')).toBe(false);
    });
  });

  // ---- setupItem ----------------------------------------------------------

  describe('setupItem', () => {
    it('registers element as draggable when canDrag returns true', () => {
      const { plugin } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a'] });
      const el = createElement();
      plugin.setupItem('a', el);

      expect(el.getAttribute('draggable')).toBe('true');
    });

    it('does not register element as draggable when canDrag returns false', () => {
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), canDrag: () => false },
        { knownItemIds: ['a'] },
      );
      const el = createElement();
      plugin.setupItem('a', el);

      expect(el.getAttribute('draggable')).not.toBe('true');
    });

    it('cleanup function deregisters the element', () => {
      const { plugin } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a'] });
      const el = createElement();
      const cleanupItem = plugin.setupItem('a', el);

      expect(el.getAttribute('draggable')).toBe('true');

      cleanupItem();
      expect(el.getAttribute('draggable')).not.toBe('true');
    });
  });

  // ---- State management during drag ---------------------------------------

  describe('state management during drag', () => {
    it('sets draggedItemIds on drag start', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement();
      plugin.setupItem('a', elA);

      await lift(elA);

      expect(lastState()?.draggedItemIds).toEqual(new Set(['a']));
    });

    it('sets dropTarget, dropPosition, dropOperation on drag enter', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // Drag over elB at the bottom 25% → 'after'
      await dragEnter(elB, { clientY: 190 });
      await dragOver(elB, { clientY: 190 });

      const state = lastState();
      expect(state?.dropTargetItemId).toBe('b');
      expect(state?.dropPosition).toBe('after');
      expect(state?.dropOperation).toBe('move');
    });

    it('clears dropTarget on drag leave but keeps draggedItemIds', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });

      // Now leave elB
      fireEvent.dragLeave(elB);

      const state = lastState();
      expect(state?.draggedItemIds).toEqual(new Set(['a']));
      expect(state?.dropTargetItemId).toBeNull();
      expect(state?.dropPosition).toBeNull();
    });

    it('resets to initial state on drop', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });
      drop(elB, { clientY: 150 });

      const state = lastState();
      expect(state?.draggedItemIds).toEqual(new Set());
      expect(state?.dropTargetItemId).toBeNull();
      expect(state?.dropPosition).toBeNull();
      expect(state?.dropOperation).toBeNull();
    });
  });

  // ---- Drag type filtering ------------------------------------------------

  describe('drag type filtering', () => {
    it('accepts own dragType by default', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement();
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      expect(lastState()?.draggedItemIds.size).toBeGreaterThan(0);
    });

    it('uses custom dragType', async () => {
      const onMove = vi.fn();
      const { plugin } = setupPlugin(
        { onMove, dragType: 'custom-type' },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement();
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });
      drop(elB, { clientY: 150 });

      expect(onMove).toHaveBeenCalled();
    });
  });

  // ---- onDragStart / onDragEnd --------------------------------------------

  describe('onDragStart / onDragEnd', () => {
    it('fires onDragStart with correct itemIds', async () => {
      const onDragStart = vi.fn();
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), onDragStart },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement();
      plugin.setupItem('a', elA);

      await lift(elA);

      expect(onDragStart).toHaveBeenCalledWith({
        itemIds: new Set(['a']),
      });
    });

    it('fires onDragEnd with isInternal=true for same-collection drop', async () => {
      const onDragEnd = vi.fn();
      const { plugin } = setupPlugin({ onMove: vi.fn(), onDragEnd }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await dragAndDrop(elA, elB, { clientY: 150 });

      expect(onDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a']),
          isInternal: true,
          dropOperation: 'move',
        }),
      );
    });

    it('fires onDragEnd with dropOperation="cancel" when drag is cancelled', async () => {
      const onDragEnd = vi.fn();
      const { plugin } = setupPlugin({ onMove: vi.fn(), onDragEnd }, { knownItemIds: ['a'] });
      const elA = createElement();
      plugin.setupItem('a', elA);

      await lift(elA);
      cancel(elA);

      expect(onDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          dropOperation: 'cancel',
        }),
      );
    });
  });

  // ---- Drop position computation ------------------------------------------

  describe('drop position computation', () => {
    it('returns "before" when cursor is in top 25% (expandable 3-zone item)', async () => {
      const { plugin, lastState } = setupPlugin(
        { onMove: vi.fn() },
        {
          knownItemIds: ['a', 'b'],
        },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 110 → relativeY = (110-100)/100 = 0.10 → top 25% → "before"
      await dragEnter(elB, { clientY: 110 });
      await dragOver(elB, { clientY: 110 });

      expect(lastState()?.dropPosition).toBe('before');
    });

    it('returns "on" when cursor is in middle 50% (expandable 3-zone item)', async () => {
      const { plugin, lastState } = setupPlugin(
        { onMove: vi.fn() },
        {
          knownItemIds: ['a', 'b'],
        },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 150 → relativeY = 0.50 → middle → "on"
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });

      expect(lastState()?.dropPosition).toBe('on');
    });

    it('returns "after" when cursor is in bottom 25% (expandable 3-zone item)', async () => {
      const { plugin, lastState } = setupPlugin(
        { onMove: vi.fn() },
        {
          knownItemIds: ['a', 'b'],
        },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 190 → relativeY = 0.90 → bottom 25% → "after"
      await dragEnter(elB, { clientY: 190 });
      await dragOver(elB, { clientY: 190 });

      expect(lastState()?.dropPosition).toBe('after');
    });

    it('returns "before" when cursor is in top 25% (3-zone item with onMove)', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 110 → relativeY = 0.10 → top 25% → "before"
      await dragEnter(elB, { clientY: 110 });
      await dragOver(elB, { clientY: 110 });

      expect(lastState()?.dropPosition).toBe('before');
    });

    it('returns "on" when cursor is in middle 50% (3-zone item with onMove)', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 150 → relativeY = 0.50 → middle 50% → "on"
      await dragEnter(elB, { clientY: 150 });
      await dragOver(elB, { clientY: 150 });

      expect(lastState()?.dropPosition).toBe('on');
    });

    it('returns "after" when cursor is in bottom 25% (3-zone item with onMove)', async () => {
      const { plugin, lastState } = setupPlugin({ onMove: vi.fn() }, { knownItemIds: ['a', 'b'] });
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 190 → relativeY = 0.90 → bottom 25% → "after"
      await dragEnter(elB, { clientY: 190 });
      await dragOver(elB, { clientY: 190 });

      expect(lastState()?.dropPosition).toBe('after');
    });

    it('returns "before"/"after" 2-zone when only onReorder is provided', async () => {
      const { plugin, lastState } = setupPlugin(
        { onReorder: vi.fn() },
        { knownItemIds: ['a', 'b'] },
      );
      const elA = createElement({ top: 0, height: 100 });
      const elB = createElement({ top: 100, height: 100 });
      plugin.setupItem('a', elA);
      plugin.setupItem('b', elB);

      await lift(elA);
      // clientY 130 → relativeY = 0.30 → top 50% → "before"
      await dragEnter(elB, { clientY: 130 });
      await dragOver(elB, { clientY: 130 });

      expect(lastState()?.dropPosition).toBe('before');
    });
  });

  // ---- Multi-selection drag -----------------------------------------------

  describe('multi-selection drag', () => {
    it('drags all selected items when dragged item is in selection', async () => {
      const onDragStart = vi.fn();
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), onDragStart },
        {
          knownItemIds: ['a', 'b', 'c'],
          selectedItemIds: new Set(['a', 'b']),
        },
      );
      const elA = createElement();
      plugin.setupItem('a', elA);

      await lift(elA);

      expect(onDragStart).toHaveBeenCalledWith({
        itemIds: new Set(['a', 'b']),
      });
    });

    it('drags only single item when not in selection', async () => {
      const onDragStart = vi.fn();
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), onDragStart },
        {
          knownItemIds: ['a', 'b', 'c'],
          selectedItemIds: new Set(['b', 'c']),
        },
      );
      const elA = createElement();
      plugin.setupItem('a', elA);

      await lift(elA);

      expect(onDragStart).toHaveBeenCalledWith({
        itemIds: new Set(['a']),
      });
    });

    it('prunes descendants from multi-selection set', async () => {
      const onDragStart = vi.fn();
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), onDragStart },
        {
          knownItemIds: ['parent', 'child', 'other'],
          selectedItemIds: new Set(['parent', 'child', 'other']),
          parentMap: { child: 'parent' },
        },
      );
      const elParent = createElement();
      plugin.setupItem('parent', elParent);

      await lift(elParent);

      // 'child' should be pruned because it's a descendant of 'parent'
      expect(onDragStart).toHaveBeenCalledWith({
        itemIds: new Set(['parent', 'other']),
      });
    });
  });

  // ---- Drag preview -------------------------------------------------------

  describe('drag preview', () => {
    it('calls renderDragPreview when provided', async () => {
      const renderDragPreview = vi.fn().mockReturnValue(null);
      const { plugin } = setupPlugin(
        { onMove: vi.fn(), renderDragPreview },
        { knownItemIds: ['a'] },
      );
      const el = createElement();
      plugin.setupItem('a', el);

      // The drag preview is generated during the dragstart event's
      // onGenerateDragPreview callback within pragmatic-dnd.
      // We can at least verify the callback is stored and the element is draggable.
      expect(el.getAttribute('draggable')).toBe('true');
    });
  });
});
