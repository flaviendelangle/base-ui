import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDragAndDrop } from './useDragAndDrop';
import type { UseDragAndDropComponentContext, DragAndDropState } from './useDragAndDrop';

describe('useDragAndDrop', () => {
  it('returns a DragAndDrop object with attach, setupItem, canDragItem', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({ onMove: vi.fn() }),
    );
    expect(result.current.attach).toBeTypeOf('function');
    expect(result.current.setupItem).toBeTypeOf('function');
    expect(result.current.canDragItem).toBeTypeOf('function');
  });

  it('attach() calls onStateChange immediately with initial state', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({ onMove: vi.fn() }),
    );

    let lastState: DragAndDropState | null = null;
    const context: UseDragAndDropComponentContext = {
      getParentId: () => null,
      getChildrenIds: () => [],
      isDescendantOf: () => false,
      getItemIndex: () => 0,
      isItemExpandable: () => false,
      expandItem: () => {},
      hasItem: () => false,
      getSelectedItemIds: () => [],
      onStateChange: (state) => {
        lastState = state;
      },
    };

    result.current.attach(context);

    // Should have called onStateChange immediately
    expect(lastState).not.toBeNull();
    expect(lastState!.draggedItemIds).toEqual(new Set());
    expect(lastState!.dropTargetItemId).toBeNull();
    expect(lastState!.dropPosition).toBeNull();
  });

  it('canDragItem returns true by default', () => {
    const { result } = renderHook(() =>
      useDragAndDrop({ onMove: vi.fn() }),
    );
    expect(result.current.canDragItem('item-1')).toBe(true);
  });

  it('canDragItem respects canDrag callback', () => {
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
