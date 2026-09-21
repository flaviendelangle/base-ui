import type { ListboxSortingItem } from './ListboxSortingContext';
import type { ListboxSortingDropPosition } from '../sortable-provider/ListboxSortableProvider';
import type { ListboxSortingDestination } from './useListboxSorting';

export function getListboxDropDestination(
  ordered: ListboxSortingItem<unknown>[],
  position: ListboxSortingDropPosition,
): ListboxSortingDestination | null {
  const target = ordered.find((item) => item.id === position.id);
  if (!target || target.disabled) {
    return null;
  }
  const index = position.index ?? target.index + (position.placement === 'after' ? 1 : 0);
  const group = ordered.filter((item) => item.groupId === target.groupId);
  // Overrides use list-wide indices and must remain within the destination group.
  if (
    !Number.isInteger(index) ||
    index < group[0].index ||
    index > group[group.length - 1].index + 1 ||
    ordered.some(
      (item) =>
        item.index >= Math.min(index, target.index) &&
        item.index < Math.max(index, target.index) &&
        item.groupId !== target.groupId,
    )
  ) {
    return null;
  }
  return { index, groupId: target.groupId };
}
