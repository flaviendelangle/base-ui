'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import { useStore } from '@base-ui/utils/store';
import { areArraysEqual } from '@base-ui/utils/areArraysEqual';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useTreeGridItemContext } from '../item/TreeGridItemContext';
import type { TreeGridState } from '../store/types';
import { selectAncestorLastChildFlags } from './selectAncestorLastChildFlags';
import * as TreeGridItemIndentGuideCssVars from './TreeGridItemIndentGuideCssVars';
import * as TreeGridItemIndentGuideDataAttributes from './TreeGridItemIndentGuideDataAttributes';

const stateAttributesMapping = { level: () => null };

/**
 * Renders vertical indent guide lines for a tree item, one per ancestor level.
 * Each line carries `data-level` and, when its ancestor is a last child, `data-last`.
 * Renders a `<span>` element containing inner `<span>` elements.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export const TreeGridItemIndentGuide = fastComponentRef(function TreeGridItemIndentGuide(
  componentProps: TreeGridItemIndentGuide.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, style, ...elementProps } = componentProps;

  const store = useTreeGridRootContext();
  const itemId = useTreeGridItemContext();
  const level = store.useState('itemLevel', itemId);
  // Any structural change creates new flag arrays, while the flags of most rows stay the same.
  const selectFlags = React.useMemo(() => {
    let previous: boolean[] | undefined;
    return (state: TreeGridState) => {
      const next = selectAncestorLastChildFlags(state, itemId);
      if (previous === undefined || !areArraysEqual(previous, next)) {
        previous = next;
      }
      return previous;
    };
  }, [itemId]);
  const ancestorLastChildFlags = useStore(store, selectFlags);

  const hasGuides = level > 1;

  const state: TreeGridItemIndentGuide.State = {
    level,
  };

  const guideSpans = hasGuides
    ? ancestorLastChildFlags.map((isLast: boolean, index: number) => {
        const lineLevel = index + 1;
        const attrs: Record<string, string> = {
          [TreeGridItemIndentGuideDataAttributes.level]: String(lineLevel),
        };
        if (isLast) {
          attrs[TreeGridItemIndentGuideDataAttributes.last] = '';
        }
        return (
          <span
            key={lineLevel}
            aria-hidden
            style={{ [TreeGridItemIndentGuideCssVars.level]: lineLevel } as React.CSSProperties}
            {...attrs}
          />
        );
      })
    : null;

  return useRenderElement('span', componentProps, {
    state,
    ref: forwardedRef,
    props: [
      { 'aria-hidden': true } as React.HTMLAttributes<HTMLSpanElement>,
      elementProps,
      { children: guideSpans } as React.HTMLAttributes<HTMLSpanElement>,
    ],
    stateAttributesMapping,
    enabled: hasGuides,
  });
});

export interface TreeGridItemIndentGuideState {
  /**
   * The level of the item in the tree hierarchy (1-based).
   */
  level: number;
}

export interface TreeGridItemIndentGuideProps extends BaseUIComponentProps<
  'span',
  TreeGridItemIndentGuideState
> {}

export namespace TreeGridItemIndentGuide {
  export type State = TreeGridItemIndentGuideState;
  export type Props = TreeGridItemIndentGuideProps;
}
