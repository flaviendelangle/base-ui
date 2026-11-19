import { describe, it, expect } from 'vitest';
import type { TreeGridState } from '../store/types';
import { buildItemsState } from '../store/itemIndex';
import { sortIdsByTreeGridOrder } from './sortIdsByTreeGridOrder';

interface Item {
  id: string;
  children?: Item[];
}

// Preorder of this tree: a, a1, a2, a3, b, b1, c
const ITEMS: Item[] = [
  { id: 'a', children: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] },
  { id: 'b', children: [{ id: 'b1' }] },
  { id: 'c' },
];

function makeState(items: Item[]): TreeGridState {
  const lookups = buildItemsState<Item>(items, {
    itemToId: (item) => item.id,
    itemToStringLabel: (item) => item.id,
    itemToChildren: (item) => item.children,
    isItemDisabled: () => false,
    isItemSelectionDisabled: () => false,
  });
  // The util only reads the lookup tables, so a lookup-only state is sufficient.
  return lookups as unknown as TreeGridState;
}

describe('sortIdsByTreeGridOrder', () => {
  const state = makeState(ITEMS);

  it('sorts reversed input back into tree order', () => {
    expect(sortIdsByTreeGridOrder(['a3', 'a1'], state)).toEqual(['a1', 'a3']);
  });

  it('sorts ids spanning multiple parents into preorder', () => {
    expect(sortIdsByTreeGridOrder(['c', 'a', 'b1', 'a2'], state)).toEqual(['a', 'a2', 'b1', 'c']);
  });

  it('orders a parent before its own descendants', () => {
    expect(sortIdsByTreeGridOrder(['a1', 'a'], state)).toEqual(['a', 'a1']);
  });

  it('does not depend on expansion state (collapsed items still order correctly)', () => {
    // The fixture has no expanded items, yet siblings under a collapsed parent
    // still sort by their sibling index.
    expect(sortIdsByTreeGridOrder(['b1', 'a3', 'a1'], state)).toEqual(['a1', 'a3', 'b1']);
  });
});
