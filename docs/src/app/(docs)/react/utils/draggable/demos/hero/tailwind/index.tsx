'use client';
import * as React from 'react';
import { useStableCallback } from '@base-ui/utils/useStableCallback';
import { Draggable } from '@base-ui/react/draggable';

const CARD_WIDTH = 128;
const CARD_HEIGHT = 40;

// The preview is a clone of the card, so it keeps these classes: `data-dragging`
// hides the source, `data-drag-preview` lifts the clone above the canvas.
// `transition-colors`, not `transition`: the latter covers `opacity`, which would
// fade the card back in at its new position on drop.
const CARD_CLASS =
  'absolute left-1/2 top-1/2 box-border flex -translate-x-1/2 -translate-y-1/2 items-center justify-center border text-sm leading-5 border-neutral-950 dark:border-white bg-white text-neutral-950 dark:bg-neutral-950 dark:text-white data-[dragging]:cursor-grabbing cursor-grab transition-colors sm:left-[calc(25%-0.1875rem)] data-[dragging]:opacity-0 data-[drag-preview]:shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] dark:data-[drag-preview]:shadow-none hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-neutral-950 dark:focus-visible:outline-white';

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
      <div
        ref={rootRef}
        className="relative grid w-full select-none grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Draggable.Root
          className={CARD_CLASS}
          style={{
            left: position?.x,
            top: position?.y,
            transform: position ? 'none' : 'translate(-50%, -50%)',
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          }}
        >
          Drag me
        </Draggable.Root>
        <Draggable.Target
          ref={surfaceRef}
          className="relative order-2 box-border flex h-48 items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-50 bg-[radial-gradient(var(--color-neutral-300)_1px,transparent_1px)] [background-size:20px_20px] text-xs leading-4 font-medium text-neutral-500 sm:col-start-2 sm:order-none dark:border-neutral-700 dark:bg-neutral-900 dark:bg-[radial-gradient(var(--color-neutral-700)_1px,transparent_1px)] dark:text-neutral-400 dark:data-[drag-over]:border-white dark:data-[drag-over]:bg-neutral-800 data-[drag-over]:border-neutral-950 data-[drag-over]:bg-neutral-100"
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
          {dropped ? 'Dropped!' : 'Drop here'}
        </Draggable.Target>

        <div className="order-1 box-border flex h-48 items-center justify-center border border-neutral-200 p-4 sm:col-start-1 sm:order-none sm:row-start-1 dark:border-neutral-700">
          {dropped && (
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 text-sm leading-5 text-neutral-500 underline underline-offset-2 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:focus-visible:outline-white"
              onClick={reset}
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </Draggable.Provider>
  );
}
