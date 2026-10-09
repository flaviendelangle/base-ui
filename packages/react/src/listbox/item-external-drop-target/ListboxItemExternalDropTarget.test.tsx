import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@mui/internal-test-utils';
import { createRenderer, firePointer } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { Listbox } from '@base-ui/react/listbox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { lift, dragEnter, drop, cancel, setupDragEngineTests, flushRaf } from '../../../test/dnd';

setupDragEngineTests();
const kind = Draggable.createKind<Listbox.ReorderProvider.DragPayload<string>>('files');
const otherKind = Draggable.createKind<string>('text');

// The exact keys: the drag records of the underlying target events stay internal.
function positionChangeDetails(reason: string) {
  return { reason, event: expect.any(Event), location: expect.any(Object) };
}

function setRects() {
  screen.getAllByRole('option').forEach((row, index) => {
    row.getBoundingClientRect = () => new DOMRect(index * 100, index * 100, 100, 100);
  });
}
function Fixture({
  onDrop,
  onDraggableDrop,
  sortable = true,
  dropDisabled,
  canDrop,
  getDropPosition,
  onDropPositionChange,
  sortingDisabled = false,
  horizontal = false,
  hiddenItems,
}: Partial<Listbox.ItemExternalDropTarget.Props<typeof kind, string>> & {
  sortable?: boolean;
  sortingDisabled?: boolean;
  horizontal?: boolean;
  hiddenItems?: string[];
}) {
  const [items, setItems] = React.useState(['a', 'b', 'c']);
  const content = (
    <Listbox.List>
      {items
        .filter((item) => !hiddenItems?.includes(item))
        .map((item) => (
          <Listbox.ItemExternalDropTarget
            key={item}
            value={item}
            accept={kind}
            onDrop={onDrop}
            onDraggableDrop={onDraggableDrop}
            canDrop={canDrop}
            getDropPosition={getDropPosition}
            dropDisabled={dropDisabled}
            onDropPositionChange={onDropPositionChange}
          >
            <Listbox.ItemText>{item}</Listbox.ItemText>
            <Listbox.ItemIndicator />
          </Listbox.ItemExternalDropTarget>
        ))}
    </Listbox.List>
  );
  const listbox = (
    <Listbox.Root orientation={horizontal ? 'horizontal' : 'vertical'}>{content}</Listbox.Root>
  );
  return (
    <Draggable.Provider>
      <Draggable.Root
        kind={kind}
        payload={{ id: 'foreign', itemIds: ['foreign'], items: ['foreign'], collectionId: {} }}
        data-testid="source"
      >
        foreign
      </Draggable.Root>
      <Draggable.Root kind={otherKind} payload="text" data-testid="other">
        text
      </Draggable.Root>
      {sortable ? (
        <Listbox.ReorderProvider kind={kind} disabled={sortingDisabled} onItemsReorder={setItems}>
          {listbox}
        </Listbox.ReorderProvider>
      ) : (
        listbox
      )}
    </Draggable.Provider>
  );
}

