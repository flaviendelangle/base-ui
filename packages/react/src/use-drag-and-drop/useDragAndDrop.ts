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
import { isMac, isIOS } from '@base-ui/utils/detectBrowser';
import type { CollectionActions, CollectionItemId } from '../types/collection';

const DEFAULT_DRAG_TYPE = 'base-ui-dnd-item';

const EMPTY_SET = new Set<CollectionItemId>();

const INITIAL_STATE: DragAndDropState = {
  draggedItemIds: EMPTY_SET,
  dropTargetItemId: null,
  dropPosition: null,
  dropOperation: null,
};

let nextInstanceId = 0;

function getNextInstanceId() {
  nextInstanceId += 1;
  return nextInstanceId;
}

class DragAndDropPlugin<TItem> {
  private static defaultAllowedOperations: DropOperation[] = ['move'];

  private readonly instanceId = getNextInstanceId();

  private configRef: React.RefObject<UseDragAndDropParameters<TItem>>;

  private context: CollectionActions<TItem> | null = null;

  private attachConfig: DragAndDropAttachConfig | null = null;

  private monitorCleanup: (() => void) | null = null;

  /**
   * Tracks the currently dragged item ids (set by the global monitor).
   */
  private currentDraggedItemIds: Set<CollectionItemId> = EMPTY_SET;

  /**
   * Whether the drag was initiated by an item in THIS plugin's collection.
   */
  private dragOriginatedHere = false;

  /**
   * Whether the drop was handled by THIS plugin instance.
   */
  private dropHandledHere = false;

  /**
   * Tracks the last known drop position so we can use it in `onDrop`.
   */
  private lastDropPosition: DropPosition | null = null;

  /**
   * Tracks the last known drop target id so we can use it in `onDrop`.
   */
  private lastDropTargetItemId: CollectionItemId | null = null;

  /**
   * The allowed operations for the current drag, set at drag start.
   */
  private currentAllowedOperations: DropOperation[] = DragAndDropPlugin.defaultAllowedOperations;

  /**
   * The resolved drop operation for the current hover target.
   */
  private lastDropOperation: DropOperation | null = null;

  /**
   * The item data from the source's `getItems`, carried with the drag.
   */
  private currentDragItems: TItem[] = [];

  constructor(configRef: React.RefObject<UseDragAndDropParameters>) {
    this.configRef = configRef;
  }

  private get config(): UseDragAndDropParameters<TItem> {
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
    const positions = new Set<DropPosition>();
    if (this.config.onReorder || this.config.onInsert || this.config.onMove) {
      positions.add('before');
      positions.add('after');
    }
    if (this.config.onMove || this.config.onItemDrop) {
      positions.add('on');
    }
    return positions.size > 0 ? Array.from(positions) : ['before', 'after', 'on'];
  }

  // ---- DragAndDrop interface -----------------------------------------------

