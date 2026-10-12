import { TransitionStatusDataAttributes } from '../../internals/stateAttributesMapping';

/**
 * Present on the drag preview, whether it's a clone of the item or custom content.
 * A clone keeps the item's classes, so use this attribute to tell them apart in CSS.
 */
export const dragPreview = 'data-drag-preview';
/**
 * Present on the preview while it ends after a deliberate release. A `translate`
 * transition then moves it to the item's final position, or back to the item
 * after a release outside every target. Without one, it ends where it was released.
 * The preview stays mounted until animations started by this state finish.
 */
export const endingStyle = TransitionStatusDataAttributes.endingStyle;
/**
 * Present on the preview while it ends after a drop on a target. Absent when it ends
 * after a release outside every target.
 */
export const dropped = 'data-dropped';
