import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { act, fireEvent, screen } from '@mui/internal-test-utils';
import { activeElement } from '@base-ui/utils/shadowDom';
import { ownerDocument } from '@base-ui/utils/owner';
import { createRenderer, isJSDOM } from '#test-utils';
import { TreeGrid } from '..';

const items: TreeGrid.DefaultItem[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      { id: 'invoices', label: 'Invoices', children: [{ id: 'q1', label: 'Invoice Q1.pdf' }] },
    ],
  },
  { id: 'notes', label: 'Notes.txt' },
];

function renderItem(item: TreeGrid.DefaultItem) {
  return (
    <TreeGrid.Item itemId={item.id}>
      <TreeGrid.ItemContent>
        <TreeGrid.ItemExpansionTrigger />
        {item.label}
      </TreeGrid.ItemContent>
    </TreeGrid.Item>
  );
}

function FilterableTreeGrid(
  props: TreeGrid.FilterProvider.Props & {
    root?: Partial<TreeGrid.Root.Props<TreeGrid.DefaultItem, undefined>>;
    items?: TreeGrid.DefaultItem[];
  },
) {
  const { root, items: treeItems = items, ...providerProps } = props;
  return (
    <TreeGrid.FilterProvider {...providerProps}>
      <TreeGrid.Root items={treeItems} {...root}>
        <TreeGrid.Input aria-label="Filter files" />
        <TreeGrid.Clear>Clear</TreeGrid.Clear>
        <TreeGrid.List aria-label="Files">{renderItem}</TreeGrid.List>
        <TreeGrid.Empty data-testid="empty">No results</TreeGrid.Empty>
      </TreeGrid.Root>
    </TreeGrid.FilterProvider>
  );
}

const rowIds = () => screen.queryAllByRole('row').map((row) => row.getAttribute('data-item-id'));
const getInput = () => screen.getByRole('searchbox', { name: 'Filter files' });