  attach(actions: CollectionActions<TItem>, config: DragAndDropAttachConfig): () => void {
    this.context = actions;
    this.attachConfig = config;

    // Initialize state so that items know DnD is enabled and can register via setupItem.
    config.onStateChange(INITIAL_STATE);

    this.monitorCleanup = monitorForElements({
      canMonitor: ({ source }) => this.acceptsDragType(readSourceData<TItem>(source.data).type),
      onDragStart: ({ source }) => {
        const src = readSourceData<TItem>(source.data);
        this.currentDraggedItemIds = src.itemIds;
        this.currentAllowedOperations =
          src.allowedOperations ?? DragAndDropPlugin.defaultAllowedOperations;
        this.currentDragItems = src.items ?? [];
        this.lastDropPosition = null;
        this.lastDropTargetItemId = null;
        this.lastDropOperation = null;
        this.dropHandledHere = false;
        // The drag originated here if this plugin instance initiated it
        this.dragOriginatedHere = src.sourceInstanceId === this.instanceId;

        // Only update state and fire the user callback on the plugin that owns the dragged items
        if (this.dragOriginatedHere) {
          config.onStateChange({
            draggedItemIds: src.itemIds,
            dropTargetItemId: null,
            dropPosition: null,
            dropOperation: null,
          });
          this.config.onDragStart?.({ itemIds: src.itemIds });
        }
      },
      onDrop: ({ location }) => {
        const draggedItemIds = this.currentDraggedItemIds;
        // Only handle the drop if the actual drop target belongs to this plugin's collection
        const actualTargetData = location.current.dropTargets[0]?.data;
        const actualTargetItemId = actualTargetData
          ? readTargetData(actualTargetData).itemId
          : undefined;
        if (actualTargetItemId != null && this.context?.hasItem(actualTargetItemId)) {
          this.handleDrop();
        }
        // Read the resolved operation from the drop target's data (for cross-collection drops),
        // fall back to this plugin's own lastDropOperation (for internal drops).
        const dropOperation =
          (actualTargetData ? readTargetData(actualTargetData).dropOperation : undefined) ??
          this.lastDropOperation ??
          'cancel';
        const dragItems = this.currentDragItems;
        config.onStateChange(INITIAL_STATE);
        this.currentDraggedItemIds = EMPTY_SET;
        this.currentAllowedOperations = DragAndDropPlugin.defaultAllowedOperations;
        this.currentDragItems = [];

        // Only fire the user callback on the plugin that originated the drag
        if (draggedItemIds.size > 0 && this.dragOriginatedHere) {
          this.config.onDragEnd?.({
            itemIds: draggedItemIds,
            items: dragItems,
            isInternal: this.dragOriginatedHere && this.dropHandledHere,
            dropOperation,
          });
        }
      },
    });

    return () => {
      this.monitorCleanup?.();
      this.monitorCleanup = null;
      this.context = null;
      this.attachConfig = null;
      this.currentDraggedItemIds = EMPTY_SET;
      this.currentAllowedOperations = DragAndDropPlugin.defaultAllowedOperations;
      this.currentDragItems = [];
    };
  }

