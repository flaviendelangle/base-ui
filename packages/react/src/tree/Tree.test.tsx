import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { Tree } from '.';
import type { TreeDefaultItem } from './store/types';

const { render } = createRenderer();

interface Item {
  id: string;
  label: string;
  children?: Item[];
}

const ITEMS: Item[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume' },
      { id: 'cover-letter', label: 'Cover Letter' },
    ],
  },
  { id: 'music', label: 'Music' },
];

const FLAT_ITEMS: Item[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'music', label: 'Music' },
];

function CheckboxTree(props: {
  defaultExpandedItems?: string[] | undefined;
  onSelectedItemsChange?: Tree.Root.Props<Item, true>['onSelectedItemsChange'];
}) {
  return (
    <Tree.Root
      items={ITEMS}
      multiple
      defaultExpandedItems={props.defaultExpandedItems}
      onSelectedItemsChange={props.onSelectedItemsChange}
    >
      <Tree.List aria-label="Files">
        {(item: Item) => (
          <Tree.CheckboxItem itemId={item.id} data-testid={`row-${item.id}`}>
            <Tree.CheckboxItemIndicator keepMounted data-testid={`checkbox-${item.id}`} />
            <Tree.ItemIndicator keepMounted data-testid={`indicator-${item.id}`} />
            {item.label}
          </Tree.CheckboxItem>
        )}
      </Tree.List>
    </Tree.Root>
  );
}

