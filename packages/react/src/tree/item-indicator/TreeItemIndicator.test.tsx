import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Tree } from '..';

const items: Tree.DefaultItem[] = [
  { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
  { id: 'b', label: 'B' },
];

function Example(props: {
  indicator?: Omit<Tree.ItemIndicator.Props, 'data-testid'>;
  root?: { items?: Tree.DefaultItem[]; defaultSelectedItems?: Tree.ItemId };
}) {
  const { indicator, root } = props;
  return (
    <Tree.Root items={root?.items ?? items} defaultSelectedItems={root?.defaultSelectedItems}>
      <Tree.List>
        {(item) => (
          <Tree.Item itemId={item.id}>
            <Tree.ItemIndicator data-testid={`indicator-${item.id}`} {...indicator} />
            <span data-testid={`label-${item.id}`}>{item.label}</span>
          </Tree.Item>
        )}
      </Tree.List>
    </Tree.Root>
  );
}

function getItem(name: string) {
  return screen.getByRole('treeitem', { name });
}

describe('<Tree.ItemIndicator />', () => {
  const { render } = createRenderer();

  it('renders only in items that can be expanded', async () => {
    await render(<Example indicator={{ keepMounted: true }} />);
    expect(screen.getByTestId('indicator-a')).toBeInTheDocument();
    expect(screen.queryByTestId('indicator-b')).toBe(null);
  });

  it('renders only while the item is expanded by default', async () => {
    const { user } = await render(<Example />);
    expect(screen.queryByTestId('indicator-a')).toBe(null);

    await user.click(screen.getByTestId('label-a'));
    expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('indicator-a')).toBeInTheDocument();
  });

  it('renders only while the item is collapsed with match="closed"', async () => {
    const { user } = await render(<Example indicator={{ match: 'closed' }} />);
    expect(screen.getByTestId('indicator-a')).toBeInTheDocument();

    await user.click(screen.getByTestId('label-a'));
    expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByTestId('indicator-a')).toBe(null);
  });

  it('renders in both states with keepMounted', async () => {
    const { user } = await render(<Example indicator={{ keepMounted: true }} />);
    expect(getItem('A')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('indicator-a')).toBeInTheDocument();

    await user.click(screen.getByTestId('label-a'));
    expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('indicator-a')).toBeInTheDocument();
  });

  it('marks the expansion state with data-expanded and data-collapsed', async () => {
    const { user } = await render(<Example indicator={{ keepMounted: true }} />);
    const indicator = screen.getByTestId('indicator-a');
    expect(indicator).toHaveAttribute('data-collapsed');
    expect(indicator).not.toHaveAttribute('data-expanded');

    await user.click(screen.getByTestId('label-a'));
    expect(indicator).toHaveAttribute('data-expanded');
    expect(indicator).not.toHaveAttribute('data-collapsed');
  });

  it('is hidden from assistive technology', async () => {
    await render(<Example indicator={{ keepMounted: true }} />);
    expect(screen.getByTestId('indicator-a')).toHaveAttribute('aria-hidden', 'true');
  });

  describe('press', () => {
    it('expands and collapses the item without selecting it', async () => {
      const { user } = await render(<Example indicator={{ keepMounted: true }} />);
      expect(getItem('A')).toHaveAttribute('aria-selected', 'false');

      await user.click(screen.getByTestId('indicator-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
      expect(getItem('A')).toHaveAttribute('aria-selected', 'false');

      await user.click(screen.getByTestId('indicator-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'false');
      expect(getItem('A')).toHaveAttribute('aria-selected', 'false');
    });

    it('keeps the selection of other items', async () => {
      const { user } = await render(
        <Example indicator={{ keepMounted: true }} root={{ defaultSelectedItems: 'b' }} />,
      );
      expect(getItem('B')).toHaveAttribute('aria-selected', 'true');

      await user.click(screen.getByTestId('indicator-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
      expect(getItem('B')).toHaveAttribute('aria-selected', 'true');
    });

    it('a press elsewhere on the item also selects it', async () => {
      const { user } = await render(<Example indicator={{ keepMounted: true }} />);

      await user.click(screen.getByTestId('label-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
      expect(getItem('A')).toHaveAttribute('aria-selected', 'true');
    });

    it('expands the item and its descendants with Alt', async () => {
      const { user } = await render(
        <Example
          indicator={{ keepMounted: true }}
          root={{
            items: [
              {
                id: 'a',
                label: 'A',
                children: [{ id: 'a1', label: 'A1', children: [{ id: 'a1x', label: 'A1X' }] }],
              },
            ],
          }}
        />,
      );
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'false');

      await user.keyboard('{Alt>}');
      await user.click(screen.getByTestId('indicator-a'));
      await user.keyboard('{/Alt}');
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
      expect(getItem('A1')).toHaveAttribute('aria-expanded', 'true');
      expect(getItem('A')).toHaveAttribute('aria-selected', 'false');
    });

    it('does not toggle the item back on the second click of a double-click', async () => {
      const { user } = await render(<Example indicator={{ keepMounted: true }} />);
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'false');

      await user.dblClick(screen.getByTestId('indicator-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
