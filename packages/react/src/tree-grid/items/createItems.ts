import type { TreeGridItemId } from '../store/types';

import { createInternalTreeGridItemCollection } from './itemCollection';
import type { TreeGridItemCollection } from './itemCollection';

const DEFAULT_GET_CHILDREN = () => undefined;
const DEFAULT_IS_DISABLED = () => false;

export interface TreeGridCreateItemsOptions<TItem> {
  /** Returns the unique ID that identifies an item. */
  getId: (item: TItem) => TreeGridItemId;
  /**
   * Returns the item's text label, used as its accessible name and for typeahead and filtering.
   * Visible row content is rendered by the `TreeGrid.List` children.
   */
  getLabel: (item: TItem) => string;
  /** Returns an item's children. Items are treated as leaves when omitted. */
  getChildren?: ((item: TItem) => readonly TItem[] | undefined) | undefined;
  /** Returns whether an item is disabled. Items are enabled when omitted. */
  isDisabled?: ((item: TItem) => boolean) | undefined;
  /**
   * Returns whether an item does not support selection at all.
   * Items support selection when omitted. Disabled items still cannot be selected by the user,
   * but keep reporting their selected state.
   */
  isSelectionDisabled?: ((item: TItem) => boolean) | undefined;
  /** Returns a copy of an item with replacement children. */
  setChildren?: ((item: TItem, children: readonly TItem[]) => TItem) | undefined;
}

/**
 * Creates an opaque item collection for the root component.
 *
 * Create static collections at module scope. Memoize dynamic collections by their data and every
 * reactive value used by their accessors.
 * Accessors are not called until the collection is consumed by a root component.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid#createitems)
 *
 * @param data The items to render, or `undefined` when there are none yet.
 * @param options Accessors that read and update the item model.
 */
export function createTreeGridItems<TItem>(
  data: readonly TItem[] | undefined,
  options: TreeGridCreateItemsOptions<TItem>,
): TreeGridItemCollection<TItem> {
  const {
    getId,
    getLabel,
    getChildren = DEFAULT_GET_CHILDREN,
    isDisabled = DEFAULT_IS_DISABLED,
    isSelectionDisabled = DEFAULT_IS_DISABLED,
    setChildren,
  } = options;

  return createInternalTreeGridItemCollection(data, {
    itemToId: getId,
    itemToStringLabel: getLabel,
    itemToChildren: getChildren,
    isItemDisabled: isDisabled,
    isItemSelectionDisabled: isSelectionDisabled,
    setItemChildren: setChildren,
  });
}
