import type { TreeStore } from '../store/TreeStore';
import type { CollectionItemId } from '../../types/collection';
import { selectors } from '../store/selectors';
import { REASONS } from '../../utils/reasons';

export class TreeEditingPlugin {
  private store: TreeStore;

  constructor(store: TreeStore) {
    this.store = store;
  }

  /**
   * Enter edit mode for the given item.
   * No-op if the item is not editable or is disabled.
   */
  public startEditing = (itemId: CollectionItemId): void => {
    if (!selectors.isItemEditable(this.store.state, itemId)) {
      return;
    }
    if (selectors.isItemDisabled(this.store.state, itemId)) {
      return;
    }
    this.store.set('editingItemId', itemId);
  };

  /**
   * Cancel editing and re-focus the previously edited item.
   */
  public cancelEditing = (): void => {
    const editingId = this.store.state.editingItemId;
    this.store.set('editingItemId', null);
    if (editingId != null) {
      requestAnimationFrame(() => {
        this.store.interaction.focusItem(editingId, REASONS.imperativeAction);
      });
    }
  };

  /**
   * Save the new label for the item and exit edit mode.
   * Delegates to `itemMutation.setItemLabel` to update the items array
   * and fire `onItemsChange`.
   */
  public saveEditing = (itemId: CollectionItemId, newLabel: string): void => {
    this.store.itemMutation.setItemLabel(itemId, newLabel);
    this.store.set('editingItemId', null);
    requestAnimationFrame(() => {
      this.store.interaction.focusItem(itemId, REASONS.imperativeAction);
    });
  };

  public actions = {
    startEditing: this.startEditing,
    cancelEditing: this.cancelEditing,
  };
}
