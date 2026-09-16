'use client';
import * as React from 'react';
import { Draggable } from '@base-ui/react/draggable';

const circleKind = Draggable.createKind('overview/shape-circle');
const squareKind = Draggable.createKind('overview/shape-square');
const triangleKind = Draggable.createKind('overview/shape-triangle');

const SHAPES = [
  { id: 'circle', label: 'Circle', kind: circleKind },
  { id: 'square', label: 'Square', kind: squareKind },
  { id: 'triangle', label: 'Triangle', kind: triangleKind },
] as const;

type ShapeId = (typeof SHAPES)[number]['id'];

const PIECE_CLASS =
  'z-10 size-14 data-[dragging]:cursor-grabbing cursor-grab bg-neutral-950 transition-opacity data-[dragging]:opacity-0 motion-safe:data-[drag-preview]:data-ending-style:transition-[translate] motion-safe:data-[drag-preview]:data-ending-style:duration-200 motion-safe:data-[drag-preview]:data-ending-style:ease-[cubic-bezier(0.2,0,0,1)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-950 dark:bg-white dark:focus-visible:outline-white data-[shape=circle]:rounded-full data-[shape=triangle]:[clip-path:polygon(50%_4%,96%_96%,4%_96%)]';

const CUTOUT_CLASS =
  'col-start-1 row-start-1 size-14 bg-neutral-200 transition-colors dark:bg-neutral-700 data-[shape=circle]:rounded-full data-[shape=triangle]:[clip-path:polygon(50%_4%,96%_96%,4%_96%)]';

export default function ShapeSorter() {
  const [placed, setPlaced] = React.useState<Set<ShapeId>>(() => new Set());

  function placeShape(shape: ShapeId) {
    setPlaced((current) => new Set(current).add(shape));
  }

  return (
    <Draggable.Provider>
      <div className="flex w-full flex-col items-center select-none">
        <div className="flex min-h-5 w-full max-w-md justify-end">
          {placed.size > 0 && (
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-sm leading-5 text-neutral-500 underline underline-offset-2 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:text-neutral-400 dark:hover:text-white dark:focus-visible:outline-white"
              onClick={() => setPlaced(new Set())}
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid w-full max-w-md grid-cols-3 py-3">
          {SHAPES.map((shape) => (
            <div key={shape.id} className="grid h-16 place-items-center">
              {!placed.has(shape.id) && (
                <Draggable.Root
                  className={PIECE_CLASS}
                  data-shape={shape.id}
                  kind={shape.kind}
                  aria-label={shape.label}
                  role="button"
                  tabIndex={0}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid w-full max-w-md grid-cols-3 border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900">
          {SHAPES.map((shape) => {
            const isPlaced = placed.has(shape.id);

            return (
              <Draggable.Target
                key={shape.id}
                className="group grid h-24 place-items-center data-[accepting]:[&_[data-cutout]]:bg-neutral-300 data-[drag-over]:[&_[data-cutout]]:bg-neutral-400 dark:data-[accepting]:[&_[data-cutout]]:bg-neutral-600 dark:data-[drag-over]:[&_[data-cutout]]:bg-neutral-500"
                accept={shape.kind}
                onDraggableDrop={() => placeShape(shape.id)}
              >
                <span
                  className={CUTOUT_CLASS}
                  data-cutout=""
                  data-shape={shape.id}
                  aria-hidden="true"
                />
                {isPlaced && (
                  <Draggable.Root
                    className={PIECE_CLASS}
                    data-shape={shape.id}
                    kind={shape.kind}
                    aria-label={shape.label}
                    role="button"
                    tabIndex={0}
                  />
                )}
              </Draggable.Target>
            );
          })}
        </div>
      </div>
    </Draggable.Provider>
  );
}
