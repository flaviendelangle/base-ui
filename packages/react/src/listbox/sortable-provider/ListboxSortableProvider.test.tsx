import * as React from 'react';
import { expect, vi, describe, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Listbox } from '@base-ui/react/listbox';
import {
  cancel,
  dragEnter,
  dragOver,
  drop,
  flushRaf,
  lift,
  setupDragEngineTests,
} from '../../../test/dnd';

setupDragEngineTests();

function setItemRects() {
  screen.getAllByRole('option').forEach((item, index) => {
    item.getBoundingClientRect = () => new DOMRect(0, index * 100, 100, 100);
  });
}
const values = () => screen.getAllByRole('option').map((item) => item.textContent);

function GroupedFixture({
  reorderOn,
  defer,
  selected = [],
}: {
  reorderOn?: 'drop' | 'move';
  defer?: (apply: () => void) => void;
  selected?: string[];
}) {
  const [items, setItems] = React.useState<Array<{ value: string; groupId: string | undefined }>>([
    { value: 'a', groupId: 'one' },
    { value: 'b', groupId: 'two' },
    { value: 'c', groupId: 'two' },
  ]);
  return (
    <Listbox.Root selectionMode="multiple" defaultValue={selected}>
      <Listbox.SortableProvider
        reorderOn={reorderOn}
        onItemsReorder={(_, details) => {
          const apply = () =>
            setItems(details.order.map(({ value, groupId }) => ({ value, groupId })));
          if (defer) {
            defer(apply);
          } else {
            apply();
          }
        }}
      >
        <Listbox.List>
          {['one', 'two'].map((groupId) => (
            <Listbox.Group key={groupId} id={groupId} data-testid={groupId}>
              {items
                .filter((item) => item.groupId === groupId)
                .map(({ value }) => (
                  <Listbox.Item key={value} value={value}>
                    {value}
                  </Listbox.Item>
                ))}
            </Listbox.Group>
          ))}
        </Listbox.List>
      </Listbox.SortableProvider>
    </Listbox.Root>
  );
}

