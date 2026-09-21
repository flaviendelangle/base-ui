'use client';
import * as React from 'react';
import { platform } from '@base-ui/utils/platform';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import { isMouseWithinBounds } from '@base-ui/utils/isMouseWithinBounds';
import { useTimeout } from '@base-ui/utils/useTimeout';
import { useExternalDropPosition } from '../../internals/sorting/externalDropPosition';
import type { ExternalDropTargetProps } from '../../internals/sorting/SortableDropProvider';
import type { ListboxSortingDropPosition } from '../sortable-provider/ListboxSortableProvider';
import { useListboxDropItem } from '../sorting/useListboxDropItem';
import type { Draggable } from '../../draggable';
import type {
  BaseUIComponentProps,
  BaseUIEvent,
  HTMLProps,
  NonNativeButtonProps,
} from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useButton } from '../../internals/use-button';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { useCompositeListItem } from '../../internals/composite';
import { findItemIndex } from '../../internals/itemEquality';
import { useListboxRootContext } from '../root/ListboxRootContext';
import { ListboxItemContext } from './ListboxItemContext';
import { ListboxSortingContext, ListboxSortableContext } from '../sorting/ListboxSortingContext';
import { useListboxGroupContext } from '../group/ListboxGroupContext';
import { useListboxSortingItem } from '../sorting/useListboxSortingItem';
import { selectionReducer, isMultipleSelectionMode } from '../utils/selectionReducer';
import type { SelectionAction } from '../utils/selectionReducer';

function useListItemValueRegistration(params: {
  index: number;
  itemValue: any;
  hasRegistered: boolean;
  valuesRef: React.RefObject<Array<any>>;
}) {
  const { index, itemValue, hasRegistered, valuesRef } = params;

  useIsoLayoutEffect(() => {
    if (!hasRegistered) {
      return undefined;
    }

    const values = valuesRef.current;
    values[index] = itemValue;

    return () => {
      delete values[index];
    };
  }, [hasRegistered, index, itemValue, valuesRef]);
}

const stateAttributesMapping: StateAttributesMapping<ListboxItemState> = {
  dragOver(value) {
    return value ? { 'data-drag-over': '' } : null;
  },
  dropPosition(value) {
    return value ? { 'data-drop-position': value } : null;
  },
};

