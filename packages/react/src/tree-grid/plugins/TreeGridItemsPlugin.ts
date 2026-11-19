import type { TreeGridDefaultItem, TreeGridItemId } from '../store/types';
import type { TreeGridStore } from '../store/TreeGridStore';
import { selectors } from '../store/selectors';
import { buildItemsState } from '../store/itemIndex';
import { getItemIdKey } from '../utils/itemIdKey';
import { getRowsPerPage } from '../utils/viewport';
import type { TreeGridViewport } from '../utils/viewport';

export class TreeGridItemsPlugin<TItem = TreeGridDefaultItem> {
  declare private store: TreeGridStore<boolean | undefined, TItem>;

  private elements = new Map<string, HTMLElement>();

  /** The mounted list. */
  private viewport: TreeGridViewport | null = null;

  constructor(store: TreeGridStore<boolean | undefined, TItem>) {
    this.store = store;
  }

  public getItemDOMElement(itemId: TreeGridItemId): HTMLElement | null {
    return this.elements.get(getItemIdKey(itemId)) ?? null;
  }

  public registerItemDOMElement(itemId: TreeGridItemId, element: HTMLElement): () => void {
    const key = getItemIdKey(itemId);
    this.elements.set(key, element);
    return () => {
      if (this.elements.get(key) === element) {
        this.elements.delete(key);
      }
    };
  }

  /**
   * @internal Attaches the mounted list, which keeps the focused row in view
   * until the returned function detaches it.
   */
  public attachViewport(viewport: TreeGridViewport): () => void {
    this.viewport = viewport;
    const unobserve = this.store.observe(selectors.focusedItemId, (itemId, previousItemId) => {
      if (this.viewport === viewport && itemId != null && itemId !== previousItemId) {
        this.revealItem(itemId);
      }
    });
    return () => {
      unobserve();
      if (this.viewport === viewport) {
        this.viewport = null;
      }
    };
  }

  /**
   * Scrolls the row of an item into view. The browser's focus scrolling is
   * suppressed, as it scrolls every ancestor of the list.
   */
  public revealItem(itemId: TreeGridItemId): void {
    this.viewport?.scrollToItem(itemId);
  }

  /** Scrolls an element inside a row into view along the horizontal axis. */
  public revealHorizontally(element: HTMLElement): void {
    this.viewport?.scrollIntoViewHorizontally(element);
  }

  /**
   * How many rows from the row of `itemId` fit in the list: at least one, or `0`
   * while rows can't be measured.
   */
  public getPageSize(itemId: TreeGridItemId): number {
    const viewport = this.viewport;
    return viewport == null
      ? 0
      : getRowsPerPage(viewport.getScrollportHeight(), viewport.getRowHeight(itemId));
  }

  /** Rebuilds all lookup tables from `state.items` and the current accessors. */
  public rebuildItemsState(): void {
    const { state } = this.store;
    this.store.update(buildItemsState(state.items, state.itemCollection));
  }

  public actions = {
    hasItem: (itemId: TreeGridItemId) => selectors.itemMeta(this.store.state, itemId) != null,
    getItemModels: (itemIds: Iterable<TreeGridItemId>) => {
      const models: TItem[] = [];
      for (const id of itemIds) {
        const model = selectors.itemModel(this.store.state, id);
        if (model != null) {
          models.push(model);
        }
      }
      return models;
    },
    getItemIndex: (itemId: TreeGridItemId) => selectors.itemIndex(this.store.state, itemId),
    isItemDisabled: (itemId: TreeGridItemId) => selectors.isItemDisabled(this.store.state, itemId),
    getItemModel: (itemId: TreeGridItemId) => selectors.itemModel(this.store.state, itemId),
    getChildIds: (itemId: TreeGridItemId | null) =>
      selectors.itemOrderedChildrenIds(this.store.state, itemId).slice(),
    getItemDOMElement: (itemId: TreeGridItemId) => this.getItemDOMElement(itemId),
    getParentId: (itemId: TreeGridItemId) => selectors.itemParentId(this.store.state, itemId),
    getAncestorIds: (itemId: TreeGridItemId): TreeGridItemId[] =>
      selectors.ancestorIds(this.store.state, itemId).slice(),
  };
}
