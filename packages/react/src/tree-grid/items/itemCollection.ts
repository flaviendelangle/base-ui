import type { TreeGridItemId } from '../store/types';

const TREE_GRID_ITEM_COLLECTION = Symbol('TreeGridItemCollection');

/**
 * An opaque collection created by `TreeGrid.createItems()`.
 *
 * It carries the source item type so the root can infer it for its props, callbacks, and actions.
 * Pass it directly to the root component; it has no public members.
 */
export declare class TreeGridItemCollection<in out TItem> {
  private constructor();
  private readonly __treeItemCollectionBrand: (item: TItem) => TItem;
}

/**
 * The members behind a `TreeGridItemCollection`. The package doesn't export it, but the built
 * types of other modules reference it, so `stripInternal` must keep it.
 */
export interface InternalTreeGridItemCollection<TItem = any> {
  readonly [TREE_GRID_ITEM_COLLECTION]: true;
  readonly data: readonly TItem[] | undefined;
  readonly itemToId: (item: TItem) => TreeGridItemId;
  readonly itemToStringLabel: (item: TItem) => string;
  readonly itemToChildren: (item: TItem) => readonly TItem[] | undefined;
  readonly isItemDisabled: (item: TItem) => boolean;
  readonly isItemSelectionDisabled: (item: TItem) => boolean;
  readonly setItemChildren: ((item: TItem, children: readonly TItem[]) => TItem) | undefined;
}

/** The members that read an item. Lookups built with them go stale when one changes. */
export const ITEM_READER_KEYS = [
  'itemToId',
  'itemToStringLabel',
  'itemToChildren',
  'isItemDisabled',
  'isItemSelectionDisabled',
] as const;

export type TreeGridItemReaders<TItem> = Pick<
  InternalTreeGridItemCollection<TItem>,
  (typeof ITEM_READER_KEYS)[number]
>;

export function createInternalTreeGridItemCollection<TItem>(
  data: readonly TItem[] | undefined,
  accessors: Omit<InternalTreeGridItemCollection<TItem>, typeof TREE_GRID_ITEM_COLLECTION | 'data'>,
): TreeGridItemCollection<TItem> {
  return {
    [TREE_GRID_ITEM_COLLECTION]: true,
    data,
    ...accessors,
  } as unknown as TreeGridItemCollection<TItem>;
}

const STANDARD_ACCESSORS = {
  itemToId: (item: any): TreeGridItemId => item.id,
  itemToStringLabel: (item: any): string => item.label,
  itemToChildren: (item: any): readonly any[] | undefined => item.children,
  isItemDisabled: (item: any): boolean => !!item.disabled,
  isItemSelectionDisabled: () => false,
  setItemChildren: (item: any, children: readonly any[]): any => ({ ...item, children }),
};

export function createStandardTreeGridItemCollection<TItem>(
  data: readonly TItem[] | undefined,
): InternalTreeGridItemCollection<TItem> {
  return {
    [TREE_GRID_ITEM_COLLECTION]: true,
    data,
    ...STANDARD_ACCESSORS,
  };
}

export function normalizeTreeGridItemCollection<TItem>(
  value: readonly TItem[] | TreeGridItemCollection<TItem> | undefined,
): InternalTreeGridItemCollection<TItem> {
  if (Array.isArray(value) || value === undefined) {
    return createStandardTreeGridItemCollection(value);
  }

  if (
    (value as Partial<InternalTreeGridItemCollection> | null)?.[TREE_GRID_ITEM_COLLECTION] !== true
  ) {
    throw new Error(
      'Base UI: the `items` or `defaultItems` prop received an object that is not a valid item collection, ' +
        'so its items and accessors cannot be read. Pass a standard item array or the result of ' +
        '`TreeGrid.createItems()`. ' +
        'See https://base-ui.com/react/components/tree-grid#createitems',
    );
  }

  return value as unknown as InternalTreeGridItemCollection<TItem>;
}
