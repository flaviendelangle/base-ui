import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tree } from '..';
import { useDragAndDrop } from '../../use-drag-and-drop';

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

function DnDTree() {
  const [items] = React.useState(ITEMS);
  const dragAndDrop = useDragAndDrop({
    onMove: vi.fn(),
  });

  return (
    <Tree.Root items={items} dragAndDrop={dragAndDrop} defaultExpandedItems={['a']}>
      {(item) => (
        <Tree.Item itemId={item.id} data-testid={`item-${item.id}`}>
          <Tree.ItemLabel />
        </Tree.Item>
      )}
    </Tree.Root>
  );
}

describe('Tree drag and drop', () => {
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
});
