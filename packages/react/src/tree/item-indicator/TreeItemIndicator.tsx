'use client';
import * as React from 'react';
import type { BaseUIComponentProps } from '../../internals/types';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useTreeRootContext } from '../root/TreeRootContext';
import { useTreeItemContext } from '../item/TreeItemContext';
import { expansionMapping } from '../utils/stateAttributesMapping';

const stateAttributesMapping = { ...expansionMapping, ...transitionStatusMapping };

/**
 * Whether an expandable item is expanded. The indicator itself never toggles anything.
 */
function useItemExpanded() {
  const store = useTreeRootContext();
  const itemId = useTreeItemContext();
  const expanded = store.useState('isItemExpanded', itemId);
  const expandable = store.useState('isItemExpandable', itemId);
  return { expandable, expanded: expandable && expanded };
}

const Inner = React.memo(
  React.forwardRef(
    (
      componentProps: TreeItemIndicator.Props & { matches: boolean; expanded: boolean },
      forwardedRef: React.ForwardedRef<HTMLSpanElement>,
    ) => {
      const { render, className, style, keepMounted, match, matches, expanded, ...elementProps } =
        componentProps;

      const store = useTreeRootContext();
      const indicatorRef = React.useRef<HTMLSpanElement | null>(null);
      const { transitionStatus, setMounted } = useTransitionStatus(matches);

      const state: TreeItemIndicatorState = { expanded, transitionStatus };

      const element = useRenderElement('span', componentProps, {
        ref: [forwardedRef, indicatorRef],
        state,
        props: [
          {
            'aria-hidden': true,
            onClick: (event: React.MouseEvent) => store.interaction.markIndicatorPress(event),
          },
          elementProps,
        ],
        stateAttributesMapping,
      });

      useOpenChangeComplete({
        open: matches,
        ref: indicatorRef,
        onComplete() {
          if (!matches) {
            setMounted(false);
          }
        },
      });

      return element;
    },
  ),
);

/**
 * Shows whether its tree item is expanded, such as a chevron or a folder icon.
 * A press on it expands or collapses the item without changing the selection.
 * Renders a `<span>` element in items that can be expanded.
 *
 * Documentation: [Base UI Tree](https://base-ui.com/react/components/tree)
 */
export const TreeItemIndicator = React.forwardRef(function TreeItemIndicator(
  componentProps: TreeItemIndicator.Props,
  forwardedRef: React.ForwardedRef<HTMLSpanElement>,
) {
  const { keepMounted = false, match = 'open' } = componentProps;
  const { expandable, expanded } = useItemExpanded();
  const matches = expanded === (match === 'open');

  if (!expandable || (!keepMounted && !matches)) {
    return null;
  }

  return <Inner {...componentProps} ref={forwardedRef} matches={matches} expanded={expanded} />;
});

export interface TreeItemIndicatorState {
  /**
   * Whether the item is expanded.
   */
  expanded: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TreeItemIndicatorProps extends BaseUIComponentProps<
  'span',
  TreeItemIndicatorState
> {
  children?: React.ReactNode;
  /**
   * Which expansion state the indicator renders in.
   * Use `'open'` and `'closed'` indicators together to swap them, such as an open and a closed folder icon.
   * @default 'open'
   */
  match?: 'open' | 'closed' | undefined;
  /**
   * Whether to keep the element in the DOM in both expansion states, such as a chevron that rotates when expanded.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TreeItemIndicator {
  export type State = TreeItemIndicatorState;
  export type Props = TreeItemIndicatorProps;
}
