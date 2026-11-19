'use client';
import * as React from 'react';
import { useControlled } from '@base-ui/utils/useControlled';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { REASONS } from '../../internals/reasons';
import { getTreeGridFilter } from '../utils/useTreeGridFilter';
import { TreeGridFilteringPlugin } from '../plugins/TreeGridFilteringPlugin';
import { TreeGridRootFeatureProvider } from '../root/TreeGridRootFeatures';
import type { TreeGridRootFeature } from '../root/TreeGridRootFeatures';
import type { TreeGridFilterFunction, TreeGridFilterMode } from '../store/types';
import { TreeGridFilterContext } from './TreeGridFilterContext';

/**
 * Enables filtering for the tree it wraps.
 * Add `TreeGrid.Input` inside `TreeGrid.Root` to edit the query.
 * Doesn't render its own HTML element.
 *
 * Documentation: [Base UI TreeGrid](https://base-ui.com/react/components/tree-grid)
 */
export function TreeGridFilterProvider<TItem = any>(
  props: TreeGridFilterProvider.Props<TItem>,
): React.JSX.Element {
  const {
    children,
    value: valueProp,
    defaultValue = '',
    onValueChange,
    filter: filterProp,
    locale,
    filteredItems,
    mode = 'hide-non-matches',
  } = props;

  const [value, setValue] = useControlled({
    controlled: valueProp,
    default: defaultValue,
    name: 'TreeGrid.FilterProvider',
    state: 'value',
  });

  const handleValueChange = useStableCallback(
    (nextValue: string, eventDetails: TreeGridFilterProvider.ChangeEventDetails) => {
      onValueChange?.(nextValue, eventDetails);
      if (!eventDetails.isCanceled) {
        setValue(nextValue);
      }
    },
  );

  const filter = filterProp === undefined ? getTreeGridFilter({ locale }).contains : filterProp;
  const query = value.trim();

  const feature = React.useMemo(
    (): TreeGridRootFeature => ({
      name: 'FilterProvider',
      install: TreeGridFilteringPlugin.install,
      state: { filterOptions: { query, filter, filteredItems, mode } },
    }),
    [query, filter, filteredItems, mode],
  );

  const contextValue = React.useMemo(
    () => ({ value, onValueChange: handleValueChange }),
    [value, handleValueChange],
  );

  return (
    <TreeGridRootFeatureProvider feature={feature}>
      {/* Without children, the feature provider can tell that it wraps no root. */}
      {children == null ? null : (
        <TreeGridFilterContext.Provider value={contextValue}>
          {children}
        </TreeGridFilterContext.Provider>
      )}
    </TreeGridRootFeatureProvider>
  );
}

export interface TreeGridFilterProviderProps<TItem = any> {
  children?: React.ReactNode;
  /**
   * The filter query.
   * To render an uncontrolled query, use the `defaultValue` prop instead.
   */
  value?: string | undefined;
  /**
   * The filter query when the tree is initially rendered.
   * To render a controlled query, use the `value` prop instead.
   * @default ''
   */
  defaultValue?: string | undefined;
  /**
   * Event handler called when the filter query changes.
   */
  onValueChange?:
    ((value: string, eventDetails: TreeGridFilterProvider.ChangeEventDetails) => void) | undefined;
  /**
   * Filter function used to match items against the query. Receives each item's label, the
   * trimmed query, and the item, and keeps the item when it returns `true`.
   * By default, items match when their label contains the query, ignoring case, accents, and
   * punctuation. A new function matches every item again, so keep it stable across renders.
   * Pass `null` when rendering filtered items yourself.
   */
  filter?: TreeGridFilterFunction<TItem> | null | undefined;
  /**
   * Locale used when comparing an item against the query.
   * Defaults to the runtime's default locale.
   */
  locale?: Intl.LocalesArgument | undefined;
  /**
   * The items matching the query, for filtering done outside the tree, such as
   * on a server. Replaces `filter` when set, and an empty array matches nothing.
   * Each item must also be in the tree's items.
   */
  filteredItems?: readonly TItem[] | undefined;
  /**
   * How the tree presents the items that don't match.
   * - `'hide-non-matches'`: shows only the matches, their ancestors, and their descendants.
   * - `'collapse-non-matches'`: shows every item, collapsing the branches without matches.
   * - `'expand-matches'`: shows every item, expanding the branches with matches.
   *
   * The expansion the filter forces doesn't change `expandedItems`.
   * @default 'hide-non-matches'
   */
  mode?: TreeGridFilterMode | undefined;
}

export type TreeGridFilterProviderChangeEventReason =
  | typeof REASONS.inputChange
  | typeof REASONS.inputClear
  | typeof REASONS.clearPress
  | typeof REASONS.escapeKey;

export type TreeGridFilterProviderChangeEventDetails =
  BaseUIChangeEventDetails<TreeGridFilterProviderChangeEventReason>;

export interface TreeGridFilterProviderState {}

export namespace TreeGridFilterProvider {
  export type State = TreeGridFilterProviderState;
  export type Props<TItem = any> = TreeGridFilterProviderProps<TItem>;
  export type ChangeEventReason = TreeGridFilterProviderChangeEventReason;
  export type ChangeEventDetails = TreeGridFilterProviderChangeEventDetails;
}
