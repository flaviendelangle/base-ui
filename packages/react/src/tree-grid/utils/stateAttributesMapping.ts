import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { TreeGridItemId } from '../store/types';

import type { TreeGridItemBaseState } from './useTreeGridItem';
import { getItemIdKey, ITEM_KEY_ATTRIBUTE } from './itemIdKey';
import * as TreeGridItemDataAttributes from '../item/TreeGridItemDataAttributes';

const EXPANDED_HOOK = { [TreeGridItemDataAttributes.expanded]: '' };
const COLLAPSED_HOOK = { [TreeGridItemDataAttributes.collapsed]: '' };
const FILTER_MATCH_HOOK = { [TreeGridItemDataAttributes.filterMatch]: '' };

export const itemMapping: StateAttributesMapping<TreeGridItemBaseState> = {
  itemId(v: TreeGridItemId) {
    return {
      [TreeGridItemDataAttributes.itemId]: String(v),
      [ITEM_KEY_ATTRIBUTE]: getItemIdKey(v),
    };
  },
  // `aria-level` and `--tree-grid-item-level` already expose it.
  level: () => null,
  // `collapsed` uses the default `data-collapsed`.
  filterMatch(v: boolean) {
    return v ? FILTER_MATCH_HOOK : null;
  },
};

/** Marks an expansion part `data-expanded` or `data-collapsed`. */
export const expansionMapping: StateAttributesMapping<{ expanded: boolean }> = {
  expanded(v: boolean) {
    return v ? EXPANDED_HOOK : COLLAPSED_HOOK;
  },
};
