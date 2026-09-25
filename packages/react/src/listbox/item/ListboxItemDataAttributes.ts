export enum ListboxItemDataAttributes {
  /**
   * Present when the listbox item is selected.
   */
  selected = 'data-selected',
  /**
   * Present when the listbox item is highlighted.
   */
  highlighted = 'data-highlighted',
  /**
   * Present when the listbox item is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present while the item participates in an active pointer sort, including
   * selected items moving with the picked-up item. Items disabled for sorting are excluded.
   * Removed when the gesture ends or is canceled; not set by keyboard sorting.
   * Unlike `data-dragging`, this does not mean the item was physically picked up.
   */
  moving = 'data-moving',
  /** Present only on the item physically picked up. Managed by the drag engine. */
  dragging = 'data-dragging',
  /**
   * Present when a dragged item is over the listbox item.
   */
  dragOver = 'data-drag-over',
  /**
   * Indicates the drop position relative to the item.
   * The value is `'before'` or `'after'`.
   */
  dropPosition = 'data-drop-position',
}