  setupItem(itemId: CollectionItemId, element: HTMLElement): () => void {
    const cleanups: Array<() => void> = [];

    // Register as draggable (if allowed)
    if (this.canDragItem(itemId)) {
      cleanups.push(
        draggable({
          element,
          getInitialData: () => {
            // If this item is part of a multi-selection, drag all selected items
            let itemIdsSet = new Set([itemId]);
            const selected = this.context?.getSelectedItemIds() ?? new Set();
            if (selected.size > 1 && selected.has(itemId)) {
              itemIdsSet = this.attachConfig?.pruneDraggedItems
                ? this.attachConfig.pruneDraggedItems(selected)
                : selected;
            }
            const allowedOperations = this.config.getAllowedDropOperations
              ? this.config.getAllowedDropOperations(itemIdsSet)
              : DragAndDropPlugin.defaultAllowedOperations;
            const items = this.context?.getItemModels(itemIdsSet) ?? [];
            const draggedItem = this.context?.getItemModels(new Set([itemId]))[0];
            return {
              itemIds: itemIdsSet,
              draggedItemId: itemId,
              type: this.dragType,
              allowedOperations,
              items,
              draggedItem,
              sourceInstanceId: this.instanceId,
            } satisfies DragSourceData<TItem>;
          },
          onGenerateDragPreview: ({ nativeSetDragImage, source }) => {
            if (this.config.renderDragPreview) {
              const src = readSourceData<TItem>(source.data);
              const preview = this.config.renderDragPreview({
                itemIds: src.itemIds,
                draggedItemId: src.draggedItemId,
                draggedItem: src.draggedItem,
                items: src.items,
              });
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
          dropOperation: this.lastDropOperation,
        }),
        getDropEffect: ({ source, input }) => {
          const src = readSourceData(source.data);
          const allowedOperations =
            src.allowedOperations ?? DragAndDropPlugin.defaultAllowedOperations;
          const draggedItemIds = src.itemIds;
          const position = this.computeDropPosition(element, input.clientY);
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
          const src = readSourceData(source.data);
          if (!this.acceptsDragType(src.type)) {
            return false;
          }
          // Can't drop on any of the dragged items
          if (src.itemIds.has(itemId)) {
            return false;
          }
          // Can't drop on an invalid target (e.g. descendant of a dragged item in a tree)
          if (
            src.type === this.dragType &&
            this.attachConfig?.isDropTargetInvalid?.(itemId, src.itemIds)
          ) {
            return false;
          }
          return true;
        },
        onDragEnter: ({ location }) => {
          const { input } = location.current;
          const position = this.computeDropPosition(element, input.clientY);
          this.updateDropState(itemId, position, input);
        },
        onDrag: ({ location }) => {
          const { input } = location.current;
          const position = this.computeDropPosition(element, input.clientY);
          this.updateDropState(itemId, position, input);
        },
        onDragLeave: () => {
          this.clearDropState();
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
        return this.acceptsDragType(readSourceData(source.data).type);
      },
      onDrop: ({ source, location }) => {
        // Only fire if no item target was hit
        // We check the live drop target hierarchy rather than internal state
        // because `lastDropTargetItemId` may be stale (it is not cleared on drag leave).
        const deepestTarget = location.current.dropTargets[0];
        if (deepestTarget?.data.itemId != null) {
          return;
        }
        const src = readSourceData<TItem>(source.data);
        const allowedOperations =
          src.allowedOperations ?? DragAndDropPlugin.defaultAllowedOperations;

        this.config.onRootDrop?.({
          itemIds: src.itemIds,
          items: src.items ?? [],
          dropOperation: allowedOperations[0] ?? 'move',
        });
      },
    });
  }

  canDragItem(itemId: CollectionItemId): boolean {
    return this.config.canDrag ? this.config.canDrag(itemId) : true;
  }

  // ---- Private helpers -----------------------------------------------------

  private clearDropState() {
    if (this.currentDraggedItemIds.size > 0) {
      this.attachConfig?.onStateChange({
        draggedItemIds: this.currentDraggedItemIds,
        dropTargetItemId: null,
        dropPosition: null,
        dropOperation: null,
      });
    }
  }

  private computeDropPosition(element: HTMLElement, clientY: number): DropPosition {
    const rect = element.getBoundingClientRect();
    const relativeY = (clientY - rect.top) / rect.height;
    const accepted = this.resolvedAcceptedDropPositions;

    const hasOn = accepted.includes('on');
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
    targetItemId: CollectionItemId,
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
        this.clearDropState();
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
      this.clearDropState();
      return;
    }

    this.lastDropTargetItemId = targetItemId;
    this.lastDropPosition = position;
    this.lastDropOperation = dropOperation;

    this.attachConfig?.onStateChange({
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
    draggedItemIds: Set<CollectionItemId>,
    targetItemId: CollectionItemId,
    position: DropPosition,
    dropOperation: DropOperation,
  ) {
    if (this.config.onMove) {
      this.config.onMove({
        itemIds: draggedItemIds,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
      return;
    }

    if (position === 'on') {
      if (this.config.onItemDrop) {
        this.config.onItemDrop({
          itemIds: draggedItemIds,
          items: this.currentDragItems,
          target: { itemId: targetItemId },
          dropOperation,
        });
      }
    } else if (this.config.onReorder) {
      this.config.onReorder({
        itemIds: draggedItemIds,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
    }
  }

  private handleExternalDrop(
    draggedItemIds: Set<CollectionItemId>,
    targetItemId: CollectionItemId,
    position: DropPosition,
    dropOperation: DropOperation,
  ) {
    const items = this.currentDragItems;

    if (position === 'on') {
      if (this.config.onItemDrop) {
        this.config.onItemDrop({
          itemIds: draggedItemIds,
          items,
          target: { itemId: targetItemId },
          dropOperation,
        });
        return;
      }
    } else if (this.config.onInsert) {
      this.config.onInsert({
        itemIds: draggedItemIds,
        items,
        target: { itemId: targetItemId, position },
        dropOperation,
      });
    }
  }

  private resolveDropOperation(
    draggedItemIds: Set<CollectionItemId>,
    targetItemId: CollectionItemId,
    position: DropPosition,
    allowedOperations: readonly DropOperation[],
    input: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
  ): DropOperation {
    const filtered = filterOperationsByModifiers(allowedOperations, input);

    if (!this.config.getDropOperation) {
      return filtered[0] ?? 'cancel';
    }

    return this.config.getDropOperation({
      draggedItemIds,
      target: { itemId: targetItemId, position },
      allowedOperations: filtered,
      isInternal: this.dragOriginatedHere,
    });
  }
}

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
export function useDragAndDrop<TItem = unknown>(params: UseDragAndDropParameters<TItem>) {
  const configRef = React.useRef(params);

  React.useEffect(() => {
    configRef.current = params;
  });

  return useRefWithInit(
    () => new DragAndDropPlugin(configRef as React.RefObject<UseDragAndDropParameters>),
  ).current;
}

function dropOperationToDropEffect(op: DropOperation): 'move' | 'copy' | 'link' {
  if (op === 'copy') {
    return 'copy';
  }
  if (op === 'link') {
    return 'link';
  }
  return 'move';
}

/**
 * Filter allowed operations based on keyboard modifiers pressed during drag.
 * Uses platform-specific mappings that match native OS behavior:
 *
 * macOS:   Alt/Option → copy, Ctrl → link, Cmd → move
 * Win/Lin: Ctrl → copy, Alt → link, Shift → move
 *
 * When no modifier is pressed, all operations are available.
 * When a modifier IS pressed, only the intersection of the modifier-requested
 * operation and the source's allowed operations is returned.
 */
function filterOperationsByModifiers(
  allowedOperations: readonly DropOperation[],
  input: { altKey: boolean; ctrlKey: boolean; shiftKey: boolean; metaKey: boolean },
): readonly DropOperation[] {
  let requested: DropOperation | null = null;

  if (isMac || isIOS) {
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
    return allowedOperations;
  }

  return allowedOperations.includes(requested) ? [requested] : [];
}

function readSourceData<TItem>(data: Record<string, unknown>): DragSourceData<TItem> {
  return data as unknown as DragSourceData<TItem>;
}

function readTargetData(data: Record<string | symbol, unknown>): DropTargetItemData {
  return data as unknown as DropTargetItemData;
}

interface DragSourceData<TItem> {
  type: string;
  sourceInstanceId: number;
  itemIds: Set<CollectionItemId>;
  draggedItemId: CollectionItemId;
  items: TItem[];
  draggedItem: TItem | undefined;
  allowedOperations: DropOperation[];
}

interface DropTargetItemData {
  itemId: CollectionItemId;
  type: string;
  dropOperation: DropOperation | null;
}

type DropPosition = 'before' | 'after' | 'on';

type DropOperation = 'move' | 'copy' | 'link' | 'cancel';

interface GetDropOperationParameters {
  /**
   * The ids of the items being dragged.
   */
  draggedItemIds: Set<CollectionItemId>;
  /**
   * The target item and drop position.
   */
  target: { itemId: CollectionItemId; position: DropPosition };
  /**
   * The operations allowed by the drag source, filtered by the user's modifier keys.
   * When the user holds a modifier key (e.g., Alt/Option for copy),
   * only the corresponding operation is included.
   */
  allowedOperations: readonly DropOperation[];
  /**
   * Whether this is an internal drag (items come from the same collection).
   */
  isInternal: boolean;
}

interface OnReorderParameters {
  /**
   * The ids of the dragged items.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The target item and drop position.
   */
  target: { itemId: CollectionItemId; position: 'before' | 'after' };
  /**
   * The resolved drop operation.
   */
  dropOperation: DropOperation;
}

interface OnMoveParameters {
  /**
   * The ids of the dragged items.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The target item and drop position.
   */
  target: { itemId: CollectionItemId; position: DropPosition };
  /**
   * The resolved drop operation.
   */
  dropOperation: DropOperation;
}

interface OnInsertParameters<TItem> {
  /**
   * The ids of the external items being inserted.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The item data returned by the source's `getItems` callback.
   */
  items: TItem[];
  /**
   * Where to insert relative to the target.
   */
  target: { itemId: CollectionItemId; position: 'before' | 'after' };
  /**
   * The resolved drop operation.
   */
  dropOperation: DropOperation;
}

interface OnItemDropParameters<TItem> {
  /**
   * The ids of the external items being dropped.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The item data returned by the source's `getItems` callback.
   */
  items: TItem[];
  /**
   * The item being dropped onto.
   */
  target: { itemId: CollectionItemId };
  /**
   * The resolved drop operation.
   */
  dropOperation: DropOperation;
}

interface OnRootDropParameters<TItem> {
  /**
   * The ids of the items being dropped on the root.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The item data returned by the source's `getItems` callback.
   */
  items: TItem[];
  /**
   * The resolved drop operation.
   */
  dropOperation: DropOperation;
}

interface CanDropParameters {
  draggedItemIds: Set<CollectionItemId>;
  targetItemId: CollectionItemId;
  position: DropPosition;
}

interface OnDragStartParameters {
  /**
   * The ids of the items being dragged.
   */
  itemIds: Set<CollectionItemId>;
}

interface OnDragEndParameters<TItem> {
  /**
   * The ids of the items that were being dragged.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The item data returned by `getItems`.
   */
  items: TItem[];
  /**
   * Whether the drop occurred within the same collection that initiated the drag.
   */
  isInternal: boolean;
  /**
   * The resolved drop operation, or `'cancel'` if the drop was cancelled.
   */
  dropOperation: DropOperation;
}

interface RenderDragPreviewParameters<TItem> {
  /**
   * The ids of the items being dragged.
   */
  itemIds: Set<CollectionItemId>;
  /**
   * The id of the specific item the user grabbed to initiate the drag.
   */
  draggedItemId: CollectionItemId;
  /**
   * The model of the specific item the user grabbed to initiate the drag.
   */
  draggedItem: TItem | undefined;
  /**
   * The models of all the items being dragged.
   */
  items: TItem[];
}

export interface DragAndDropAttachConfig {
  /**
   * Called when the drag-and-drop state changes (drag start, hover, drop, etc.).
   */
  onStateChange: (state: DragAndDropState) => void;
  /**
   * Given a set of selected item IDs being dragged, returns a pruned set
   * that removes redundant items.
   * For example, a tree removes descendants when their ancestor is also in the set.
   * @default Returns the input set unchanged.
   */
  pruneDraggedItems?: ((itemIds: Set<CollectionItemId>) => Set<CollectionItemId>) | undefined;
  /**
   * Returns whether a drop target should be rejected given the dragged items.
   * For example, a tree returns `true` if the target is a descendant of any dragged item.
   * @default () => false
   */
  isDropTargetInvalid?:
    | ((dropTargetItemId: CollectionItemId, draggedItemIds: Set<CollectionItemId>) => boolean)
    | undefined;
}

export interface DragAndDropState {
  /**
   * The items currently being dragged (empty set when not dragging).
   */
  draggedItemIds: Set<CollectionItemId>;
  /**
   * The item currently hovered as a drop target, or `null`.
   */
  dropTargetItemId: CollectionItemId | null;
  /**
   * Drop position relative to the target item.
   */
  dropPosition: DropPosition | null;
  /**
   * The resolved drop operation for the current target, or `null` when not over a valid target.
   */
  dropOperation: DropOperation | null;
}

// ---------------------------------------------------------------------------
// Parameters
// ---------------------------------------------------------------------------

export interface UseDragAndDropParameters<TItem = unknown> {
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
  onInsert?: ((parameters: OnInsertParameters<TItem>) => void) | undefined;
  /**
   * Called when external items are dropped ON an item.
   * Fires for `'on'` position from a different source.
   */
  onItemDrop?: ((parameters: OnItemDropParameters<TItem>) => void) | undefined;
  /**
   * Called when items are dropped on the collection root (empty area).
   */
  onRootDrop?: ((parameters: OnRootDropParameters<TItem>) => void) | undefined;
  /**
   * Whether a given item can be dragged.
   * @default () => true
   */
  canDrag?: ((itemId: CollectionItemId) => boolean) | undefined;
  /**
   * Whether a drop is allowed at a given position.
   */
  canDrop?: ((parameters: CanDropParameters) => boolean) | undefined;
  /**
   * Custom drag preview renderer.
   * Return a React element to display as the drag preview.
   */
  renderDragPreview?:
    | ((parameters: RenderDragPreviewParameters<TItem>) => React.ReactElement)
    | undefined;
  /**
   * Called when a drag operation starts.
   */
  onDragStart?: ((parameters: OnDragStartParameters) => void) | undefined;
  /**
   * Called when a drag operation ends (drop or cancel).
   */
  onDragEnd?: ((parameters: OnDragEndParameters<TItem>) => void) | undefined;
  /**
   * Determines which drop operations the dragged items support.
   * Called once when a drag starts.
   * @default () => ['move']
   */
  getAllowedDropOperations?: ((itemIds: Set<CollectionItemId>) => DropOperation[]) | undefined;
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

export type UseDragAndDropReturnValue = ReturnType<typeof useDragAndDrop>;

export namespace useDragAndDrop {
  export type Parameters<TItem = unknown> = UseDragAndDropParameters<TItem>;

  export type ReturnValue = UseDragAndDropReturnValue;
}
