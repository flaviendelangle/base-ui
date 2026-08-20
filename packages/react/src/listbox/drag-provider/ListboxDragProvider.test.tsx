import * as React from 'react';
import { beforeEach, expect, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@mui/internal-test-utils';
import { createRenderer, isJSDOM } from '#test-utils';
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

describe('<Listbox.DragProvider />', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  it('uses the whole item as the drag source and restores its highlight after drop', async () => {
    const handleCanDrop = vi.fn(() => true);

    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);

      return (
        <Listbox.Root selectionMode="multiple" defaultValue={['a', 'b']}>
          <Listbox.DragProvider canDrop={handleCanDrop} onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
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

    expect(handleCanDrop).toHaveBeenCalledWith({
      sourceItems: [
        { value: 'a', index: 0, groupId: undefined, disabled: false },
        { value: 'b', index: 1, groupId: undefined, disabled: false },
      ],
      targetItem: { value: 'd', index: 3, groupId: undefined, disabled: false },
      edge: 'after',
    });

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
        <Listbox.DragProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value={itemA}>a</Listbox.Item>
            <Listbox.Item value={itemB}>b</Listbox.Item>
            <Listbox.Item value={itemC}>c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const optionB = screen.getByRole('option', { name: 'b' });
    const optionC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(optionB, { clientY: 150 });
    await dragEnter(optionC, { clientY: 275 });
    drop(optionC, { clientY: 275 });
    await flushRaf();

    expect(handleItemsReorder).toHaveBeenCalledWith(
      [itemC, itemA, itemB],
      expect.objectContaining({
        reason: 'drag',
        event: expect.any(PointerEvent),
        sourceItems: [
          { value: itemA, index: 0, groupId: undefined, disabled: false },
          { value: itemB, index: 1, groupId: undefined, disabled: false },
        ],
        targetItem: { value: itemC, index: 2, groupId: undefined, disabled: false },
        edge: 'after',
      }),
    );
    expect(handleItemsReorder.mock.calls[0][1].event.clientY).toBe(275);
  });

  it('rebases a drop reorder on items added during the drag', async () => {
    let addItem = () => {};

    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      addItem = () => setItems((currentItems) => [...currentItems, 'd']);

      return (
        <Listbox.Root>
          <Listbox.DragProvider onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemA, { clientY: 50 });
    await act(async () => addItem());
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(4);
    });
    setItemRects(screen.getAllByRole('option'));
    await dragEnter(itemC, { clientY: 275 });
    drop(itemC, { clientY: 275 });
    await flushRaf();

    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('blocks disabled items from dragging', async () => {
    await render(
      <Listbox.Root>
        <Listbox.DragProvider onItemsReorder={vi.fn()}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b" disabled>
              b
            </Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);

    await lift(itemB, { expectNoDrag: true });
    await lift(itemA);
    cancel();
  });

  it('allows additionally disabling drag for an enabled item', async () => {
    await render(
      <Listbox.Root>
        <Listbox.DragProvider
          isItemDragDisabled={(item) => item.value === 'a'}
          onItemsReorder={vi.fn()}
        >
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b" disabled>
              b
            </Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects([itemA, itemB, itemC]);

    await lift(itemA, { expectNoDrag: true });
    await lift(itemB, { expectNoDrag: true });
    await lift(itemC);
    cancel();
  });

  it('blocks all pointer drag-and-drop when the listbox is disabled', async () => {
    await render(
      <Listbox.Root disabled>
        <Listbox.DragProvider canDrop={() => true} onItemsReorder={vi.fn()}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
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
        <Listbox.DragProvider canDrop={handleCanDrop} onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
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

    expect(handleCanDrop).toHaveBeenCalledWith({
      sourceItems: [{ value: 'b', index: 1, groupId: undefined, disabled: false }],
      targetItem: { value: 'c', index: 2, groupId: undefined, disabled: false },
      edge: 'after',
    });
    expect(handleItemsReorder).not.toHaveBeenCalled();
  });

  it('does not reorder when dropping an item onto itself', async () => {
    const handleItemsReorder = vi.fn();

    await render(
      <Listbox.Root>
        <Listbox.DragProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
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

  it('only rerenders the item whose drop position changes', async () => {
    const renderItem = {
      a: vi.fn(),
      b: vi.fn(),
      c: vi.fn(),
    };

    await render(
      <Listbox.Root>
        <Listbox.DragProvider onItemsReorder={vi.fn()}>
          <Listbox.List>
            {(['a', 'b', 'c'] as const).map((item) => (
              <Listbox.Item
                key={item}
                value={item}
                render={(itemProps, state) => {
                  renderItem[item](state);
                  return <div {...itemProps} />;
                }}
              >
                {item}
              </Listbox.Item>
            ))}
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));
    await lift(itemA, { clientY: 50 });
    Object.values(renderItem).forEach((renderSpy) => renderSpy.mockClear());

    await dragEnter(itemC, { clientY: 275 });

    expect(renderItem.a).not.toHaveBeenCalled();
    expect(renderItem.b).not.toHaveBeenCalled();
    expect(renderItem.c).toHaveBeenCalled();
    cancel(itemA);
  });

  it('keeps pointer pickup on the whole item when ItemDragHandle is present', async () => {
    const handleItemsReorder = vi.fn();

    await render(
      <Listbox.Root>
        <Listbox.DragProvider onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">
              a
              <Listbox.ItemDragHandle data-testid="handle-a" />
            </Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);

    await lift(itemA);
    await dragEnter(itemB, { clientY: 175 });
    drop(itemB, { clientY: 175 });
    await flushRaf();

    expect(handleItemsReorder).toHaveBeenCalledWith(
      ['b', 'a'],
      expect.objectContaining({ reason: 'drag' }),
    );
  });

  it('uses Alt+Enter for keyboard pickup without taking over plain Enter', async () => {
    const handleItemsReorder = vi.fn();
    const handleCanDrop = vi.fn(() => true);

    await render(
      <Listbox.Root>
        <Listbox.DragProvider canDrop={handleCanDrop} onItemsReorder={handleItemsReorder}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    setItemRects([itemA, itemB]);
    await act(() => itemA.focus());

    fireEvent.keyDown(itemA, { key: 'Enter' });
    expect(itemA).toHaveAttribute('aria-selected', 'true');
    expect(itemA).not.toHaveAttribute('data-dragging');

    fireEvent.keyDown(itemA, { key: 'Enter', altKey: true });
    expect(itemA).toHaveAttribute('data-dragging', '');
    expect(itemA).toHaveFocus();
    await flushRaf();
    expect(itemA).toHaveFocus();
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(itemB);

    const arrowEvent = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    act(() => itemA.dispatchEvent(arrowEvent));
    expect(arrowEvent.defaultPrevented).toBe(true);
    await flushRaf();
    expect(handleCanDrop).toHaveBeenLastCalledWith(
      expect.objectContaining({
        targetItem: expect.objectContaining({ value: 'b' }),
        edge: 'after',
      }),
    );
    await waitFor(() => expect(itemB).toHaveAttribute('data-drop-position', 'after'));
    fireEvent.keyDown(itemA, { key: 'Enter' });
    await flushRaf();

    expect(handleItemsReorder).toHaveBeenCalledWith(
      ['b', 'a'],
      expect.objectContaining({ reason: 'keyboard' }),
    );
    await waitFor(() => expect(itemA).toHaveFocus());
  });

  it('keeps the live order when the moved source is under the release point', async () => {
    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);

      return (
        <Listbox.Root>
          <Listbox.DragProvider updateOn="drag" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemA, { clientY: 50 });
    await dragEnter(itemC, { clientY: 275 });
    await dragOver(itemC, { clientY: 275 });
    await flushRaf();

    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'b',
        'c',
        'a',
      ]);
    });
    expect(itemA).toHaveAttribute('data-dragging', '');
    expect(screen.getByRole('option', { name: 'b' })).not.toHaveAttribute('data-dragging');

    // Reordering the DOM puts the dragged row where the target used to be. It must remain a valid
    // terminal target rather than turning the release into a canceled drag and rolling back.
    drop(itemA, { clientY: 275 });
    await flushRaf();

    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual(['b', 'c', 'a']);
  });

  it('rolls a live reorder back when canDrop rejects its last accepted placement at release', async () => {
    let allowDrop = true;

    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);

      return (
        <Listbox.Root>
          <Listbox.DragProvider updateOn="drag" canDrop={() => allowDrop} onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemA, { clientY: 50 });
    await dragEnter(itemC, { clientY: 275 });
    await dragOver(itemC, { clientY: 275 });
    await flushRaf();
    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'b',
        'c',
        'a',
      ]);
    });

    allowDrop = false;
    drop(itemA, { clientY: 275 });
    await flushRaf();

    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'a',
        'b',
        'c',
      ]);
    });
  });

  it('does not overwrite items added after a live reorder', async () => {
    let addItem = () => {};

    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);
      addItem = () => setItems((currentItems) => [...currentItems, 'd']);

      return (
        <Listbox.Root>
          <Listbox.DragProvider updateOn="drag" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemA, { clientY: 50 });
    await dragEnter(itemC, { clientY: 275 });
    await dragOver(itemC, { clientY: 275 });
    await flushRaf();
    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'b',
        'c',
        'a',
      ]);
    });

    await act(async () => addItem());
    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(4);
    });
    drop(itemA, { clientY: 275 });
    await flushRaf();

    expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
      'b',
      'c',
      'a',
      'd',
    ]);
  });

  it('does not let focus cleanup from one drop interfere with the next drag', async () => {
    await render(
      <Listbox.Root>
        <Listbox.DragProvider onItemsReorder={vi.fn()}>
          <Listbox.List>
            <Listbox.Item value="a">a</Listbox.Item>
            <Listbox.Item value="b">b</Listbox.Item>
            <Listbox.Item value="c">c</Listbox.Item>
          </Listbox.List>
        </Listbox.DragProvider>
      </Listbox.Root>,
    );

    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    const itemC = screen.getByRole('option', { name: 'c' });
    setItemRects([itemA, itemB, itemC]);

    await lift(itemA, { clientY: 50 });
    await dragEnter(itemC, { clientY: 275 });
    drop(itemC, { clientY: 275 });

    await act(() => itemB.focus());
    await lift(itemB, { clientY: 150 });
    await flushRaf();
    await flushRaf();
    fireEvent.mouseMove(itemC);

    expect(document.activeElement).toBe(itemB);
    cancel(itemB);
  });

  it.skipIf(isJSDOM)('publishes displacement after the reordered items commit', async () => {
    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c']);

      return (
        <Listbox.Root>
          <Listbox.DragProvider updateOn="drag" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item} style={{ height: 40 }}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemB = screen.getByRole('option', { name: 'b' });
    const itemC = screen.getByRole('option', { name: 'c' });
    const displacedValues: string[] = [];
    const observer = new MutationObserver(() => {
      if (itemB.hasAttribute('data-displacing')) {
        displacedValues.push(itemB.style.getPropertyValue('--drag-displacement-y'));
      }
    });
    observer.observe(itemB, { attributes: true });

    const sourceRect = itemA.getBoundingClientRect();
    const targetRect = itemC.getBoundingClientRect();
    await lift(itemA, { clientY: sourceRect.top + sourceRect.height / 2 });
    await dragEnter(itemC, { clientY: targetRect.bottom - 1 });
    await dragOver(itemC, { clientY: targetRect.bottom - 1 });
    await flushRaf();

    await waitFor(() => {
      expect(displacedValues).toContain('40px');
    });

    observer.disconnect();
    cancel(itemA);
  });

  it('restores the exact initial order when a live multi-item drag is canceled', async () => {
    function TestComponent() {
      const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);

      return (
        <Listbox.Root selectionMode="multiple" defaultValue={['a', 'c']}>
          <Listbox.DragProvider updateOn="drag" onItemsReorder={setItems}>
            <Listbox.List>
              {items.map((item) => (
                <Listbox.Item key={item} value={item}>
                  {item}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Listbox.DragProvider>
        </Listbox.Root>
      );
    }

    await render(<TestComponent />);
    const itemA = screen.getByRole('option', { name: 'a' });
    const itemD = screen.getByRole('option', { name: 'd' });
    setItemRects(screen.getAllByRole('option'));

    await lift(itemA, { clientY: 50 });
    await dragEnter(itemD, { clientY: 375 });
    await dragOver(itemD, { clientY: 375 });
    await flushRaf();

    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'b',
        'd',
        'a',
        'c',
      ]);
    });

    cancel(itemA);
    await flushRaf();

    await waitFor(() => {
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    });
  });
});