describe('<Listbox.ItemExternalDropTarget />', () => {
  const { render } = createRenderer();
  it.each([true, false])('preserves native onDrop with sorting=%s', async (sortable) => {
    const onDrop = vi.fn();
    const onDraggableDrop = vi.fn();
    await render(<Fixture sortable={sortable} onDrop={onDrop} onDraggableDrop={onDraggableDrop} />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    fireEvent.drop(target);
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDraggableDrop).not.toHaveBeenCalled();
    onDrop.mockClear();
    const source = screen.getByTestId('source');
    await lift(source);
    await dragEnter(target, { clientY: 25 });
    // The drop helper dispatches a native HTML event; finish this engine drag with a pointer event.
    firePointer.up(source, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 0,
      clientY: 25,
      timeStamp: 1000,
    });
    await flushRaf();
    expect(onDraggableDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'accepts an external drag with sorting=%s and keeps item semantics',
    async (sortable) => {
      const onDraggableDrop = vi.fn();
      const changes = vi.fn();
      await render(
        <Fixture
          sortable={sortable}
          onDraggableDrop={onDraggableDrop}
          onDropPositionChange={changes}
        />,
      );
      setRects();
      const target = screen.getByRole('option', { name: 'b' });
      fireEvent.click(target);
      expect(target).toHaveAttribute('aria-selected', 'true');
      await lift(screen.getByTestId('source'));
      await dragEnter(target, { clientY: 175 });
      expect(target).toHaveAttribute('data-drop-position', 'after');
      drop(target, { clientY: 175 });
      await flushRaf();
      expect(onDraggableDrop).toHaveBeenCalledTimes(1);
      expect(onDraggableDrop.mock.calls[0][0]).toMatchObject({
        reason: 'drop',
        item: 'b',
        destination: { groupId: null, index: 2 },
      });
      expect(target).not.toHaveAttribute('data-drag-over');
      expect(changes.mock.calls).toEqual([
        [{ id: expect.anything(), placement: 'after' }, positionChangeDetails('pointer')],
        [null, positionChangeDetails('drop')],
      ]);
    },
  );
  it('routes same-list drags only to sorting', async () => {
    const onDraggableDrop = vi.fn();
    const canDrop = vi.fn(() => true);
    await render(<Fixture onDraggableDrop={onDraggableDrop} canDrop={canDrop} />);
    setRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    const target = screen.getByRole('option', { name: 'b' });
    await dragEnter(target, { clientY: 175 });
    drop(target, { clientY: 175 });
    await flushRaf();
    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['b', 'a', 'c']);
    expect(onDraggableDrop).not.toHaveBeenCalled();
    expect(canDrop).not.toHaveBeenCalled();
  });
  it('accepts incoming drops when sorting is disabled', async () => {
    const onDraggableDrop = vi.fn();
    await render(<Fixture onDraggableDrop={onDraggableDrop} sortingDisabled />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDraggableDrop).toHaveBeenCalledTimes(1);
  });
  it.each(['kind', 'disabled', 'predicate', 'position'] as const)(
    'refuses an external drop for %s',
    async (reason) => {
      const onDraggableDrop = vi.fn();
      await render(
        <Fixture
          onDraggableDrop={onDraggableDrop}
          dropDisabled={reason === 'disabled'}
          canDrop={() => reason !== 'predicate'}
          getDropPosition={() => (reason === 'position' ? null : 'before')}
        />,
      );
      setRects();
      const target = screen.getByRole('option', { name: 'a' });
      await lift(screen.getByTestId(reason === 'kind' ? 'other' : 'source'));
      await dragEnter(target, { clientY: 25 });
      expect(target).not.toHaveAttribute('data-drag-over');
      drop(target, { clientY: 25 });
      await flushRaf();
      expect(onDraggableDrop).not.toHaveBeenCalled();
    },
  );
  it('clears placement on cancellation', async () => {
    const onDraggableDrop = vi.fn();
    await render(<Fixture onDraggableDrop={onDraggableDrop} />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).toHaveAttribute('data-drag-over');
    cancel();
    await flushRaf();
    expect(target).not.toHaveAttribute('data-drag-over');
    expect(onDraggableDrop).not.toHaveBeenCalled();
  });
  it('resolves horizontal placement in RTL', async () => {
    const onDraggableDrop = vi.fn();
    await render(
      <DirectionProvider direction="rtl">
        <Fixture horizontal onDraggableDrop={onDraggableDrop} />
      </DirectionProvider>,
    );
    setRects();
    const target = screen.getByRole('option', { name: 'b' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientX: 125, clientY: 125 });
    expect(target).toHaveAttribute('data-drop-position', 'after');
    drop(target, { clientX: 125, clientY: 125 });
    await flushRaf();
    expect(onDraggableDrop.mock.calls[0][0].destination).toEqual({
      groupId: null,
      index: 2,
    });
  });
  it('passes where the pointer is within the option to getDropPosition', async () => {
    const getDropPosition = vi.fn(
      (_context: Listbox.ItemExternalDropTarget.PositionContext) => 'after' as const,
    );
    await render(<Fixture getDropPosition={getDropPosition} />);
    setRects();
    await lift(screen.getByTestId('source'));
    // The option spans 100 to 200 on both axes.
    await dragEnter(screen.getByRole('option', { name: 'b' }), { clientX: 125, clientY: 175 });
    expect(getDropPosition.mock.lastCall![0].getLocalPoint()).toEqual({ x: 0.25, y: 0.75 });
    cancel();
    await flushRaf();
  });
  it('reports a list-wide insertion index for a grouped destination', async () => {
    const onDraggableDrop = vi.fn();
    await render(
      <Draggable.Provider>
        <Draggable.Root kind={otherKind} payload="new" data-testid="source" />
        <Listbox.Root>
          <Listbox.List>
            <Listbox.Group id="one">
              <Listbox.Item value="a">a</Listbox.Item>
            </Listbox.Group>
            <Listbox.Group id="two">
              <Listbox.ItemExternalDropTarget
                value="b"
                accept={otherKind}
                onDraggableDrop={onDraggableDrop}
              >
                b
              </Listbox.ItemExternalDropTarget>
            </Listbox.Group>
          </Listbox.List>
        </Listbox.Root>
      </Draggable.Provider>,
    );
    setRects();
    const target = screen.getByRole('option', { name: 'b' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 175 });
    drop(target, { clientY: 175 });
    await flushRaf();
    expect(onDraggableDrop.mock.calls[0][0].destination).toEqual({
      groupId: 'two',
      index: 2,
    });
  });
  it.each(['drop', 'move'] as const)(
    'finishes a cross-list transfer after reorderOn=%s without rolling back the transfer',
    async (reorderOn) => {
      const onReorderEnd = vi.fn();
      const onDraggableDrop = vi.fn();
      function Example() {
        const [left, setLeft] = React.useState(['a', 'b', 'c']);
        const [right, setRight] = React.useState(['dest']);
        return (
          <Draggable.Provider>
            <Listbox.ReorderProvider
              kind={kind}
              reorderOn={reorderOn}
              onItemsReorder={setLeft}
              onReorderEnd={onReorderEnd}
            >
              <Listbox.Root>
                <Listbox.List data-testid="left">
                  {left.map((value) => (
                    <Listbox.Item key={value} value={value}>
                      {value}
                    </Listbox.Item>
                  ))}
                </Listbox.List>
              </Listbox.Root>
            </Listbox.ReorderProvider>
            <Listbox.ReorderProvider kind={kind} onItemsReorder={setRight}>
              <Listbox.Root>
                <Listbox.List data-testid="right">
                  {right.map((value) => (
                    <Listbox.ItemExternalDropTarget
                      key={value}
                      value={value}
                      accept={kind}
                      onDraggableDrop={(eventDetails) => {
                        onDraggableDrop(eventDetails);
                        const { destination, source } = eventDetails;
                        setRight((current) => [
                          ...current.slice(0, destination.index),
                          ...source.payload.items,
                          ...current.slice(destination.index),
                        ]);
                        setLeft((current) =>
                          current.filter((entry) => !source.payload.items.includes(entry)),
                        );
                      }}
                    >
                      {value}
                    </Listbox.ItemExternalDropTarget>
                  ))}
                </Listbox.List>
              </Listbox.Root>
            </Listbox.ReorderProvider>
          </Draggable.Provider>
        );
      }
      await render(<Example />);
      setRects();
      await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
      await dragEnter(screen.getByRole('option', { name: 'b' }), { clientY: 175 });
      const target = screen.getByRole('option', { name: 'dest' });
      await dragEnter(target, { clientY: 375 });
      drop(target, { clientY: 375 });
      await flushRaf();
      expect(onDraggableDrop).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('left').textContent).toBe('bc');
      expect(screen.getByTestId('right').textContent).toBe('desta');
      expect(onReorderEnd.mock.calls.at(-1)?.[0].canceled).toBe(false);
    },
  );
  it.each([true, false])(
    'leaves placement to a drop target nested in the option with sorting=%s',
    async (sortable) => {
      const listbox = (
        <Listbox.Root>
          <Listbox.List>
            <Listbox.ItemExternalDropTarget value="a" accept={kind}>
              a
              <Draggable.Target accept={kind} data-testid="nested" />
            </Listbox.ItemExternalDropTarget>
          </Listbox.List>
        </Listbox.Root>
      );
      await render(
        <Draggable.Provider>
          <Draggable.Root
            kind={kind}
            payload={{ id: 'foreign', itemIds: ['foreign'], items: ['foreign'], collectionId: {} }}
            data-testid="source"
          />
          {sortable ? (
            <Listbox.ReorderProvider kind={kind} onItemsReorder={() => {}}>
              {listbox}
            </Listbox.ReorderProvider>
          ) : (
            listbox
          )}
        </Draggable.Provider>,
      );
      setRects();
      const option = screen.getByRole('option', { name: 'a' });
      await lift(screen.getByTestId('source'));
      await dragEnter(option, { clientY: 75 });
      expect(option).toHaveAttribute('data-drop-position', 'after');
      await dragEnter(screen.getByTestId('nested'), { clientY: 75 });
      expect(option).not.toHaveAttribute('data-drop-position');
      cancel();
    },
  );
  it('keeps a standalone externally disabled option selectable and visually enabled', async () => {
    await render(<Fixture sortable={false} dropDisabled />);
    const row = screen.getByRole('option', { name: 'a' });
    expect(row).not.toHaveAttribute('data-disabled');
    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-selected', 'true');
  });

  it('clears a hovered destination when acceptance changes', async () => {
    const onDraggableDrop = vi.fn();
    const { setProps } = await render(<Fixture onDraggableDrop={onDraggableDrop} />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).toHaveAttribute('data-drag-over');
    await setProps({ canDrop: () => false });
    expect(target).not.toHaveAttribute('data-drag-over');
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDraggableDrop).not.toHaveBeenCalled();
  });
  it('blocks an ancestor target when the matched row rejects the drop', async () => {
    const ancestorDrop = vi.fn();
    await render(
      <Draggable.Provider>
        <Draggable.Target accept={kind} onDraggableDrop={ancestorDrop}>
          <Fixture canDrop={() => false} />
        </Draggable.Target>
      </Draggable.Provider>,
    );
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(ancestorDrop).not.toHaveBeenCalled();
  });
  it('accepts a stationary drag when external dropping is enabled', async () => {
    const onDraggableDrop = vi.fn();
    const { setProps } = await render(<Fixture onDraggableDrop={onDraggableDrop} dropDisabled />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).not.toHaveAttribute('data-drag-over');
    await setProps({ dropDisabled: false });
    expect(target).toHaveAttribute('data-drag-over');
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDraggableDrop).toHaveBeenCalledTimes(1);
  });

  it.each(['disabled', 'removed'] as const)(
    'reports the cleared position with drag event details when the hovered option is %s',
    async (change) => {
      const changes = vi.fn();
      const { setProps } = await render(<Fixture onDropPositionChange={changes} />);
      setRects();
      const target = screen.getByRole('option', { name: 'a' });
      await lift(screen.getByTestId('source'));
      await dragEnter(target, { clientY: 25 });
      if (change === 'disabled') {
        await setProps({ dropDisabled: true });
      } else {
        await setProps({ hiddenItems: ['a'] });
      }
      expect(changes.mock.calls).toEqual([
        [{ id: expect.anything(), placement: 'before' }, positionChangeDetails('pointer')],
        [null, positionChangeDetails('pointer')],
      ]);
      cancel();
      await flushRaf();
    },
  );

  // The engine validates the drop before the source's terminal callbacks run.
  it('drops at the destination validated before the source end updates the app state', async () => {
    const onDraggableDrop = vi.fn();
    function Layout() {
      const [activeId, setActiveId] = React.useState<string | null>(null);
      return (
        <Draggable.Provider>
          <Draggable.Root
            kind={kind}
            payload={{ id: 'foreign', itemIds: ['foreign'], items: ['foreign'], collectionId: {} }}
            onMoveStart={() => setActiveId('foreign')}
            onMoveEnd={() => ReactDOM.flushSync(() => setActiveId(null))}
            data-testid="source"
          >
            foreign
          </Draggable.Root>
          <Listbox.Root>
            <Listbox.List>
              {['a', 'b', 'c'].map((item) => (
                <Listbox.ItemExternalDropTarget
                  key={item}
                  value={item}
                  accept={kind}
                  canDrop={() => activeId !== null}
                  onDraggableDrop={onDraggableDrop}
                >
                  {item}
                </Listbox.ItemExternalDropTarget>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Draggable.Provider>
      );
    }
    await render(<Layout />);
    setRects();
    const target = screen.getByRole('option', { name: 'b' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 175 });
    expect(target).toHaveAttribute('data-drop-position', 'after');
    drop(target, { clientY: 175 });
    await flushRaf();
    expect(onDraggableDrop).toHaveBeenCalledTimes(1);
    expect(onDraggableDrop.mock.calls[0][0]).toMatchObject({
      dropPosition: { placement: 'after' },
      destination: { groupId: null, index: 2 },
    });
  });
});
