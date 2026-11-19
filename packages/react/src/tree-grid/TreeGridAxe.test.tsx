import * as React from 'react';
import axe from 'axe-core';
import { describe, expect, it } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { createRenderer, isJSDOM } from '#test-utils';
import { TreeGrid } from '.';

interface Item extends TreeGrid.DefaultItem {
  childrenCount?: number | undefined;
  children?: Item[] | undefined;
}

const items: Item[] = [
  {
    id: 'documents',
    label: 'Documents',
    children: [
      { id: 'resume', label: 'Resume.pdf' },
      { id: 'invoices', label: 'Invoices', children: [{ id: 'q1', label: 'Invoice Q1.pdf' }] },
    ],
  },
  { id: 'photos', label: 'Photos', children: [{ id: 'sunset', label: 'Sunset.jpg' }] },
  { id: 'notes', label: 'Notes.txt' },
];

const ROW_STYLE: React.CSSProperties = {
  height: 28,
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
};

function renderItem(item: Item) {
  return (
    <TreeGrid.Item itemId={item.id} style={ROW_STYLE}>
      <TreeGrid.ItemContent>
        <TreeGrid.ItemExpansionTrigger />
        {item.label}
      </TreeGrid.ItemContent>
    </TreeGrid.Item>
  );
}

function renderCheckboxItem(item: Item) {
  return (
    <TreeGrid.Item itemId={item.id}>
      <TreeGrid.ItemContent>
        <TreeGrid.ItemCheckbox>
          <TreeGrid.ItemCheckboxIndicator />
        </TreeGrid.ItemCheckbox>
        <TreeGrid.ItemExpansionTrigger />
        {item.label}
      </TreeGrid.ItemContent>
    </TreeGrid.Item>
  );
}

function FilterableTreeGrid(props: { query: string }) {
  return (
    <TreeGrid.FilterProvider defaultValue={props.query}>
      <TreeGrid.Root items={items}>
        <TreeGrid.Input aria-label="Filter files" />
        <TreeGrid.Clear>Clear</TreeGrid.Clear>
        <TreeGrid.List aria-label="Files">{renderItem}</TreeGrid.List>
        <TreeGrid.Empty>No results</TreeGrid.Empty>
      </TreeGrid.Root>
    </TreeGrid.FilterProvider>
  );
}

function formatViolation(violation: axe.Result) {
  const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
  return `${violation.id}: ${violation.help} (${targets})`;
}

async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, { resultTypes: ['violations'] });
  expect(results.violations.map(formatViolation)).toEqual([]);
}

// Each test checks that the tree reached the state under test before running axe on it.
describe.skipIf(isJSDOM)('TreeGrid axe checks', () => {
  const { render } = createRenderer();

  it('default', async () => {
    const { container } = await render(
      <TreeGrid.Root
        items={items}
        defaultExpandedItems={['documents']}
        defaultSelectedItems="resume"
      >
        <TreeGrid.List aria-label="Files">{renderItem}</TreeGrid.List>
      </TreeGrid.Root>,
    );
    expect(screen.getByRole('row', { name: 'Resume.pdf' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await expectNoAxeViolations(container);
  });

  it('checkbox selection', async () => {
    const { container } = await render(
      <TreeGrid.Root
        items={items}
        multiple
        defaultExpandedItems={['documents']}
        defaultSelectedItems={['resume']}
      >
        <TreeGrid.List aria-label="Files">{renderCheckboxItem}</TreeGrid.List>
      </TreeGrid.Root>,
    );
    expect(screen.getByRole('checkbox', { name: 'Select Documents' })).toHaveAttribute(
      'aria-checked',
      'mixed',
    );

    await expectNoAxeViolations(container);
  });

  it('filtering with matches', async () => {
    const { container } = await render(<FilterableTreeGrid query="resume" />);
    expect(screen.getByRole('row', { name: 'Resume.pdf' })).toBeVisible();
    expect(screen.queryByRole('row', { name: 'Notes.txt' })).toBeNull();

    await expectNoAxeViolations(container);
  });

  // axe reports the empty treegrid under "needs review" (aria-required-children), not as a
  // violation.
  it('filtering with no matches', async () => {
    const { container } = await render(<FilterableTreeGrid query="nothing matches this" />);
    expect(screen.queryAllByRole('row')).toHaveLength(0);
    expect(screen.getByRole('status')).toHaveTextContent('No results');

    await expectNoAxeViolations(container);
  });

  it('TreeGrid.Label', async () => {
    const { container } = await render(
      <TreeGrid.Root items={items}>
        <TreeGrid.Label>Files</TreeGrid.Label>
        <TreeGrid.List>{renderItem}</TreeGrid.List>
      </TreeGrid.Root>,
    );
    expect(screen.getByRole('treegrid', { name: 'Files' })).toBeVisible();

    await expectNoAxeViolations(container);
  });
});
