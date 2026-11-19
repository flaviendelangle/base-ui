import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { act, screen } from '@mui/internal-test-utils';
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

type ExampleProps = {
  checkboxSelectionPropagation?: Tree.CheckboxSelectionPropagation;
  plainItems?: string[];
} & (
  | { multiple?: false; defaultSelectedItems?: Tree.ItemId }
  | { multiple: true | 'opt-in'; defaultSelectedItems?: Tree.ItemId[] }
);

/** Renders every item as a `Tree.CheckboxItem`, except the ids in `plainItems`. */
function Example(props: ExampleProps) {
  const { plainItems = [], ...rootProps } = props;
  return (
    <Tree.Root items={items} defaultExpandedItems={['a']} {...rootProps}>
      <Tree.List>
        {(item) => {
          const content = (
            <React.Fragment>
              <Tree.ItemIndicator keepMounted data-testid={`expansion-${item.id}`} />
              <span data-testid={`label-${item.id}`}>{item.label}</span>
            </React.Fragment>
          );
          return plainItems.includes(item.id) ? (
            <Tree.Item itemId={item.id}>{content}</Tree.Item>
          ) : (
            <Tree.CheckboxItem itemId={item.id}>{content}</Tree.CheckboxItem>
          );
        }}
      </Tree.List>
    </Tree.Root>
  );
}

function getItem(name: string) {
  return screen.getByRole('treeitem', { name });
}

