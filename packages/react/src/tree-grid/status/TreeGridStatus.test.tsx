import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { describe, it, expect } from 'vitest';
import { act, fireEvent, screen, within } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';
import { INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY } from '../../internals/useInitialLiveRegionTextMutation';
import { TreeGrid } from '..';

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
      { id: 'invoice-q1', label: 'Invoice Q1' },
      { id: 'invoice-q2', label: 'Invoice Q2' },
    ],
  },
  { id: 'notes', label: 'Notes' },
];

function renderRow(item: Item) {
  return (
    <TreeGrid.Item itemId={item.id} data-testid={item.id}>
      <TreeGrid.ItemContent>{item.label}</TreeGrid.ItemContent>
    </TreeGrid.Item>
  );
}

function FilterableTreeGrid(props: { value: string; status?: React.ReactNode }) {
  return (
    <TreeGrid.FilterProvider value={props.value}>
      <TreeGrid.Root items={ITEMS}>
        <TreeGrid.List>{renderRow}</TreeGrid.List>
        {props.status ?? <TreeGrid.Status data-testid="status" />}
      </TreeGrid.Root>
    </TreeGrid.FilterProvider>
  );
}

describe('<TreeGrid.Status />', () => {
  it('announces the number of matches when the query changes', async () => {
    const view = await render(<FilterableTreeGrid value="" />);
    expect(screen.getByTestId('status')).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('status')).toBeEmptyDOMElement();

    await view.setProps({ value: 'invoice' });
    expect(screen.getByTestId('status')).toHaveTextContent('2 results.');

    await view.setProps({ value: 'notes' });
    expect(screen.getByTestId('status')).toHaveTextContent('1 result.');

    // `TreeGrid.Empty` announces that nothing matches.
    await view.setProps({ value: 'missing' });
    expect(screen.getByTestId('status')).toBeEmptyDOMElement();

    await view.setProps({ value: 'notes' });
    await view.setProps({ value: '' });
    expect(screen.getByTestId('status')).toBeEmptyDOMElement();
  });

  it('renders custom content instead of the message', async () => {
    const view = await render(
      <FilterableTreeGrid
        value=""
        status={
          <TreeGrid.Status data-testid="status">
            {(state) =>
              state.change?.type === 'filter'
                ? `${state.change.matchCount} files (${state.message})`
                : null
            }
          </TreeGrid.Status>
        }
      />,
    );

    await view.setProps({ value: 'invoice' });
    expect(screen.getByTestId('status')).toHaveTextContent('2 files (2 results.)');
  });

  describe('selection', () => {
    function renderCheckboxRow(item: Item) {
      return (
        <TreeGrid.Item itemId={item.id} data-testid={item.id}>
          <TreeGrid.ItemContent>
            <TreeGrid.ItemCheckbox data-testid={`${item.id}-checkbox`} />
            {item.label}
          </TreeGrid.ItemContent>
        </TreeGrid.Item>
      );
    }

    function SelectionTreeGrid(props: Omit<TreeGrid.Root.Props<Item, true>, 'children'>) {
      return (
        <TreeGrid.Root defaultExpandedItems={['documents']} {...props}>
          <TreeGrid.List>{renderCheckboxRow}</TreeGrid.List>
          <TreeGrid.Status data-testid="status" />
        </TreeGrid.Root>
      );
    }

    function press(itemId: string, key: string, options: object = {}) {
      act(() => screen.getByTestId(itemId).focus());
      fireEvent.keyDown(screen.getByTestId(itemId), { key, ...options });
    }

    it('names the item a single selection selects or deselects', async () => {
      await render(
        <TreeGrid.Root items={ITEMS} defaultExpandedItems={['documents']}>
          <TreeGrid.List>{renderCheckboxRow}</TreeGrid.List>
          <TreeGrid.Status data-testid="status" />
        </TreeGrid.Root>,
      );
      const status = screen.getByTestId('status');

      fireEvent.click(screen.getByTestId('notes'));
      expect(status).toHaveTextContent('Notes selected.');

      fireEvent.click(screen.getByTestId('invoice-q1'));
      expect(status).toHaveTextContent('Invoice Q1 selected.');

      press('invoice-q1', ' ');
      expect(status).toHaveTextContent('Invoice Q1 not selected.');
    });

    it('counts a multiple selection unless naming the item is enough', async () => {
      await render(
        <SelectionTreeGrid
          items={ITEMS}
          multiple
          checkboxSelectionPropagation={{ parents: false, descendants: false }}
        />,
      );
      const status = screen.getByTestId('status');

      fireEvent.click(screen.getByTestId('notes-checkbox'));
      expect(status.textContent).toBe('Notes selected.');

      fireEvent.click(screen.getByTestId('invoice-q1-checkbox'));
      expect(status).toHaveTextContent('Invoice Q1 selected. 2 items selected.');

      fireEvent.click(screen.getByTestId('notes-checkbox'));
      expect(status).toHaveTextContent('Notes not selected. 1 item selected.');

      // Pressing a row toggles it, like its checkbox.
      fireEvent.click(screen.getByTestId('invoice-q2'));
      expect(status).toHaveTextContent('Invoice Q2 selected. 2 items selected.');

      press('invoice-q2', 'a', { ctrlKey: true });
      expect(status).toHaveTextContent('All items selected.');

      press('invoice-q2', 'Escape');
      expect(status).toHaveTextContent('No items selected.');
    });

    it('announces the changes the user makes once a controlled parent applies them', async () => {
      const actionsRef = React.createRef<TreeGrid.Root.Actions<Item>>();
      let applySelection!: () => void;
      function ControlledTreeGrid() {
        const [selectedItems, setSelectedItems] = React.useState<readonly TreeGrid.ItemId[]>([]);
        return (
          <SelectionTreeGrid
            items={ITEMS}
            multiple
            checkboxSelectionPropagation={{ parents: false, descendants: false }}
            actionsRef={actionsRef}
            selectedItems={selectedItems}
            onSelectedItemsChange={(value) => {
              applySelection = () => setSelectedItems(value as readonly TreeGrid.ItemId[]);
            }}
          />
        );
      }
      await render(<ControlledTreeGrid />);
      const status = screen.getByTestId('status');

      fireEvent.click(screen.getByTestId('notes-checkbox'));
      expect(status).toBeEmptyDOMElement();
      await act(async () => applySelection());
      expect(status).toHaveTextContent('Notes selected.');

      // A change made through `actionsRef` has its own feedback.
      await act(async () => actionsRef.current!.setItemSelection('invoice-q1', true));
      await act(async () => applySelection());
      expect(status).toHaveTextContent('Notes selected.');

      fireEvent.click(within(screen.getByTestId('invoice-q2')).getByRole('checkbox'));
      await act(async () => applySelection());
      expect(status).toHaveTextContent('Invoice Q2 selected. 3 items selected.');
    });

    it('announces a change a controlled parent applies from its callback', async () => {
      function ControlledTreeGrid() {
        const [selectedItems, setSelectedItems] = React.useState<TreeGrid.ItemId | null>(null);
        return (
          <TreeGrid.Root
            items={ITEMS}
            selectedItems={selectedItems}
            onSelectedItemsChange={(value) => ReactDOM.flushSync(() => setSelectedItems(value))}
          >
            <TreeGrid.List>{renderRow}</TreeGrid.List>
            <TreeGrid.Status data-testid="status" />
          </TreeGrid.Root>
        );
      }
      await render(<ControlledTreeGrid />);

      fireEvent.click(screen.getByTestId('notes'));
      expect(screen.getByTestId('notes')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('status')).toHaveTextContent('Notes selected.');
    });

    it('does not announce a change made through `actionsRef` that replaces the one the user proposed', async () => {
      const actionsRef = React.createRef<TreeGrid.Root.Actions<Item>>();
      let applySelection!: () => void;
      function ControlledTreeGrid() {
        const [selectedItems, setSelectedItems] = React.useState<TreeGrid.ItemId | null>(null);
        return (
          <TreeGrid.Root
            items={ITEMS}
            defaultExpandedItems={['documents']}
            actionsRef={actionsRef}
            selectedItems={selectedItems}
            onSelectedItemsChange={(value) => {
              applySelection = () => setSelectedItems(value);
            }}
          >
            <TreeGrid.List>{renderRow}</TreeGrid.List>
            <TreeGrid.Status data-testid="status" />
          </TreeGrid.Root>
        );
      }
      await render(<ControlledTreeGrid />);

      // The parent never applies the proposal of the click, but applies the same
      // selection once it comes from `actionsRef`.
      fireEvent.click(screen.getByTestId('notes'));
      await act(async () => actionsRef.current!.setItemSelection('notes', true));
      await act(async () => applySelection());

      expect(screen.getByTestId('notes')).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('status')).toBeEmptyDOMElement();
    });
  });

  describe('with fake timers', () => {
    const { render: renderWithClock, clock } = createRenderer();
    clock.withFakeTimers();

    it('marks the content it mounts with so that Safari announces it', async () => {
      await renderWithClock(
        <TreeGrid.Root items={ITEMS}>
          <TreeGrid.List>{renderRow}</TreeGrid.List>
          <TreeGrid.Status data-testid="status">Ready</TreeGrid.Status>
        </TreeGrid.Root>,
      );
      expect(screen.getByTestId('status').textContent).toBe('Ready⁠');

      clock.tick(INITIAL_LIVE_REGION_TEXT_MUTATION_RESET_DELAY);
      expect(screen.getByTestId('status').textContent).toBe('Ready');
    });
  });
});
