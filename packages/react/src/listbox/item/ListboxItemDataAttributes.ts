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
   * Present when the listbox item is being dragged.
   */
  dragging = 'data-dragging',
  /**
   * Present when a dragged item is over the listbox item.
   */
  dragOver = 'data-drag-over',
  /**
   * Present while `trackDisplacement` animates the item from a previous layout position.
   */
  displacing = 'data-displacing',
  /**
   * Present on the first frame of a displacement animation.
   */
  startingStyle = 'data-starting-style',
  /**
   * Indicates the drop position relative to the item.
   * The value is `'before'` or `'after'`.
   */
  dropPosition = 'data-drop-position',
}