describe('<Tree.CheckboxItem />', () => {
  const { render } = createRenderer();

  it('renders a tree item that exposes its selection with aria-checked, not aria-selected', async () => {
    const { user } = await render(<Example multiple />);
    expect(getItem('B')).toHaveAttribute('aria-checked', 'false');

    await user.click(screen.getByTestId('label-b'));
    expect(getItem('B')).toHaveAttribute('aria-checked', 'true');
    expect(getItem('B')).not.toHaveAttribute('aria-selected');
  });

  describe('data attributes', () => {
    it('marks a selected item data-checked and an unselected one data-unchecked', async () => {
      await render(<Example multiple defaultSelectedItems={['b']} />);
      expect(getItem('B')).toHaveAttribute('data-checked');
      expect(getItem('B')).not.toHaveAttribute('data-unchecked');
      expect(getItem('A1')).toHaveAttribute('data-unchecked');
      expect(getItem('A1')).not.toHaveAttribute('data-checked');
    });

    it('marks a parent with a selected descendant data-indeterminate and aria-checked="mixed", and neither checked nor unchecked', async () => {
      await render(<Example multiple defaultSelectedItems={['a1']} />);
      expect(getItem('A')).toHaveAttribute('data-indeterminate');
      expect(getItem('A')).toHaveAttribute('aria-checked', 'mixed');
      expect(getItem('A')).not.toHaveAttribute('data-checked');
      expect(getItem('A')).not.toHaveAttribute('data-unchecked');
      expect(getItem('B')).not.toHaveAttribute('data-indeterminate');
    });

    it('marks a parent data-indeterminate while only some descendants are selected with checkboxSelectionPropagation.parents', async () => {
      const { user } = await render(
        <Example multiple checkboxSelectionPropagation={{ parents: true }} />,
      );
      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A')).toHaveAttribute('data-indeterminate');

      await user.click(screen.getByTestId('label-a2'));
      expect(getItem('A')).toHaveAttribute('data-checked');
      expect(getItem('A')).not.toHaveAttribute('data-indeterminate');
    });

    it('sets aria-checked to true on a parent that shows as checked because all its descendants are selected', async () => {
      await render(
        <Example
          multiple
          checkboxSelectionPropagation={{ parents: true }}
          defaultSelectedItems={['a1', 'a2']}
        />,
      );
      expect(getItem('A')).toHaveAttribute('data-checked');
      expect(getItem('A')).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('press', () => {
    it('selects the descendants of the item with it, with checkboxSelectionPropagation.descendants', async () => {
      const { user } = await render(
        <Example multiple checkboxSelectionPropagation={{ descendants: true }} />,
      );
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');

      await user.click(screen.getByTestId('label-a'));
      expect(getItem('A')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('A2')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not propagate a press on a plain Tree.Item, with checkboxSelectionPropagation.descendants', async () => {
      const { user } = await render(
        <Example
          multiple
          checkboxSelectionPropagation={{ descendants: true }}
          plainItems={['a']}
        />,
      );

      await user.click(screen.getByTestId('label-a'));
      expect(getItem('A')).toHaveAttribute('aria-selected', 'true');
      // A press on a plain parent also collapses it, so expand it to see its children.
      await user.click(screen.getByTestId('expansion-a'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');
    });

    it('toggles the item and keeps the rest of the selection with multiple', async () => {
      const { user } = await render(<Example multiple defaultSelectedItems={['b']} />);

      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'true');

      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'true');
    });

    it('toggles the item, replacing the selection, in single selection', async () => {
      const { user } = await render(<Example defaultSelectedItems="b" />);

      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'false');

      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');
    });

    it('keeps a plain item selected on a second press in single selection', async () => {
      const { user } = await render(<Example plainItems={['a1']} />);

      await user.click(screen.getByTestId('label-a1'));
      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-selected', 'true');
    });

    it('toggles the item, keeping the rest of the selection, with multiple="opt-in"', async () => {
      const { user } = await render(<Example multiple="opt-in" defaultSelectedItems={['b']} />);

      await user.click(screen.getByTestId('label-a1'));
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not expand or collapse the item', async () => {
      const { user } = await render(<Example multiple />);
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');

      await user.click(screen.getByTestId('label-a'));
      expect(getItem('A')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    });

    it('expands and collapses the item from its Tree.ItemIndicator without selecting it', async () => {
      const { user } = await render(<Example multiple />);
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');

      await user.click(screen.getByTestId('expansion-a'));
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'false');
      expect(getItem('A')).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('keyboard', () => {
    it.each([
      { name: 'Space', key: '[Space]' },
      { name: 'Enter', key: '[Enter]' },
    ])('toggles the item with $name and keeps the rest of the selection', async ({ key }) => {
      const { user } = await render(<Example multiple defaultSelectedItems={['b']} />);
      act(() => getItem('A1').focus());

      await user.keyboard(key);
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'true');

      await user.keyboard(key);
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');
      expect(getItem('B')).toHaveAttribute('aria-checked', 'true');
    });

    it.each([
      { name: 'Space', key: '[Space]' },
      { name: 'Enter', key: '[Enter]' },
    ])(
      'toggles the item with $name and keeps the rest of the selection with multiple="opt-in"',
      async ({ key }) => {
        const { user } = await render(<Example multiple="opt-in" defaultSelectedItems={['b']} />);
        act(() => getItem('A1').focus());

        await user.keyboard(key);
        expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');
        expect(getItem('B')).toHaveAttribute('aria-checked', 'true');
      },
    );

    it.each([
      { name: 'Space', key: '[Space]' },
      { name: 'Enter', key: '[Enter]' },
    ])(
      'replaces the selection with $name on a plain item with multiple="opt-in"',
      async ({ key }) => {
        const { user } = await render(
          <Example multiple="opt-in" plainItems={['a1']} defaultSelectedItems={['b']} />,
        );
        act(() => getItem('A1').focus());

        await user.keyboard(key);
        expect(getItem('A1')).toHaveAttribute('aria-selected', 'true');
        expect(getItem('B')).toHaveAttribute('aria-checked', 'false');
      },
    );

    it('toggles the item with Enter in single selection', async () => {
      const { user } = await render(<Example />);
      act(() => getItem('A1').focus());

      await user.keyboard('[Enter]');
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'true');

      await user.keyboard('[Enter]');
      expect(getItem('A1')).toHaveAttribute('aria-checked', 'false');
    });

    it('keeps a plain item selected on a second Enter in single selection', async () => {
      const { user } = await render(<Example plainItems={['a1']} />);
      act(() => getItem('A1').focus());

      await user.keyboard('[Enter]');
      await user.keyboard('[Enter]');
      expect(getItem('A1')).toHaveAttribute('aria-selected', 'true');
    });

    it('does not expand or collapse the item with Enter', async () => {
      const { user } = await render(<Example multiple />);
      act(() => getItem('A').focus());

      await user.keyboard('[Enter]');
      expect(getItem('A')).toHaveAttribute('aria-checked', 'true');
      expect(getItem('A')).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
