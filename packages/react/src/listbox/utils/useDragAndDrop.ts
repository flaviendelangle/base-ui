'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useId } from '@base-ui/utils/useId';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import type { CollectionItemId } from '../../types/collection';
import { useListboxDragProviderContext } from '../drag-provider/ListboxDragProviderContext';

/**
 * Parameters for {@link useDragAndDrop}.
 */
export interface UseDragAndDropParameters {
  /** Composite index of the item within the current listbox. */
  index: number;
  /** Value associated with the current item. */
  itemValue: any;
  /** Ref to the item's DOM element. */
  itemRef: React.RefObject<HTMLElement | null>;
  /** Whether drag-and-drop registration is enabled for the item. */
  enabled: boolean;
  /** Whether the item is disabled. */
  disabled: boolean;
  /**
   * Group ID metadata exposed to provider drag-and-drop predicates.
   */
  groupId: string | undefined;
}

/**
 * Wires a listbox item into `Listbox.DragProvider`.
 *
 * @param params Configuration for the current draggable item.
 * @returns The stable identifier used by the collection drag engine.
 */
export function useDragAndDrop(params: UseDragAndDropParameters): CollectionItemId | undefined {
  const { index, itemValue, itemRef, enabled, disabled, groupId } = params;

  const itemId = useId();
  const item = useValueAsRef({ value: itemValue, index, groupId, disabled });
  const dragContext = useListboxDragProviderContext(true);

  useIsoLayoutEffect(() => {
    const element = itemRef.current;
    if (!dragContext || itemId === undefined || !element || !enabled) {
      return undefined;
    }

    return dragContext.setupItem(itemId, element, item);
  }, [dragContext, enabled, itemId, item, itemRef]);

  useIsoLayoutEffect(() => {
    const element = itemRef.current;
    if (dragContext && itemId !== undefined && element && enabled) {
      dragContext.scheduleDisplacementSweep(element);
    }
  });

  return itemId;
}
