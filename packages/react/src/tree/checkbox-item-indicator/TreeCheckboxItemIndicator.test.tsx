import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Tree } from '..';

const items: Tree.DefaultItem[] = [
  {
    id: 'a',
    label: 'A',
    children: [
      { id: 'a1', label: 'A1' },
      { id: 'a2', label: 'A2' },
    ],
  },
  { id: 'b', label: 'B' },
];

function Example(props: {
  items?: Tree.DefaultItem[] | Tree.ItemCollection<Tree.DefaultItem>;
  defaultSelectedItems?: Tree.ItemId[];
  indicator?: Omit<Tree.CheckboxItemIndicator.Props, 'data-testid'>;
}) {
  const { indicator, defaultSelectedItems } = props;
  return (
    <Tree.Root
      items={props.items ?? items}
      defaultExpandedItems={['a']}
      multiple
      defaultSelectedItems={defaultSelectedItems}
    >
      <Tree.List>
        {(item) => (
          <Tree.CheckboxItem itemId={item.id}>
            <Tree.CheckboxItemIndicator data-testid={`indicator-${item.id}`} {...indicator} />
            <span data-testid={`label-${item.id}`}>{item.label}</span>
          </Tree.CheckboxItem>
        )}
      </Tree.List>
    </Tree.Root>
  );
}

describe('<Tree.CheckboxItemIndicator />', () => {
  const { render } = createRenderer();

  it('renders only while its item is selected', async () => {
    const { user } = await render(<Example />);
    expect(screen.queryByTestId('indicator-b')).toBe(null);

    await user.click(screen.getByTestId('label-b'));
    expect(screen.getByTestId('indicator-b')).toBeInTheDocument();

    await user.click(screen.getByTestId('label-b'));
    expect(screen.queryByTestId('indicator-b')).toBe(null);
  });

  it('renders while its item is indeterminate', async () => {
    await render(<Example defaultSelectedItems={['a1']} />);
    expect(screen.getByTestId('indicator-a')).toHaveAttribute('data-indeterminate');
  });

  it('stays rendered while its item is unselected with keepMounted', async () => {
    await render(<Example indicator={{ keepMounted: true }} />);
    expect(screen.getByTestId('indicator-b')).toHaveAttribute('data-unchecked');
  });

  it('marks a selected item data-checked, and neither checked nor unchecked while indeterminate', async () => {
    await render(<Example defaultSelectedItems={['a1']} />);
    expect(screen.getByTestId('indicator-a1')).toHaveAttribute('data-checked');
    expect(screen.getByTestId('indicator-a1')).not.toHaveAttribute('data-unchecked');
    expect(screen.getByTestId('indicator-a')).not.toHaveAttribute('data-checked');
    expect(screen.getByTestId('indicator-a')).not.toHaveAttribute('data-unchecked');
  });

  it('marks an item that cannot be selected data-disabled', async () => {
    await render(
      <Example
        items={Tree.createItems(items, {
          getId: (item) => item.id,
          getLabel: (item) => item.label ?? String(item.id),
          getChildren: (item) => item.children,
          isSelectionDisabled: (item) => item.id === 'b',
        })}
        indicator={{ keepMounted: true }}
      />,
    );
    expect(screen.getByTestId('indicator-b')).toHaveAttribute('data-disabled');
    expect(screen.getByTestId('indicator-a1')).not.toHaveAttribute('data-disabled');
  });

  it('is hidden from assistive technology', async () => {
    await render(<Example indicator={{ keepMounted: true }} />);
    expect(screen.getByTestId('indicator-b')).toHaveAttribute('aria-hidden', 'true');
  });

  it('throws outside a Tree.CheckboxItem', async () => {
    await expect(
      render(
        <Tree.Root items={items}>
          <Tree.List>
            {(item) => (
              <Tree.Item itemId={item.id}>
                <Tree.CheckboxItemIndicator keepMounted />
              </Tree.Item>
            )}
          </Tree.List>
        </Tree.Root>,
      ),
    ).rejects.toThrow(/<Tree\.CheckboxItemIndicator> reads its state from <Tree\.CheckboxItem>/);
  });
});
