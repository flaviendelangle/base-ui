import * as React from 'react';
import { useTreeGridRootContext } from '../../src/tree-grid/root/TreeGridRootContext';
import type { TreeGridStore } from '../../src/tree-grid/store/TreeGridStore';

/**
 * Exposes the internal TreeGridStore to a test via the root context, so the test
 * can drive interaction state imperatively (jsdom lacks real layout,
 * scroll, and IntersectionObserver behavior).
 */
export function TreeGridStoreTap(props: { storeRef: React.RefObject<TreeGridStore | null> }) {
  const store = useTreeGridRootContext();
  React.useEffect(() => {
    props.storeRef.current = store;
    return () => {
      props.storeRef.current = null;
    };
  }, [store, props.storeRef]);
  return null;
}
