'use client';
import { getListboxDropDestination } from '../sorting/dropPosition';
import type { AnyDragAccept, AcceptedDragPayload, DragSource } from '../../types/drag';
import { useDirection } from '../../internals/direction-context';
import { useExternalDrop } from '../../internals/sorting/useExternalDrop';
import type { useListboxRootContext } from '../root/ListboxRootContext';
import type { ListboxSortingItemRecord } from '../sorting/ListboxSortingContext';
import type { ListboxItemId } from '../utils/ListboxItemId';
import type {
  ListboxItemExternalDropTargetOptions,
  ListboxItemExternalDropTargetDropContext,
} from './ListboxItemExternalDropTarget';
import { getListboxDropItems } from '../sorting/useListboxDropItem';

type Store = ReturnType<typeof useListboxRootContext>;
type Item = ListboxSortingItemRecord<unknown>;

export function useListboxExternalDrop<TAccept extends AnyDragAccept, Value>(
  store: Store,
  item: Omit<Item, 'id'> & { id: ListboxItemId | undefined },
  options: ListboxItemExternalDropTargetOptions<TAccept, Value> | undefined,
) {
  const direction = useDirection();
  const records = getListboxDropItems(store);
  return useExternalDrop({
    accept: options?.accept,
    collectionId: store,
    itemId: item.id,
    disabled: item.disabled || item.index < 0 || !options || !!options.dropDisabled,
    onDrop: options?.onDrop,
    onDropPositionChange: options?.onDropPositionChange,
    resolve: ({
      source,
      element,
      input,
    }): ListboxItemExternalDropTargetDropContext<AcceptedDragPayload<TAccept>, Value> | null => {
      if (!options || item.id === undefined) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      const point = {
        x: rect.width ? (input.clientX - rect.left) / rect.width : 0,
        y: rect.height ? (input.clientY - rect.top) / rect.height : 0,
      };
      const context = {
        // useExternalDrop checked the accepted kinds before calling this resolver.
        source: source as DragSource<AcceptedDragPayload<TAccept>>,
        item: item.value as Value,
        itemId: item.id,
        itemMetadata: { index: item.index, groupId: item.groupId, disabled: item.disabled },
        point,
      };
      const horizontalCoordinate = direction === 'rtl' ? 1 - point.x : point.x;
      const coordinate = store.state.orientation === 'horizontal' ? horizontalCoordinate : point.y;
      const defaultPlacement = coordinate < 0.5 ? 'before' : 'after';
      const resolved = options.getDropPosition
        ? options.getDropPosition(context)
        : defaultPlacement;
      if (!resolved) {
        return null;
      }
      const position =
        typeof resolved === 'string' ? { id: item.id, placement: resolved } : resolved;
      const ordered = Array.from(records.values(), (read) => read()).sort(
        (a, b) => a.index - b.index,
      );
      const destination = getListboxDropDestination(ordered, position);
      if (!destination) {
        return null;
      }
      const drop = { ...context, position, destination };
      return (options.canDrop?.(drop) ?? true) ? drop : null;
    },
  });
}
