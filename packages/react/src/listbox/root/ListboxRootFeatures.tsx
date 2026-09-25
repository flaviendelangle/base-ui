'use client';
import * as React from 'react';
import { EMPTY_ARRAY } from '@base-ui/utils/empty';
import { warn } from '@base-ui/utils/warn';
import { ListboxRootContext } from './ListboxRootContext';

/**
 * What a provider wrapping `Listbox.Root` adds to the listbox, such as sorting.
 * Only the provider imports the feature's implementation, so listboxes that don't
 * render the provider don't bundle it.
 */
export interface ListboxRootFeature {
  /**
   * Wraps the root's children with the feature's React logic, which reads the store
   * with `useListboxRootContext()`.
   */
  render: (children: React.ReactNode) => React.ReactNode;
}

/**
 * The features of the providers wrapping a `Listbox.Root`. Each root resets it, so
 * a listbox nested in another listbox's items doesn't inherit them.
 */
export const ListboxRootFeaturesContext =
  React.createContext<readonly ListboxRootFeature[]>(EMPTY_ARRAY);

const consumedFeatures = new WeakSet<ListboxRootFeature>();

/** Records the features a root applied, so a misplaced provider can warn. */
export function markListboxRootFeaturesConsumed(features: readonly ListboxRootFeature[]) {
  if (process.env.NODE_ENV !== 'production') {
    for (const feature of features) {
      consumedFeatures.add(feature);
    }
  }
}

/**
 * Adds a feature to the `Listbox.Root` it wraps, after the features of the
 * providers around it.
 */
export function ListboxRootFeatureProvider(props: ListboxRootFeatureProvider.Props) {
  const { name, feature, children } = props;
  const parentFeatures = React.useContext(ListboxRootFeaturesContext);
  const features = React.useMemo(() => [...parentFeatures, feature], [parentFeatures, feature]);

  const insideRoot = React.useContext(ListboxRootContext) !== null;
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && insideRoot && !consumedFeatures.has(feature)) {
      warn(
        `<Listbox.${name}> has no effect inside <Listbox.Root>.`,
        'Providers configure the listbox they wrap.',
        `Render <Listbox.${name}> around <Listbox.Root> instead.`,
      );
    }
  }, [insideRoot, feature, name]);

  return (
    <ListboxRootFeaturesContext.Provider value={features}>
      {children}
    </ListboxRootFeaturesContext.Provider>
  );
}

export namespace ListboxRootFeatureProvider {
  export interface Props {
    /** The provider's part name, such as `SortableProvider`, for warnings. */
    name: string;
    feature: ListboxRootFeature;
    children?: React.ReactNode;
  }
}
