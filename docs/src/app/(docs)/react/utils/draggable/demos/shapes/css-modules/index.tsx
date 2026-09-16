'use client';
import * as React from 'react';
import { Draggable } from '@base-ui/react/draggable';
import styles from '../../shapes.module.css';

const circleKind = Draggable.createKind('overview/shape-circle');
const squareKind = Draggable.createKind('overview/shape-square');
const triangleKind = Draggable.createKind('overview/shape-triangle');

const SHAPES = [
  { id: 'circle', label: 'Circle', kind: circleKind },
  { id: 'square', label: 'Square', kind: squareKind },
  { id: 'triangle', label: 'Triangle', kind: triangleKind },
] as const;

type ShapeId = (typeof SHAPES)[number]['id'];

export default function ShapeSorter() {
  const [placed, setPlaced] = React.useState<Set<ShapeId>>(() => new Set());

  function placeShape(shape: ShapeId) {
    setPlaced((current) => new Set(current).add(shape));
  }

  return (
    <Draggable.Provider>
      <div className={styles.Root}>
        <div className={styles.Actions}>
          {placed.size > 0 && (
            <button type="button" className={styles.Reset} onClick={() => setPlaced(new Set())}>
              Reset
            </button>
          )}
        </div>

        <div className={styles.Tray}>
          {SHAPES.map((shape) => (
            <div key={shape.id} className={styles.TraySlot}>
              {!placed.has(shape.id) && (
                <Draggable.Root
                  className={styles.Piece}
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

        <div className={styles.Board}>
          {SHAPES.map((shape) => {
            const isPlaced = placed.has(shape.id);

            return (
              <Draggable.Target
                key={shape.id}
                className={styles.Target}
                accept={shape.kind}
                onDraggableDrop={() => placeShape(shape.id)}
              >
                <span className={styles.Cutout} data-shape={shape.id} aria-hidden="true" />
                {isPlaced && (
                  <Draggable.Root
                    className={styles.Piece}
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
