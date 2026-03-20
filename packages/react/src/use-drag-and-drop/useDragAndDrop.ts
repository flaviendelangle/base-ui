'use client';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { TimeoutManager } from '@base-ui/utils/TimeoutManager';

// ---------------------------------------------------------------------------
// Private constants
// ---------------------------------------------------------------------------

const DEFAULT_DRAG_TYPE = 'base-ui-dnd-item';
const AUTO_EXPAND_DELAY = 800;

function dropOperationToDropEffect(op: DropOperation): 'move' | 'copy' | 'link' {
  if (op === 'copy') {
    return 'copy';
  }
  if (op === 'link') {
    return 'link';
  }
  return 'move';
}

const IS_MAC =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * Filter allowed operations based on keyboard modifiers pressed during drag.
 * Uses platform-specific mappings that match native OS behavior and React Aria:
 *
 * macOS:   Alt/Option → copy, Ctrl → link, Cmd → move
 * Win/Lin: Ctrl → copy, Alt → link, Shift → move
 *
 * When no modifier is pressed, all operations are available.
 * When a modifier IS pressed, only the intersection of the modifier-requested
 * operation and the source's allowed operations is returned.
 */
function filterOperationsByModifiers(
  allowedOperations: DropOperation[],
  input: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
): DropOperation[] {
  let requested: DropOperation | null = null;

  if (IS_MAC) {
    if (input.altKey) {
      requested = 'copy';
    }
    if (input.ctrlKey) {
      requested = 'link';
    }
    if (input.metaKey) {
      requested = 'move';
    }
  } else {
    if (input.ctrlKey) {
      requested = 'copy';
    }
    if (input.altKey) {
      requested = 'link';
    }
    if (input.shiftKey) {
      requested = 'move';
    }
  }

  if (requested == null) {
    return allowedOperations as DropOperation[];
  }

  return allowedOperations.includes(requested) ? [requested] : [];
}

const EMPTY_SET = new Set<DraggableItemId>();

const INITIAL_STATE: DragAndDropState = {
  draggedItemIds: EMPTY_SET,
  dropTargetItemId: null,
  dropPosition: null,
  dropOperation: null,
};

// ---------------------------------------------------------------------------
// DragAndDropPlugin – private implementation
// ---------------------------------------------------------------------------

class DragAndDropPlugin {
  private configRef: React.RefObject<UseDragAndDropParameters>;

  private context: UseDragAndDropComponentContext | null = null;

  private monitorCleanup: (() => void) | null = null;

  private timeoutManager = new TimeoutManager();

  /** Tracks the currently dragged item ids (set by the global monitor). */
  private currentDraggedItemIds: Set<DraggableItemId> = EMPTY_SET;

  /** Whether the drag was initiated by an item in THIS plugin's collection. */
  private dragOriginatedHere = false;

  /** Whether the drop was handled by THIS plugin instance. */
  private dropHandledHere = false;

  /** Tracks the last known drop position so we can use it in `onDrop`. */
  private lastDropPosition: DropPosition | null = null;

  /** Tracks the last known drop target id so we can use it in `onDrop`. */
  private lastDropTargetItemId: DraggableItemId | null = null;

  /** The allowed operations for the current drag, set at drag start. */
  private currentAllowedOperations: DropOperation[] = ['move'];

  /** The resolved drop operation for the current hover target. */
  private lastDropOperation: DropOperation | null = null;

  constructor(configRef: React.RefObject<UseDragAndDropParameters>) {
    this.configRef = configRef;
  }

  private get config(): UseDragAndDropParameters {
    return this.configRef.current;
  }

  private get dragType(): string {
    return this.config.dragType ?? DEFAULT_DRAG_TYPE;
  }

  private acceptsDragType(type: unknown): boolean {
    const accepted = this.config.acceptedDragTypes;
    if (accepted === 'all') {
      return true;
    }
    const acceptedList = accepted ?? [this.dragType];
    return acceptedList.includes(type as string);
  }

  /**
   * Infer accepted drop positions from the provided callbacks.
   */
  private get resolvedAcceptedDropPositions(): DropPosition[] {
    const conf = this.config;
    const positions = new Set<DropPosition>();
    if (conf.onReorder || conf.onInsert || conf.onMove) {
      positions.add('before');
      positions.add('after');
    }
    if (conf.onMove || conf.onItemDrop) {
      positions.add('on');
    }
    return positions.size > 0 ? Array.from(positions) : ['before', 'after', 'on'];
  }

