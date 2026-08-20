import * as React from 'react';
import { expect, vi } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer, isJSDOM } from '#test-utils';
import { Listbox } from '@base-ui/react/listbox';
import { cancel, lift, setupDragEngineTests } from '../../../test/dnd';

setupDragEngineTests();

interface Item {
  id: string;
  label: string;
}

const ITEMS: Item[] = [
  { id: 'a', label: 'Item A' },
  { id: 'b', label: 'Item B' },
  { id: 'c', label: 'Item C' },
];

function TestListbox(props: {
  children?: React.ReactNode | ((items: Item[]) => React.ReactNode);
  defaultValue?: Item[];
}) {
  return (
    <Listbox.Root selectionMode="multiple" defaultValue={props.defaultValue}>
      <Listbox.DragProvider onItemsReorder={vi.fn()}>
        <Listbox.List>
          {ITEMS.map((item) => (
            <Listbox.Item key={item.id} value={item} data-testid={`item-${item.id}`}>
              {item.label}
            </Listbox.Item>
          ))}
        </Listbox.List>
        <Listbox.DragPreview<Item> data-testid="drag-preview">{props.children}</Listbox.DragPreview>
      </Listbox.DragProvider>
    </Listbox.Root>
  );
}

describe.skipIf(!isJSDOM)('<Listbox.DragPreview />', () => {
  const { render } = createRenderer();

  it('renders the dragged item label by default', async () => {
    await render(<TestListbox />);

    await lift(screen.getByTestId('item-a'));

    expect(screen.getByTestId('drag-preview')).toHaveTextContent('Item A');
    expect(screen.getByTestId('drag-preview')).not.toHaveAttribute('data-multiple');
    cancel();
  });

  it('renders the localized count for several selected items', async () => {
    await render(<TestListbox defaultValue={[ITEMS[0], ITEMS[2]]} />);

    await lift(screen.getByTestId('item-c'));

    expect(screen.getByTestId('drag-preview')).toHaveTextContent('2 items');
    expect(screen.getByTestId('drag-preview')).toHaveAttribute('data-multiple');
    cancel();
  });

  it('passes dragged values to function children in list order', async () => {
    const children = vi.fn((items: Item[]) => items.map((item) => item.label).join(' + '));
    await render(<TestListbox defaultValue={[ITEMS[2], ITEMS[0]]}>{children}</TestListbox>);

    await lift(screen.getByTestId('item-c'));

    expect(screen.getByTestId('drag-preview')).toHaveTextContent('Item A + Item C');
    expect(children).toHaveBeenCalledWith([ITEMS[0], ITEMS[2]]);
    cancel();
  });
});
