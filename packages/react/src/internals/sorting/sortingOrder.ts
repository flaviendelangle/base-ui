/** Ordered siblings keyed by their parent or group. Include empty containers when restoring. */
export type SortingOrder<Item, Container> = ReadonlyMap<Container, readonly Item[]>;

/** Match snapshot items to current models. Items must have unique identities across containers. */
function matchItems<Item, Container>(
  current: SortingOrder<Item, Container>,
  reference: SortingOrder<Item, Container>,
  isEqual?: (a: Item, b: Item) => boolean,
) {
  const currentItems = Array.from(current.values()).flat();
  const currentSet = new Set(currentItems);
  const matches = new Map<Item, Item>();
  for (const siblings of reference.values()) {
    for (const item of siblings) {
      if (isEqual) {
        const index = currentItems.findIndex((candidate) => isEqual(candidate, item));
        if (index !== -1) {
          matches.set(item, currentItems[index]);
        }
      } else if (currentSet.has(item)) {
        matches.set(item, item);
      }
    }
  }
  return matches;
}

/**
 * Compare surviving items' containers and sibling order, ignoring additions, deletions,
 * and model edits. Container iteration order belongs to the component, not sorting.
 * Supply isEqual when identity differs from model equality; primitive IDs use a linear lookup.
 */
export function matchesSortingOrder<Item, Container>(
  current: SortingOrder<Item, Container>,
  expected: SortingOrder<Item, Container>,
  isEqual?: (a: Item, b: Item) => boolean,
): boolean {
  const matches = matchItems(current, expected, isEqual);
  const known = new Set(matches.values());
  for (const container of new Set([...current.keys(), ...expected.keys()])) {
    const actual = (current.get(container) ?? []).filter((item) => known.has(item));
    const wanted = (expected.get(container) ?? [])
      .filter((item) => matches.has(item))
      .map((item) => matches.get(item)!);
    if (actual.length !== wanted.length || actual.some((item, index) => item !== wanted[index])) {
      return false;
    }
  }
  return true;
}

/**
 * Restore surviving items to their original containers and sibling order using current models.
 * New items retain their current container and sibling slot, clamped to the restored length.
 * If an original container was removed, keep its surviving items in their current container.
 * Current must include empty containers that can receive restored items.
 */
export function restoreSortingOrder<Item, Container>(
  current: SortingOrder<Item, Container>,
  original: SortingOrder<Item, Container>,
  isEqual?: (a: Item, b: Item) => boolean,
): Map<Container, Item[]> {
  const matches = matchItems(current, original, isEqual);
  const restored = new Map<Container, Item[]>();
  const assigned = new Set<Item>();
  for (const container of current.keys()) {
    const siblings = (original.get(container) ?? [])
      .filter((item) => matches.has(item))
      .map((item) => matches.get(item)!);
    restored.set(container, siblings);
    siblings.forEach((item) => assigned.add(item));
  }
  for (const [container, currentSiblings] of current) {
    const siblings = restored.get(container)!;
    const next: Item[] = [];
    let index = 0;
    currentSiblings.forEach((item, slot) => {
      if (!assigned.has(item)) {
        while (next.length < slot && index < siblings.length) {
          next.push(siblings[index]);
          index += 1;
        }
        next.push(item);
      }
    });
    while (index < siblings.length) {
      next.push(siblings[index]);
      index += 1;
    }
    restored.set(container, next);
  }
  return restored;
}
