export type CollectionItemId = string | number;

/**
 * Actions that can be performed on all collection-based components, such as a Tree.
 */
export interface CollectionActions<TItem = unknown> {
  /**
   * Returns the zero-based index of an item among its siblings.
   */
  getItemIndex(itemId: CollectionItemId): number;
  /**
   * Returns whether the given item exists in the collection.
   */
  hasItem(itemId: CollectionItemId): boolean;
  /**
   * Returns all currently selected item IDs.
   */
  getSelectedItemIds(): Set<CollectionItemId>;
  /**
   * Returns the model (data) associated with the given item ID,
   * or `undefined` if the item does not exist.
   */
  getItemModel(itemId: CollectionItemId): TItem | undefined;
  /**
   * Returns the models (data) for the given item IDs.
   * Items that do not exist in the collection are excluded from the result.
   */
  getItemModels(itemIds: Set<CollectionItemId>): TItem[];
}