describe('<Listbox.SortableProvider />', () => {
  const { render } = createRenderer();
  function Fixture({
    onItemsReorder,
    preview,
    draggableProps,
    ...props
  }: Listbox.SortableProvider.Props<string> & {
    preview?: Listbox.SortPreview.Props<string>;
    draggableProps?: Listbox.Item.Props['draggableProps'];
  }) {
    const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);
    return (
      <Listbox.Root selectionMode="multiple" defaultValue={['a', 'b']}>
        <Listbox.SortableProvider
          {...props}
          onItemsReorder={(next, details) => {
            onItemsReorder?.(next, details);
            if (!details.isCanceled) {
              setItems(next);
            }
          }}
        >
          <Listbox.List>
            {items.map((value) => (
              <Listbox.Item key={value} value={value} draggableProps={draggableProps}>
                {value}
                {preview && <Listbox.SortPreview {...preview} />}
              </Listbox.Item>
            ))}
          </Listbox.List>
        </Listbox.SortableProvider>
      </Listbox.Root>
    );
  }
  it('reorders selected items only on drop by default', async () => {
    const onItemsReorder = vi.fn();
    await render(<Fixture onItemsReorder={onItemsReorder} />);
    setItemRects();
    const b = screen.getByRole('option', { name: 'b' });
    const d = screen.getByRole('option', { name: 'd' });
    await lift(b, { clientY: 150 });
    await dragEnter(d, { clientY: 375 });
    await dragOver(d, { clientY: 375 });
    expect(d).toHaveAttribute('data-drop-position', 'after');
    expect(onItemsReorder).not.toHaveBeenCalled();
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    await waitFor(() => expect(b).toHaveFocus());
  });
  it('uses custom drop zones and shares movement validation with the keyboard', async () => {
    const canMoveItems = vi.fn(() => true);
    await render(<Fixture getDropPosition={() => 'before'} canMoveItems={canMoveItems} />);
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(d, { clientY: 375 });
    expect(d).toHaveAttribute('data-drop-position', 'before');
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['c', 'a', 'b', 'd']);
    expect(canMoveItems).toHaveBeenCalledWith({
      items: [expect.objectContaining({ value: 'a' }), expect.objectContaining({ value: 'b' })],
      destination: { index: 3, groupId: undefined },
    });
  });
  it('rejects a pointer move when canMoveItems rejects it', async () => {
    await render(<Fixture canMoveItems={() => false} />);
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(d, { clientY: 375 });
    expect(d).not.toHaveAttribute('data-drop-position');
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('reorders live and restores the order on cancellation', async () => {
    const onSortEnd = vi.fn();
    await render(<Fixture reorderOn="move" onSortEnd={onSortEnd} />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'd' }), { clientY: 375 });
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    cancel();
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
    expect(onSortEnd).toHaveBeenCalledWith({ itemIds: expect.any(Array), canceled: true });
  });
  it('keeps a live move when dropping over its source', async () => {
    const onSortEnd = vi.fn();
    await render(<Fixture reorderOn="move" onSortEnd={onSortEnd} />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'd' }), { clientY: 375 });
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    setItemRects();
    await dragEnter(a, { clientY: 250 });
    drop(a, { clientY: 250 });
    await flushRaf();
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    expect(onSortEnd).toHaveBeenCalledWith({ itemIds: expect.any(Array), canceled: false });
  });
  it('passes item draggable options through to the engine', async () => {
    const onBeforeMoveStart = vi.fn((_, details) => details.cancel());
    await render(<Fixture draggableProps={{ onBeforeMoveStart }} />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25, expectNoDrag: true });
    expect(onBeforeMoveStart).toHaveBeenCalledOnce();
    expect(a).not.toHaveAttribute('data-dragging');
  });
  it('renders a selected-item count in a custom preview', async () => {
    await render(
      <Fixture
        preview={{
          children: ({ items }) => <span data-testid="preview">{items.length} items</span>,
        }}
      />,
    );
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    expect(screen.getByTestId('preview')).toHaveTextContent('2 items');
    cancel();
  });
  it('hides the preview without disabling sorting', async () => {
    const preview = vi.fn(() => <span>Preview</span>);
    await render(<Fixture preview={{ disabled: true, children: preview }} />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25 });
    expect(preview).not.toHaveBeenCalled();
    expect(a).toHaveAttribute('data-dragging');
    cancel();
  });
  it('restricts pointer pickup to SortHandle while keeping row keyboard sorting', async () => {
    const onItemsReorder = vi.fn();
    await render(
      <Listbox.Root>
        <Listbox.SortableProvider onItemsReorder={onItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">
              a<Listbox.SortHandle data-testid="handle" />
            </Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.SortableProvider>
      </Listbox.Root>,
    );
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25, expectNoDrag: true });
    await act(() => a.focus());
    expect(a).not.toHaveAttribute('data-dragging');
    fireEvent.keyDown(a, { key: 'ArrowDown', altKey: true });
    expect(onItemsReorder).toHaveBeenCalledWith(
      ['b', 'a'],
      expect.objectContaining({ reason: 'keyboard' }),
    );
    await lift(screen.getByTestId('handle'), { clientY: 25 });
    expect(a).toHaveAttribute('data-dragging');
    cancel();
  });
  it('reports a canceled drop proposal as canceled', async () => {
    const onSortEnd = vi.fn();
    await render(
      <Fixture onSortEnd={onSortEnd} onItemsReorder={(_, details) => details.cancel()} />,
    );
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(d, { clientY: 375 });
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
    expect(onSortEnd).toHaveBeenCalledWith({ itemIds: expect.any(Array), canceled: true });
  });
  it('revalidates movement rules before keeping a live move over its source', async () => {
    const onSortEnd = vi.fn();
    let allowed = true;
    await render(<Fixture reorderOn="move" onSortEnd={onSortEnd} canMoveItems={() => allowed} />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'd' }), { clientY: 375 });
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    allowed = false;
    setItemRects();
    await dragEnter(a, { clientY: 250 });
    drop(a, { clientY: 250 });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
    expect(onSortEnd).toHaveBeenCalledWith({ itemIds: expect.any(Array), canceled: true });
  });
  it('restores focus after a pointer move remounts an item in another group', async () => {
    function Groups() {
      const [moved, setMoved] = React.useState(false);
      return (
        <Listbox.Root>
          <Listbox.SortableProvider onItemsReorder={() => setMoved(true)}>
            <Listbox.List>
              <Listbox.Group>{!moved && <Listbox.Item value="a">a</Listbox.Item>}</Listbox.Group>
              <Listbox.Group>
                {(moved ? ['b', 'a', 'c'] : ['b', 'c']).map((value) => (
                  <Listbox.Item key={value} value={value}>
                    {value}
                  </Listbox.Item>
                ))}
              </Listbox.Group>
            </Listbox.List>
          </Listbox.SortableProvider>
        </Listbox.Root>
      );
    }
    await render(<Groups />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    const b = screen.getByRole('option', { name: 'b' });
    await lift(a, { clientY: 25 });
    await dragEnter(b, { clientY: 175 });
    drop(b, { clientY: 175 });
    await flushRaf();
    expect(screen.getByRole('option', { name: 'a' })).not.toBe(a);
    await waitFor(() => expect(screen.getByRole('option', { name: 'a' })).toHaveFocus());
  });
  it('keeps externally inserted items when canceling a live move', async () => {
    let updateItems: React.Dispatch<React.SetStateAction<string[]>>;
    function UpdatingList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      updateItems = setItems;
      return (
        <Listbox.Root>
          <Listbox.SortableProvider reorderOn="move" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.SortableProvider>
        </Listbox.Root>
      );
    }
    await render(<UpdatingList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    expect(values()).toEqual(['b', 'c', 'a']);
    await act(() => updateItems((items) => ['new', ...items]));
    cancel();
    await flushRaf();
    expect(values()).toEqual(['new', 'a', 'b', 'c']);
  });
  it('does not overwrite an external reorder when canceling a live move', async () => {
    let updateItems: React.Dispatch<React.SetStateAction<string[]>>;
    function UpdatingList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      updateItems = setItems;
      return (
        <Listbox.Root>
          <Listbox.SortableProvider reorderOn="move" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.SortableProvider>
        </Listbox.Root>
      );
    }
    await render(<UpdatingList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    await act(() => updateItems(['c', 'a', 'b']));
    cancel();
    await flushRaf();
    expect(values()).toEqual(['c', 'a', 'b']);
  });
  it('moves between groups even when the flat order stays the same', async () => {
    await render(<GroupedFixture />);
    setItemRects();
    const b = screen.getByRole('option', { name: 'b' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(b, { clientY: 125 });
    drop(b, { clientY: 125 });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c']);
    expect(within(screen.getByTestId('one')).queryAllByRole('option')).toHaveLength(0);
    expect(within(screen.getByTestId('two')).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
  });
  it.each([{ selected: [] }, { selected: ['a', 'b'] }])(
    'restores original groups when canceling live sorting, selection $selected',
    async ({ selected }) => {
      await render(<GroupedFixture reorderOn="move" selected={selected} />);
      setItemRects();
      await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
      await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
      expect(within(screen.getByTestId('one')).queryAllByRole('option')).toHaveLength(0);
      cancel();
      await flushRaf();
      expect(within(screen.getByTestId('one')).getByRole('option', { name: 'a' })).toBeVisible();
      expect(
        within(screen.getByTestId('two'))
          .getAllByRole('option')
          .map((item) => item.textContent),
      ).toEqual(['b', 'c']);
      expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
    },
  );
  it('restores focus when a delayed pointer drop remounts an item in another group', async () => {
    let apply: (() => void) | undefined;
    await render(
      <GroupedFixture
        defer={(commit) => {
          apply = commit;
        }}
      />,
    );
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    const b = screen.getByRole('option', { name: 'b' });
    await lift(a, { clientY: 25 });
    await dragEnter(b, { clientY: 175 });
    drop(b, { clientY: 175 });
    await flushRaf();
    await act(() => apply!());
    expect(screen.getByRole('option', { name: 'a' })).not.toBe(a);
    await waitFor(() => expect(screen.getByRole('option', { name: 'a' })).toHaveFocus());
  });

  it('restores grouped order and focus while preserving a newly inserted item', async () => {
    let insert: () => void;
    function UpdatingGroups() {
      const [items, setItems] = React.useState([
        { value: 'a', groupId: 'one' },
        { value: 'b', groupId: 'two' },
        { value: 'c', groupId: 'two' },
      ]);
      insert = () => setItems((current) => [{ value: 'new', groupId: 'two' }, ...current]);
      return (
        <Listbox.Root>
          <Listbox.SortableProvider
            reorderOn="move"
            onItemsReorder={(_, details) =>
              setItems(details.order.map(({ value, groupId }) => ({ value, groupId: groupId! })))
            }
          >
            <Listbox.List>
              {['one', 'two'].map((groupId) => (
                <Listbox.Group key={groupId} id={groupId}>
                  {items
                    .filter((item) => item.groupId === groupId)
                    .map(({ value }) => (
                      <Listbox.Item key={value} value={value}>
                        {value}
                      </Listbox.Item>
                    ))}
                </Listbox.Group>
              ))}
            </Listbox.List>
          </Listbox.SortableProvider>
        </Listbox.Root>
      );
    }
    await render(<UpdatingGroups />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    await act(() => insert());
    cancel();
    await flushRaf();
    expect(values()).toEqual(['a', 'new', 'b', 'c']);
    expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
  });
});
