import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { SortableDropProvider, SortableDropTarget } from './SortableDropProvider';
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
      expect(onMoveEnd.mock.calls[0][0].dropTarget?.element).toBe(expectedTargets[scenario]);
    },
  );
});
