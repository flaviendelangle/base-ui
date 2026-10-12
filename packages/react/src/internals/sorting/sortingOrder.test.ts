import { describe, expect, it } from 'vitest';
import { matchesSortingOrder, restoreSortingOrder } from './sortingOrder';

function order(...containers: Array<[string | null, string[]]>) {
  return new Map(containers);
}

describe('sortingOrder', () => {
  it('ignores additions and deletions when comparing surviving siblings', () => {
    expect(
      matchesSortingOrder(order([null, ['a', 'new', 'c']]), order([null, ['a', 'b', 'c']])),
    ).toBe(true);
  });

  it('detects reordered siblings and changed containers', () => {
    const expected = order([null, ['a', 'b']], ['folder', []]);
    expect(matchesSortingOrder(order([null, ['b', 'a']], ['folder', []]), expected)).toBe(false);
    expect(matchesSortingOrder(order([null, ['b']], ['folder', ['a']]), expected)).toBe(false);
  });

  it('leaves container iteration order to the component', () => {
    expect(
      matchesSortingOrder(
        order(['two', ['b']], ['one', ['a']]),
        order(['one', ['a']], ['two', ['b']]),
      ),
    ).toBe(true);
  });

  it.each([
    { current: ['new', 'b', 'a', 'c'], restored: ['new', 'a', 'b', 'c'] },
    { current: ['b', 'new', 'a', 'c'], restored: ['a', 'new', 'b', 'c'] },
    { current: ['b', 'a', 'c', 'new'], restored: ['a', 'b', 'c', 'new'] },
    { current: ['x', 'b', 'y', 'a', 'c', 'z'], restored: ['x', 'a', 'y', 'b', 'c', 'z'] },
  ])('preserves inserted slots in $current', ({ current, restored }) => {
    expect(
      restoreSortingOrder(order([null, current]), order([null, ['a', 'b', 'c']])).get(null),
    ).toEqual(restored);
  });

  it('restores parents and keeps new children in their current containers', () => {
    const original = order([null, ['a', 'folder']], ['folder', ['b']]);
    const current = order([null, ['folder']], ['folder', ['a', 'x', 'b', 'y']]);
    expect(restoreSortingOrder(current, original)).toEqual(
      order([null, ['a', 'folder']], ['folder', ['b', 'x', 'y']]),
    );
  });

  it('restores items into an empty container', () => {
    const original = order(['one', ['a']], ['two', ['b']]);
    const current = order(['one', []], ['two', ['a', 'b']]);
    expect(restoreSortingOrder(current, original)).toEqual(original);
  });

  it('keeps survivors in their current container if their original container was removed', () => {
    const current = order([null, ['x', 'a']]);
    const original = order([null, ['folder']], ['folder', ['a']]);
    expect(restoreSortingOrder(current, original)).toEqual(current);
  });

  it('does not resurrect deleted items', () => {
    expect(
      restoreSortingOrder(order([null, ['c', 'a']]), order([null, ['a', 'b', 'c']])).get(null),
    ).toEqual(['a', 'c']);
  });

  it('uses current models with custom identity, including remounted items', () => {
    const before = { id: 'a', label: 'A', registration: 'old' };
    const after = { id: 'a', label: 'Edited', registration: 'new' };
    const b = { id: 'b', label: 'B', registration: 'b' };
    const original = new Map([[null, [before, b]]]);
    const current = new Map([[null, [b, after]]]);
    const sameItem = (a: typeof before, other: typeof before) => a.id === other.id;
    const restored = restoreSortingOrder(current, original, sameItem);
    expect(restored.get(null)).toEqual([after, b]);
    expect(restored.get(null)![0]).toBe(after);
    expect(matchesSortingOrder(restored, original, sameItem)).toBe(true);
  });

  it('preserves array models as items', () => {
    const a = ['a'];
    const b = ['b'];
    const original = new Map([[null, [a, b]]]);
    const current = new Map([[null, [b, a]]]);
    expect(restoreSortingOrder(current, original)).toEqual(original);
  });
});
