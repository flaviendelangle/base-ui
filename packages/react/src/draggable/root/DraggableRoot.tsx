'use client';
import * as React from 'react';
import { useRenderElement } from '../../internals/useRenderElement';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import type {
  NativeDragEventProps,
  RegisterDraggableParameters,
} from '../../types/dragRegistration';
import type { DragKind, DraggablePayload } from '../../types/drag';
import { useDraggableElement } from './useDraggableElement';
import { DraggableRootContext } from './DraggableRootContext';
import { useDraggableContext } from '../DraggableContext';

const stateAttributesMapping: StateAttributesMapping<DraggableRootState> = {
  // The engine owns `data-dragging`: it lands only once the preview has been built
  // and measured, so the clone never inherits it. React writing it too would race
  // that ordering.
  dragging: () => null,
};

// Without a role, the default focusable `<div>` is exposed as an unnamed `generic`
// node, which makes assistive technology drop the engine's `aria-roledescription`
// and leaves the pickup gesture undiscoverable. A polymorphic render target keeps
// its native semantics instead. Passed before `elementProps`, so an explicit role
// still wins.

/**
 * Makes its element a drag source that can be picked up with the pointer and
 * dropped on matching drop targets.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Draggable](https://base-ui.com/react/utils/draggable)
 */
export const DraggableRoot = React.forwardRef(function DraggableRoot<TData = undefined>(
  componentProps: DraggableRootPropsBase<TData> & {
    payload?: DraggablePayload<TData> | undefined;
  },
  forwardedRef: React.ForwardedRef<HTMLDivElement>,
) {
  const {
    // Rendering props
    className,
    render,
    style,
    children,
    // Drag source props. Listed explicitly because whatever stays in
    // `elementProps` is spread onto the `<div>`, where an engine parameter would
    // land as an attribute.
    kind,
    payload,
    previewKey,
    disabled,
    activation,
    dragCursor,
    modifiers,
    // Event handlers
    onBeforeMoveStart,
    onMoveStart,
    onMove,
    onTargetChange,
    onMoveEnd,
    // Props forwarded to the DOM element
    ...elementProps
  } = componentProps;

  const draggableContext = useDraggableContext();
  const resolvedKind = kind ?? draggableContext.defaultKind;

  // A fresh object per render is fine: `useDraggableElement` reads it through a
  // ref and never compares it.
  const params = {
    kind: resolvedKind,
    payload,
    previewKey,
    disabled,
    activation,
    dragCursor,
    modifiers,
    onBeforeMoveStart,
    onMoveStart,
    onMove,
    onTargetChange,
    onMoveEnd,
  } as RegisterDraggableParameters<TData>;

  const { ref, dragging, setHandleElement, observeElement, previewHandle } =
    useDraggableElement<TData>(params);

  const state: DraggableRoot.State = { dragging, disabled: disabled ?? false };

  const contextValue = React.useMemo(
    () => ({
      setHandleElement,
      observeElement,
      previewHandle,
      disabled: disabled ?? false,
    }),
    [setHandleElement, observeElement, previewHandle, disabled],
  );

  const element = useRenderElement('div', componentProps, {
    state,
    ref: [forwardedRef, ref],
    props: [{ children }, elementProps],
    stateAttributesMapping,
  });

  return (
    <DraggableRootContext.Provider value={contextValue}>{element}</DraggableRootContext.Provider>
  );
  // Overloaded so `payload` stays required for a kind that declares one: a
  // `kind={card}` with no payload can't leave the engine emitting `undefined` where a
  // `Card` was promised. Expressing that as a conditional on the props type instead
  // would make it a deferred conditional a generic wrapper can't spread into.
}) as {
  <TData>(
    props: DraggableRootPropsWithKind<TData> & RequiredDraggablePayload<TData>,
  ): React.JSX.Element;
  (
    props: DraggableRootPropsBase<undefined> & DraggablePayloadParameters<undefined>,
  ): React.JSX.Element;
};

export interface DraggableRootState {
  /**
   * Whether this element is the one currently being dragged.
   */
  dragging: boolean;
  /**
   * Whether the draggable is disabled.
   */
  disabled: boolean;
}

// Every `Draggable.Root` prop except its payload fields; the overloads and `Props` below
// each add it back with their own optionality. See `DraggableConfig.payload`.
type DraggableRootPropsBase<TData> = Omit<
  BaseUIComponentProps<'div', DraggableRootState>,
  // - `children` is widened below.
  // - the whole native HTML5 drag event family is replaced by this engine
  'children' | 'draggable' | NativeDragEventProps
> &
  // The preview is described by a `Draggable.Preview`. An empty Preview uses the
  // default clone, so no separate clone part is needed.
  // rendered inside this component, and the drag handle by a `Draggable.Handle`,
  // never from here.
  Omit<RegisterDraggableParameters<TData>, 'dragPreview' | 'dragHandle' | 'kind' | 'payload'> & {
    children?: React.ReactNode | undefined;
    kind?: DragKind<TData> | undefined;
  };

export type DraggableRootProps<TData = undefined> = [TData] extends [undefined]
  ? DraggableRootPropsBase<undefined> & DraggableRootPayloadField<undefined>
  : DraggableRootPropsWithKind<TData> & DraggableRootPayloadField<TData>;

/**
 * Props for a generic `Draggable.Root` wrapper whose payload is always required.
 * Use this alias when spreading props with an unbound payload type into the root.
 */
export type DraggableRootPropsWithPayload<TData> = DraggableRootPropsBase<TData> & {
  kind: DragKind<TData>;
} & RequiredDraggablePayload<TData>;

type DraggableRootPropsWithKind<TData> = Omit<DraggableRootPropsBase<TData>, 'kind'> & {
  kind: DragKind<TData>;
};

type DraggablePayloadParameters<TData> = {
  /**
   * Data to attach to this drag. It is available as `source.payload` on every
   * drag-and-drop event.
   */
  payload?: DraggablePayload<TData> | undefined;
};

type RequiredDraggablePayload<TData> = {
  /**
   * Data to attach to this drag. It is available as `source.payload` on every
   * drag-and-drop event.
   */
  payload: DraggablePayload<TData>;
};

/**
 * Requires `payload` when the caller declares a payload type. Generic wrappers
 * use {@link DraggableRootPropsWithPayload} instead.
 */
type DraggableRootPayloadField<TData> = [TData] extends [undefined]
  ? DraggablePayloadParameters<TData>
  : RequiredDraggablePayload<TData>;

export namespace DraggableRoot {
  export type State = DraggableRootState;
  export type Props<TData = undefined> = DraggableRootProps<TData>;
  export type PropsWithPayload<TData> = DraggableRootPropsWithPayload<TData>;
}
