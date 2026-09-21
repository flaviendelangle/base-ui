import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
import { Listbox } from '@base-ui/react/listbox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { lift, dragEnter, drop, cancel, setupDragEngineTests, flushRaf } from '../../../test/dnd';

setupDragEngineTests();
const kind = Draggable.createKind<Listbox.SortableProvider.DragPayload<string>>('files');
const otherKind = Draggable.createKind<string>('text');
function setRects() {
  screen.getAllByRole('option').forEach((row, index) => {
    row.getBoundingClientRect = () => new DOMRect(index * 100, index * 100, 100, 100);
  });
}
function Fixture({
  onDrop,
  sortable = true,
  dropDisabled,
  canDrop,
  getDropPosition,
  onDropPositionChange,
  sortingDisabled = false,
  horizontal = false,
}: Partial<Listbox.ItemExternalDropTarget.Props<typeof kind, string>> & {
  sortable?: boolean;
  sortingDisabled?: boolean;
  horizontal?: boolean;
}) {
  const [items, setItems] = React.useState(['a', 'b', 'c']);
  const content = (
    <Listbox.List>
      {items.map((item) => (
        <Listbox.ItemExternalDropTarget
          key={item}
          value={item}
          accept={kind}
          onDrop={onDrop}
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
      <Listbox.Root orientation={horizontal ? 'horizontal' : 'vertical'}>
        {sortable ? (
          <Listbox.SortableProvider
            kind={kind}
            disabled={sortingDisabled}
            onItemsReorder={setItems}
          >
            {content}
          </Listbox.SortableProvider>
        ) : (
          content
        )}
      </Listbox.Root>
    </Draggable.Provider>
  );
}

describe('<Listbox.ItemExternalDropTarget />', () => {
  const { render } = createRenderer();
  it.each([true, false])(
    'accepts an external drag with sorting=%s and keeps item semantics',
    async (sortable) => {
      const onDrop = vi.fn();
      const changes = vi.fn();
      await render(<Fixture sortable={sortable} onDrop={onDrop} onDropPositionChange={changes} />);
      setRects();
      const target = screen.getByRole('option', { name: 'b' });
      fireEvent.click(target);
      expect(target).toHaveAttribute('aria-selected', 'true');
      await lift(screen.getByTestId('source'));
      await dragEnter(target, { clientY: 175 });
      expect(target).toHaveAttribute('data-drop-position', 'after');
      drop(target, { clientY: 175 });
      await flushRaf();
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(onDrop.mock.calls[0][0]).toMatchObject({
        item: 'b',
        destination: { groupId: null, index: 2 },
      });
      expect(target).not.toHaveAttribute('data-drag-over');
      expect(changes).toHaveBeenLastCalledWith(null);
    },
  );
  it('routes same-list drags only to sorting', async () => {
    const onDrop = vi.fn();
    const canDrop = vi.fn(() => true);
    await render(<Fixture onDrop={onDrop} canDrop={canDrop} />);
    setRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    const target = screen.getByRole('option', { name: 'b' });
    await dragEnter(target, { clientY: 175 });
    drop(target, { clientY: 175 });
    await flushRaf();
    expect(screen.getAllByRole('option').map((row) => row.textContent)).toEqual(['b', 'a', 'c']);
    expect(onDrop).not.toHaveBeenCalled();
    expect(canDrop).not.toHaveBeenCalled();
  });
  it('accepts incoming drops when sorting is disabled', async () => {
    const onDrop = vi.fn();
    await render(<Fixture onDrop={onDrop} sortingDisabled />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDrop).toHaveBeenCalledTimes(1);
  });
  it.each(['kind', 'disabled', 'predicate', 'position'] as const)(
    'refuses an external drop for %s',
    async (reason) => {
      const onDrop = vi.fn();
      await render(
        <Fixture
          onDrop={onDrop}
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
      expect(onDrop).not.toHaveBeenCalled();
    },
  );
  it('clears placement on cancellation', async () => {
    const onDrop = vi.fn();
    await render(<Fixture onDrop={onDrop} />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).toHaveAttribute('data-drag-over');
    cancel();
    await flushRaf();
    expect(target).not.toHaveAttribute('data-drag-over');
    expect(onDrop).not.toHaveBeenCalled();
  });
  it('resolves horizontal placement in RTL', async () => {
    const onDrop = vi.fn();
    await render(
      <DirectionProvider direction="rtl">
        <Fixture horizontal onDrop={onDrop} />
      </DirectionProvider>,
    );
    setRects();
    const target = screen.getByRole('option', { name: 'b' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientX: 125, clientY: 125 });
    expect(target).toHaveAttribute('data-drop-position', 'after');
    drop(target, { clientX: 125, clientY: 125 });
    await flushRaf();
    expect(onDrop.mock.calls[0][0].destination).toEqual({ groupId: null, index: 2 });
  });
  it('reports a list-wide insertion index for a grouped destination', async () => {
    const onDrop = vi.fn();
    await render(
      <Draggable.Provider>
        <Draggable.Root kind={otherKind} payload="new" data-testid="source" />
        <Listbox.Root>
          <Listbox.List>
            <Listbox.Group id="one">
              <Listbox.Item value="a">a</Listbox.Item>
            </Listbox.Group>
            <Listbox.Group id="two">
              <Listbox.ItemExternalDropTarget value="b" accept={otherKind} onDrop={onDrop}>
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
    expect(onDrop.mock.calls[0][0].destination).toEqual({ groupId: 'two', index: 2 });
  });
  it.each(['drop', 'move'] as const)(
    'finishes a cross-list transfer after reorderOn=%s without rolling back the transfer',
    async (reorderOn) => {
      const onSortEnd = vi.fn();
      const onDrop = vi.fn();
      function Example() {
        const [left, setLeft] = React.useState(['a', 'b', 'c']);
        const [right, setRight] = React.useState(['dest']);
        return (
          <Draggable.Provider>
            <Listbox.Root>
              <Listbox.SortableProvider
                kind={kind}
                reorderOn={reorderOn}
                onItemsReorder={setLeft}
                onSortEnd={onSortEnd}
              >
                <Listbox.List data-testid="left">
                  {left.map((value) => (
                    <Listbox.Item key={value} value={value}>
                      {value}
                    </Listbox.Item>
                  ))}
                </Listbox.List>
              </Listbox.SortableProvider>
            </Listbox.Root>
            <Listbox.Root>
              <Listbox.SortableProvider kind={kind} onItemsReorder={setRight}>
                <Listbox.List data-testid="right">
                  {right.map((value) => (
                    <Listbox.ItemExternalDropTarget
                      key={value}
                      value={value}
                      accept={kind}
                      onDrop={(context) => {
                        onDrop(context);
                        setRight((current) => [
                          ...current.slice(0, context.destination.index),
                          ...context.source.payload.items,
                          ...current.slice(context.destination.index),
                        ]);
                        setLeft((current) =>
                          current.filter((entry) => !context.source.payload.items.includes(entry)),
                        );
                      }}
                    >
                      {value}
                    </Listbox.ItemExternalDropTarget>
                  ))}
                </Listbox.List>
              </Listbox.SortableProvider>
            </Listbox.Root>
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
      expect(onDrop).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('left').textContent).toBe('bc');
      expect(screen.getByTestId('right').textContent).toBe('desta');
      expect(onSortEnd.mock.calls.at(-1)?.[0].canceled).toBe(false);
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
    const onDrop = vi.fn();
    const { setProps } = await render(<Fixture onDrop={onDrop} />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).toHaveAttribute('data-drag-over');
    await setProps({ canDrop: () => false });
    expect(target).not.toHaveAttribute('data-drag-over');
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDrop).not.toHaveBeenCalled();
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
    const onDrop = vi.fn();
    const { setProps } = await render(<Fixture onDrop={onDrop} dropDisabled />);
    setRects();
    const target = screen.getByRole('option', { name: 'a' });
    await lift(screen.getByTestId('source'));
    await dragEnter(target, { clientY: 25 });
    expect(target).not.toHaveAttribute('data-drag-over');
    await setProps({ dropDisabled: false });
    expect(target).toHaveAttribute('data-drag-over');
    drop(target, { clientY: 25 });
    await flushRaf();
    expect(onDrop).toHaveBeenCalledTimes(1);
  });
});