  /**
   * Remove items that are descendants of other items in the set.
   * When a parent and its children are both selected, only the parent should move.
   */
  private pruneDescendants(itemIds: DraggableItemId[]): DraggableItemId[] {
    if (!this.context) {
      return itemIds;
    }
    return itemIds.filter(
      (id) =>
        !itemIds.some((otherId) => otherId !== id && this.context!.isDescendantOf(id, otherId)),
    );
  }

  // ---- DragAndDrop interface -----------------------------------------------

  attach(context: UseDragAndDropComponentContext): () => void {
    this.context = context;

    // Initialize state so that items know DnD is enabled and can register via setupItem.
    context.onStateChange(INITIAL_STATE);

    this.monitorCleanup = monitorForElements({
      canMonitor: ({ source }) => this.acceptsDragType(source.data.type),
      onDragStart: ({ source }) => {
        const itemIds = new Set(source.data.itemIds as DraggableItemId[]);
        this.currentDraggedItemIds = itemIds;
        this.currentAllowedOperations = (source.data.allowedOperations as
          | DropOperation[]
          | undefined) ?? ['move'];
        this.lastDropPosition = null;
        this.lastDropTargetItemId = null;
        this.lastDropOperation = null;
        this.dropHandledHere = false;
        // The drag originated here if all dragged items exist in this collection
        this.dragOriginatedHere =
          this.context != null && [...itemIds].every((id) => this.context!.hasItem(id));

        context.onStateChange({
          draggedItemIds: itemIds,
          dropTargetItemId: null,
          dropPosition: null,
          dropOperation: null,
        });

        // Only fire the user callback on the plugin that owns the dragged items
        if (this.dragOriginatedHere) {
          this.config.onDragStart?.({ itemIds });
        }
      },
      onDrop: () => {
        const draggedItemIds = this.currentDraggedItemIds;
        this.handleDrop();
        // isInternal = both the drag source and the drop target are this same plugin instance
        const isInternal = this.dragOriginatedHere && this.dropHandledHere;
        const dropOperation = this.lastDropOperation ?? 'cancel';
        context.onStateChange(INITIAL_STATE);
        this.currentDraggedItemIds = EMPTY_SET;
        this.currentAllowedOperations = ['move'];
        this.timeoutManager.clearAll();

        // Only fire the user callback on the plugin that originated the drag
        if (draggedItemIds.size > 0 && this.dragOriginatedHere) {
          this.config.onDragEnd?.({ itemIds: draggedItemIds, isInternal, dropOperation });
        }
      },
    });

    return () => {
      this.monitorCleanup?.();
      this.monitorCleanup = null;
      this.timeoutManager.clearAll();
      this.context = null;
      this.currentDraggedItemIds = EMPTY_SET;
      this.currentAllowedOperations = ['move'];
    };
  }

  setupItem(itemId: DraggableItemId, element: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];

