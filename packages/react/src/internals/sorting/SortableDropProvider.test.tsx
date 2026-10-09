import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import {
  SortableDropProvider,
  SortableDropTarget,
  acceptsExternalDrop,
} from './SortableDropProvider';
import { lift, dragEnter, drop, flushRaf, setupDragEngineTests } from '../../../test/dnd';

setupDragEngineTests();
describe('SortableDropProvider target ownership', () => {
  const { render } = createRenderer();
  it.each(['provider', 'item', 'neither', 'foreign'] as const)(
    'handles ancestor fallback when %s is disabled or foreign',
    async (scenario) => {
      const collectionId = {};
      const kind = Draggable.createKind<{ collectionId: object }>('items');
      const onDrop = vi.fn();
      const onMoveEnd = vi.fn();
      await render(
        <Draggable.Provider>
          <Draggable.Root
            onMoveEnd={onMoveEnd}
            kind={kind}
            payload={{ collectionId: scenario === 'foreign' ? {} : collectionId }}
            data-testid="source"
          />
          <Draggable.Target accept={kind} onDraggableDrop={onDrop} data-testid="ancestor">
            <SortableDropProvider
              kind={kind}
              collectionId={collectionId}
              disabled={scenario === 'provider'}
              isTargetDisabled={() => scenario === 'item'}
            >
              <SortableDropTarget
                payload={{ collectionId }}
                element={<div data-testid="target" />}
              />
            </SortableDropProvider>
          </Draggable.Target>
        </Draggable.Provider>,
      );
      const target = screen.getByTestId('target');
      target.getBoundingClientRect = () => new DOMRect(0, 100, 100, 100);
      await lift(screen.getByTestId('source'));
      await dragEnter(target, { clientY: 125 });
      drop(target, { clientY: 125 });
      await flushRaf();
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onDrop).toHaveBeenCalledTimes(scenario === 'foreign' ? 1 : 0);
      const expectedTargets = {
        provider: undefined,
        item: undefined,
        neither: target,
        foreign: screen.getByTestId('ancestor'),
      };
      expect(onMoveEnd.mock.calls[0][0].target?.element).toBe(expectedTargets[scenario]);
    },
  );
});

describe('SortableDropProvider collisions', () => {
  const { render } = createRenderer();
  const collectionId = {};
  type Row = { collectionId: object; id: string };
  type OnCollisionChange = NonNullable<Draggable.CollisionProvider.Props<Row>['onCollisionChange']>;
  const kind = Draggable.createKind<Row>('rows');

  async function renderRows(onCollisionChange: OnCollisionChange) {
    await render(
      <Draggable.Provider>
        <SortableDropProvider
          kind={kind}
          collectionId={collectionId}
          disabled={false}
          isTargetDisabled={() => false}
          onCollisionChange={onCollisionChange}
        >
          {['a', 'b'].map((id) => (
            <SortableDropTarget
              key={id}
              payload={{ collectionId, id }}
              element={
                <Draggable.Root kind={kind} payload={{ collectionId, id }} data-testid={id} />
              }
            />
          ))}
        </SortableDropProvider>
      </Draggable.Provider>,
    );
    ['a', 'b'].forEach((id, index) => {
      screen.getByTestId(id).getBoundingClientRect = () => new DOMRect(0, index * 100, 200, 100);
    });
  }

  it('reports the hovered row with its normalized local point', async () => {
    const onCollisionChange = vi.fn<OnCollisionChange>();
    await renderRows(onCollisionChange);
    await lift(screen.getByTestId('a'), { clientY: 50 });
    await dragEnter(screen.getByTestId('b'), { clientX: 50, clientY: 175 });
    const [eventDetails] = onCollisionChange.mock.calls.at(-1)!;
    expect(eventDetails.target?.element).toBe(screen.getByTestId('b'));
    expect(eventDetails.target?.payload).toEqual({ collectionId, id: 'b' });
    expect(eventDetails.target?.getLocalPoint()).toEqual({ x: 0.25, y: 0.75 });
    expect(eventDetails.previousTarget).toBe(null);
    drop(screen.getByTestId('b'), { clientX: 50, clientY: 175 });
    await flushRaf();
  });

  it('never reports the dragged row as a collision', async () => {
    const onCollisionChange = vi.fn<OnCollisionChange>();
    await renderRows(onCollisionChange);
    const [a, b] = [screen.getByTestId('a'), screen.getByTestId('b')];
    await lift(a, { clientY: 50 });
    await dragEnter(a, { clientY: 60 });
    expect(
      onCollisionChange.mock.calls.every(([eventDetails]) => eventDetails.target === null),
    ).toBe(true);
    await dragEnter(b, { clientY: 150 });
    expect(onCollisionChange.mock.calls.at(-1)![0].target?.payload.id).toBe('b');
    drop(b, { clientY: 150 });
    await flushRaf();
  });

  it('reports a target change once although the engine notifies both the move and the change', async () => {
    const onCollisionChange = vi.fn<OnCollisionChange>();
    await renderRows(onCollisionChange);
    const b = screen.getByTestId('b');
    await lift(screen.getByTestId('a'), { clientY: 50 });
    onCollisionChange.mockClear();
    await dragEnter(b, { clientY: 150 });
    expect(onCollisionChange).toHaveBeenCalledTimes(1);
    drop(b, { clientY: 150 });
    await flushRaf();
  });
});

describe('acceptsExternalDrop', () => {
  const first = Draggable.createKind<string>('first');
  const second = Draggable.createKind<string>('second');
  const source = { kind: second.id, payload: 'value' } as unknown as Draggable.Root.Record;

  it.each([
    { name: 'no accept', accept: undefined, expected: false },
    { name: 'a different kind', accept: first, expected: false },
    { name: 'the source kind', accept: second, expected: true },
    { name: 'an array containing the source kind', accept: [first, second], expected: true },
    { name: 'an array without the source kind', accept: [first], expected: false },
    { name: 'anyKind', accept: Draggable.anyKind, expected: true },
    { name: 'an array containing anyKind', accept: [first, Draggable.anyKind], expected: true },
  ])('returns $expected for $name', ({ accept, expected }) => {
    expect(acceptsExternalDrop(accept, source)).toBe(expected);
  });
});
