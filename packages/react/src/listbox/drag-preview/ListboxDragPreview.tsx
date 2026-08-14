'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { useValueAsRef } from '@base-ui/utils/useValueAsRef';
import { warn } from '@base-ui/utils/warn';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useDraggableCollectionTranslations } from '../../internals/use-draggable-collection';
import type { DragPreviewOffset, DragPreviewSettings } from '../../types/drag';
import { useListboxRootContext } from '../root/ListboxRootContext';
import type { ListboxDragItem } from '../drag-provider/ListboxDragProviderContext';
import {
  type ListboxDragPreviewDeclaration,
  useListboxDragPreviewRegistry,
} from './ListboxDragPreviewContext';

const MULTIPLE_HOOK = { 'data-multiple': '' };

const stateAttributesMapping = {
  multiple(value: boolean) {
    return value ? MULTIPLE_HOOK : null;
  },
} satisfies StateAttributesMapping<ListboxDragPreview.State>;

function ListboxDragPreviewElement(props: {
  componentProps: ListboxDragPreviewElementProps;
  content: React.ReactNode;
  multiple: boolean;
}): React.ReactNode {
  const { componentProps, content, multiple } = props;
  const { className, style, render, ...elementProps } = componentProps;
  const state: ListboxDragPreview.State = { multiple };

  return useRenderElement('div', componentProps, {
    state,
    props: [{ children: content }, elementProps],
    stateAttributesMapping,
  });
}

type ListboxDragPreviewElementProps = Omit<
  ListboxDragPreviewProps<any>,
  'children' | keyof DragPreviewSettings
>;

/**
 * Describes what follows the pointer while listbox items are dragged.
 * Renders nothing where you write it.
 *
 * Documentation: [Base UI Listbox](https://base-ui.com/react/components/listbox)
 */
export function ListboxDragPreview<Value = any>(
  props: ListboxDragPreview.Props<Value>,
): React.ReactNode {
  const store = useListboxRootContext();
  const translations = useDraggableCollectionTranslations();
  const registry = useListboxDragPreviewRegistry();
  const propsRef = useValueAsRef(props);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && registry == null) {
      warn(
        '<Listbox.DragPreview> has no effect outside <Listbox.DragProvider>.',
        'Render it inside <Listbox.DragProvider> so a drag can render the preview.',
        'See https://base-ui.com/react/components/listbox for more details.',
      );
    }
  }, [registry]);

  const render = useStableCallback((draggedItems: ListboxDragItem<Value>[]): React.ReactNode => {
    const { children, offset, modifiers, disabled, container, ...componentProps } =
      propsRef.current;
    const items = [...draggedItems].sort((a, b) => a.index - b.index);
    const multiple = items.length > 1;

    let content: React.ReactNode;
    if (typeof children === 'function') {
      content = children(items.map((item) => item.value));
    } else if (children !== undefined) {
      content = children;
    } else if (multiple) {
      content = translations.dragMultipleItemsLabel({ count: items.length });
    } else {
      const item = items[0];
      content = (item && store.context.labelsRef.current[item.index]) ?? String(item?.value ?? '');
    }

    if (content == null || content === false) {
      return content;
    }

    return (
      <ListboxDragPreviewElement
        componentProps={componentProps}
        content={content}
        multiple={multiple}
      />
    );
  });

  const declaration = React.useMemo<ListboxDragPreviewDeclaration>(
    () => ({
      render,
      get offset() {
        return propsRef.current.offset ?? 'pointer';
      },
      get modifiers() {
        return propsRef.current.modifiers;
      },
      get disabled() {
        return propsRef.current.disabled;
      },
      get container() {
        return propsRef.current.container;
      },
    }),
    [propsRef, render],
  );

  useIsoLayoutEffect(() => registry?.register(declaration), [declaration, registry]);

  return null;
}

export interface ListboxDragPreviewState {
  /** Present when several items are dragged together. */
  multiple: boolean;
}

export interface ListboxDragPreviewProps<Value = any>
  extends
    Omit<BaseUIComponentProps<'div', ListboxDragPreviewState>, 'children' | 'ref'>,
    DragPreviewSettings {
  /**
   * Where to place the preview relative to the pointer.
   * @default 'pointer'
   */
  offset?: DragPreviewOffset | undefined;
  /**
   * The preview content. Pass a function to render the dragged item values in list order.
   * Omit it to render the item label, or a localized item count for a multi-item drag.
   */
  children?: React.ReactNode | ((items: Value[]) => React.ReactNode) | undefined;
}

export namespace ListboxDragPreview {
  export type State = ListboxDragPreviewState;
  export type Props<Value = any> = ListboxDragPreviewProps<Value>;
}
