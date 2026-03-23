import * as React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Tree } from '..';
import { useDragAndDrop } from '../../use-drag-and-drop';
import { resetDrag, lift, dragEnter, dragOver, drop } from '../../use-drag-and-drop/testing';

afterEach(() => {
  resetDrag();
});

const ITEMS = [
  {
    id: 'a',
    label: 'Item A',
    children: [
      { id: 'a1', label: 'Item A1' },
      { id: 'a2', label: 'Item A2' },
    ],
  },
  { id: 'b', label: 'Item B' },
];

// ---------------------------------------------------------------------------
// Test component helpers
// ---------------------------------------------------------------------------

function DnDTree(props: {
  onMove?: (params: any) => void;
  canDrag?: (id: string | number) => boolean;
  items?: typeof ITEMS;
}) {
  const [items, setItems] = React.useState(props.items ?? ITEMS);
  const dragAndDrop = useDragAndDrop({
    onMove: props.onMove ?? vi.fn(),
    canDrag: props.canDrag,
  });

  return (
    <Tree.Root
      items={items}
      onItemsChange={setItems}
      dragAndDrop={dragAndDrop}
      defaultExpandedItems={['a']}
    >
      {(item) => (
        <Tree.Item itemId={item.id} data-testid={`item-${item.id}`}>
          <Tree.ItemDragIndicator data-testid={`drag-indicator-${item.id}`}>
            ⠿
          </Tree.ItemDragIndicator>
          <Tree.ItemExpansionTrigger />
          <Tree.ItemLabel />
        </Tree.Item>
      )}
    </Tree.Root>
  );
}

// ---------------------------------------------------------------------------
// Item attributes
// ---------------------------------------------------------------------------

