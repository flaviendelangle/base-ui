import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, act } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { TreeGrid } from '..';

const { render } = createRenderer();

describe('TreeGridItemModelProvider', () => {
  it('skips unchanged models across parent renders and expansion, and renders changed models', async () => {
    const items = [
      { id: 'a', label: 'A', children: [{ id: 'child', label: 'Child' }] },
      { id: 'b', label: 'B' },
    ];
    const actionsRef = React.createRef<TreeGrid.Root.Actions<TreeGrid.DefaultItem>>();
    const renderItem = vi.fn((item: TreeGrid.DefaultItem) => (
      <TreeGrid.Item itemId={item.id}>
        <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
      </TreeGrid.Item>
    ));
    function App() {
      return (
        <TreeGrid.Root defaultItems={items} actionsRef={actionsRef}>
          <TreeGrid.List>{renderItem}</TreeGrid.List>
        </TreeGrid.Root>
      );
    }
    // Counts `renderItem` calls, which Strict Mode would double.
    const { rerender } = await render(<App />, { strict: false });
    renderItem.mockClear();
    await rerender(<App />);
    expect(renderItem).not.toHaveBeenCalled();
    act(() => actionsRef.current!.setItemExpansion('a', true));
    expect(renderItem.mock.calls.map(([item]) => item.id)).toEqual(['child']);
    renderItem.mockClear();
    act(() => {
      actionsRef.current!.applyTransaction((transaction) =>
        transaction.update('b', { label: 'Renamed' }),
      );
    });
    expect(renderItem.mock.calls.map(([item]) => item.id)).toEqual(['b']);
    expect(screen.getByRole('row', { name: 'Renamed' })).toBeVisible();
  });

  it('updates rows when the render callback changes', async () => {
    const items = [{ id: 'a', label: 'A' }];
    const item = (label: string) =>
      function RenderItem() {
        return (
          <TreeGrid.Item itemId="a">
            <TreeGrid.ItemContent>{label}</TreeGrid.ItemContent>
          </TreeGrid.Item>
        );
      };
    const { rerender } = await render(
      <TreeGrid.Root items={items}>
        <TreeGrid.List>{item('Before')}</TreeGrid.List>
      </TreeGrid.Root>,
    );
    await rerender(
      <TreeGrid.Root items={items}>
        <TreeGrid.List>{item('After')}</TreeGrid.List>
      </TreeGrid.Root>,
    );
    expect(screen.getByText('After')).toBeVisible();
    expect(screen.queryByText('Before')).toBeNull();
  });
});
