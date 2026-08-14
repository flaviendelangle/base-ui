import * as React from 'react';
import { beforeEach, expect, vi } from 'vitest';
import { screen, waitFor } from '@mui/internal-test-utils';
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

function setItemRects(items: HTMLElement[]) {
  items.forEach((item, index) => {
    item.getBoundingClientRect = () => new DOMRect(0, index * 100, 100, 100);
  });
}

function reorder(
  prev: string[],
  event: { items: string[]; referenceItem: string; edge: 'before' | 'after' },
) {
  const movedValues = new Set(event.items);
  const movedItems = prev.filter((item) => movedValues.has(item));
  const rest = prev.filter((item) => !movedValues.has(item));
  const refIndex = rest.indexOf(event.referenceItem);
  rest.splice(event.edge === 'after' ? refIndex + 1 : refIndex, 0, ...movedItems);
  return rest;
}

describe('<Listbox.DragAndDropProvider />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  it('highlights the dragged item after a multi-drag drop', async () => {
    const handleCanDrop = vi.fn(() => true);

    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);

      return (
        <Listbox.Root selectionMode="multiple" defaultValue={['a', 'b']}>
          <Listbox.DragAndDropProvider
            canDrop={handleCanDrop}
            onItemsReorder={(event) => {
              setItems((prev) => reorder(prev, event));
            }}
          >
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragAndDropProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);

    const itemB = screen.getByRole('option', { name: 'b' });
    const itemD = screen.getByRole('option', { name: 'd' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemB, { clientY: 150 });
    await dragEnter(itemD, { clientY: 375 });
    await dragOver(itemD, { clientY: 375 });

    expect(itemD).toHaveAttribute('data-drag-over', '');
    expect(itemD).toHaveAttribute('data-drop-position', 'after');
    expect(itemB).not.toHaveAttribute('data-drag-over');

    drop(itemD, { clientY: 375 });
    await flushRaf();

    expect(handleCanDrop).toHaveBeenCalledWith(
      [
        { value: 'a', index: 0, groupId: undefined, disabled: false },
        { value: 'b', index: 1, groupId: undefined, disabled: false },
      ],
      { value: 'd', index: 3, groupId: undefined, disabled: false },
      'after',
    );

    await waitFor(() => {
      expect(screen.getAllByRole('option').map((element) => element.textContent)).toEqual([
        'c',
        'd',
        'a',
        'b',
      ]);
    });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'b' })).toBe(document.activeElement);
    });
  });

  it('supports object item values', async () => {
    const itemA = { id: 'a' };
    const itemB = { id: 'b' };
    const itemC = { id: 'c' };
    const handleItemsReorder = vi.fn();

    await render(
      <Listbox.Root
        selectionMode="multiple"
        defaultValue={[itemA, itemB]}
        isItemEqualToValue={(item, value) => item.id === value.id}
      >
        <Listbox.DragAndDropProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value={itemA}>a</Listbox.Item>
            <Listbox.Item value={itemB}>b</Listbox.Item>
            <Listbox.Item value={itemC}>c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const optionB = screen.getByRole('option', { name: 'b' });
    const optionC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(optionB, { clientY: 150 });
    await dragEnter(optionC, { clientY: 275 });
    drop(optionC, { clientY: 275 });
    await flushRaf();

    expect(handleItemsReorder).toHaveBeenCalledWith({
      items: [itemA, itemB],
      referenceItem: itemC,
      edge: 'after',
      reason: 'drag',
    });
  });

  it('uses the default canDrag behavior to block disabled items from dragging', async () => {
    await render(
      <Listbox.Root>
        <Listbox.DragAndDropProvider onItemsReorder={vi.fn()}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b" disabled>
              b
            </Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);

    await lift(itemB, { expectNoDrag: true });
    await lift(itemA);
    cancel();
  });

  it('allows overriding canDrag for a disabled item', async () => {
    await render(
      <Listbox.Root>
        <Listbox.DragAndDropProvider
          canDrag={(item) => item.value === 'b'}
          onItemsReorder={vi.fn()}
        >
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b" disabled>
              b
            </Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);

    await lift(itemA, { expectNoDrag: true });
    await lift(itemB);
    cancel();
  });

  it('blocks all pointer drag-and-drop when the listbox is disabled', async () => {
    await render(
      <Listbox.Root disabled>
        <Listbox.DragAndDropProvider
          canDrag={() => true}
          canDrop={() => true}
          onItemsReorder={vi.fn()}
        >
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    setItemRects([itemA, screen.getByRole('option', { name: 'b' })]);

    await lift(itemA, { expectNoDrag: true });
  });

  it('blocks pointer reordering when canDrop returns false', async () => {
    const handleItemsReorder = vi.fn();
    const handleCanDrop = vi.fn(() => false);

    await render(
      <Listbox.Root>
        <Listbox.DragAndDropProvider canDrop={handleCanDrop} onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemB = screen.getByRole('option', { name: 'b' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemB, { clientY: 150 });
    await dragEnter(itemC, { clientY: 275 });
    await dragOver(itemC, { clientY: 275 });
    drop(itemC, { clientY: 275 });
    await flushRaf();

    expect(handleCanDrop).toHaveBeenCalledWith(
      [{ value: 'b', index: 1, groupId: undefined, disabled: false }],
      { value: 'c', index: 2, groupId: undefined, disabled: false },
      'after',
    );
    expect(handleItemsReorder).not.toHaveBeenCalled();
  });

  it('does not reorder when dropping an item onto itself', async () => {
    const handleItemsReorder = vi.fn();

    await render(
      <Listbox.Root>
        <Listbox.DragAndDropProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemB, { clientY: 150 });
    await dragEnter(itemB, { clientY: 125 });
    drop(itemB, { clientY: 125 });
    await flushRaf();

    expect(handleItemsReorder).not.toHaveBeenCalled();
  });

  it('restricts pointer pickup to ItemDragHandle when one is present', async () => {
    const handleItemsReorder = vi.fn();

    await render(
      <Listbox.Root>
        <Listbox.DragAndDropProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">
              a
              <Listbox.ItemDragHandle data-testid="handle-a" />
            </Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.DragAndDropProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);

    await lift(itemA, { expectNoDrag: true });
    await lift(screen.getByTestId('handle-a'));
    await dragEnter(itemB, { clientY: 175 });
    drop(itemB, { clientY: 175 });
    await flushRaf();

    expect(handleItemsReorder).toHaveBeenCalledWith({
      items: ['a'],
      referenceItem: 'b',
      edge: 'after',
      reason: 'drag',
    });
  });
});
