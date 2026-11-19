import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { TreeGrid } from '..';

const items: TreeGrid.DefaultItem[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

function Example(props: {
  label?: React.ReactNode;
  list?: Omit<TreeGrid.List.Props, 'children'>;
  onItemHighlighted?: TreeGrid.Root.Props['onItemHighlighted'];
}) {
  const { label = <TreeGrid.Label>Files</TreeGrid.Label>, list, onItemHighlighted } = props;
  return (
    <TreeGrid.Root items={items} defaultSelectedItems="b" onItemHighlighted={onItemHighlighted}>
      {label}
      <TreeGrid.List {...list}>
        {(item) => (
          <TreeGrid.Item itemId={item.id}>
            <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
          </TreeGrid.Item>
        )}
      </TreeGrid.List>
    </TreeGrid.Root>
  );
}

describe('<TreeGrid.Label />', () => {
  const { render } = createRenderer();

  it('names the tree', async () => {
    await render(<Example />);
    expect(screen.getByRole('treegrid', { name: 'Files' })).toBeVisible();
  });

  it('keeps a custom id', async () => {
    await render(<Example label={<TreeGrid.Label id="files-label">Files</TreeGrid.Label>} />);
    expect(screen.getByRole('treegrid')).toHaveAttribute('aria-labelledby', 'files-label');
  });

  it('references the id of the render element', async () => {
    await render(
      <Example label={<TreeGrid.Label render={<h2 id="files-heading" />}>Files</TreeGrid.Label>} />,
    );
    expect(screen.getByRole('treegrid', { name: 'Files' })).toHaveAttribute(
      'aria-labelledby',
      'files-heading',
    );
  });

  it('drops the reference when the render element clears the id', async () => {
    await render(<Example label={<TreeGrid.Label render={<h2 id="" />}>Files</TreeGrid.Label>} />);
    expect(screen.getByRole('treegrid')).not.toHaveAttribute('aria-labelledby');
  });

  it('lets the list override the reference', async () => {
    await render(<Example list={{ 'aria-labelledby': 'heading' }} />);
    expect(screen.getByRole('treegrid')).toHaveAttribute('aria-labelledby', 'heading');
  });

  it('removes the reference when it unmounts', async () => {
    const { setProps } = await render(<Example />);
    await setProps({ label: null });
    expect(screen.getByRole('treegrid')).not.toHaveAttribute('aria-labelledby');
  });

  it('focuses the tree on click', async () => {
    await render(<Example />);
    const label = screen.getByText('Files');
    const pointerDown = fireEvent.pointerDown(label);
    expect(pointerDown).toBe(false);
    fireEvent.click(label);
    // The selected item holds the tab stop.
    expect(screen.getByRole('row', { name: 'B' })).toHaveFocus();
  });

  it('reports the click as the cause of the focus', async () => {
    const onItemHighlighted = vi.fn();
    await render(<Example onItemHighlighted={onItemHighlighted} />);
    fireEvent.click(screen.getByText('Files'));
    expect(onItemHighlighted).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({ reason: 'item-press', event: expect.any(MouseEvent) }),
    );
  });
});
