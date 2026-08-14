'use client';
import * as React from 'react';
import { useAnimationFrame } from '@base-ui/utils/useAnimationFrame';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useTimeout } from '@base-ui/utils/useTimeout';
import type { CollectionActions, CollectionItemId } from '../../types/collection';
import {
  useDraggableCollection,
  type DraggableCollectionState,
} from '../../internals/use-draggable-collection';
import { useListboxRootContext } from '../root/ListboxRootContext';
import { afterDomSettle } from '../utils/afterDomSettle';
import {
  type ListboxDragAndDropProviderContext as ListboxDragAndDropContextValue,
  ListboxDragAndDropProviderContext,
  type ListboxDragAndDropItem,
  type ListboxDragAndDropProviderOnItemsReorderEvent,
  type ListboxDragAndDropTargetEdge,
  type RegisteredListboxDragAndDropItem,
} from './ListboxDragAndDropProviderContext';

/**
 * Enables drag-and-drop reordering when rendered inside `Listbox.Root`.
 * Renders no DOM element of its own.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxDragAndDropProvider<Value = any>(
  props: ListboxDragAndDropProvider.Props<Value>,
) {
  const { children, onItemsReorder, canDrag, canDrop } = props;
  const store = useListboxRootContext();
  const dropHighlightTimeout = useTimeout();
  const dropHighlightFrame = useAnimationFrame();
  const { labelsRef, pointerMoveSuppressedRef } = store.context;
  const draggedItemIdRef = React.useRef<CollectionItemId | null>(null);
  const registeredItems = useRefWithInit(
    () => new Map<CollectionItemId, RegisteredListboxDragAndDropItem<Value>>(),
  ).current;

  const getItem = useStableCallback((itemId: CollectionItemId) => {
    return registeredItems.get(itemId)?.next;
  });

  const handleItemsReorder = useStableCallback(
    (event: ListboxDragAndDropProviderOnItemsReorderEvent<Value>) => {
      onItemsReorder?.(event);
    },
  );

  const handleCanDrag = useStableCallback((item: ListboxDragAndDropItem<Value>) => {
    if (store.state.disabled) {
      return false;
    }

    return canDrag ? canDrag(item) : !item.disabled;
  });

  const handleCanDrop = useStableCallback(
    (
      sourceItems: ListboxDragAndDropItem<Value>[],
      targetItem: ListboxDragAndDropItem<Value>,
      edge: ListboxDragAndDropTargetEdge,
    ) => {
      if (store.state.disabled) {
        return false;
      }

      return canDrop ? canDrop(sourceItems, targetItem, edge) : true;
    },
  );

  const canDragItem = useStableCallback((itemId: CollectionItemId) => {
    const item = getItem(itemId);
    return item ? handleCanDrag(item) : false;
  });

  const actions = useRefWithInit<CollectionActions<ListboxDragAndDropItem<Value>>>(() => ({
    hasItem(itemId) {
      return registeredItems.has(itemId);
    },
    getSelectedItemIds() {
      const selectedItemIds = new Set<CollectionItemId>();
      const { isItemEqualToValue, value: selectedValues } = store.state;

      for (const [itemId, itemRef] of registeredItems) {
        if (
          selectedValues.some((selectedValue) =>
            isItemEqualToValue(itemRef.next.value, selectedValue),
          )
        ) {
          selectedItemIds.add(itemId);
        }
      }

      return selectedItemIds;
    },
    getItemModels(itemIds) {
      const items: ListboxDragAndDropItem<Value>[] = [];
      for (const itemId of itemIds) {
        const item = registeredItems.get(itemId)?.next;
        if (item) {
          items.push(item);
        }
      }
      return items;
    },
  })).current;

  const handleStateChange = useStableCallback((dndState: DraggableCollectionState) => {
    const dragActiveIndices: number[] = [];
    for (const itemId of dndState.draggedItemIds) {
      const item = getItem(itemId);
      if (item) {
        dragActiveIndices.push(item.index);
      }
    }

    const dragOverItem =
      dndState.dropTargetItemId == null ? undefined : getItem(dndState.dropTargetItemId);
    const dropPosition =
      dndState.dropPosition === 'before' || dndState.dropPosition === 'after'
        ? dndState.dropPosition
        : null;

    store.update({
      dragActiveIndices: dragActiveIndices.length === 0 ? null : dragActiveIndices,
      dragOverIndex: dragOverItem?.index ?? null,
      dropPosition,
    });
  });

  const dragAndDrop = useDraggableCollection<
    ListboxDragAndDropItem<Value>,
    CollectionActions<ListboxDragAndDropItem<Value>>
  >({
    orientation: store.state.orientation,
    getActions: () => actions,
    keyboardActivation: 'off',
    canDrag: canDragItem,
    canDrop: ({ draggedItemIds, targetItemId, position }) => {
      if (position === 'on') {
        return false;
      }

      const sourceItems = actions.getItemModels([...draggedItemIds]);
      const targetItem = getItem(targetItemId);
      return targetItem ? handleCanDrop(sourceItems, targetItem, position) : false;
    },
    canDropRoot: () => false,
    getDropCapabilities: () => ({ hasOn: false, hasBeforeAfter: true }),
    onDrop: ({ items, target, isInternal }) => {
      if (!isInternal || !onItemsReorder || target.itemId == null || target.position === 'on') {
        return false;
      }

      const targetItem = getItem(target.itemId);
      if (!targetItem) {
        return false;
      }

      handleItemsReorder({
        items: items.map((item) => item.value),
        referenceItem: targetItem.value,
        edge: target.position,
        reason: 'drag',
      });
      return true;
    },
    onStateChange: handleStateChange,
    onDragStart: ({ source }) => {
      const payload = source.payload;
      draggedItemIdRef.current =
        typeof payload === 'object' &&
        payload !== null &&
        'draggedItemId' in payload &&
        (typeof payload.draggedItemId === 'string' || typeof payload.draggedItemId === 'number')
          ? payload.draggedItemId
          : null;
      pointerMoveSuppressedRef.current = true;
    },
    onDragEnd: () => {
      afterDomSettle(dropHighlightTimeout, dropHighlightFrame, () => {
        const draggedItem =
          draggedItemIdRef.current == null ? undefined : getItem(draggedItemIdRef.current);
        if (draggedItem) {
          const target =
            store.state.listElement?.querySelectorAll<HTMLElement>('[role="option"]')[
              draggedItem.index
            ];
          target?.focus();
          store.set('activeIndex', draggedItem.index);
        }
        draggedItemIdRef.current = null;
        pointerMoveSuppressedRef.current = false;
      });
    },
    getItemLabel: (itemId) => {
      const item = getItem(itemId);
      return (item && labelsRef.current[item.index]) ?? String(item?.value ?? itemId);
    },
  });

  const setupItem = useStableCallback<ListboxDragAndDropContextValue['setupItem']>(
    (itemId, element, itemRef) => {
      registeredItems.set(itemId, itemRef);
      const cleanup = dragAndDrop.setupItem(itemId, element);

      return () => {
        cleanup();
        if (registeredItems.get(itemId) === itemRef) {
          registeredItems.delete(itemId);
        }
      };
    },
  );

  const setupHandle = useStableCallback<ListboxDragAndDropContextValue['setupHandle']>(
    (itemId, element) => dragAndDrop.setupHandle(itemId, element),
  );

  const itemsReorderEnabled = onItemsReorder != null;
  const contextValue = React.useMemo(
    () => ({
      onItemsReorder: itemsReorderEnabled ? handleItemsReorder : undefined,
      canDragItem: handleCanDrag,
      canDropItems: handleCanDrop,
      setupItem,
      setupHandle,
    }),
    [handleCanDrag, handleCanDrop, handleItemsReorder, itemsReorderEnabled, setupHandle, setupItem],
  );

  return (
    <ListboxDragAndDropProviderContext.Provider value={contextValue}>
      {children}
    </ListboxDragAndDropProviderContext.Provider>
  );
}

export interface ListboxDragAndDropProviderState {}

export interface ListboxDragAndDropProviderProps<Value = any> {
  children?: React.ReactNode;
  /**
   * Event handler called when items are reordered via drag-and-drop or keyboard.
   * `items` contains the moved item(s). `referenceItem` is the item that was
   * dropped on or moved next to, and `edge` indicates placement relative to it.
   */
  onItemsReorder?:
    | ((event: ListboxDragAndDropProviderOnItemsReorderEvent<Value>) => void)
    | undefined;
  /**
   * Determines whether a given item can initiate drag-and-drop.
   * Defaults to allowing all non-disabled items.
   */
  canDrag?: ((item: ListboxDragAndDropItem<Value>) => boolean) | undefined;
  /**
   * Determines whether the dragged items can be dropped relative to a target item.
   * Defaults to allowing all drops.
   */
  canDrop?:
    | ((
        sourceItems: ListboxDragAndDropItem<Value>[],
        targetItem: ListboxDragAndDropItem<Value>,
        edge: ListboxDragAndDropTargetEdge,
      ) => boolean)
    | undefined;
}

export namespace ListboxDragAndDropProvider {
  export type Props<Value = any> = ListboxDragAndDropProviderProps<Value>;
  export type State = ListboxDragAndDropProviderState;
}

export type {
  ListboxDragAndDropItem,
  ListboxDragAndDropProviderOnItemsReorderEvent,
  ListboxDragAndDropTargetEdge,
} from './ListboxDragAndDropProviderContext';
