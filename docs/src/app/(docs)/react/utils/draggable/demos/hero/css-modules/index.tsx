'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { Draggable } from '@base-ui/react/draggable';
import styles from '../../hero.module.css';

const CARD_WIDTH = 128;
const CARD_HEIGHT = 40;

export default function DraggableHero() {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const [dropped, setDropped] = React.useState(false);
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);

  const reset = useStableCallback(() => {
    setPosition(null);
    setDropped(false);
  });

  return (
    <Draggable.Provider>
      <div ref={rootRef} className={styles.Root}>
        <Draggable.Root
          className={styles.Card}
          style={{
            left: position?.x,
            top: position?.y,
            transform: position ? 'none' : undefined,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
        >
          Drag me
        </Draggable.Root>
        <Draggable.Target
          ref={surfaceRef}
          className={styles.Surface}
          onDraggableDrop={({ target }) => {
            const root = rootRef.current;
            const surface = surfaceRef.current;
            if (!root || !surface) {
              return;
            }

            const point = target.getSnappedLocalPoint({ anchor: 'source' });
            const rootRect = root.getBoundingClientRect();
            const surfaceRect = surface.getBoundingClientRect();
            setPosition({
              x:
                surfaceRect.left - rootRect.left + point.x * surfaceRect.width - surface.clientLeft,
              y: surfaceRect.top - rootRect.top + point.y * surfaceRect.height - surface.clientTop,
            });
            setDropped(true);
          }}
        >
          <span>{dropped ? 'Dropped!' : 'Drop here'}</span>
        </Draggable.Target>

        <div className={styles.Panel}>
          {dropped && (
            <button type="button" className={styles.Reset} onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>
    </Draggable.Provider>
  );
}
