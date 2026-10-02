'use client';
import * as React from 'react';

export type SharedPosition = { id: string | number; placement: string; index?: number | undefined };
export type PositionStore = {
  position: SharedPosition | null;
  owner: object | null;
  listeners: Set<() => void>;
};
const positions = new WeakMap<object, PositionStore>();

export function useExternalDropStore(collectionId: object) {
  return React.useMemo(() => {
    let existing = positions.get(collectionId);
    if (!existing) {
      existing = { position: null, owner: null, listeners: new Set() };
      positions.set(collectionId, existing);
    }
    return existing;
  }, [collectionId]);
}

/** Subscribe only to this row's destination, or to the external gesture it owns. */
export function useExternalDropPosition<Position extends SharedPosition>(
  collectionId: object,
  itemId: string | number | undefined,
  owner?: object,
): Position | null {
  const shared = useExternalDropStore(collectionId);
  const subscribe = React.useCallback(
    (listener: () => void) => {
      shared.listeners.add(listener);
      return () => {
        shared.listeners.delete(listener);
      };
    },
    [shared],
  );
  const read = React.useCallback(() => {
    if (
      (owner && shared.owner === owner) ||
      (itemId !== undefined && shared.position?.id === itemId)
    ) {
      return shared.position as Position | null;
    }
    return null;
  }, [shared, owner, itemId]);
  return React.useSyncExternalStore(subscribe, read, () => null);
}
