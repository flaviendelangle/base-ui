import { useStore } from '@base-ui/utils/store';
import { useRefWithInit } from '@base-ui/utils/useRefWithInit';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { resolveRenderedId } from '../../internals/resolveRenderedId';
import { useTreeGridRootContext } from '../root/TreeGridRootContext';
import { useWarnMisplacedTreeGridRootFeatures } from '../root/TreeGridRootFeatures';
import { selectors } from '../store/selectors';
import { useIsTreeGridEmpty } from './useIsTreeGridEmpty';

/**
 * Returns the DOM props and ref that should be applied to the element
 * with `role="treegrid"`.
 *
 * @param props The list's `id` and `render` props.
 */
export function useTreeGridRootProps(props: { id?: string | undefined; render?: unknown }) {
  const store = useTreeGridRootContext();
  useWarnMisplacedTreeGridRootFeatures();

  // A filterable tree needs an id for `TreeGrid.Input` to reference.
  const generatedId = useBaseUiId(props.id);
  const id = store.filtering == null ? props.id : generatedId;
  // An empty id on the `render` element leaves the list without one to reference.
  store.useSyncedValueWithCleanup('listId', resolveRenderedId(props, id) || undefined);

  const multiple = useStore(store, (s) => s.multiple);
  const disabled = useStore(store, (s) => s.disabled);
  const empty = useIsTreeGridEmpty();
  const labelId = useStore(store, (s) => s.labelId);
  // Not the tabbable id itself, so moving focus between rows does not
  // re-render the whole list.
  const containerFocus = useStore(store, (s): 'tab-stop' | 'focusable' | 'none' => {
    if (selectors.tabbableItemId(s) != null) {
      return 'none';
    }
    // A disabled tree without a focusable row leaves the tab order. It stays
    // focusable to hold the focus of a row that just became disabled.
    return s.disabled ? 'focusable' : 'tab-stop';
  });
  let tabIndex: number | undefined;
  if (containerFocus === 'tab-stop') {
    tabIndex = 0;
  } else if (containerFocus === 'focusable') {
    tabIndex = -1;
  }

  const rootProps = {
    id,
    role: 'treegrid',
    'aria-labelledby': labelId,
    'aria-multiselectable': multiple ? true : undefined,
    'aria-disabled': disabled || undefined,
    // The roving tab stop normally lives on a row. The container takes it when
    // there is no focusable row.
    tabIndex,
    ...store.interaction.rootEventHandlers,
  };

  const rootRef = useRefWithInit(() => (node: HTMLElement | null) => {
    store.context.rootRef.current = node;
  }).current;

  return { rootProps, rootRef, state: { disabled, empty } };
}
