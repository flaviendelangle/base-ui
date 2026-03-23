'use client';
import * as React from 'react';
import { fastComponentRef } from '@base-ui/utils/fastHooks';
import type { BaseUIComponentProps } from '../../utils/types';
import { useRenderElement } from '../../utils/useRenderElement';
import { useTreeRootContext } from '../root/TreeRootContext';
import { useTreeItemContext } from '../item/TreeItemContext';
import { TreeItemIndentGuideDataAttributes } from './TreeItemIndentGuideDataAttributes';
import { TreeItemIndentGuideCssVars } from './TreeItemIndentGuideCssVars';

/**
 * Renders vertical indent guide lines for a tree item.
 * One guide line (`<span>`) is rendered per ancestor depth level (1 to level-1).
 * Each guide line receives `data-depth` and optionally `data-last` attributes
 * for CSS-driven positioning and VS Code-style last-child truncation.
 * Renders a `<span>` element containing inner `<span>` elements.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemIndentGuide = fastComponentRef(function TreeItemIndentGuide(
  componentProps: TreeItemIndentGuide.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { className, render, ...elementProps } = componentProps;

  const store = useTreeRootContext();
  const itemId = useTreeItemContext();
  const level = store.useState('itemLevel', itemId);
  const ancestorLastChildFlags = store.useState('itemAncestorLastChildFlags', itemId);

  const hasGuides = level > 1;

  const state: TreeItemIndentGuide.State = {
    level,
  };

  const guideSpans = hasGuides
    ? ancestorLastChildFlags.map((isLast: boolean, index: number) => {
        const depth = index + 1;
        const attrs: Record<string, string> = {
          [TreeItemIndentGuideDataAttributes.depth]: String(depth),
        };
        if (isLast) {
          attrs[TreeItemIndentGuideDataAttributes.last] = '';
        }
        return (
          <span
            key={depth}
            aria-hidden
            style={{ [TreeItemIndentGuideCssVars.depth]: depth } as React.CSSProperties}
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
    enabled: hasGuides,
  });
});

export interface TreeItemIndentGuideState {
  /**
   * The level of the item in the tree hierarchy (1-based).
   */
  level: number;
}

export interface TreeItemIndentGuideProps extends BaseUIComponentProps<
  'span',
  TreeItemIndentGuideState
> {}

export namespace TreeItemIndentGuide {
  export type State = TreeItemIndentGuideState;
  export type Props = TreeItemIndentGuideProps;
}
