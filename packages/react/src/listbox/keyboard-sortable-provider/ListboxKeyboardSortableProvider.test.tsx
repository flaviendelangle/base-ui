import * as React from 'react';
import { expect, vi, describe, it } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Listbox } from '@base-ui/react/listbox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { flushRaf } from '../../../test/dnd';

async function keyDown(element: HTMLElement, options: { key: string; altKey?: boolean }) {
  await act(() => element.focus());
  fireEvent.keyDown(element, options);
}

for (const Provider of [Listbox.KeyboardSortableProvider, Listbox.SortableProvider]) {
  describe(`<${Provider.name} /> keyboard sorting`, () => {
    const { render } = createRenderer();
    function Fixture({ onItemsReorder, ...props }: Listbox.KeyboardSortableProvider.Props<string>) {
      const [items, setItems] = React.useState(['a', 'b', 'c', 'd']);
      return (
        <Listbox.Root selectionMode="multiple" defaultValue={['a', 'b']}>
          <Provider
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
                <Listbox.Item key={value} value={value}>
                  {value}
                </Listbox.Item>
              ))}
            </Listbox.List>
          </Provider>
        </Listbox.Root>
      );
    }
    it('moves selected items together and retains focus and selection', async () => {
      await render(<Fixture />);
      const b = screen.getByRole('option', { name: 'b' });
      await act(() => b.focus());
      await keyDown(b, { key: 'ArrowDown', altKey: true });
      await waitFor(() =>
        expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
          'c',
          'a',
          'b',
          'd',
        ]),
      );
      expect(b).toHaveFocus();
      expect(b).toHaveAttribute('aria-selected', 'true');
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Moved a, b to position 2 of 4.'),
      );
      await keyDown(b, { key: 'ArrowDown' });
      await waitFor(() => expect(screen.getByRole('option', { name: 'd' })).toHaveFocus());
    });
    it('customizes announcements with the resulting position and input reason', async () => {
      const getAnnouncement = vi.fn(() => 'Custom move announcement');
      await render(<Fixture getAnnouncement={getAnnouncement} />);
      await keyDown(screen.getByRole('option', { name: 'b' }), { key: 'ArrowDown', altKey: true });
      await waitFor(() =>
        expect(getAnnouncement).toHaveBeenCalledExactlyOnceWith({
          items: [
            expect.objectContaining({ value: 'a', index: 1 }),
            expect.objectContaining({ value: 'b', index: 2 }),
          ],
          destination: { groupId: null, index: 1 },
          reason: 'keyboard',
          outcome: 'moved',
        }),
      );
      expect(screen.getByRole('status')).toHaveTextContent('Custom move announcement');
    });

    it('applies canMoveItems to keyboard moves', async () => {
      const onItemsReorder = vi.fn();
      const canMoveItems = vi.fn(() => false);
      await render(<Fixture onItemsReorder={onItemsReorder} canMoveItems={canMoveItems} />);
      await keyDown(screen.getByRole('option', { name: 'a' }), {
        key: 'ArrowDown',
        altKey: true,
      });
      expect(canMoveItems).toHaveBeenCalledWith({
        items: [expect.objectContaining({ value: 'a' }), expect.objectContaining({ value: 'b' })],
        destination: { index: 3, groupId: null },
      });
      expect(onItemsReorder).not.toHaveBeenCalled();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
    it('allows the consumer to cancel a proposed move', async () => {
      await render(<Fixture onItemsReorder={(_, details) => details.cancel()} />);
      await keyDown(screen.getByRole('option', { name: 'a' }), {
        key: 'ArrowDown',
        altKey: true,
      });
      expect(screen.getAllByRole('option').map((item) => item.textContent)).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
    it('does not announce or change focus when controlled order is rejected', async () => {
      const onItemsReorder = vi.fn();
      await render(
        <Listbox.Root>
          <Provider onItemsReorder={onItemsReorder}>
            <Listbox.List>
              <Listbox.Item value="a">a</Listbox.Item>
              <Listbox.Item value="b">b</Listbox.Item>
            </Listbox.List>
          </Provider>
        </Listbox.Root>,
      );
      const a = screen.getByRole('option', { name: 'a' });
      await act(() => a.focus());
      await keyDown(a, { key: 'ArrowDown', altKey: true });
      expect(onItemsReorder).toHaveBeenCalledOnce();
      expect(a).toHaveFocus();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });
    it('skips disabled selected items', async () => {
      const onItemsReorder = vi.fn();
      await render(
        <Fixture
          isItemSortingDisabled={(item) => item.value === 'a'}
          onItemsReorder={onItemsReorder}
        />,
      );
      expect(screen.getByRole('option', { name: 'a' })).not.toHaveAttribute('aria-keyshortcuts');
      expect(screen.getByRole('option', { name: 'b' })).toHaveAttribute('aria-keyshortcuts');
      await keyDown(screen.getByRole('option', { name: 'b' }), {
        key: 'ArrowDown',
        altKey: true,
      });
      expect(onItemsReorder).toHaveBeenCalledWith(
        ['a', 'c', 'b', 'd'],
        expect.objectContaining({ reason: 'keyboard' }),
      );
    });
    it('disables sorting without disabling selection', async () => {
      const onItemsReorder = vi.fn();
      await render(<Fixture disabled onItemsReorder={onItemsReorder} />);
      const c = screen.getByRole('option', { name: 'c' });
      await keyDown(c, { key: 'ArrowDown', altKey: true });
      expect(onItemsReorder).not.toHaveBeenCalled();
      fireEvent.click(c);
      expect(c).toHaveAttribute('aria-selected', 'true');
    });
    it('sorts horizontal lists in RTL', async () => {
      const onItemsReorder = vi.fn();
      await render(
        <DirectionProvider direction="rtl">
          <Listbox.Root orientation="horizontal">
            <Provider onItemsReorder={onItemsReorder}>
              <Listbox.List>
                <Listbox.Item value="a">a</Listbox.Item>
                <Listbox.Item value="b">b</Listbox.Item>
              </Listbox.List>
            </Provider>
          </Listbox.Root>
        </DirectionProvider>,
      );
      await keyDown(screen.getByRole('option', { name: 'a' }), {
        key: 'ArrowLeft',
        altKey: true,
      });
      expect(onItemsReorder).toHaveBeenCalledWith(
        ['b', 'a'],
        expect.objectContaining({ reason: 'keyboard' }),
      );
    });
    it('does not sort an outer list from a nested list', async () => {
      const onItemsReorder = vi.fn();
      await render(
        <Listbox.Root>
          <Provider onItemsReorder={onItemsReorder}>
            <Listbox.List>
              <Listbox.Item value="outer">
                Outer
                <Listbox.Root>
                  <Listbox.List>
                    <Listbox.Item value="inner">Inner</Listbox.Item>
                  </Listbox.List>
                </Listbox.Root>
              </Listbox.Item>
              <Listbox.Item value="other">Other</Listbox.Item>
            </Listbox.List>
          </Provider>
        </Listbox.Root>,
      );
      await keyDown(screen.getByRole('option', { name: 'Inner' }), {
        key: 'ArrowDown',
        altKey: true,
      });
      expect(onItemsReorder).not.toHaveBeenCalled();
    });
    it('restores focus and announces a move that remounts an item in another group', async () => {
      function Groups() {
        const [moved, setMoved] = React.useState(false);
        return (
          <Listbox.Root>
            <Provider onItemsReorder={() => setMoved(true)}>
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
            </Provider>
          </Listbox.Root>
        );
      }
      await render(<Groups />);
      const original = screen.getByRole('option', { name: 'a' });
      await keyDown(original, { key: 'ArrowDown', altKey: true });
      await waitFor(() => expect(screen.getByRole('option', { name: 'a' })).toHaveFocus());
      expect(screen.getByRole('option', { name: 'a' })).not.toBe(original);
      expect(screen.getByRole('status')).toHaveTextContent('Moved a to position 2 of 3.');
    });
    it('reconciles a delayed update confined to a child of the provider', async () => {
      let applyOrder: (() => void) | undefined;
      let updateItems: React.Dispatch<React.SetStateAction<string[]>>;
      function Items() {
        const [items, setItems] = React.useState(['a', 'b']);
        updateItems = setItems;
        return (
          <Listbox.List>
            {items.map((value) => (
              <Listbox.Item key={value} value={value}>
                {value}
              </Listbox.Item>
            ))}
          </Listbox.List>
        );
      }
      await render(
        <Listbox.Root>
          <Provider
            onItemsReorder={(items) => {
              applyOrder = () => updateItems(items);
            }}
          >
            <Items />
          </Provider>
        </Listbox.Root>,
      );
      await keyDown(screen.getByRole('option', { name: 'a' }), { key: 'ArrowDown', altKey: true });
      await flushRaf();
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
      await act(() => applyOrder!());
      await waitFor(() =>
        expect(screen.getByRole('status')).toHaveTextContent('Moved a to position 2 of 2.'),
      );
      expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
    });
  });
}
