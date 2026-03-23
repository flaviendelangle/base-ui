export enum TreeCheckboxItemDataAttributes {
  /**
   * The id of the item.
   */
  itemId = 'data-item-id',
  /**
   * Present when the item is expanded.
   */
  expanded = 'data-expanded',
  /**
   * Present when the item is collapsed.
   */
  collapsed = 'data-collapsed',
  /**
   * Present when the item is checked.
   */
  checked = 'data-checked',
  /**
   * Present when the item is not checked.
   */
  unchecked = 'data-unchecked',
  /**
   * Present when the item is in an indeterminate state.
   */
  indeterminate = 'data-indeterminate',
  /**
   * Present when the item is focused.
   */
  focused = 'data-focused',
  /**
   * Present when the item is disabled.
   */
  disabled = 'data-disabled',
  /**
   * Present when the item has children and can be expanded.
   */
  expandable = 'data-expandable',
  /**
   * Present when the item is being dragged.
   */
  dragged = 'data-dragged',
  /**
   * Present when the item is a drop target.
   */
  dropTarget = 'data-drop-target',
  /**
   * The drop position relative to the item: 'before', 'after', or 'child'.
   */
  dropPosition = 'data-drop-position',
  /**
   * The drop operation for the item: 'move', 'copy', or 'link'.
   */
  dropOperation = 'data-drop-operation',
  /**
   * Present when the item belongs to the drop target's group (folder subtree).
   */
  dropTargetGroup = 'data-drop-target-group',
}