describe('Tree', () => {
  it('uses tree and treeitem roles', async () => {
    await render(
      <Tree.Root items={ITEMS}>
        <Tree.List aria-label="Files">
          {(item: Item) => (
            <Tree.Item itemId={item.id}>
              <Tree.ItemIndicator keepMounted>▸</Tree.ItemIndicator>
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    expect(screen.getByRole('tree', { name: 'Files' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(2);
    // Named from its content; the indicator is hidden from assistive technology.
    expect(screen.getByRole('treeitem', { name: 'Documents' })).toBeInTheDocument();
    expect(screen.queryByRole('row')).toBeNull();
    expect(screen.queryByRole('gridcell')).toBeNull();
  });

  it('prevents native scrolling at vertical navigation boundaries', async () => {
    await render(
      <Tree.Root items={FLAT_ITEMS}>
        <Tree.List>
          {(item: Item) => (
            <Tree.Item itemId={item.id} data-testid={`row-${item.id}`}>
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const firstRow = screen.getByTestId('row-documents');
    const lastRow = screen.getByTestId('row-music');
    act(() => firstRow.focus());
    expect(fireEvent.keyDown(firstRow, { key: 'ArrowUp' })).toBe(false);

    act(() => lastRow.focus());
    expect(fireEvent.keyDown(lastRow, { key: 'ArrowDown' })).toBe(false);
    expect(lastRow).toHaveFocus();
  });

  it('ignores presses and focus in content a row portals elsewhere', async () => {
    const onItemHighlighted = vi.fn();
    await render(
      <Tree.Root items={FLAT_ITEMS} multiple onItemHighlighted={onItemHighlighted}>
        <Tree.List>
          {(item: Item) => (
            <Tree.Item itemId={item.id} data-testid={`row-${item.id}`}>
              {item.label}
              {item.id === 'documents'
                ? ReactDOM.createPortal(
                    <div data-testid="popup">
                      Details
                      <button type="button">Close</button>
                    </div>,
                    document.body,
                  )
                : null}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    fireEvent.click(screen.getByTestId('popup'));
    act(() => screen.getByRole('button', { name: 'Close' }).focus());

    expect(screen.getByTestId('row-documents')).toHaveAttribute('aria-selected', 'false');
    expect(onItemHighlighted).not.toHaveBeenCalled();
  });

  it('clears the pointer focus reason when a press does not move focus', async () => {
    vi.useFakeTimers();
    const onItemHighlighted = vi.fn();

    try {
      await render(
        <Tree.Root items={ITEMS} onItemHighlighted={onItemHighlighted}>
          <Tree.List>
            {(item: Item) => (
              <Tree.Item itemId={item.id} data-testid={`reason-row-${item.id}`}>
                <span data-testid={`label-${item.id}`}>{item.label}</span>
              </Tree.Item>
            )}
          </Tree.List>
        </Tree.Root>,
      );

      act(() => screen.getByTestId('reason-row-documents').focus());
      onItemHighlighted.mockClear();
      // `fireEvent` moves no focus, as when the press is prevented.
      fireEvent.mouseDown(screen.getByTestId('label-music'));
      act(() => vi.runAllTimers());
      act(() => screen.getByTestId('reason-row-music').focus());

      expect(onItemHighlighted).toHaveBeenLastCalledWith(
        'music',
        expect.objectContaining({ reason: 'none' }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('updates the item name when its label changes', async () => {
    function Example({ label }: { label: string }) {
      return (
        <Tree.Root items={[{ id: 'documents', label, children: [{ id: 'child', label: 'C' }] }]}>
          <Tree.List>
            {(item: Item) =>
              item.id === 'documents' ? (
                <Tree.Item itemId="documents">
                  <Tree.ItemIndicator keepMounted>▸</Tree.ItemIndicator>
                  {item.label}
                </Tree.Item>
              ) : null
            }
          </Tree.List>
        </Tree.Root>
      );
    }

    const { rerender } = await render(<Example label="Documents" />);
    expect(screen.getByRole('treeitem')).toHaveAccessibleName('Documents');

    await rerender(<Example label="Docs" />);
    expect(screen.getByRole('treeitem')).toHaveAccessibleName('Docs');
  });

  it('walks hierarchies deeper than the call stack', async () => {
    const depth = 20000;
    let root: Item = { id: `n${depth - 1}`, label: 'Needle' };
    for (let index = depth - 2; index >= 0; index -= 1) {
      root = { id: `n${index}`, label: `Node ${index}`, children: [root] };
    }
    const actionsRef = React.createRef<Tree.Root.Actions | null>();
    const onSelectedItemsChange = vi.fn();
    const renderTree = (filterValue: string) => (
      <Tree.FilterProvider value={filterValue}>
        <Tree.Root
          items={[root]}
          multiple
          actionsRef={actionsRef}
          onSelectedItemsChange={onSelectedItemsChange}
        >
          {null}
        </Tree.Root>
      </Tree.FilterProvider>
    );
    const view = await render(renderTree(''));

    act(() => actionsRef.current!.setItemSelection('n0', true));
    expect(onSelectedItemsChange.mock.calls.at(-1)![0]).toHaveLength(depth);

    await view.rerender(renderTree('needle'));
    expect(actionsRef.current!.isItemExpanded('n0')).toBe(true);
    expect(actionsRef.current!.isItemExpanded(`n${depth - 2}`)).toBe(true);
  });
});

const renderSimpleItem = (item: TreeDefaultItem) => (
  <Tree.Item itemId={item.id}>{item.label}</Tree.Item>
);

describe('nested tree ownership', () => {
  it('isolates a nested tree row click from the enclosing row', async () => {
    const outerChange = vi.fn();
    await render(
      <Tree.Root items={[{ id: 'outer', label: 'outer' }]} onSelectedItemsChange={outerChange}>
        <Tree.List>
          {() => (
            <Tree.Item itemId="outer">
              outer
              <Tree.Root items={[{ id: 'inner', label: 'inner' }]}>
                <Tree.List>{renderSimpleItem}</Tree.List>
              </Tree.Root>
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );
    fireEvent.click(screen.getByText('inner'));
    expect(outerChange).not.toHaveBeenCalled();
  });
});

describe('Tree.CheckboxItem', () => {
  it('toggles its selection when pressed, keeping the rest', async () => {
    const onSelectedItemsChange = vi.fn();
    const { user } = await render(
      <Tree.Root items={FLAT_ITEMS} multiple onSelectedItemsChange={onSelectedItemsChange}>
        <Tree.List>
          {(item: Item) => (
            <Tree.CheckboxItem itemId={item.id} data-testid={`row-${item.id}`}>
              {item.label}
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const music = screen.getByTestId('row-music');
    const documents = screen.getByTestId('row-documents');
    expect(music).toHaveAttribute('aria-selected', 'false');
    expect(music).toHaveAttribute('data-unchecked');

    await user.click(music);
    expect(music).toHaveAttribute('aria-selected', 'true');
    expect(music).toHaveAttribute('data-checked');

    await user.click(documents);
    expect(new Set(onSelectedItemsChange.mock.lastCall?.[0])).toEqual(
      new Set(['music', 'documents']),
    );

    await user.click(music);
    expect(music).toHaveAttribute('aria-selected', 'false');
    expect(onSelectedItemsChange.mock.lastCall?.[0]).toEqual(['documents']);
  });

  it('does not expand or collapse when pressed', async () => {
    const onExpandedItemsChange = vi.fn();
    const { user } = await render(
      <Tree.Root items={ITEMS} multiple onExpandedItemsChange={onExpandedItemsChange}>
        <Tree.List>
          {(item: Item) => (
            <Tree.CheckboxItem itemId={item.id} data-testid={`row-${item.id}`}>
              {item.label}
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const documents = screen.getByTestId('row-documents');
    await user.click(documents);

    expect(documents).toHaveAttribute('aria-selected', 'true');
    expect(documents).toHaveAttribute('aria-expanded', 'false');
    expect(onExpandedItemsChange).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'single', multiple: false },
    { name: 'opt-in', multiple: 'opt-in' },
  ] as const)('toggles with Space and Enter in $name selection mode', async ({ multiple }) => {
    const onSelectedItemsChange = vi.fn();
    const { user } = await render(
      <Tree.Root
        items={FLAT_ITEMS}
        multiple={multiple}
        onSelectedItemsChange={onSelectedItemsChange}
      >
        <Tree.List>
          {(item: Item) => (
            <Tree.CheckboxItem itemId={item.id} data-testid={`row-${item.id}`}>
              {item.label}
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const documents = screen.getByTestId('row-documents');
    act(() => documents.focus());

    await user.keyboard(' ');
    expect(documents).toHaveAttribute('aria-selected', 'true');

    // A plain item would stay selected here, as Space and Enter select it.
    await user.keyboard(' ');
    expect(documents).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{Enter}');
    expect(documents).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    expect(documents).toHaveAttribute('aria-selected', 'false');
    expect(onSelectedItemsChange).toHaveBeenCalledTimes(4);
  });

  it('marks a parent indeterminate while only some of its descendants are selected', async () => {
    const { user } = await render(<CheckboxTree defaultExpandedItems={['documents']} />);

    const parent = screen.getByTestId('row-documents');
    const child = screen.getByTestId('row-resume');
    expect(parent).toHaveAttribute('data-unchecked');

    await user.click(child);

    expect(child).toHaveAttribute('data-checked');
    expect(parent).toHaveAttribute('data-indeterminate');
    expect(parent).not.toHaveAttribute('data-checked');
    expect(parent).not.toHaveAttribute('data-unchecked');
    expect(screen.getByTestId('checkbox-documents')).toHaveAttribute('data-indeterminate');
    // Assistive technology hears the selection of the item, not a separate checkbox.
    expect(parent).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByRole('checkbox')).toBeNull();

    await user.click(parent);

    expect(parent).toHaveAttribute('data-checked');
    expect(child).toHaveAttribute('data-checked');
  });

  it('ignores presses when its selection is unavailable', async () => {
    const onSelectedItemsChange = vi.fn();
    const selectionLockedItems = Tree.createItems([{ id: 'locked', label: 'Locked' }], {
      getId: (item) => item.id,
      getLabel: (item) => item.label,
      isSelectionDisabled: () => true,
    });

    const { user, rerender } = await render(
      <Tree.Root
        items={selectionLockedItems}
        multiple
        onSelectedItemsChange={onSelectedItemsChange}
      >
        <Tree.List>
          {(item) => (
            <Tree.CheckboxItem itemId={item.id} data-testid="row">
              <Tree.CheckboxItemIndicator keepMounted data-testid="checkbox" />
              {item.label}
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    expect(screen.getByTestId('checkbox')).toHaveAttribute('data-disabled');
    await user.click(screen.getByTestId('row'));
    expect(onSelectedItemsChange).not.toHaveBeenCalled();

    await rerender(
      <Tree.Root items={[{ id: 'music', label: 'Music' }]} multiple disabled>
        <Tree.List>
          {(item: Item) => (
            <Tree.CheckboxItem itemId={item.id}>
              <Tree.CheckboxItemIndicator keepMounted data-testid="checkbox" />
              {item.label}
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );
    expect(screen.getByTestId('checkbox')).toHaveAttribute('data-disabled');
  });

  it('passes its selection state to the state callbacks of its parts', async () => {
    const itemStates: Tree.CheckboxItem.State[] = [];
    const indicatorStates: Tree.CheckboxItemIndicator.State[] = [];
    await render(
      <Tree.Root items={[{ id: 'a', label: 'A' }]} multiple defaultSelectedItems={['a']}>
        <Tree.List>
          {(item) => (
            <Tree.CheckboxItem
              itemId={item.id}
              className={(state) => {
                itemStates.push(state);
                return undefined;
              }}
            >
              <Tree.CheckboxItemIndicator
                className={(state) => {
                  indicatorStates.push(state);
                  return undefined;
                }}
              />
            </Tree.CheckboxItem>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    expect(itemStates.at(-1)).toMatchObject({ checked: true, indeterminate: false });
    expect(indicatorStates.at(-1)).toEqual({
      checked: true,
      indeterminate: false,
      disabled: false,
      transitionStatus: undefined,
    });
  });
});

describe('checkbox keyboard selection', () => {
  const branch = ['documents', 'resume', 'cover-letter', 'music'];
  const cases = [
    { descendants: true, initial: ['music'], first: branch, second: ['music'] },
    { descendants: false, initial: ['music'], first: ['documents', 'music'], second: ['music'] },
    {
      descendants: true,
      initial: ['resume', 'cover-letter', 'music'],
      first: ['music'],
      second: branch,
    },
    { descendants: true, initial: ['resume', 'music'], first: branch, second: ['music'] },
  ];
  it.each(cases)(
    'uses checkbox propagation for Space (descendants: $descendants, initial: $initial)',
    async ({ descendants, initial, first, second }) => {
      const onSelectedItemsChange = vi.fn();
      const { user } = await render(
        <Tree.Root
          items={ITEMS}
          multiple
          defaultSelectedItems={initial}
          checkboxSelectionPropagation={{ parents: true, descendants }}
          onSelectedItemsChange={onSelectedItemsChange}
        >
          <Tree.List>
            {(item) => (
              <Tree.CheckboxItem itemId={item.id}>
                <Tree.CheckboxItemIndicator />
                {item.label}
              </Tree.CheckboxItem>
            )}
          </Tree.List>
        </Tree.Root>,
      );
      const target = screen.getByRole('treeitem', { name: 'Documents' });
      act(() => target.focus());
      await user.keyboard(' ');
      expect(new Set(onSelectedItemsChange.mock.lastCall?.[0])).toEqual(new Set(first));
      expect(target).toHaveFocus();
      await user.keyboard(' ');
      expect(new Set(onSelectedItemsChange.mock.lastCall?.[0])).toEqual(new Set(second));
    },
  );
});

describe('Tree.ItemIndicator', () => {
  const NESTED: TreeDefaultItem[] = [
    { id: 'a', label: 'A', children: [{ id: 'a1', label: 'A1' }] },
    { id: 'b', label: 'B' },
  ];

  it('renders the indicator that matches the expansion state', async () => {
    const { user } = await render(
      <Tree.Root items={NESTED}>
        <Tree.List>
          {(item) => (
            <Tree.Item itemId={item.id} data-testid={`row-${item.id}`}>
              <Tree.ItemIndicator match="open" data-testid={`open-${item.id}`} />
              <Tree.ItemIndicator match="closed" data-testid={`closed-${item.id}`} />
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    expect(screen.queryByTestId('open-a')).toBeNull();
    expect(screen.getByTestId('closed-a')).toHaveAttribute('data-collapsed');

    await user.click(screen.getByTestId('row-a'));

    expect(screen.getByTestId('open-a')).toHaveAttribute('data-expanded');
    expect(screen.queryByTestId('closed-a')).toBeNull();
    // A leaf item can't expand, so it renders neither.
    expect(screen.queryByTestId('open-b')).toBeNull();
    expect(screen.queryByTestId('closed-b')).toBeNull();
  });

  it('matches the open state by default', async () => {
    await render(
      <Tree.Root items={NESTED} defaultExpandedItems={['a']}>
        <Tree.List>
          {(item) => (
            <Tree.Item itemId={item.id}>
              {item.id === 'a' ? <Tree.ItemIndicator data-testid="indicator" /> : null}
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    expect(screen.getByTestId('indicator')).toHaveAttribute('data-expanded');
  });

  it('stays mounted in both states with keepMounted', async () => {
    const { user } = await render(
      <Tree.Root items={NESTED}>
        <Tree.List>
          {(item) => (
            <Tree.Item itemId={item.id} data-testid={`row-${item.id}`}>
              <Tree.ItemIndicator keepMounted data-testid={`indicator-${item.id}`} />
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const indicator = screen.getByTestId('indicator-a');
    expect(indicator).toHaveAttribute('data-collapsed');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');

    await user.click(screen.getByTestId('row-a'));

    expect(screen.getByTestId('indicator-a')).toBe(indicator);
    expect(indicator).toHaveAttribute('data-expanded');
    expect(indicator).not.toHaveAttribute('data-collapsed');
    expect(screen.queryByTestId('indicator-b')).toBeNull();
  });

  it('expands and collapses its item without selecting it when pressed', async () => {
    const onSelectedItemsChange = vi.fn();
    const { user } = await render(
      <Tree.Root items={NESTED} onSelectedItemsChange={onSelectedItemsChange}>
        <Tree.List>
          {(item) => (
            <Tree.Item itemId={item.id} data-testid={`row-${item.id}`}>
              <Tree.ItemIndicator keepMounted data-testid={`indicator-${item.id}`} />
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    const row = screen.getByTestId('row-a');
    await user.click(screen.getByTestId('indicator-a'));
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('treeitem', { name: 'A1' })).toBeVisible();

    await user.click(screen.getByTestId('indicator-a'));
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(row).toHaveAttribute('aria-selected', 'false');
    expect(onSelectedItemsChange).not.toHaveBeenCalled();
  });

  it('expands a checkbox item without toggling its selection when pressed', async () => {
    const onSelectedItemsChange = vi.fn();
    const { user } = await render(<CheckboxTree onSelectedItemsChange={onSelectedItemsChange} />);

    await user.click(screen.getByTestId('indicator-documents'));

    expect(screen.getByTestId('row-documents')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('row-documents')).toHaveAttribute('aria-selected', 'false');
    expect(onSelectedItemsChange).not.toHaveBeenCalled();
  });

  it('does not toggle a disabled item when pressed', async () => {
    const onExpandedItemsChange = vi.fn();
    const { user } = await render(
      <Tree.Root
        items={[{ id: 'a', label: 'A', disabled: true, children: [{ id: 'a1', label: 'A1' }] }]}
        onExpandedItemsChange={onExpandedItemsChange}
      >
        <Tree.List>
          {(item) => (
            <Tree.Item itemId={item.id}>
              <Tree.ItemIndicator keepMounted data-testid={`indicator-${item.id}`} />
              {item.label}
            </Tree.Item>
          )}
        </Tree.List>
      </Tree.Root>,
    );

    await user.click(screen.getByTestId('indicator-a'));
    expect(onExpandedItemsChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('treeitem', { name: 'A1' })).toBeNull();
  });
});