describe('TreeGrid filtering parts', () => {
  const { render } = createRenderer();

  it('exposes filterMatch state and data-filter-match on rows containing different controls', async () => {
    const matchItems = [
      { id: 'item', label: 'Match item' },
      { id: 'checkbox', label: 'Match checkbox' },
      { id: 'link', label: 'Match link' },
    ];

    await render(
      <TreeGrid.FilterProvider defaultValue="match">
        <TreeGrid.Root items={matchItems}>
          <TreeGrid.List>
            {(item) => {
              if (item.id === 'checkbox') {
                return (
                  <TreeGrid.Item
                    itemId={item.id}
                    className={(state) => (state.filterMatch ? 'exact-match' : undefined)}
                  >
                    <TreeGrid.ItemContent>
                      <TreeGrid.ItemCheckbox />
                      {item.label}
                    </TreeGrid.ItemContent>
                  </TreeGrid.Item>
                );
              }
              if (item.id === 'link') {
                return (
                  <TreeGrid.Item
                    itemId={item.id}
                    className={(state) => (state.filterMatch ? 'exact-match' : undefined)}
                  >
                    <TreeGrid.ItemContent>
                      <a href="#link">{item.label}</a>
                    </TreeGrid.ItemContent>
                  </TreeGrid.Item>
                );
              }
              return (
                <TreeGrid.Item
                  itemId={item.id}
                  className={(state) => (state.filterMatch ? 'exact-match' : undefined)}
                >
                  <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
                </TreeGrid.Item>
              );
            }}
          </TreeGrid.List>
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>,
    );

    for (const name of ['Match item', 'Match checkbox', 'Match link']) {
      const row = screen.getByRole('row', { name });
      expect(row).toHaveAttribute('data-filter-match');
      expect(row).toHaveClass('exact-match');
    }
  });

  it('shows TreeGrid.Empty when nothing matches, in every mode', async () => {
    const view = await render(<FilterableTreeGrid value="missing" />);
    expect(screen.getByTestId('empty')).toHaveTextContent('No results');
    expect(rowIds()).toEqual([]);

    await view.setProps({ mode: 'collapse-non-matches' });
    expect(rowIds()).toEqual(['documents', 'notes']);
    expect(screen.getByTestId('empty')).toHaveTextContent('No results');

    await view.setProps({ value: 'notes' });
    expect(screen.getByTestId('empty')).toBeEmptyDOMElement();
  });

  it('returns the same matchers for the same options', async () => {
    const matchers: TreeGrid.Filter[] = [];
    function Probe() {
      matchers.push(TreeGrid.useFilter({ locale: 'fr' }));
      return null;
    }
    await render(
      <React.Fragment>
        <Probe />
        <Probe />
      </React.Fragment>,
    );
    expect(matchers[1]).toBe(matchers[0]);
  });

  it('accepts a TreeGrid.useFilter matcher as the filter of custom items', async () => {
    interface Item {
      key: string;
      name: string;
      nodes?: Item[];
    }
    const customItems: Item[] = [
      {
        key: 'parent',
        name: 'Folder',
        nodes: [{ key: 'child', name: 'Résumé' }],
      },
      { key: 'other', name: 'Result' },
    ];
    const collection = TreeGrid.createItems(customItems, {
      getId: (item) => item.key,
      getLabel: (item) => item.name,
      getChildren: (item) => item.nodes,
    });

    function CustomTreeGrid() {
      const { startsWith } = TreeGrid.useFilter({ sensitivity: 'base' });
      return (
        <TreeGrid.FilterProvider<Item> defaultValue="res" filter={startsWith}>
          <TreeGrid.Root items={collection}>
            <TreeGrid.List<Item>>
              {(item) => (
                <TreeGrid.Item itemId={item.key}>
                  <TreeGrid.ItemContent>{item.name}</TreeGrid.ItemContent>
                </TreeGrid.Item>
              )}
            </TreeGrid.List>
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>
      );
    }

    await render(<CustomTreeGrid />);
    expect(screen.getAllByRole('row').map((row) => row.textContent)).toEqual([
      'Folder',
      'Résumé',
      'Result',
    ]);
  });

  it('matches on item fields other than the label', async () => {
    interface Item extends TreeGrid.DefaultItem {
      tags?: string[];
    }
    const taggedItems: Item[] = [
      { id: 'report', label: 'Report.pdf', tags: ['finance'] },
      { id: 'photo', label: 'Photo.jpg' },
    ];

    await render(
      <TreeGrid.FilterProvider<Item>
        defaultValue="finance"
        filter={(text, query, item) => text.includes(query) || !!item.tags?.includes(query)}
      >
        <TreeGrid.Root items={taggedItems}>
          <TreeGrid.List>{renderItem}</TreeGrid.List>
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>,
    );

    expect(rowIds()).toEqual(['report']);
  });

  it('projects external source items through custom collection IDs', async () => {
    interface Item {
      key: number;
      name: string;
      nodes?: Item[];
    }
    const sourceItems: Item[] = [
      {
        key: 1,
        name: 'Parent',
        nodes: [
          { key: 2, name: 'First match' },
          { key: 3, name: 'Second match' },
        ],
      },
    ];
    const collection = TreeGrid.createItems(sourceItems, {
      getId: (item) => item.key,
      getLabel: (item) => item.name,
      getChildren: (item) => item.nodes,
    });
    const filter = vi.fn(() => false);

    await render(
      <TreeGrid.FilterProvider
        filteredItems={[sourceItems[0].nodes![1]]}
        defaultValue="ignored"
        filter={filter}
      >
        <TreeGrid.Root items={collection}>
          <TreeGrid.List<Item>>
            {(item) => (
              <TreeGrid.Item itemId={item.key} data-source-name={item.name}>
                <TreeGrid.ItemContent>{item.name}</TreeGrid.ItemContent>
              </TreeGrid.Item>
            )}
          </TreeGrid.List>
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>,
    );

    expect(screen.getAllByRole('row').map((row) => row.getAttribute('data-source-name'))).toEqual([
      'Parent',
      'Second match',
    ]);
    expect(
      screen
        .getAllByRole('row')
        .filter((row) => row.hasAttribute('data-filter-match'))
        .map((row) => row.getAttribute('data-source-name')),
    ).toEqual(['Second match']);
    expect(filter).not.toHaveBeenCalled();
  });

  it('applies new items and their external matches in one update', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      function App(props: { step: number }) {
        const treeItems = [{ id: `item-${props.step}`, label: `Item ${props.step}` }];
        return (
          <TreeGrid.FilterProvider filteredItems={treeItems}>
            <TreeGrid.Root items={treeItems}>
              <TreeGrid.List>{renderItem}</TreeGrid.List>
            </TreeGrid.Root>
          </TreeGrid.FilterProvider>
        );
      }

      const view = await render(<App step={0} />);
      await view.setProps({ step: 1 });

      expect(rowIds()).toEqual(['item-1']);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it('preserves focus on an external filter input', async () => {
    function App(props: { value: string }) {
      return (
        <React.Fragment>
          <input aria-label="Filter" />
          <TreeGrid.FilterProvider value={props.value}>
            <TreeGrid.Root
              items={[
                { id: 'one', label: 'One' },
                { id: 'two', label: 'Two' },
              ]}
            >
              <TreeGrid.List>{renderItem}</TreeGrid.List>
            </TreeGrid.Root>
          </TreeGrid.FilterProvider>
        </React.Fragment>
      );
    }

    const view = await render(<App value="" />);
    const input = screen.getByRole('textbox', { name: 'Filter' });
    // Leave the tree from a row that the query below hides.
    act(() => screen.getByRole('row', { name: 'One' }).focus());
    act(() => input.focus());
    await view.setProps({ value: 'two' });
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });

    expect(activeElement(ownerDocument(input))).toBe(input);
  });

  it('keeps a nested tree out of the filter of the tree it renders in', async () => {
    await render(
      <TreeGrid.FilterProvider defaultValue="outer">
        <TreeGrid.Root items={[{ id: 'outer', label: 'Outer' }]}>
          <TreeGrid.List>
            {() => (
              <TreeGrid.Item itemId="outer">
                <TreeGrid.ItemContent>
                  Outer
                  <TreeGrid.Root items={[{ id: 'inner', label: 'Inner' }]}>
                    <TreeGrid.List aria-label="Nested">{renderItem}</TreeGrid.List>
                  </TreeGrid.Root>
                </TreeGrid.ItemContent>
              </TreeGrid.Item>
            )}
          </TreeGrid.List>
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>,
    );

    expect(screen.getByRole('row', { name: 'Inner' })).not.toHaveAttribute('data-filter-match');
    expect(screen.getByRole('row', { name: 'Outer' })).toHaveAttribute('data-filter-match');
  });

  describe('TreeGrid.Input', () => {
    it('renders a searchbox that controls the tree', async () => {
      await render(<FilterableTreeGrid />);
      const input = getInput();
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('autocomplete', 'off');
      const list = screen.getByRole('treegrid', { name: 'Files' });
      expect(list.id).not.toBe('');
      expect(input).toHaveAttribute('aria-controls', list.id);
    });

    it('controls the id that the render element gives TreeGrid.List', async () => {
      await render(
        <TreeGrid.FilterProvider>
          <TreeGrid.Root items={items}>
            <TreeGrid.Input aria-label="Filter files" />
            <TreeGrid.List render={<div id="file-list" />}>{renderItem}</TreeGrid.List>
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>,
      );
      expect(screen.getByRole('treegrid')).toHaveAttribute('id', 'file-list');
      expect(getInput()).toHaveAttribute('aria-controls', 'file-list');
    });

    it('filters the tree as the user types and reports the reason', async () => {
      const onValueChange = vi.fn();
      await render(<FilterableTreeGrid onValueChange={onValueChange} />);

      fireEvent.change(getInput(), { target: { value: 'q1' } });
      expect(getInput()).toHaveValue('q1');
      expect(rowIds()).toEqual(['documents', 'invoices', 'q1']);
      expect(onValueChange.mock.calls.at(-1)![0]).toBe('q1');
      expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('input-change');

      fireEvent.change(getInput(), { target: { value: '' } });
      expect(rowIds()).toEqual(['documents', 'notes']);
      expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('input-clear');
    });

    it('keeps a controlled query until the consumer updates it', async () => {
      const onValueChange = vi.fn();
      await render(<FilterableTreeGrid value="" onValueChange={onValueChange} />);

      fireEvent.change(getInput(), { target: { value: 'notes' } });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(getInput()).toHaveValue('');
      expect(rowIds()).toEqual(['documents', 'notes']);
    });

    it('keeps the query when the change is canceled', async () => {
      await render(
        <FilterableTreeGrid
          defaultValue="notes"
          onValueChange={(_, eventDetails) => eventDetails.cancel()}
        />,
      );

      fireEvent.change(getInput(), { target: { value: 'resume' } });
      expect(getInput()).toHaveValue('notes');
      expect(rowIds()).toEqual(['notes']);
    });

    it('clears the query on Escape and lets an empty query pass Escape through', async () => {
      const onValueChange = vi.fn();
      const onParentKeyDown = vi.fn();
      await render(
        <div onKeyDown={onParentKeyDown}>
          <FilterableTreeGrid defaultValue="notes" onValueChange={onValueChange} />
        </div>,
      );

      act(() => getInput().focus());
      fireEvent.keyDown(getInput(), { key: 'Escape' });
      expect(getInput()).toHaveValue('');
      expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('escape-key');
      expect(onParentKeyDown).not.toHaveBeenCalled();

      fireEvent.keyDown(getInput(), { key: 'Escape' });
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onParentKeyDown).toHaveBeenCalledTimes(1);
    });

    it('preserves a read-only query on Escape', async () => {
      const onValueChange = vi.fn();
      await render(
        <TreeGrid.FilterProvider defaultValue="notes" onValueChange={onValueChange}>
          <TreeGrid.Root items={items}>
            <TreeGrid.Input aria-label="Filter files" readOnly />
            <TreeGrid.List>{renderItem}</TreeGrid.List>
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>,
      );

      act(() => getInput().focus());
      fireEvent.keyDown(getInput(), { key: 'Escape' });
      expect(getInput()).toHaveValue('notes');
      expect(rowIds()).toEqual(['notes']);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('moves focus to the first match with ArrowDown or Enter, and to the last with ArrowUp', async () => {
      await render(<FilterableTreeGrid defaultValue="pdf" mode="expand-matches" />);
      expect(rowIds()).toEqual(['documents', 'resume', 'invoices', 'q1', 'notes']);
      act(() => getInput().focus());

      fireEvent.keyDown(getInput(), { key: 'ArrowDown' });
      expect(screen.getByRole('row', { name: 'Resume.pdf' })).toHaveFocus();

      act(() => getInput().focus());
      fireEvent.keyDown(getInput(), { key: 'ArrowUp' });
      expect(screen.getByRole('row', { name: 'Invoice Q1.pdf' })).toHaveFocus();

      act(() => getInput().focus());
      fireEvent.keyDown(getInput(), { key: 'Enter' });
      expect(screen.getByRole('row', { name: 'Resume.pdf' })).toHaveFocus();
    });

    it('skips disabled matches when moving focus from the input', async () => {
      await render(
        <FilterableTreeGrid
          defaultValue="match"
          items={[
            { id: 'first', label: 'Match first', disabled: true },
            { id: 'middle', label: 'Match middle' },
            { id: 'last', label: 'Match last', disabled: true },
          ]}
          root={{ itemFocusableWhenDisabled: false }}
        />,
      );
      act(() => getInput().focus());

      fireEvent.keyDown(getInput(), { key: 'ArrowDown' });
      expect(screen.getByRole('row', { name: 'Match middle' })).toHaveFocus();

      act(() => getInput().focus());
      fireEvent.keyDown(getInput(), { key: 'ArrowUp' });
      expect(screen.getByRole('row', { name: 'Match middle' })).toHaveFocus();
    });

    it('moves focus to the tab stop without a query and leaves Enter to the input', async () => {
      await render(<FilterableTreeGrid root={{ defaultSelectedItems: 'notes' }} />);
      act(() => getInput().focus());

      const enter = fireEvent.keyDown(getInput(), { key: 'Enter' });
      expect(enter).toBe(true);
      expect(getInput()).toHaveFocus();

      fireEvent.keyDown(getInput(), { key: 'ArrowDown' });
      expect(screen.getByRole('row', { name: 'Notes.txt' })).toHaveFocus();
    });

    it('leaves modified arrows to the input', async () => {
      await render(<FilterableTreeGrid defaultValue="notes" />);
      act(() => getInput().focus());

      fireEvent.keyDown(getInput(), { key: 'ArrowDown', shiftKey: true });
      expect(getInput()).toHaveFocus();
    });

    it('leaves the Enter that confirms an IME candidate to the input', async () => {
      await render(<FilterableTreeGrid defaultValue="notes" />);
      act(() => getInput().focus());

      fireEvent.keyDown(getInput(), { key: 'Enter', keyCode: 229, which: 229 });
      expect(getInput()).toHaveFocus();
    });

    it('filters once the IME composition ends', async () => {
      const onValueChange = vi.fn();
      await render(<FilterableTreeGrid onValueChange={onValueChange} />);
      const input = getInput();

      fireEvent.compositionStart(input);
      fireEvent.change(input, { target: { value: 'no' } });
      expect(input).toHaveValue('no');
      expect(onValueChange).not.toHaveBeenCalled();
      expect(rowIds()).toEqual(['documents', 'notes']);

      fireEvent.change(input, { target: { value: 'notes' } });
      fireEvent.compositionEnd(input);
      expect(onValueChange).toHaveBeenCalledTimes(1);
      expect(onValueChange.mock.calls[0][0]).toBe('notes');
      expect(rowIds()).toEqual(['notes']);
    });

    it('moves focus back to the input when typing on a row', async () => {
      await render(<FilterableTreeGrid defaultValue="notes" />);
      const row = screen.getByRole('row', { name: 'Notes.txt' });
      act(() => row.focus());

      fireEvent.keyDown(row, { key: 'x' });
      expect(getInput()).toHaveFocus();
    });

    // jsdom has no default action that types the key into the newly focused input.
    it.skipIf(isJSDOM)('types a key pressed on a row into the input', async () => {
      const { userEvent: browserUser } = await import('vitest/browser');
      await render(<FilterableTreeGrid defaultValue="no" />);
      const row = screen.getByRole('row', { name: 'Notes.txt' });
      act(() => row.focus());

      await act(async () => {
        await browserUser.keyboard('t');
      });
      expect(getInput()).toHaveFocus();
      expect(getInput()).toHaveValue('not');
      expect(rowIds()).toEqual(['notes']);
    });

    it('is disabled with the tree', async () => {
      await render(<FilterableTreeGrid defaultValue="notes" root={{ disabled: true }} />);
      expect(getInput()).toBeDisabled();
      expect(getInput()).toHaveAttribute('data-disabled');
    });

    it('throws outside a TreeGrid.FilterProvider', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await expect(
          render(
            <TreeGrid.Root items={items}>
              <TreeGrid.Input />
            </TreeGrid.Root>,
          ),
        ).rejects.toThrow(
          /<TreeGrid\.Input> must be placed in a tree wrapped in <TreeGrid\.FilterProvider>/,
        );
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe('TreeGrid.Clear', () => {
    it('renders only while the query is not empty', async () => {
      const view = await render(<FilterableTreeGrid value="" />);
      expect(screen.queryByText('Clear')).toBeNull();

      await view.setProps({ value: 'notes' });
      const clear = screen.getByRole('button', { name: 'Clear filter' });
      expect(clear.tagName).toBe('BUTTON');
      expect(clear).toHaveAttribute('tabindex', '-1');
      expect(clear).not.toHaveAttribute('aria-hidden');
    });

    it('clears the query and returns focus to the input', async () => {
      const onValueChange = vi.fn();
      await render(<FilterableTreeGrid defaultValue="notes" onValueChange={onValueChange} />);

      const mouseDown = fireEvent.mouseDown(screen.getByText('Clear'));
      expect(mouseDown).toBe(false);
      fireEvent.click(screen.getByText('Clear'));

      expect(onValueChange.mock.calls.at(-1)![0]).toBe('');
      expect(onValueChange.mock.calls.at(-1)![1].reason).toBe('clear-press');
      expect(getInput()).toHaveValue('');
      expect(getInput()).toHaveFocus();
      expect(rowIds()).toEqual(['documents', 'notes']);
      expect(screen.queryByText('Clear')).toBeNull();
    });

    it('lets an aria-label override its default accessible name', async () => {
      await render(
        <TreeGrid.FilterProvider defaultValue="notes">
          <TreeGrid.Root items={items}>
            <TreeGrid.Clear aria-label="Reset search" />
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>,
      );

      expect(screen.getByRole('button')).toHaveAccessibleName('Reset search');
    });

    it('throws outside a TreeGrid.FilterProvider', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await expect(
          render(
            <TreeGrid.Root items={items}>
              <TreeGrid.Clear />
            </TreeGrid.Root>,
          ),
        ).rejects.toThrow(
          /<TreeGrid\.Clear> must be placed in a tree wrapped in <TreeGrid\.FilterProvider>/,
        );
      } finally {
        consoleError.mockRestore();
      }
    });
  });
});
