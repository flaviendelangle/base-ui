'use client';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { mergeCleanups } from '@base-ui/utils/mergeCleanups';
import { useCSPContext } from '../../internals/csp-context/CSPContext';
import type { CSPContextValue } from '../../internals/csp-context/CSPContext';
import { applyDraggableStaticSetup, bindDraggableSensors } from './draggable';
import type { DraggableConfig } from './draggable';
// Aliased to avoid shadowing the public `registerDraggable` method name.
import { registerDraggable as registerDraggableInRegistry } from './draggableRegistry';
import { registerAutoScroller, registerDropTarget, registerMonitor } from './registrations';
import { onceCleanup } from './utils';
import { cancelDrag } from './cancelDrag';
import { clearPublishedDragPreview, publishDragPreview } from './overlay/dragPreviewStore';
import { useDragPreviewContext } from './overlay/DragPreviewContext';
import type { DragPreviewContext } from './overlay/DragPreviewContext';
import {
  getActiveDragPreviewSettings,
  getActivePreview,
  removeActivePreview,
} from './activePreview';
import { retargetEndingPreviewSource } from './synthetic/syntheticPreview';
import type {
  InternalDragEngine,
  InternalDraggableParameters,
  RegisterDraggableParameters,
} from '../../types/dragRegistration';
import type { DragCleanupFn } from '../../types/drag';
import { useDraggableContext } from '../../draggable/DraggableContext';

import type { LatestGetter } from './useRegistrationRef';

/**
 * The half of the engine that depends on React context: `registerDraggable`,
 * which reads the locale and the preview provider, plus `cancelDrag`.
 *
 * Separate from {@link DragEngineImpl} for bundle size. The other three
 * registrations are class fields assigned from `./registrations`, which makes
 * them unconditionally reachable — so a bundle with nothing but `Draggable.Root`
 * in it shipped the drop-target and monitor registries too. Keeping them off
 * this base class is what lets a bundler drop them.
 *
 * Auto-scroll is armed independently by `Draggable.Viewport` or an imperative
 * auto-scroller registration, so it also stays outside the draggable leaf.
 */
export class DragEngineBase {
  constructor(
    private readonly getPreviewContext: LatestGetter<DragPreviewContext | null>,
    private readonly getCSPContext: LatestGetter<CSPContextValue>,
  ) {}

  // The nearest `Draggable.PreviewProvider`, or `null` when there is none.
  private get previewContext(): DragPreviewContext | null {
    return this.getPreviewContext();
  }

  cancelDrag = cancelDrag;

