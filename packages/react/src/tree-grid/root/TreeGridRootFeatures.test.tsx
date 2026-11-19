import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { reset as resetLogOnce } from '@base-ui/utils/createLogOnce';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { TreeGrid } from '..';

const items: TreeGrid.DefaultItem[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

function List() {
  return (
    <TreeGrid.List>
      {(item) => (
        <TreeGrid.Item itemId={item.id} data-testid={item.id}>
          <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
        </TreeGrid.Item>
      )}
    </TreeGrid.List>
  );
}

const misplaced = (name: string) =>
  expect.stringContaining(`<TreeGrid.${name}> has no effect inside <TreeGrid.Root>`);

describe('TreeGrid root features', () => {
  const { render } = createRenderer();

  afterEach(() => {
    resetLogOnce();
    vi.restoreAllMocks();
  });

  it('warns when a provider is rendered between the root and its list', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <TreeGrid.Root defaultItems={items}>
        <TreeGrid.FilterProvider defaultValue="b">
          <List />
        </TreeGrid.FilterProvider>
      </TreeGrid.Root>,
    );
    expect(warn).toHaveBeenCalledWith(misplaced('FilterProvider'));
    expect(screen.getByTestId('a')).toBeInTheDocument();
  });

  it('warns when a provider without children is rendered inside the root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <TreeGrid.Root defaultItems={items}>
        <TreeGrid.FilterProvider defaultValue="b" />
        <List />
      </TreeGrid.Root>,
    );
    expect(warn).toHaveBeenCalledWith(misplaced('FilterProvider'));
  });

  it('warns for a misplaced provider even when the same provider wraps another tree', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <React.Fragment>
        <TreeGrid.FilterProvider defaultValue="b">
          <TreeGrid.Root defaultItems={items}>
            <List />
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>
        <TreeGrid.Root defaultItems={items}>
          <TreeGrid.FilterProvider defaultValue="b">
            <TreeGrid.List>
              {(item) => (
                <TreeGrid.Item itemId={item.id}>
                  <TreeGrid.ItemContent />
                </TreeGrid.Item>
              )}
            </TreeGrid.List>
          </TreeGrid.FilterProvider>
        </TreeGrid.Root>
      </React.Fragment>,
    );
    expect(warn).toHaveBeenCalledWith(misplaced('FilterProvider'));
  });

  it('applies a provider to a root nested in another root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <TreeGrid.Root defaultItems={[]}>
        <TreeGrid.FilterProvider defaultValue="b">
          <TreeGrid.Root defaultItems={items}>
            <List />
          </TreeGrid.Root>
        </TreeGrid.FilterProvider>
      </TreeGrid.Root>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('a')).toBeNull();
  });

  it('does not warn for a provider whose nested root renders later', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function App({ open }: { open: boolean }) {
      return (
        <TreeGrid.Root defaultItems={[]}>
          <TreeGrid.FilterProvider defaultValue="b">
            {open && (
              <TreeGrid.Root defaultItems={items}>
                <List />
              </TreeGrid.Root>
            )}
          </TreeGrid.FilterProvider>
        </TreeGrid.Root>
      );
    }
    const view = await render(<App open={false} />);
    await view.rerender(<App open />);
    expect(warn).not.toHaveBeenCalled();
    expect(screen.queryByTestId('a')).toBeNull();
  });

  it('applies a provider wrapping the root', async () => {
    await render(
      <TreeGrid.FilterProvider defaultValue="b">
        <TreeGrid.Root defaultItems={items}>
          <List />
        </TreeGrid.Root>
      </TreeGrid.FilterProvider>,
    );
    expect(screen.queryByTestId('a')).toBeNull();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });
});
