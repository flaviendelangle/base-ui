'use client';
import * as React from 'react';
import { useIsoLayoutEffect } from '@base-ui/utils/useIsoLayoutEffect';
import { useDraggableRootContext } from '../root/DraggableRootContext';
import type { DragPreviewDeclaration } from '../../utils/drag-and-drop/dragPreviewDeclaration';
import type { DragPreviewSettings } from '../../types/drag';
import type { DragPreviewElementFactory } from '../../utils/drag-and-drop/synthetic/cloneDragPreview';

/**
 * Tell the draggable what its preview is. Pass `render` to own the content, or
 * `null` for a clone of the source.
 * @internal
 */
export function useDeclaredPreview<TData = unknown>(
  getProps: () => DragPreviewSettings,
  render: DragPreviewDeclaration<TData>['render'],
  createPreviewElement?: DragPreviewElementFactory,
  disabled = false,
): void {
  const { previewHandle } = useDraggableRootContext<TData>();
  const declaration = React.useMemo<DragPreviewDeclaration<TData>>(() => {
    // Mapped over `Required<…>` so every setting has to be plucked here: settings
    // are all optional, so a new one added to `DragPreviewSettings` would
    // otherwise type-check while being silently dropped on its way to the engine.
    const declared: {
      [K in keyof Required<DragPreviewDeclaration<TData>>]: DragPreviewDeclaration<TData>[K];
    } = {
      render,
      createPreviewElement,
      get offset() {
        return getProps().offset;
      },
      get modifiers() {
        return getProps().modifiers;
      },
      get disabled() {
        return getProps().disabled;
      },
      get container() {
        return getProps().container;
      },
    };
    return declared;
  }, [getProps, render, createPreviewElement]);

  useIsoLayoutEffect(() => previewHandle.declare(declaration), [previewHandle, declaration]);
}
