import { useStore } from '@base-ui/utils/store';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { selectors } from '../store/selectors';

/** Whether the tree has no visible rows, or no item matches the filter. */
export function useIsTreeGridEmpty(): boolean {
  const store = useTreeGridRootContext();
  return useStore(
    store,
    (state) =>
      selectors.flatList(state).length === 0 || store.filtering?.hasNoMatches(state) === true,
  );
}
