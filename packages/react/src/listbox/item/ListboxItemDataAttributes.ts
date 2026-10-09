/**
 * Present when the listbox item is selected.
 */
export const selected = 'data-selected';
/**
 * Present when the listbox item is highlighted.
 */
export const highlighted = 'data-highlighted';
/**
 * Present when the listbox item is disabled.
 */
export const disabled = 'data-disabled';
/**
 * Present while the item participates in an active pointer sort, including
 * selected items moving with the picked-up item. Items disabled for sorting are excluded.
 * Removed when the gesture ends or is canceled; not set by keyboard sorting.
 * Unlike `data-dragging`, this does not mean the item was physically picked up.
 */
export const moving = 'data-moving';
/** Present only on the item physically picked up. Managed by the drag engine. */
export const dragging = 'data-dragging';
/**
 * Present on the item picked up after a pointer drop, until its drag preview's ending
 * animation finishes. Managed by the drag engine.
 */
export const settling = 'data-settling';
/** Present when the item is the current pointer sorting or external drop destination. */
export const dragOver = 'data-drag-over';
/** The sorting or external drop destination: before or after. */
export const dropPosition = 'data-drop-position';