/**
 * An individual option in the listbox.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export const ListboxItem = React.memo(
  React.forwardRef(function ListboxItem(
    componentProps: ListboxItem.Props,
    forwardedRef: React.ForwardedRef<HTMLElement>,
  ) {
    return renderListboxItem(useListboxItemElement(componentProps, forwardedRef));
  }),
);

export function useListboxItemElement(
  componentProps: ListboxItem.Props,
  forwardedRef: React.ForwardedRef<HTMLElement>,
) {
  const {
    render,
    className,
    style,
    value: itemValue = null,
    label,
    disabled = false,
    nativeButton = false,
    draggableProps,
    ...elementProps
  } = componentProps;

  const textRef = React.useRef<HTMLElement | null>(null);
  const listItem = useCompositeListItem({
    guess: true,
    label,
    textRef,
  });

  const store = useListboxRootContext();

  const groupContext = useListboxGroupContext(true);
  const sorting = React.useContext(ListboxSortingContext);
  const sortable = React.useContext(ListboxSortableContext);
  const highlightTimeout = useTimeout();

  const selectionMode = store.useState('selectionMode');
  const highlightItemOnHover = store.useState('highlightItemOnHover');
  const rootDisabled = store.useState('disabled');
  const highlighted = store.useState('isActive', listItem.index);
  const selected = store.useState('isSelected', listItem.index, itemValue);
  const isItemEqualToValue = store.useState('isItemEqualToValue');
  const { disabledItemsRef, lastSelectedIndexRef, pointerMoveSuppressedRef, setValue, valuesRef } =
    store.context;

  const index = listItem.index;
  const hasRegistered = index !== -1;
  const groupId = groupContext?.groupId ?? null;

  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const indexRef = useValueAsRef(index);
  const handleContextMenu = React.useCallback((event: BaseUIEvent<React.MouseEvent>) => {
    event.preventDefault();
  }, []);

  const dragItemId = useListboxSortingItem({
    index,
    itemValue,
    itemRef,
    enabled: hasRegistered,
    disabled,
    groupId,
  });
  const moving = store.useState('isMoving', dragItemId);
  const sortingPosition = store.useState('dropPositionForItem', dragItemId);
  const dropItem = {
    id: dragItemId,
    value: itemValue,
    index,
    groupId,
    disabled: disabled || rootDisabled,
  };
  useListboxDropItem(store, dropItem);
  const externalPosition = useExternalDropPosition<ListboxSortingDropPosition>(store, dragItemId);
  const dropPosition = externalPosition?.placement ?? sortingPosition;
  const dragOver = dropPosition !== null;
  const sortingEnabled =
    sorting != null &&
    dragItemId !== undefined &&
    !sorting.isDisabled({ id: dragItemId, value: itemValue, index, groupId, disabled });
  const preventContextMenuOnAndroid =
    platform.os.android && sortable != null && sortingEnabled && !draggableProps?.disabled;

  useListItemValueRegistration({
    index,
    itemValue,
    hasRegistered,
    valuesRef,
  });

  useIsoLayoutEffect(() => {
    if (!hasRegistered) {
      return undefined;
    }

    const disabledItems = disabledItemsRef.current;
    disabledItems[index] = rootDisabled || disabled;

    return () => {
      delete disabledItems[index];
    };
  }, [disabled, disabledItemsRef, hasRegistered, index, rootDisabled]);

  const state: ListboxItemState = {
    disabled,
    selected,
    highlighted,
    moving,
    dragOver,
    dropPosition,
  };

  const lastKeyRef = React.useRef<string | null>(null);

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled: true,
    native: nativeButton,
    composite: true,
  });

  /**
   * Maps a click event (with modifier keys) to a SelectionAction based on
   * the current selectionMode, then dispatches it through the reducer.
   */
  function commitSelection(
    event: MouseEvent | KeyboardEvent,
    {
      shiftKey = false,
      ctrlKey = false,
    }: {
      shiftKey?: boolean | undefined;
      ctrlKey?: boolean | undefined;
    } = {},
  ) {
    let action: SelectionAction;

    if (shiftKey && isMultipleSelectionMode(selectionMode)) {
      if (selectionMode === 'explicit-multiple' && ctrlKey) {
        const anchorIndex = lastSelectedIndexRef.current;
        action =
          anchorIndex === null
            ? { type: 'toggle', index }
            : { type: 'selectRange', from: anchorIndex, to: index };
      } else {
        action = { type: 'extendTo', index, anchorIndex: lastSelectedIndexRef.current };
      }
    } else if (selectionMode === 'multiple') {
      // In 'multiple' mode, every click toggles
      action = { type: 'toggle', index };
    } else if (selectionMode === 'explicit-multiple' && ctrlKey) {
      // In 'explicit-multiple' mode, Ctrl/Cmd+Click toggles
      action = { type: 'toggle', index };
    } else {
      // 'single' or 'explicit-multiple' without modifier → replace
      action = { type: 'select', index };
    }

    const currentValue = store.state.value;
    const nextValue = selectionReducer(
      action,
      currentValue,
      valuesRef.current,
      disabledItemsRef.current,
      isItemEqualToValue,
    );
    setValue(nextValue, createChangeEventDetails(REASONS.itemPress, event));

    // Update selection anchor (used by Shift+Click range selection)
    if (action.type !== 'extendTo') {
      lastSelectedIndexRef.current = index;
    }
  }

  function handleItemKeyDown(event: BaseUIEvent<React.KeyboardEvent>) {
    if (dragItemId !== undefined) {
      sorting?.handleKeyDown(event, dragItemId);
      if (event.defaultPrevented) {
        return;
      }
    }

    lastKeyRef.current = event.key;
    const currentIndex = findItemIndex(valuesRef.current, itemValue, isItemEqualToValue);
    const resolvedIndex = currentIndex === -1 ? index : currentIndex;

    store.set('activeIndex', resolvedIndex);
  }

  const sortKeys =
    store.state.orientation === 'horizontal'
      ? 'Alt+ArrowLeft Alt+ArrowRight'
      : 'Alt+ArrowUp Alt+ArrowDown';
  const defaultProps: HTMLProps = {
    role: 'option',
    'aria-selected': selected,
    'aria-keyshortcuts': sortingEnabled ? sortKeys : undefined,
    tabIndex: highlighted ? 0 : -1,
    onFocus() {
      store.set('activeIndex', index);
    },
    onMouseMove() {
      if (highlightItemOnHover && !pointerMoveSuppressedRef.current) {
        store.set('activeIndex', index);
        itemRef.current?.focus();
      }
    },
    onMouseLeave(event) {
      if (!highlightItemOnHover || pointerMoveSuppressedRef.current || isMouseWithinBounds(event)) {
        return;
      }

      highlightTimeout.start(0, () => {
        if (store.state.activeIndex === index) {
          store.set('activeIndex', null);
        }
      });
    },
    onKeyDownCapture(event: BaseUIEvent<React.KeyboardEvent>) {
      if (disabled && !rootDisabled) {
        handleItemKeyDown(event);
      }
    },
    onKeyDown(event: BaseUIEvent<React.KeyboardEvent>) {
      handleItemKeyDown(event);
    },
    onClick(event) {
      // useButton in composite mode synthesizes a click from keydown (Space/Enter).
      // lastKeyRef is set in our onKeyDown and cleared below. If lastKeyRef is
      // null but the event type is 'keydown', it means a synthetic click arrived
      // without a real keydown we tracked — ignore it to avoid double-selection.
      if (event.type === 'keydown' && lastKeyRef.current === null) {
        return;
      }

      if (disabled || rootDisabled) {
        return;
      }

      lastKeyRef.current = null;
      commitSelection(event.nativeEvent, {
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey || event.metaKey,
      });
    },
    onContextMenu: preventContextMenuOnAndroid ? handleContextMenu : undefined,
  };

  const element = useRenderElement('div', componentProps, {
    ref: [buttonRef, forwardedRef, listItem.ref, itemRef],
    state,
    props: [defaultProps, elementProps, getButtonProps],
    stateAttributesMapping,
  });

  const contextValue: ListboxItemContext = React.useMemo(
    () => ({
      selected,
      indexRef,
      textRef,
      dragItemId,
      hasRegistered,
    }),
    [selected, indexRef, textRef, dragItemId, hasRegistered],
  );

  return { element, store, dropItem, sortable, draggableProps, contextValue };
}

