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
   * Present on the item picked up after a pointer drop, until its drag preview's ending
   * animation finishes. Managed by the drag engine.
   */
  settling = 'data-settling',
  /** Present when the item is the current pointer sorting or external drop destination. */
  dragOver = 'data-drag-over',
  /** The sorting or external drop destination: before or after. */
  dropPosition = 'data-drop-position',
}