describe('Tree drag and drop', () => {
  describe('item attributes', () => {
    it('items should have draggable attribute when dragAndDrop is provided', async () => {
      render(<DnDTree />);

      // Wait for mount effect + re-render
      await vi.waitFor(() => {
        const itemA = screen.getByTestId('item-a');
        expect(itemA.getAttribute('draggable')).toBe('true');
      });
    });

    it('items should have data-dragged=undefined when not dragging', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        const itemA = screen.getByTestId('item-a');
        expect(itemA.getAttribute('draggable')).toBe('true');
      });

      const itemA = screen.getByTestId('item-a');
      expect(itemA.hasAttribute('data-dragged')).toBe(false);
    });

    it('items that cannot be dragged should not have draggable attribute', async () => {
      render(<DnDTree canDrag={(id) => id !== 'b'} />);

      await vi.waitFor(() => {
        const itemA = screen.getByTestId('item-a');
        expect(itemA.getAttribute('draggable')).toBe('true');
      });

      const itemB = screen.getByTestId('item-b');
      expect(itemB.getAttribute('draggable')).not.toBe('true');
    });

    it('all items should be registered as drop targets', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        const itemA = screen.getByTestId('item-a');
        expect(itemA.getAttribute('draggable')).toBe('true');
      });

      // All items including children should be draggable
      const itemA1 = screen.getByTestId('item-a1');
      expect(itemA1.getAttribute('draggable')).toBe('true');
    });
  });

  // ---- Drag state on tree items -------------------------------------------

  describe('drag state attributes', () => {
    it('sets data-dragged on the dragged item during drag', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a').getAttribute('draggable')).toBe('true');
      });

      const itemA = screen.getByTestId('item-a');
      await lift(itemA);

      expect(itemA.hasAttribute('data-dragged')).toBe(true);
    });

    it('sets data-drop-target and data-drop-position on hover target', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-b').getAttribute('draggable')).toBe('true');
      });

      const itemA1 = screen.getByTestId('item-a1');
      const itemB = screen.getByTestId('item-b');

      // Get itemB's position for clientY calculation
      const rect = itemB.getBoundingClientRect();

      await lift(itemA1);
      // Drag over itemB at the bottom half → "after"
      await dragEnter(itemB, { clientY: rect.top + rect.height * 0.75 });
      await dragOver(itemB, { clientY: rect.top + rect.height * 0.75 });

      expect(itemB.hasAttribute('data-drop-target')).toBe(true);
      expect(itemB.getAttribute('data-drop-position')).toBeTruthy();
    });

    it('clears drag state after drop', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a1').getAttribute('draggable')).toBe('true');
      });

      const itemA1 = screen.getByTestId('item-a1');
      const itemB = screen.getByTestId('item-b');
      const rect = itemB.getBoundingClientRect();

      await lift(itemA1);
      await dragEnter(itemB, { clientY: rect.top + rect.height * 0.75 });
      await dragOver(itemB, { clientY: rect.top + rect.height * 0.75 });
      drop(itemB, { clientY: rect.top + rect.height * 0.75 });

      // After drop, state should reset
      await vi.waitFor(() => {
        expect(itemA1.hasAttribute('data-dragged')).toBe(false);
      });
      expect(itemB.hasAttribute('data-drop-target')).toBe(false);
    });
  });

  // ---- DragIndicator ------------------------------------------------------

  describe('DragIndicator', () => {
    it('renders when dragAndDrop is enabled and item is draggable', async () => {
      render(<DnDTree />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a').getAttribute('draggable')).toBe('true');
      });

      const indicator = screen.getByTestId('drag-indicator-a');
      expect(indicator).toBeTruthy();
    });

    it('does not render when canDrag returns false for the item', async () => {
      render(<DnDTree canDrag={(id) => id !== 'b'} />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a').getAttribute('draggable')).toBe('true');
      });

      // DragIndicator for 'b' should not render (enabled=false suppresses rendering)
      expect(screen.queryByTestId('drag-indicator-b')).toBeNull();
    });
  });

  // ---- Disabled items and canDrag -----------------------------------------

  describe('disabled items', () => {
    it('disabled items should not be draggable when canDrag checks disabled state', async () => {
      const disabledItems = new Set(['b']);
      render(<DnDTree canDrag={(id) => !disabledItems.has(String(id))} />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a').getAttribute('draggable')).toBe('true');
      });

      const itemB = screen.getByTestId('item-b');
      expect(itemB.getAttribute('draggable')).not.toBe('true');
    });

    it('dropping onto a non-draggable item should still work (it is a valid drop target)', async () => {
      const onMove = vi.fn();
      render(<DnDTree onMove={onMove} canDrag={(id) => id !== 'b'} />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a1').getAttribute('draggable')).toBe('true');
      });

      const itemA1 = screen.getByTestId('item-a1');
      const itemB = screen.getByTestId('item-b');
      const rect = itemB.getBoundingClientRect();

      await lift(itemA1);
      await dragEnter(itemB, { clientY: rect.top + rect.height * 0.75 });
      await dragOver(itemB, { clientY: rect.top + rect.height * 0.75 });
      drop(itemB, { clientY: rect.top + rect.height * 0.75 });

      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a1']),
          target: expect.objectContaining({
            itemId: 'b',
          }),
        }),
      );
    });
  });

  describe('dynamic canDrag changes', () => {
    it('items remain draggable when canDrag changes without remounting (known limitation)', async () => {
      // canDragItem is evaluated at setupItem time. Changing canDrag's return value
      // without also changing the item ID or remounting the item won't update draggability.
      // This test documents the current behavior.
      function DnDTreeWithToggle() {
        const [canDragB, setCanDragB] = React.useState(true);
        const dragAndDrop = useDragAndDrop({
          onMove: vi.fn(),
          canDrag: (id) => (id === 'b' ? canDragB : true),
        });

        return (
          <div>
            <button data-testid="toggle" onClick={() => setCanDragB(false)}>
              Toggle
            </button>
            <Tree.Root items={ITEMS} dragAndDrop={dragAndDrop} defaultExpandedItems={['a']}>
              {(item) => (
                <Tree.Item itemId={item.id} data-testid={`item-${item.id}`}>
                  <Tree.ItemDragIndicator data-testid={`drag-indicator-${item.id}`}>
                    ⠿
                  </Tree.ItemDragIndicator>
                  <Tree.ItemExpansionTrigger />
                  <Tree.ItemLabel />
                </Tree.Item>
              )}
            </Tree.Root>
          </div>
        );
      }

      render(<DnDTreeWithToggle />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-b').getAttribute('draggable')).toBe('true');
      });

      // Toggle canDrag for 'b' to false
      act(() => {
        screen.getByTestId('toggle').click();
      });

      // The item remains draggable because setupItem doesn't re-run when canDrag changes.
      // This documents a known limitation — the setupItem effect depends on
      // [store, dragAndDropEnabled, itemId] but not on canDrag's return value.
      expect(screen.getByTestId('item-b').getAttribute('draggable')).toBe('true');
    });
  });

  // ---- Integration: actual move callback ----------------------------------

  describe('move integration', () => {
    it('calls onMove when dragging and dropping between items', async () => {
      const onMove = vi.fn();
      render(<DnDTree onMove={onMove} />);

      await vi.waitFor(() => {
        expect(screen.getByTestId('item-a1').getAttribute('draggable')).toBe('true');
      });

      const itemA1 = screen.getByTestId('item-a1');
      const itemB = screen.getByTestId('item-b');
      const rect = itemB.getBoundingClientRect();

      await lift(itemA1);
      await dragEnter(itemB, { clientY: rect.top + rect.height * 0.75 });
      await dragOver(itemB, { clientY: rect.top + rect.height * 0.75 });
      drop(itemB, { clientY: rect.top + rect.height * 0.75 });

      expect(onMove).toHaveBeenCalledWith(
        expect.objectContaining({
          itemIds: new Set(['a1']),
          target: expect.objectContaining({
            itemId: 'b',
          }),
        }),
      );
    });
  });
});