export function renderListboxItem(
  item: ReturnType<typeof useListboxItemElement>,
  external?: {
    targetProps: ExternalDropTargetProps;
    render: (element: React.ReactElement) => React.ReactElement;
  },
) {
  const { element, dropItem, sortable, draggableProps, contextValue } = item;
  let renderedItem = element;
  if (sortable && dropItem.id !== undefined) {
    renderedItem = sortable.renderItem(
      element,
      dropItem.id,
      dropItem.disabled,
      draggableProps,
      external?.targetProps,
    );
  } else if (external) {
    renderedItem = external.render(element);
  }
  return (
    <ListboxItemContext.Provider value={contextValue}>{renderedItem}</ListboxItemContext.Provider>
  );
}

export interface ListboxItemState {
  /**
   * Whether the item should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is selected.
   */
  selected: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the item participates in the active pointer sorting operation.
   * Includes the item physically picked up and any other selected items included
   * in the move. Selected items disabled for sorting are excluded.
   * Remains true throughout the gesture, including live reordering, and resets
   * when the gesture ends or is canceled. Not set by keyboard sorting.
   * Exposed as `data-moving`. The drag engine separately sets `data-dragging`
   * only on the item physically picked up.
   */
  moving: boolean;
  /**
   * Whether a dragged item is over this item.
   */
  dragOver: boolean;
  /**
   * The drop position relative to this item, or `null` when the item is not being dragged over.
   */
  dropPosition: 'before' | 'after' | null;
}

export interface ListboxItemProps
  extends
    NonNativeButtonProps,
    Omit<BaseUIComponentProps<'div', ListboxItemState>, 'id' | 'draggable'> {
  children?: React.ReactNode;
  /** Configures the underlying Draggable.Root without replacing managed sorting. */
  draggableProps?: ListboxItemDraggableProps | undefined;
  /**
   * A unique value that identifies this listbox item.
   * @default null
   */
  value?: any;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * Specifies the text label to use when the item is matched during keyboard text navigation.
   */
  label?: string | undefined;
}

export type ListboxItemDraggableProps = Omit<
  Draggable.Root.Props<unknown>,
  'children' | 'render' | 'kind' | 'payload' | 'getPayload' | 'collisionPayload' | 'collision'
>;

export namespace ListboxItem {
  export type State = ListboxItemState;
  export type Props = ListboxItemProps;
}
