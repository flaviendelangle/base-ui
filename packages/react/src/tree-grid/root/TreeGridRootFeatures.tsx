'use client';
import * as React from 'react';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { warn } from '@base-ui/utils/warn';
import type { TreeGridStore } from '../store/TreeGridStore';
import type { TreeGridState } from '../store/types';
import { TreeGridRootContext } from './TreeGridRootContext';

/** The store state a provider wrapping `TreeGrid.Root` controls. */
export type TreeGridRootFeatureState = Pick<TreeGridState, 'filterOptions'>;

/**
 * What a provider wrapping `TreeGrid.Root` adds to the tree, such as filtering. Only the provider imports the feature's implementation, so trees that
 * don't render the provider don't bundle it.
 */
export interface TreeGridRootFeature {
  /** The provider's part name, such as `FilterProvider`, for warnings. */
  name: string;
  /**
   * Adds the feature's plugin to the store, such as `store.filtering`, and passes
   * the plugin's actions to `store.registerActions()` so they replace the store's
   * missing-provider fallbacks. Runs when the root creates its store, so the first
   * render already has the plugin.
   */
  install?: ((store: TreeGridStore<any, any>) => void) | undefined;
  /**
   * The store state the feature reads, from the provider's props. The root applies
   * it at creation, then synchronizes it in the same update as its own props, so
   * the store never mixes new items with stale feature state.
   */
  state?: TreeGridRootFeatureState | undefined;
  /**
   * Wraps the root's children with the feature's React logic, which reads the store
   * with `useTreeGridRootContext()`.
   */
  render?: ((children: React.ReactNode) => React.ReactNode) | undefined;
}

/**
 * The features of the providers wrapping a `TreeGrid.Root`. Each root resets it, so a
 * tree nested in another tree's items doesn't inherit them.
 */
export const TreeGridRootFeaturesContext =
  React.createContext<readonly TreeGridRootFeature[]>(EMPTY_ARRAY);

function warnMisplacedProvider(name: string) {
  warn(
    `<TreeGrid.${name}> has no effect inside <TreeGrid.Root>.`,
    'Providers configure the tree they wrap.',
    `Render <TreeGrid.${name}> around <TreeGrid.Root> instead.`,
  );
}

/**
 * Adds a feature to the `TreeGrid.Root` it wraps, after the features of the providers
 * around it.
 */
export function TreeGridRootFeatureProvider(props: TreeGridRootFeatureProvider.Props) {
  const { feature, children } = props;
  const parentFeatures = React.useContext(TreeGridRootFeaturesContext);
  const features = React.useMemo(() => [...parentFeatures, feature], [parentFeatures, feature]);

  // A provider without children can't wrap a root, so inside a root it's misplaced.
  const insideRoot = React.useContext(TreeGridRootContext) !== undefined;
  const childlessInsideRoot = insideRoot && children == null;
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && childlessInsideRoot) {
      warnMisplacedProvider(feature.name);
    }
  }, [childlessInsideRoot, feature.name]);

  return (
    <TreeGridRootFeaturesContext.Provider value={features}>
      {children}
    </TreeGridRootFeaturesContext.Provider>
  );
}

export namespace TreeGridRootFeatureProvider {
  export interface Props {
    feature: TreeGridRootFeature;
    children?: React.ReactNode;
  }
}

/**
 * Warns about the providers between a root and its list. The root resets the
 * features it applies, so any feature a list still sees comes from a provider
 * rendered inside the root, where it configures nothing.
 */
export function useWarnMisplacedTreeGridRootFeatures() {
  const features = React.useContext(TreeGridRootFeaturesContext);
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      for (const feature of features) {
        warnMisplacedProvider(feature.name);
      }
    }
  }, [features]);
}
