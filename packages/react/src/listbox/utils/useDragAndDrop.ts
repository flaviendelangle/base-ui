'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
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
export function useDragAndDrop(params: UseDragAndDropParameters): string {
  const { index, itemValue, itemRef, enabled, disabled, groupId } = params;

  const itemId = React.useId();
  const item = useValueAsRef({ value: itemValue, index, groupId, disabled });
  const dragContext = useListboxDragProviderContext(true);

  useIsoLayoutEffect(() => {
    const element = itemRef.current;
    if (!dragContext || !element || !enabled || index === -1) {
      return undefined;
    }

    return dragContext.setupItem(itemId, element, item);
  }, [dragContext, enabled, index, itemId, item, itemRef]);

  useIsoLayoutEffect(() => {
    const element = itemRef.current;
    if (dragContext && element && enabled) {
      dragContext.scheduleDisplacementSweep(element);
    }
  });

  return itemId;
}
