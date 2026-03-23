import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { Tree } from '..';

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const ITEMS: Item[] = [
  {
    id: 'a',
    label: 'A',
    children: [
      { id: 'a1', label: 'A1' },
      { id: 'a2', label: 'A2' },
      { id: 'a3', label: 'A3' },
    ],
  },
  {
    id: 'b',
    label: 'B',
    children: [
      { id: 'b1', label: 'B1' },
      { id: 'b2', label: 'B2' },
    ],
  },
  { id: 'c', label: 'C' },
];

function childIds(result: Item[], parentId?: string): string[] {
  if (!parentId) {
    return result.map((i) => i.id);
  }
  for (const item of result) {
    if (item.id === parentId) {
      return (item.children ?? []).map((c) => c.id);
    }
    if (item.children) {
      const found = childIds(item.children, parentId);
      if (found.length > 0 || item.children.some((c) => c.id === parentId)) {
        return found;
      }
    }
  }
  return [];
}

function TestTree({
  initialItems,
  actionsRef,
  onItemsChange,
}: {
  initialItems: Item[];
  actionsRef: React.RefObject<Tree.Root.Actions<Item> | null>;
  onItemsChange: (items: Item[]) => void;
}) {
  return (
    <Tree.Root
      items={initialItems}
      onItemsChange={onItemsChange}
      actionsRef={actionsRef}
      defaultExpandedItems={['a', 'b']}
    >
      {(item) => (
        <Tree.Item itemId={item.id}>
          <Tree.ItemLabel />
        </Tree.Item>
      )}
    </Tree.Root>
  );
}

describe('actionsRef.moveItems', () => {
  it('moves a single item to a different parent', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a1']), 'b', 2));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a2', 'a3']);
    expect(childIds(result, 'b')).toEqual(['b1', 'b2', 'a1']);
  });

  it('moves a single item within the same parent (forward)', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a1']), 'a', 2));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a2', 'a1', 'a3']);
  });

  it('moves a single item within the same parent (backward)', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a3']), 'a', 0));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a3', 'a1', 'a2']);
  });

  it('moves a single item to root level', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a1']), null, 0));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result)).toEqual(['a1', 'a', 'b', 'c']);
    expect(childIds(result, 'a')).toEqual(['a2', 'a3']);
  });

  it('moves a root item within root (reorder)', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a']), null, 2));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result)).toEqual(['b', 'a', 'c']);
  });

  it('moves multiple items to a different parent', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a1', 'a3']), 'b', 0));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a2']);
    expect(childIds(result, 'b')).toEqual(['a1', 'a3', 'b1', 'b2']);
  });

  it('prunes descendants when parent and child are both selected', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItems(new Set(['a', 'a1']), null, 2));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result)).toEqual(['b', 'a', 'c']);
    expect(childIds(result, 'a')).toEqual(['a1', 'a2', 'a3']);
  });
});

describe('actionsRef.moveItemsBefore', () => {
  it('moves a single item before a target', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItemsBefore(new Set(['a1']), 'b2'));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a2', 'a3']);
    expect(childIds(result, 'b')).toEqual(['b1', 'a1', 'b2']);
  });

  it('moves multiple items before a target', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItemsBefore(new Set(['a1', 'a2']), 'b1'));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a3']);
    expect(childIds(result, 'b')).toEqual(['a1', 'a2', 'b1', 'b2']);
  });
});

describe('actionsRef.moveItemsAfter', () => {
  it('moves a single item after a target', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItemsAfter(new Set(['a1']), 'b1'));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result, 'a')).toEqual(['a2', 'a3']);
    expect(childIds(result, 'b')).toEqual(['b1', 'a1', 'b2']);
  });

  it('moves a single item after the last root item', () => {
    const actionsRef = React.createRef<Tree.Root.Actions<Item>>();
    const onItemsChange = vi.fn();
    render(<TestTree initialItems={ITEMS} actionsRef={actionsRef} onItemsChange={onItemsChange} />);

    act(() => actionsRef.current!.moveItemsAfter(new Set(['a1']), 'c'));

    const result = onItemsChange.mock.calls[0][0] as Item[];
    expect(childIds(result)).toEqual(['a', 'b', 'c', 'a1']);
  });
});
