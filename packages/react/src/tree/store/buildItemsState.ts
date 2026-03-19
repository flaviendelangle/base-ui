import type { TreeItemId, TreeDefaultItemModel, TreeItemMeta, TreeItemsState } from './types';
import { TREE_SELECTION_ALL, TREE_VIEW_ROOT_PARENT_ID } from './types';

export function buildItemsState<TItem = TreeDefaultItemModel>(
  items: readonly TItem[],
  itemToId: (item: TItem) => TreeItemId,
  itemToStringLabel: (item: TItem) => string,
  itemToChildren: (item: TItem) => TItem[] | undefined,
  isItemDisabled: (item: TItem) => boolean,
  isItemSelectionDisabled: (item: TItem) => boolean,
): TreeItemsState<TItem> {
  const itemMetaLookup: Record<TreeItemId, TreeItemMeta> = {};
  const itemModelLookup: Record<TreeItemId, TItem> = {};
  const itemOrderedChildrenIdsLookup: Record<TreeItemId, TreeItemId[]> = {};
  const itemChildrenIndexesLookup: Record<TreeItemId, Record<TreeItemId, number>> = {};
  const itemIdLookup: Record<string, TreeItemId> = {};

  function processSiblings(siblings: readonly TItem[], parentId: TreeItemId | null, depth: number) {
    const parentKey = parentId ?? TREE_VIEW_ROOT_PARENT_ID;
    const orderedChildrenIds: TreeItemId[] = [];
    const childrenIndexes: Record<TreeItemId, number> = {};

    for (let i = 0; i < siblings.length; i += 1) {
      const item = siblings[i];
      const itemId = itemToId(item);
      const children = itemToChildren(item);
      const expandable = !!children && children.length > 0;

      if (process.env.NODE_ENV !== 'production') {
        if (itemMetaLookup[itemId] != null) {
          console.error(
            `Base UI Tree: Two items have the same \`id\` property: "${itemId}". ` +
              'Each item must have a unique ID. The second item will overwrite the first.',
          );
        }

        if (itemId === TREE_SELECTION_ALL) {
          console.warn(
            'Base UI Tree: An item has its `id` property equal to "all". ' +
              'This value is reserved as a sentinel for selecting all items and will cause unexpected behavior with selection. ' +
              'Please use a different `id` for this item.',
          );
        }
      }

      itemIdLookup[itemId] = itemId;
      orderedChildrenIds.push(itemId);
      childrenIndexes[itemId] = i;

      itemModelLookup[itemId] = item;
      itemMetaLookup[itemId] = {
        id: itemId,
        parentId,
        depth,
        expandable,
        disabled: isItemDisabled(item),
        selectable: !isItemSelectionDisabled(item),
        label: itemToStringLabel(item),
      };

      if (children && children.length > 0) {
        processSiblings(children, itemId, depth + 1);
      }
    }

    itemOrderedChildrenIdsLookup[parentKey] = orderedChildrenIds;
    itemChildrenIndexesLookup[parentKey] = childrenIndexes;
  }

  processSiblings(items, null, 0);

  return {
    itemMetaLookup,
    itemModelLookup,
    itemOrderedChildrenIdsLookup,
    itemChildrenIndexesLookup,
    itemIdLookup,
  };
}
