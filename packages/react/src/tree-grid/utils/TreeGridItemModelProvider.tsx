import * as React from 'react';
import { useStore } from '@base-ui/utils/store';
import type { TreeGridItemId } from '../store/types';

import { selectors } from '../store/selectors';
import type { TreeGridStore } from '../store/TreeGridStore';

export const TreeGridItemModelProvider = React.memo(function TreeGridItemModelProvider(props: {
  store: TreeGridStore<any, any>;
  itemId: TreeGridItemId;
  children: (item: any) => React.ReactNode;
}) {
  const model = useStore(props.store, selectors.itemModel, props.itemId);
  return props.children(model) as React.JSX.Element;
});
