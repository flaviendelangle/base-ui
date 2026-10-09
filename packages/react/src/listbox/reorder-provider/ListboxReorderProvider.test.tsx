import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { expect, vi, describe, it } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Draggable } from '@base-ui/react/draggable';
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
  const [items, setItems] = React.useState<Array<{ value: string; groupId: string | null }>>([
    { value: 'a', groupId: 'one' },
    { value: 'b', groupId: 'two' },
    { value: 'c', groupId: 'two' },
  ]);
  return (
    <Listbox.ReorderProvider
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
      <Listbox.Root selectionMode="multiple" defaultValue={selected}>
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
      </Listbox.Root>
    </Listbox.ReorderProvider>
  );
}

describe('<Listbox.ReorderProvider />', () => {
  const { render } = createRenderer();
  function Fixture({
    onItemsReorder,
    preview,
    draggableProps,
    ...props
  }: Partial<Listbox.ReorderProvider.Props<string>> & {
    preview?: Listbox.ReorderPreview.Props<string>;
    draggableProps?: Listbox.Item.Props['draggableProps'];
  }) {
    const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);
    return (
      <Listbox.ReorderProvider
        {...props}
        onItemsReorder={(next, details) => {
          onItemsReorder?.(next, details);
          if (!details.isCanceled) {
            setItems(next);
          }
        }}
      >
        <Listbox.Root selectionMode="multiple" defaultValue={['a', 'b']}>
          <Listbox.List>
            {items.map((value) => (
              <Listbox.Item key={value} value={value} draggableProps={draggableProps}>
                {value}
                {preview && <Listbox.ReorderPreview {...preview} />}
              </Listbox.Item>
            ))}
          </Listbox.List>
        </Listbox.Root>
      </Listbox.ReorderProvider>
    );
  }
  it('restores a live proposal when its callback synchronously unmounts sorting', async () => {
    let current = ['a', 'b', 'c'];
    let first = true;
    function Example() {
      const [visible, setVisible] = React.useState(true);
      return visible ? (
        <Listbox.ReorderProvider
          reorderOn="move"
          onItemsReorder={(next) => {
            current = next;
            if (first) {
              first = false;
              ReactDOM.flushSync(() => setVisible(false));
            }
          }}
        >
          <Listbox.Root>
            <Listbox.List>
              {['a', 'b', 'c'].map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      ) : null;
    }
    await render(<Example />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    expect(current).toEqual(['a', 'b', 'c']);
  });
  it('does not propose rollback twice if rollback unmounts sorting', async () => {
    const proposals: string[][] = [];
    function Example() {
      const [visible, setVisible] = React.useState(true);
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      return visible ? (
        <Listbox.ReorderProvider
          reorderOn="move"
          onItemsReorder={(next) => {
            proposals.push(next);
            if (proposals.length === 2) {
              ReactDOM.flushSync(() => setVisible(false));
            } else {
              setItems(next);
            }
          }}
        >
          <Listbox.Root>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      ) : null;
    }
    await render(<Example />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    expect(values()).toEqual(['b', 'c', 'a']);
    cancel();
    expect(proposals).toEqual([
      ['b', 'c', 'a'],
      ['a', 'b', 'c'],
    ]);
  });
  it('passes only the declared event details to onDropPositionChange and onReorderEnd', async () => {
    const onDropPositionChange = vi.fn();
    const onReorderEnd = vi.fn();
    await render(
      <Fixture onDropPositionChange={onDropPositionChange} onReorderEnd={onReorderEnd} />,
    );
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'b' }), { clientY: 150 });
    await dragEnter(d, { clientY: 375 });
    await dragOver(d, { clientY: 375 });
    drop(d, { clientY: 375 });
    await flushRaf();
    const details = (reason: string) => ({
      reason,
      event: expect.any(Event),
      location: expect.any(Object),
    });
    expect(onDropPositionChange.mock.calls).toEqual([
      [{ id: expect.anything(), placement: 'after' }, details('pointer')],
      [null, details('drop')],
    ]);
    expect(onReorderEnd.mock.calls).toEqual([
      [{ ...details('drop'), itemIds: expect.any(Array), canceled: false }],
    ]);
  });
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
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    await waitFor(() => expect(b).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('Moved a, b');
  });
  it.each([false, true])(
    'marks all moved items without changing the engine drag marker, canceled: %s',
    async (canceled) => {
      await render(<Fixture />);
      setItemRects();
      const a = screen.getByRole('option', { name: 'a' });
      const b = screen.getByRole('option', { name: 'b' });
      const d = screen.getByRole('option', { name: 'd' });
      await lift(a, { clientY: 25 });
      expect(a).toHaveAttribute('data-moving');
      expect(b).toHaveAttribute('data-moving');
      expect(a).toHaveAttribute('data-dragging');
      expect(b).not.toHaveAttribute('data-dragging');
      expect(d).not.toHaveAttribute('data-moving');
      if (canceled) {
        cancel();
      } else {
        await dragEnter(d, { clientY: 375 });
        drop(d, { clientY: 375 });
      }
      await flushRaf();
      expect(a).not.toHaveAttribute('data-moving');
      expect(b).not.toHaveAttribute('data-moving');
    },
  );

  it('does not mark selected items excluded from sorting as moving', async () => {
    await render(<Fixture isItemReorderable={({ value }) => value !== 'b'} />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    expect(screen.getByRole('option', { name: 'a' })).toHaveAttribute('data-moving');
    expect(screen.getByRole('option', { name: 'b' })).not.toHaveAttribute('data-moving');
    cancel();
    await flushRaf();
  });

  it.each(['moved', 'canceled', 'unchanged'] as const)(
    'customizes the final %s announcement',
    async (outcome) => {
      const getAnnouncement = vi.fn(({ outcome: result }) => `Result: ${result}`);
      await render(
        <Fixture
          getAnnouncement={getAnnouncement}
          onItemsReorder={(_, details) => {
            if (outcome === 'canceled') {
              details.cancel();
            }
          }}
        />,
      );
      setItemRects();
      const target = screen.getByRole('option', { name: outcome === 'unchanged' ? 'c' : 'd' });
      const clientY = outcome === 'unchanged' ? 225 : 375;
      await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
      await dragEnter(target, { clientY });
      expect(getAnnouncement).not.toHaveBeenCalled();
      drop(target, { clientY });
      await flushRaf();
      expect(getAnnouncement).toHaveBeenCalledExactlyOnceWith({
        items: [
          expect.objectContaining({ value: 'a', index: outcome === 'moved' ? 2 : 0 }),
          expect.objectContaining({ value: 'b', index: outcome === 'moved' ? 3 : 1 }),
        ],
        destination: { groupId: null, index: outcome === 'moved' ? 2 : 0 },
        reason: 'drag',
        outcome,
        direction: null,
      });
      expect(screen.getByRole('status')).toHaveTextContent(`Result: ${outcome}`);
    },
  );

  it('uses custom drop zones and shares movement validation with the keyboard', async () => {
    const canMoveItems = vi.fn(() => true);
    const getDropPosition = vi.fn(
      (_context: Listbox.ReorderProvider.DropContext<string>) => 'before' as const,
    );
    await render(<Fixture getDropPosition={getDropPosition} canMoveItems={canMoveItems} />);
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(d, { clientY: 375 });
    expect(d).toHaveAttribute('data-drop-position', 'before');
    expect(getDropPosition).toHaveBeenCalledWith(
      expect.objectContaining({
        item: 'd',
        itemMetadata: { index: 3, groupId: null },
        source: expect.objectContaining({
          element: screen.getByRole('option', { name: 'a' }),
          payload: expect.objectContaining({ collectionId: expect.any(Object), items: ['a', 'b'] }),
        }),
      }),
    );
    // The row is 100px tall from y = 300.
    expect(getDropPosition.mock.lastCall![0].getLocalPoint().y).toBe(0.75);
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['c', 'a', 'b', 'd']);
    expect(canMoveItems).toHaveBeenCalledWith({
      items: [expect.objectContaining({ value: 'a' }), expect.objectContaining({ value: 'b' })],
      destination: { index: 3, groupId: null },
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
    const onReorderEnd = vi.fn();
    await render(<Fixture reorderOn="move" onReorderEnd={onReorderEnd} />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'd' }), { clientY: 375 });
    expect(values()).toEqual(['c', 'd', 'a', 'b']);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    cancel();
    await flushRaf();
    expect(screen.getByRole('status')).toHaveTextContent('Reordering canceled.');
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
    expect(onReorderEnd).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: expect.any(Array), canceled: true }),
    );
  });
  it('keeps a live move when dropping over its source', async () => {
    const onReorderEnd = vi.fn();
    await render(<Fixture reorderOn="move" onReorderEnd={onReorderEnd} />);
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
    expect(onReorderEnd).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: expect.any(Array), canceled: false }),
    );
  });
  it('passes item draggable options through to the engine', async () => {
    const onBeforeMoveStart = vi.fn((eventDetails: Draggable.Root.BeforeMoveStartEventDetails) =>
      eventDetails.cancel(),
    );
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
  it('shows drag state in a custom preview through Draggable.updatePreview()', async () => {
    await render(
      <Fixture
        draggableProps={{
          onMove: (eventDetails) => {
            eventDetails.source.updateDragData(
              Math.round(eventDetails.location.current.input.clientY),
            );
            Draggable.updatePreview();
          },
        }}
        preview={{
          children: (parameters) => (
            <span data-testid="preview">{String(parameters.source.dragData ?? 'start')}</span>
          ),
        }}
      />,
    );
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25 });
    await flushRaf();
    // The pickup's own move already asked for an update.
    expect(screen.getByTestId('preview')).toHaveTextContent('25');

    await dragOver(a, { clientY: 60 });
    await flushRaf();
    expect(screen.getByTestId('preview')).toHaveTextContent('60');
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
  describe('preview key', () => {
    const transferKind =
      Draggable.createKind<Listbox.ReorderProvider.DragPayload<string>>('transfer');
    function TransferFixture({
      previewKey,
    }: {
      previewKey?: (list: string, value: string) => string;
    }) {
      const [left, setLeft] = React.useState(['a', 'b']);
      const [right, setRight] = React.useState(['c']);
      const draggableProps = (list: string, value: string) =>
        previewKey ? { previewKey: previewKey(list, value) } : undefined;
      return (
        <Draggable.Provider>
          <Listbox.ReorderProvider kind={transferKind} onItemsReorder={setLeft}>
            <Listbox.Root>
              <Listbox.List>
                {left.map((value) => (
                  <Listbox.Item
                    key={value}
                    value={value}
                    draggableProps={draggableProps('left', value)}
                  >
                    {value}
                  </Listbox.Item>
                ))}
              </Listbox.List>
            </Listbox.Root>
          </Listbox.ReorderProvider>
          <Listbox.ReorderProvider kind={transferKind} onItemsReorder={setRight}>
            <Listbox.Root>
              <Listbox.List>
                {right.map((value) => (
                  <Listbox.ItemExternalDropTarget
                    key={value}
                    value={value}
                    accept={transferKind}
                    draggableProps={draggableProps('right', value)}
                    onDraggableDrop={({ source, destination }) => {
                      const moved = source.payload.items;
                      setLeft((current) => current.filter((item) => !moved.includes(item)));
                      setRight((current) => [
                        ...current.slice(0, destination.index),
                        ...moved,
                        ...current.slice(destination.index),
                      ]);
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
    async function transfer() {
      setItemRects();
      const a = screen.getByRole('option', { name: 'a' });
      const c = screen.getByRole('option', { name: 'c' });
      await lift(a, { clientY: 25 });
      await dragEnter(c, { clientY: 275 });
      drop(c, { clientY: 275 });
      const remounted = screen.getByRole('option', { name: 'a' });
      expect(remounted).not.toBe(a);
      return remounted;
    }

    it('settles the preview onto the row a cross-list drop remounts', async () => {
      await render(<TransferFixture />);
      expect(await transfer()).toHaveAttribute('data-settling');
      await flushRaf();
    });
    it('uses an explicit draggableProps.previewKey instead of the item value', async () => {
      // The keys differ between the lists, so the preview can't find the moved row.
      await render(<TransferFixture previewKey={(list, value) => `${list}-${value}`} />);
      expect(await transfer()).not.toHaveAttribute('data-settling');
      await flushRaf();
    });
  });
  it('restricts pointer pickup to ReorderHandle while keeping row keyboard sorting', async () => {
    const onItemsReorder = vi.fn();
    await render(
      <Listbox.ReorderProvider onItemsReorder={onItemsReorder}>
        <Listbox.Root>
          <Listbox.List>
            <Listbox.Item value="a">
              a<Listbox.ReorderHandle data-testid="handle" />
            </Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.Root>
      </Listbox.ReorderProvider>,
    );
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    await lift(a, { clientY: 25, expectNoDrag: true });
    await act(async () => a.focus());
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
    const onReorderEnd = vi.fn();
    await render(
      <Fixture onReorderEnd={onReorderEnd} onItemsReorder={(_, details) => details.cancel()} />,
    );
    setItemRects();
    const d = screen.getByRole('option', { name: 'd' });
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(d, { clientY: 375 });
    drop(d, { clientY: 375 });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c', 'd']);
    expect(onReorderEnd).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: expect.any(Array), canceled: true }),
    );
  });
  it('revalidates movement rules before keeping a live move over its source', async () => {
    const onReorderEnd = vi.fn();
    let allowed = true;
    await render(
      <Fixture reorderOn="move" onReorderEnd={onReorderEnd} canMoveItems={() => allowed} />,
    );
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
    expect(onReorderEnd).toHaveBeenCalledWith(
      expect.objectContaining({ itemIds: expect.any(Array), canceled: true }),
    );
  });
  it('restores focus after a pointer move remounts an item in another group', async () => {
    function Groups() {
      const [moved, setMoved] = React.useState(false);
      return (
        <Listbox.ReorderProvider onItemsReorder={() => setMoved(true)}>
          <Listbox.Root>
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
          </Listbox.Root>
        </Listbox.ReorderProvider>
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
    expect(screen.getByRole('status')).toHaveTextContent('Moved a');
  });
  it('keeps externally inserted items when canceling a live move', async () => {
    let updateItems: React.Dispatch<React.SetStateAction<string[]>>;
    function UpdatingList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      updateItems = setItems;
      return (
        <Listbox.ReorderProvider reorderOn="move" onItemsReorder={setItems}>
          <Listbox.Root>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<UpdatingList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    expect(values()).toEqual(['b', 'c', 'a']);
    await act(async () => updateItems((items) => ['new', ...items]));
    cancel();
    await flushRaf();
    expect(values()).toEqual(['new', 'a', 'b', 'c']);
  });
  it('preserves current models and additions without resurrecting deleted items on rollback', async () => {
    type Item = { id: string; label: string };
    let updateItems: React.Dispatch<React.SetStateAction<Item[]>>;
    function UpdatingList() {
      const [items, setItems] = React.useState<Item[]>([
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
      ]);
      updateItems = setItems;
      return (
        <Listbox.ReorderProvider reorderOn="move" onItemsReorder={setItems}>
          <Listbox.Root isItemEqualToValue={(a: Item, b: Item) => a.id === b.id}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item.id} value={item}>
                  {item.label}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<UpdatingList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'A' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'C' }), { clientY: 275 });
    expect(values()).toEqual(['B', 'C', 'A']);
    await act(async () =>
      updateItems([
        { id: 'new', label: 'New' },
        { id: 'c', label: 'C' },
        { id: 'a', label: 'Edited A' },
      ]),
    );
    cancel();
    await flushRaf();
    expect(values()).toEqual(['New', 'Edited A', 'C']);
  });

  it('does not overwrite an external reorder when canceling a live move', async () => {
    let updateItems: React.Dispatch<React.SetStateAction<string[]>>;
    function UpdatingList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      updateItems = setItems;
      return (
        <Listbox.ReorderProvider reorderOn="move" onItemsReorder={setItems}>
          <Listbox.Root>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<UpdatingList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    await act(async () => updateItems(['c', 'a', 'b']));
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
  it('does not report the drag preview as the highlighted option', async () => {
    const onHighlightChange = vi.fn();
    await render(
      <Listbox.ReorderProvider onItemsReorder={() => {}}>
        <Listbox.Root onHighlightChange={onHighlightChange}>
          <Listbox.List>
            <Listbox.Group id="one">
              <Listbox.Item value="a">
                a<Listbox.ReorderHandle data-testid="handle" />
              </Listbox.Item>
            </Listbox.Group>
            <Listbox.Group id="two">
              <Listbox.Item value="b">b</Listbox.Item>
            </Listbox.Group>
          </Listbox.List>
        </Listbox.Root>
      </Listbox.ReorderProvider>,
    );
    setItemRects();
    await act(async () => screen.getByRole('option', { name: 'a' }).focus());
    fireEvent.keyDown(screen.getByRole('option', { name: 'a' }), { key: 'ArrowDown' });
    await flushRaf();
    expect(onHighlightChange).toHaveBeenLastCalledWith(
      'b',
      screen.getByRole('option', { name: 'b' }),
    );
    onHighlightChange.mockClear();
    // The preview of `a` goes at the end of the first group, before `b` in tree order.
    await lift(screen.getByTestId('handle'), { clientY: 25 });
    expect(document.querySelector('[data-drag-preview]')).not.toBe(null);
    expect(onHighlightChange).not.toHaveBeenCalled();
    cancel();
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
  it.each([false, true])(
    'supersedes a deferred live move on cancellation, separate commits %s',
    async (separateCommits) => {
      const updates: Array<() => void> = [];
      await render(<GroupedFixture reorderOn="move" defer={(apply) => updates.push(apply)} />);
      setItemRects();
      await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
      await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
      expect(updates).toHaveLength(1);
      cancel();
      expect(updates).toHaveLength(2);
      if (separateCommits) {
        await act(async () => updates[0]());
        await flushRaf();
        await act(async () => updates[1]());
      } else {
        await act(async () => updates.forEach((apply) => apply()));
      }
      await flushRaf();
      expect(values()).toEqual(['a', 'b', 'c']);
      expect(within(screen.getByTestId('one')).getByRole('option', { name: 'a' })).toBeVisible();
      expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
    },
  );

  it('restores the original order when a later live proposal is deferred', async () => {
    const updates: Array<() => void> = [];
    function DeferredList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      return (
        <Listbox.ReorderProvider
          reorderOn="move"
          onItemsReorder={(next) => updates.push(() => setItems(next))}
        >
          <Listbox.Root>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<DeferredList />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'b' }), { clientY: 175 });
    await act(async () => updates[0]());
    await flushRaf();
    expect(values()).toEqual(['b', 'a', 'c']);
    setItemRects();
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    expect(updates).toHaveLength(2);
    cancel();
    expect(updates).toHaveLength(3);
    await act(async () => {
      updates[1]();
      updates[2]();
    });
    await flushRaf();
    expect(values()).toEqual(['a', 'b', 'c']);
    expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
  });

  it('batches collection reconciliation when many items render during a drag', async () => {
    let update: () => void;
    function Items() {
      const [revision, setRevision] = React.useState(0);
      update = () => setRevision((value) => value + 1);
      return (
        <React.Fragment>
          {Array.from({ length: 40 }, (_, index) => (
            <Listbox.Item key={index} value={index} data-revision={revision}>
              {index}
            </Listbox.Item>
          ))}
        </React.Fragment>
      );
    }
    await render(
      <Listbox.ReorderProvider onItemsReorder={() => {}}>
        <Listbox.Root>
          <Listbox.List>
            <Items />
          </Listbox.List>
        </Listbox.Root>
      </Listbox.ReorderProvider>,
    );
    setItemRects();
    await lift(screen.getByRole('option', { name: '0' }), { clientY: 25 });
    await flushRaf();
    const query = vi.spyOn(screen.getByRole('listbox'), 'querySelectorAll');
    try {
      await act(async () => update());
      await flushRaf();
      const scans = query.mock.calls.filter(([selector]) => selector === '[role="option"]');
      expect(scans.length).toBeGreaterThan(0);
      expect(scans.length).toBeLessThanOrEqual(3);
      query.mockClear();
      await dragEnter(screen.getByRole('option', { name: '1' }), { clientY: 175 });
      const collisionScans = query.mock.calls.filter(
        ([selector]) => selector === '[role="option"]',
      );
      // Collision eligibility must not scan the collection once for each of the 40 targets.
      expect(collisionScans.length).toBeLessThan(20);
    } finally {
      query.mockRestore();
      cancel();
    }
  });

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
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await act(async () => apply!());
    expect(screen.getByRole('option', { name: 'a' })).not.toBe(a);
    await waitFor(() => expect(screen.getByRole('option', { name: 'a' })).toHaveFocus());
  });

  it('discards pending focus and announcements when another pointer sort starts', async () => {
    let apply: () => void = () => {};
    const getAnnouncement = vi.fn(() => 'Move completed');
    function DeferredList() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      return (
        <Listbox.ReorderProvider
          getAnnouncement={getAnnouncement}
          onItemsReorder={(next) => {
            apply = () => setItems(next);
          }}
        >
          <Listbox.Root>
            <Listbox.List>
              {items.map((value) => (
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<DeferredList />);
    setItemRects();
    const a = screen.getByRole('option', { name: 'a' });
    const b = screen.getByRole('option', { name: 'b' });
    await lift(a, { clientY: 25 });
    await dragEnter(b, { clientY: 175 });
    drop(b, { clientY: 175 });
    await flushRaf();
    await lift(b, { clientY: 125 });
    await act(async () => b.focus());
    await act(async () => apply());
    await flushRaf();
    expect(b).toHaveFocus();
    expect(getAnnouncement).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    cancel();
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
        <Listbox.ReorderProvider
          reorderOn="move"
          onItemsReorder={(_, details) =>
            setItems(details.order.map(({ value, groupId }) => ({ value, groupId: groupId! })))
          }
        >
          <Listbox.Root>
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
          </Listbox.Root>
        </Listbox.ReorderProvider>
      );
    }
    await render(<UpdatingGroups />);
    setItemRects();
    await lift(screen.getByRole('option', { name: 'a' }), { clientY: 25 });
    await dragEnter(screen.getByRole('option', { name: 'c' }), { clientY: 275 });
    await act(async () => insert());
    cancel();
    await flushRaf();
    expect(values()).toEqual(['a', 'new', 'b', 'c']);
    expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
  });
});
