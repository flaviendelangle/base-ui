import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { TreeGrid } from '..';

const { render } = createRenderer();

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const ITEMS: Item[] = [
  { id: '1', label: 'One' },
  { id: '2', label: 'Two' },
];

function row(itemId: string): HTMLElement {
  return screen.getByTestId(`item-${itemId}`);
}

describe('TreeGrid — controls nested in item content', () => {
  function TreeGridWithButtons(props: { onAction?: (() => void) | undefined }) {
    return (
      <TreeGrid.Root items={ITEMS} multiple>
        <TreeGrid.List>
          {(item: Item) => (
            <TreeGrid.Item itemId={item.id} data-testid={`item-${item.id}`}>
              <TreeGrid.ItemContent>
                {item.label}
                <button type="button" data-testid={`action-${item.id}`} onClick={props.onAction}>
                  Actions
                </button>
              </TreeGrid.ItemContent>
            </TreeGrid.Item>
          )}
        </TreeGrid.List>
      </TreeGrid.Root>
    );
  }

  it('leaves Space to a nested button instead of toggling the row', async () => {
    await render(<TreeGridWithButtons />);

    const button = screen.getByTestId('action-1');
    act(() => {
      row('1').focus();
      button.focus();
    });

    const event = fireEvent.keyDown(button, { key: ' ' });

    // Not `preventDefault`ed, so the browser still activates the button…
    expect(event).toBe(true);
    // …and the row's selection is untouched.
    expect(row('1')).toHaveAttribute('aria-selected', 'false');
  });

  it('leaves click activation to a nested button', async () => {
    const onAction = vi.fn();
    await render(<TreeGridWithButtons onAction={onAction} />);

    fireEvent.click(screen.getByTestId('action-1'));

    expect(onAction).toHaveBeenCalledOnce();
    expect(row('1')).toHaveAttribute('aria-selected', 'false');
  });

  it('does not expand a row when clicking a nested button', async () => {
    await render(
      <TreeGrid.Root
        items={[{ id: 'parent', label: 'Parent', children: [{ id: 'child', label: 'Child' }] }]}
        expandOnClick
      >
        <TreeGrid.List>
          {(item: Item) => (
            <TreeGrid.Item itemId={item.id} data-testid={`item-${item.id}`}>
              <TreeGrid.ItemContent>
                {item.label}
                <button type="button" data-testid={`action-${item.id}`}>
                  Actions
                </button>
              </TreeGrid.ItemContent>
            </TreeGrid.Item>
          )}
        </TreeGrid.List>
      </TreeGrid.Root>,
    );

    fireEvent.click(screen.getByTestId('action-parent'));

    expect(row('parent')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('item-child')).toBeNull();
  });

  it('still handles keys pressed on the row itself', async () => {
    await render(<TreeGridWithButtons />);

    act(() => {
      row('1').focus();
    });
    fireEvent.keyDown(row('1'), { key: ' ' });

    expect(row('1')).toHaveAttribute('aria-selected', 'true');
  });
});