    // Register as draggable (if allowed)
    if (this.canDragItem(itemId)) {
      cleanups.push(
        draggable({
          element,
          getInitialData: () => {
            // If this item is part of a multi-selection, drag all selected items
            let itemIds = [itemId];
            const selected = this.context?.getSelectedItemIds() ?? [];
            if (selected.length > 1 && selected.includes(itemId)) {
              itemIds = this.pruneDescendants(selected);
            }
            // Resolve allowed operations for this drag
            const itemIdsSet = new Set(itemIds);
            const allowedOperations = this.config.getAllowedDropOperations
              ? this.config.getAllowedDropOperations(itemIdsSet)
              : (['move'] as DropOperation[]);
            // pragmatic-dnd stores plain data — serialize as array, convert to Set at boundary
            return { itemIds, type: this.dragType, allowedOperations };
          },
          onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
            if (this.config.renderDragPreview) {
              const itemIds = new Set(source.data.itemIds as DraggableItemId[]);
              const preview = this.config.renderDragPreview({ itemIds, draggedItemId: itemId });
              setCustomNativeDragPreview({
                nativeSetDragImage,
                render: ({ container }) => {
                  const root = ReactDOM.createRoot(container);
                  root.render(preview);
                  return () => root.unmount();
                },
              });
            }
          },
        }),
      );
    }

    // Register as drop target
    cleanups.push(
      dropTargetForElements({
        element,
        getData: () => ({
          itemId,
          type: this.dragType,
        }),
        getDropEffect: ({ source, input }) => {
          const allowedOperations =
            (source.data.allowedOperations as DropOperation[] | undefined) ?? (['move'] as const);
          const draggedItemIds = new Set(source.data.itemIds as DraggableItemId[]);
          const position = this.computeDropPosition(itemId, element, input.clientY);
          const op = this.resolveDropOperation(
            draggedItemIds,
            itemId,
            position,
            allowedOperations,
            input,
          );
          return dropOperationToDropEffect(op);
        },
        canDrop: ({ source }) => {
          if (!this.acceptsDragType(source.data.type)) {
            return false;
          }
          const draggedItemIds = source.data.itemIds as DraggableItemId[];
          // Can't drop on any of the dragged items
          if (draggedItemIds.includes(itemId)) {
            return false;
          }
          // Can't drop on a descendant of any dragged item (same tree only)
          if (source.data.type === this.dragType) {
            for (const id of draggedItemIds) {
              if (this.context?.isDescendantOf(itemId, id)) {
                return false;
              }
            }
          }
          return true;
        },
        onDragEnter: ({ location }) => {
          const { input } = location.current;
          const position = this.computeDropPosition(itemId, element, input.clientY);
          this.updateDropState(itemId, position, input);
          this.startAutoExpandTimer(itemId);
        },
        onDrag: ({ location }) => {
          const { input } = location.current;
          const position = this.computeDropPosition(itemId, element, input.clientY);
          this.updateDropState(itemId, position, input);
        },
        onDragLeave: () => {
          this.clearAutoExpandTimer();
          if (this.currentDraggedItemIds.size > 0) {
            this.context?.onStateChange({
              draggedItemIds: this.currentDraggedItemIds,
              dropTargetItemId: null,
              dropPosition: null,
              dropOperation: null,
            });
          }
        },
      }),
    );

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  setupRoot(element: HTMLElement): () => void {
    return dropTargetForElements({
      element,
      getData: () => ({
        type: this.dragType,
        isRoot: true,
      }),
      canDrop: ({ source }) => {
        if (!this.config.onRootDrop) {
          return false;
        }
        return this.acceptsDragType(source.data.type);
      },
      onDrop: ({ source }) => {
        // Only fire if no item target was hit
        if (this.lastDropTargetItemId != null) {
          return;
        }
        const itemIds = new Set(source.data.itemIds as DraggableItemId[]);
        const allowedOperations = (source.data.allowedOperations as
          | DropOperation[]
          | undefined) ?? ['move'];
        const dropOperation = allowedOperations[0] ?? 'move';
        this.config.onRootDrop?.({ itemIds, dropOperation });
      },
    });
  }

  canDragItem(itemId: DraggableItemId): boolean {
    return this.config.canDrag ? this.config.canDrag(itemId) : true;
  }

  // ---- Private helpers -----------------------------------------------------

  private computeDropPosition(
    targetItemId: DraggableItemId,
    element: HTMLElement,
    clientY: number,
  ): DropPosition {
    const rect = element.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / rect.height;
    const accepted = this.resolvedAcceptedDropPositions;
    const isExpandable = this.context?.isItemExpandable(targetItemId) ?? false;

    const hasOn = accepted.includes('on') && isExpandable;
    const hasBefore = accepted.includes('before');
    const hasAfter = accepted.includes('after');

    if (hasOn && hasBefore && hasAfter) {
      if (relativeY < 0.25) {
        return 'before';
      }
      if (relativeY > 0.75) {
        return 'after';
      }
      return 'on';
    }

    if (hasBefore && hasAfter) {
      return relativeY < 0.5 ? 'before' : 'after';
    }

    if (hasOn) {
      return 'on';
    }
    if (hasBefore) {
      return 'before';
    }
    if (hasAfter) {
      return 'after';
    }

    return 'after';
  }

  private updateDropState(
    targetItemId: DraggableItemId,
    position: DropPosition,
    input: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
  ) {
    if (!this.context || this.currentDraggedItemIds.size === 0) {
      return;
    }

    if (this.config.canDrop) {
      const allowed = this.config.canDrop({
        draggedItemIds: this.currentDraggedItemIds,
        targetItemId,
        position,
      });
      if (!allowed) {
        return;
      }
    }

    // Resolve drop operation
    const dropOperation = this.resolveDropOperation(
      this.currentDraggedItemIds,
      targetItemId,
      position,
      this.currentAllowedOperations,
      input,
    );

    // If the resolved operation is 'cancel', treat as not droppable
    if (dropOperation === 'cancel') {
      return;
    }

    this.lastDropTargetItemId = targetItemId;
    this.lastDropPosition = position;
    this.lastDropOperation = dropOperation;

    this.context.onStateChange({
      draggedItemIds: this.currentDraggedItemIds,
      dropTargetItemId: targetItemId,
      dropPosition: position,
      dropOperation,
    });
  }

  private handleDrop() {
    if (!this.context || this.currentDraggedItemIds.size === 0) {
      return;
    }

    const draggedItemIds = this.currentDraggedItemIds;
    const targetItemId = this.lastDropTargetItemId;
    const position = this.lastDropPosition;

    if (targetItemId == null || position == null) {
      return;
    }

    // Only process the drop if the target item belongs to this plugin's collection
    if (!this.context.hasItem(targetItemId)) {
      return;
    }

    if (this.config.canDrop) {
      const allowed = this.config.canDrop({ draggedItemIds, targetItemId, position });
      if (!allowed) {
        return;
      }
    }

    const dropOperation = this.lastDropOperation ?? 'move';

    // This plugin handled the drop
    this.dropHandledHere = true;

    // Check if all dragged items exist in this collection
    let allItemsKnown = true;
    for (const id of draggedItemIds) {
      if (!this.context!.hasItem(id)) {
        allItemsKnown = false;
        break;
      }
    }

    if (allItemsKnown) {
      this.handleInternalDrop(draggedItemIds, targetItemId, position, dropOperation);
    } else {
      this.handleExternalDrop(draggedItemIds, targetItemId, position, dropOperation);
    }
  }

  private handleInternalDrop(
    draggedItemIds: Set<DraggableItemId>,
    targetItemId: DraggableItemId,
    position: DropPosition,
    dropOperation: DropOperation,
  ) {
    const conf = this.config;

    if (conf.onMove) {
      conf.onMove({
        itemIds: draggedItemIds,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
      return;
    }

    if (conf.onReorder && position !== 'on') {
      conf.onReorder({
        itemIds: draggedItemIds,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
    }
  }

  private handleExternalDrop(
    draggedItemIds: Set<DraggableItemId>,
    targetItemId: DraggableItemId,
    position: DropPosition,
    dropOperation: DropOperation,
  ) {
    const conf = this.config;

    if (position === 'on') {
      if (conf.onItemDrop) {
        conf.onItemDrop({
          itemIds: draggedItemIds,
          target: { itemId: targetItemId },
          dropOperation,
        });
        return;
      }
    } else if (conf.onInsert) {
      conf.onInsert({
        itemIds: draggedItemIds,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
    }
  }

  private resolveDropOperation(
    draggedItemIds: Set<DraggableItemId>,
    targetItemId: DraggableItemId,
    position: DropPosition,
    allowedOperations: readonly DropOperation[],
    input: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
  ): DropOperation {
    // Pre-filter allowedOperations based on modifier keys (matches React Aria behavior).
    // When a modifier is held, only the corresponding operation is offered.
    const filtered = filterOperationsByModifiers(
      allowedOperations as DropOperation[],
      input,
    );

    if (!this.config.getDropOperation) {
      return filtered[0] ?? 'cancel';
    }

    const isInternal =
      this.context != null && [...draggedItemIds].every((id) => this.context!.hasItem(id));

    return this.config.getDropOperation({
      draggedItemIds,
      target: { itemId: targetItemId, position },
      allowedOperations: filtered,
      isInternal,
    });
  }

  // ---- Auto-expand on hover ------------------------------------------------

  private startAutoExpandTimer(targetItemId: DraggableItemId) {
    if (!this.context?.isItemExpandable(targetItemId)) {
      this.timeoutManager.clearTimeout('autoExpand');
      return;
    }

    this.timeoutManager.startTimeout('autoExpand', AUTO_EXPAND_DELAY, () => {
      this.context?.expandItem(targetItemId);
    });
  }

  private clearAutoExpandTimer() {
    this.timeoutManager.clearTimeout('autoExpand');
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Creates a drag-and-drop configuration for collection components.
 * Returns an object to pass as the `dragAndDrop` prop.
 *
 * @example
 * ```tsx
 * import { useDragAndDrop } from '@base-ui/react/use-drag-and-drop';
 *
 * const dragAndDrop = useDragAndDrop({
 *   onMove: ({ itemIds, target }) => {
 *     if (target.position === 'on') {
 *       // reparent: move as children of target
 *     } else {
 *       // reorder: move before/after target
 *     }
 *   },
 * });
 *
 * <Tree.Root items={items} dragAndDrop={dragAndDrop}>
 *   ...
 * </Tree.Root>
 * ```
 */
export function useDragAndDrop(params: UseDragAndDropParameters) {
  const configRef = React.useRef(params);

  React.useEffect(() => {
    configRef.current = params;
  });

  return useRefWithInit(() => new DragAndDropPlugin(configRef)).current;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

type DraggableItemId = string | number;

type DropPosition = 'before' | 'after' | 'on';

type DropOperation = 'move' | 'copy' | 'link' | 'cancel';

interface GetDropOperationParameters {
  /** The ids of the items being dragged. */
  draggedItemIds: Set<DraggableItemId>;
  /** The target item and drop position. */
  target: { itemId: DraggableItemId; position: DropPosition };
  /**
   * The operations allowed by the drag source, filtered by the user's modifier keys.
   * When the user holds a modifier key (e.g., Alt/Option for copy),
   * only the corresponding operation is included.
   */
  allowedOperations: DropOperation[];
  /** Whether this is an internal drag (items come from the same collection). */
  isInternal: boolean;
}

interface OnReorderParameters {
  /** The ids of the dragged items. */
  itemIds: Set<DraggableItemId>;
  /** The target item and drop position. */
  target: { itemId: DraggableItemId; position: 'before' | 'after' };
  /** The resolved drop operation. */
  dropOperation: DropOperation;
}

interface OnMoveParameters {
  /** The ids of the dragged items. */
  itemIds: Set<DraggableItemId>;
  /** The target item and drop position. */
  target: { itemId: DraggableItemId; position: DropPosition };
  /** The resolved drop operation. */
  dropOperation: DropOperation;
}

interface OnInsertParameters {
  /** The ids of the external items being inserted. */
  itemIds: Set<DraggableItemId>;
  /** Where to insert relative to the target. */
  target: { itemId: DraggableItemId; position: 'before' | 'after' };
  /** The resolved drop operation. */
  dropOperation: DropOperation;
}

interface OnItemDropParameters {
  /** The ids of the external items being dropped. */
  itemIds: Set<DraggableItemId>;
  /** The item being dropped onto. */
  target: { itemId: DraggableItemId };
  /** The resolved drop operation. */
  dropOperation: DropOperation;
}

interface OnRootDropParameters {
  /** The ids of the items being dropped on the root. */
  itemIds: Set<DraggableItemId>;
  /** The resolved drop operation. */
  dropOperation: DropOperation;
}

interface CanDropParameters {
  draggedItemIds: Set<DraggableItemId>;
  targetItemId: DraggableItemId;
  position: DropPosition;
}

interface OnDragStartParameters {
  /** The ids of the items being dragged. */
  itemIds: Set<DraggableItemId>;
}

interface OnDragEndParameters {
  /** The ids of the items that were being dragged. */
  itemIds: Set<DraggableItemId>;
  /** Whether the drop occurred within the same collection that initiated the drag. */
  isInternal: boolean;
  /** The resolved drop operation, or `'cancel'` if the drop was cancelled. */
  dropOperation: DropOperation;
}

interface RenderDragPreviewParameters {
  /** The ids of the items being dragged. */
  itemIds: Set<DraggableItemId>;
  /** The id of the specific item the user grabbed to initiate the drag. */
  draggedItemId: DraggableItemId;
}

export interface DragAndDropState {
  /** The items currently being dragged (empty set when not dragging). */
  draggedItemIds: Set<DraggableItemId>;
  /** The item currently hovered as a drop target, or `null`. */
  dropTargetItemId: DraggableItemId | null;
  /** Drop position relative to the target item. */
  dropPosition: DropPosition | null;
  /** The resolved drop operation for the current target, or `null` when not over a valid target. */
  dropOperation: DropOperation | null;
}

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export interface UseDragAndDropParameters {
  /**
   * Called when items are reordered within the same parent.
   * Only fires for `'before'`/`'after'` positions on siblings.
   * Mutually exclusive with `onMove`.
   */
  onReorder?: ((parameters: OnReorderParameters) => void) | undefined;

  /**
   * Called when items are moved within the same collection.
   * Fires for `'before'`, `'after'`, and `'on'` positions.
   * Subsumes `onReorder` — use one or the other.
   */
  onMove?: ((parameters: OnMoveParameters) => void) | undefined;

  /**
   * Called when external items are dropped between items.
   * Fires for `'before'`/`'after'` positions from a different source.
   */
  onInsert?: ((parameters: OnInsertParameters) => void) | undefined;

  /**
   * Called when external items are dropped ON an item.
   * Fires for `'on'` position from a different source.
   */
  onItemDrop?: ((parameters: OnItemDropParameters) => void) | undefined;

  /**
   * Called when items are dropped on the collection root (empty area).
   */
  onRootDrop?: ((parameters: OnRootDropParameters) => void) | undefined;

  // ---- Configuration ----

  /**
   * Whether a given item can be dragged.
   * @default () => true
   */
  canDrag?: ((itemId: DraggableItemId) => boolean) | undefined;

  /** Whether a drop is allowed at a given position. */
  canDrop?: ((parameters: CanDropParameters) => boolean) | undefined;

  /**
   * Custom drag preview renderer.
   * Return a React element to display as the drag preview.
   */
  renderDragPreview?: ((parameters: RenderDragPreviewParameters) => React.ReactElement) | undefined;

  /** Called when a drag operation starts. */
  onDragStart?: ((parameters: OnDragStartParameters) => void) | undefined;

  /** Called when a drag operation ends (drop or cancel). */
  onDragEnd?: ((parameters: OnDragEndParameters) => void) | undefined;

  /**
   * Determines which drop operations the dragged items support.
   * Called once when a drag starts.
   * @default () => ['move']
   */
  getAllowedDropOperations?: ((itemIds: Set<DraggableItemId>) => DropOperation[]) | undefined;

  /**
   * Determines the actual drop operation for a given target.
   * Called repeatedly during drag-over as the target changes.
   * Return `'cancel'` to reject the drop at this target.
   * @default Returns the first allowed operation.
   */
  getDropOperation?: ((parameters: GetDropOperationParameters) => DropOperation) | undefined;

  /**
   * A string identifying the type of dragged items.
   * Used to filter which drag sources a drop target accepts.
   * @default 'base-ui-dnd-item'
   */
  dragType?: string | undefined;

  /**
   * Which drag types this instance accepts for drops.
   * Defaults to the same value as `dragType` (only accepts its own items).
   * Use `'all'` to accept any drag type.
   */
  acceptedDragTypes?: string[] | 'all' | undefined;
}

// ---------------------------------------------------------------------------
// Component context – provided by the consuming component (Tree, List, etc.)
// ---------------------------------------------------------------------------

export interface UseDragAndDropComponentContext {
  /** Get the parent id of an item (`null` for root items). */
  getParentId(itemId: DraggableItemId): DraggableItemId | null;
  /** Get child ids for a parent (`null` = root children). */
  getChildrenIds(parentId: DraggableItemId | null): DraggableItemId[];
  /** Check if `itemId` is a descendant of `ancestorId`. */
  isDescendantOf(itemId: DraggableItemId, ancestorId: DraggableItemId): boolean;
  /** Get the index of an item among its siblings. */
  getItemIndex(itemId: DraggableItemId): number;
  /** Whether an item can be expanded (has children / is a group). */
  isItemExpandable(itemId: DraggableItemId): boolean;
  /** Expand an item (used for auto-expand on hover during drag). */
  expandItem(itemId: DraggableItemId): void;
  /** Whether the given item exists in this collection. */
  hasItem(itemId: DraggableItemId): boolean;
  /** Get the currently selected item IDs. */
  getSelectedItemIds(): DraggableItemId[];
  /** Update DnD visual state in the component's store. */
  onStateChange(state: DragAndDropState): void;
}

export namespace useDragAndDrop {
  export type Parameters = UseDragAndDropParameters;

  export type ComponentContext = UseDragAndDropComponentContext;
}