  registerDraggable = <TData = undefined>(
    element: HTMLElement,
    get: () => RegisterDraggableParameters<TData>,
    cacheParameters = false,
  ): DragCleanupFn => {
    const initial = get();

    // Always defined so every drag start clears any preview the previous drag left
    // behind. A drop and the next pickup can land in one React flush, so the
    // renderer's clear-on-null effect never runs and the previous preview would
    // otherwise render frozen through the next drag.
    const onGenerateDragPreview: DraggableConfig<TData>['onGenerateDragPreview'] = (payload) => {
      // Read live at dispatch time, not captured at registration: nothing
      // re-registers a draggable when the nearest `Draggable.PreviewProvider`
      // re-renders, so a `container` that arrives after mount must still be seen by
      // the next drag.
      const previewContext = this.previewContext;
      // The previous drag's store, which is not necessarily one this source can
      // resolve (another provider's). Clearing only the resolved store below
      // would strand that content on screen.
      clearPublishedDragPreview();
      // Resolved by the sensor, which built the preview element from them
      // before starting the session this runs inside.
      const settings = getActiveDragPreviewSettings();
      // Only a host has React content to publish. Bail before
      // `getActivePreview()` below, which reports hosts alone — a clone would
      // read as "no preview" there and get torn straight back down.
      if (settings == null || settings.content !== 'host' || settings.disabled) {
        previewContext?.previewStore.setState(null);
        return;
      }
      const { previewStore } = previewContext!;
      previewStore.setState(null);
      const preview = getActivePreview();
      const previewNode = preview ? settings.render(payload) : null;
      // Content that resolves to nothing declines the preview for this drag. Drop
      // the host the sensor built, or an empty box would follow the pointer.
      if (preview == null || previewNode == null || previewNode === false) {
        removeActivePreview();
        return;
      }
      publishDragPreview(previewStore, {
        node: previewNode,
        host: preview.element,
        offset: settings.offset,
        // Measured once by the engine, before the clone was inserted and the
        // source was marked — re-reading it here would force another reflow.
        sourceRect: preview.sourceRect,
        input: payload.location.initial.input,
      });
    };

    // Most parameters flow straight through the spread; only fields needing
    // locale context (localized a11y strings/announcements) or the preview
    // wiring are overridden. Internal React-backed registrations opt into caching
    // while all inputs are unchanged: the lifecycle reads this getter on every
    // event, while those callers only replace `params` on a render.
    let lastParams: InternalDraggableParameters<TData> | null = null;
    let lastCSPContext: CSPContextValue | null = null;
    let normalized: DraggableConfig<TData> | null = null;
    const getNormalized = (): DraggableConfig<TData> => {
      // `Draggable.Root` adds the preview-declaration channel to what it returns
      // here; the public parameter type hides it, since consumers never set it.
      const params = get() as InternalDraggableParameters<TData>;
      const cspContext = this.getCSPContext();
      if (
        cacheParameters &&
        normalized !== null &&
        params === lastParams &&
        cspContext === lastCSPContext
      ) {
        return normalized;
      }
      lastParams = params;
      lastCSPContext = cspContext;
      normalized = {
        ...params,
        element,
        styleNonce: cspContext.nonce,
        disableStyleElements: cspContext.disableStyleElements,
        onGenerateDragPreview,
      } as DraggableConfig<TData>;
      return normalized;
    };

    // One-time static DOM setup (gesture styles + a11y attributes), read once at registration.
    const restoreStatic = applyDraggableStaticSetup({
      element,
      dragHandle: initial.dragHandle,
      disabled: initial.disabled,
    });
    const unregister = registerDraggableInRegistry(element, getNormalized);
    retargetEndingPreviewSource(element, {
      kind: initial.kind.id,
      previewKey: initial.previewKey,
      payload: initial.payload,
    });
    const unbindSensors = bindDraggableSensors(element);

    return onceCleanup(mergeCleanups(restoreStatic, unregister, unbindSensors));
  };
}

/** The full imperative API: the base plus the three standalone registrations. */
export class DragEngineImpl extends DragEngineBase implements InternalDragEngine {
  // The stateless primitives, re-exposed as methods (see `./registrations`).
  registerDropTarget = registerDropTarget;

  registerAutoScroller = registerAutoScroller;

  registerMonitor = registerMonitor;
}

/**
 * The registration function `Draggable.Root` runs, bound to the current locale
 * and preview provider. Stable across renders.
 *
 * Returns the function rather than an object with one method on it: the caller
 * needs nothing else, and reaching for {@link useInnerDragEngine} here would pull
 * the drop-target and monitor registrations into every bundle containing a
 * `Draggable.Root`.
 */
export function useRegisterDraggable(): DragEngineBase['registerDraggable'] {
  useDraggableContext();
  const previewContext = useDragPreviewContext();
  const cspContext = useCSPContext();
  const getPreviewContext = useStableCallback(() => previewContext);
  const getCSPContext = useStableCallback(() => cspContext);

  return useRefWithInit(() => new DragEngineBase(getPreviewContext, getCSPContext)).current
    .registerDraggable;
}

/**
 * The engine's imperative API, used internally by `Draggable.Root`,
 * `Draggable.Target`, `Draggable.Viewport` and `Draggable.useDragMonitor`, and publicly by
 * `useDragDropManager`. The collection plugin builds its own {@link DragEngineImpl}
 * directly rather than calling this hook.
 *
 * The registries, lifecycle and sensors live in a global, cross-bundle slot, but
 * the React-facing API requires `Draggable.Provider` for its shared context and
 * preview boundary.
 */
export function useInnerDragEngine(): InternalDragEngine {
  useDraggableContext();
  const previewContext = useDragPreviewContext();
  const cspContext = useCSPContext();
  const getPreviewContext = useStableCallback(() => previewContext);
  const getCSPContext = useStableCallback(() => cspContext);

  return useRefWithInit(() => new DragEngineImpl(getPreviewContext, getCSPContext)).current;
}
