'use client';
import type * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import type { BaseUIComponentProps } from '../../internals/types';
import type { DragKind, DragPreviewSettings, DragPreviewRenderEvent } from '../../types/drag';
import { DraggablePreviewElement } from './DraggablePreviewElement';
import { useDeclaredPreview } from './useDeclaredPreview';
import { createDragPreviewHostElement } from '../../utils/drag-and-drop/synthetic/cloneDragPreview';

/**
 * Customizes what follows the pointer while the draggable is dragged.
 * When no children are provided, the source is cloned automatically. Providing
 * children replaces that clone with custom preview content.
 * Renders a `<div>` element.
 *
 * Renders nothing where you write it. Custom preview content renders through
 * `Draggable.Provider`; the default clone does not require React rendering.
 *
 * Documentation: [Base UI Draggable](https://base-ui.com/react/utils/draggable)
 */
export function DraggablePreview<TData>(props: DraggablePreviewTypedProps<TData>): React.ReactNode;
export function DraggablePreview(props: DraggablePreviewProps): React.ReactNode;
export function DraggablePreview<TData = unknown>(
  props: DraggablePreviewProps | DraggablePreviewTypedProps<TData>,
): React.ReactNode {
  return <DraggablePreviewDeclaration {...props} />;
}

function DraggablePreviewDeclaration<TData = unknown>(
  props: DraggablePreviewProps | DraggablePreviewTypedProps<TData>,
): null {
  const getProps = useStableCallback(() => props);

  // Resolved per drag, not per render.
  const render = useStableCallback((parameters: DragPreviewRenderEvent<TData>) => {
    // The settings belong to the engine, which reads them off the declaration;
    // everything else belongs to the rendered element.
    const { children, kind, offset, modifiers, disabled, container, ...componentProps } =
      getProps();
    // A typed preview must never call its render function with a payload of a
    // different kind. This can happen only when the part is composed under the
    // wrong root; decline the preview for that drag rather than violating the
    // callback's public type.
    if (kind !== undefined && !kind.matches(parameters.source)) {
      return null;
    }
    const resolved = typeof children === 'function' ? children(parameters) : children;
    // Declining the preview has to reach the engine as-is: it tears the host it
    // already built back down, which rendering an empty element would not.
    if (resolved == null || resolved === false) {
      return resolved;
    }
    return <DraggablePreviewElement componentProps={{ ...componentProps, children: resolved }} />;
  });

  useDeclaredPreview<TData>(
    getProps,
    props.children === undefined ? null : render,
    props.children === undefined ? undefined : createDragPreviewHostElement,
    props.disabled === true,
  );

  return null;
}

export interface DraggablePreviewState {}

export interface DraggablePreviewProps
  extends
    Omit<
      BaseUIComponentProps<'div', DraggablePreviewState>,
      // - `children` is widened below.
      // - the engine creates the element at drag start, in the overlay rather than here,
      // so there is no node for a ref to point at when this component renders.
      'children' | 'ref'
    >,
    DragPreviewSettings {
  /**
   * Show no preview at all: nothing follows the pointer. The drag itself still runs.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The preview content. Omit it to use a clone of the draggable source. Pass a
   * function to build custom content from the drag payload, which is resolved
   * once at drag start. Its payload is `unknown` until a `kind` is supplied
   * through {@link DraggablePreviewTypedProps}.
   */
  children?:
    | React.ReactNode
    | ((parameters: DragPreviewRenderEvent) => React.ReactNode)
    | undefined;
  /** Omitted on an untyped preview. */
  kind?: undefined;
}

/**
 * Props for a payload-aware preview. `kind` both types the render callback and
 * checks the active source before that callback runs.
 */
export type DraggablePreviewTypedProps<TData> = Omit<DraggablePreviewProps, 'children' | 'kind'> & {
  /** The source kind whose payload the render callback accepts. */
  kind: DragKind<TData>;
  /** Preview content, or omit it to use a clone, resolved once at drag start with the kind's payload type. */
  children?:
    | React.ReactNode
    | ((parameters: DragPreviewRenderEvent<TData>) => React.ReactNode)
    | undefined;
};

export namespace DraggablePreview {
  export type State = DraggablePreviewState;
  export type Props<TData = unknown> = unknown extends TData
    ? DraggablePreviewProps
    : DraggablePreviewTypedProps<TData>;
}
