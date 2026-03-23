import { fireEvent } from '@mui/internal-test-utils';
import { describeTree } from '../../../test/describeTree';

describeTree('TreeRoot - Items', ({ render }) => {
  describe('items prop', () => {
    it('should support removing an item', async () => {
      const view = await render({
        items: [{ id: '1' }, { id: '2' }],
      });

      await view.setItems([{ id: '1' }]);
      expect(view.getAllTreeItemIds()).toEqual(['1']);
    });

    it('should support adding an item at the end', async () => {
      const view = await render({
        items: [{ id: '1' }],
      });

      await view.setItems([{ id: '1' }, { id: '2' }]);
      expect(view.getAllTreeItemIds()).toEqual(['1', '2']);
    });

    it('should support adding an item at the beginning', async () => {
      const view = await render({
        items: [{ id: '2' }],
      });

      await view.setItems([{ id: '1' }, { id: '2' }]);
      expect(view.getAllTreeItemIds()).toEqual(['1', '2']);
    });

    it('should update indexes when two items are swapped', async () => {
      const onSelectedItemsChange = vi.fn();

      const view = await render({
        items: [{ id: '1' }, { id: '2' }, { id: '3' }],
        selectionMode: 'multiple',
        onSelectedItemsChange,
      });

      await view.setItems([{ id: '1' }, { id: '3' }, { id: '2' }]);
      expect(view.getAllTreeItemIds()).toEqual(['1', '3', '2']);

      // Check if the internal state is updated by running a range selection
      fireEvent.click(view.getItemRoot('1'));
      fireEvent.click(view.getItemRoot('3'), { shiftKey: true });
      expect(onSelectedItemsChange.mock.calls.at(-1)![0]).toEqual(['1', '3']);
    });

    it('should mark an item as expandable if its children is an empty array', async () => {
      const view = await render({
        items: [{ id: '1', children: [] }],
        defaultExpandedItems: ['1'],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-expanded', 'true');
    });

    it('should use itemToStringLabel to render the label', async () => {
      const view = await render({
        items: [{ id: '1' }, { id: '2' }],
        itemToStringLabel: (item: any) => `Label: ${item.id}`,
      });

      expect(view.getItemRoot('1')).toHaveTextContent('Label: 1');
      expect(view.getItemRoot('2')).toHaveTextContent('Label: 2');
    });

    it('should use itemToChildren to find children', async () => {
      const items = [
        {
          id: '1',
          label: 'Node 1',
          section: [
            { id: '1.1', label: 'Child 1' },
            { id: '1.2', label: 'Child 2' },
          ],
        },
        { id: '2', label: 'Node 2' },
      ];

      const view = await render({
        items,
        itemToChildren: (item: any) => item.section,
        defaultExpandedItems: ['1'],
      });

      expect(view.getAllTreeItemIds()).toEqual(['1', '1.1', '1.2', '2']);
    });
  });

  describe('disabled prop', () => {
    it('should not have the attribute `aria-disabled` if disabled is not defined', async () => {
      const view = await render({
        items: [{ id: '1' }, { id: '2', disabled: false }, { id: '3', disabled: true }],
      });

      expect(view.getItemRoot('1')).not.toHaveAttribute('aria-disabled');
      expect(view.getItemRoot('2')).not.toHaveAttribute('aria-disabled');
      expect(view.getItemRoot('3')).toHaveAttribute('aria-disabled');
    });

    it('should disable all descendants of a disabled item', async () => {
      const view = await render({
        items: [
          { id: '1', disabled: true, children: [{ id: '1.1', children: [{ id: '1.1.1' }] }] },
        ],
        defaultExpandedItems: ['1', '1.1'],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-disabled', 'true');
      expect(view.getItemRoot('1.1')).toHaveAttribute('aria-disabled', 'true');
      expect(view.getItemRoot('1.1.1')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('API methods', () => {
    describe('getItemDOMElement', () => {
      it('should return the DOM element of the item', async () => {
        const view = await render({
          items: [{ id: '1' }],
        });

        expect(view.actionsRef.current!.getItemDOMElement('1')).toBe(view.getItemRoot('1'));
      });

      it('should return null when the item does not exist', async () => {
        const view = await render({
          items: [{ id: '1' }],
        });

        expect(view.actionsRef.current!.getItemDOMElement('2')).toBe(null);
      });

      it('should return the DOM element with getItemDOMElement using numeric ids', async () => {
        const view = await render({
          items: [{ id: 1 }],
        });

        expect(view.actionsRef.current!.getItemDOMElement(1)).toBe(view.getItemRoot(1));
      });
    });

    describe('getItemOrderedChildrenIds', () => {
      it('should return the children of an item in their rendering order', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }, { id: '1.2' }] }],
        });

        expect(view.actionsRef.current!.getItemOrderedChildrenIds('1')).toEqual(['1.1', '1.2']);
      });

      it('should work for the root items', async () => {
        const view = await render({
          items: [{ id: '1' }, { id: '2' }],
        });

        expect(view.actionsRef.current!.getItemOrderedChildrenIds(null)).toEqual(['1', '2']);
      });

      it('should have up to date children when items change', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        });

        await view.setItems([{ id: '1', children: [{ id: '1.1' }, { id: '1.2' }] }]);

        expect(view.actionsRef.current!.getItemOrderedChildrenIds('1')).toEqual(['1.1', '1.2']);
      });

      it('should return ordered children ids using numeric ids', async () => {
        const view = await render({
          items: [{ id: 1, children: [{ id: 11 }, { id: 12 }] }],
        });

        expect(view.actionsRef.current!.getItemOrderedChildrenIds(1)).toEqual([11, 12]);
      });
    });

    describe('getParentId', () => {
      it('should return the parent id of a child item', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }],
        });

        expect(view.actionsRef.current!.getParentId('1.1')).toBe('1');
      });

      it('should return null for root items', async () => {
        const view = await render({
          items: [{ id: '1' }, { id: '2' }],
        });

        expect(view.actionsRef.current!.getParentId('1')).toBe(null);
      });

      it('should return the parent id using numeric ids', async () => {
        const view = await render({
          items: [{ id: 1, children: [{ id: 11 }] }],
        });

        expect(view.actionsRef.current!.getParentId(11)).toBe(1);
        expect(view.actionsRef.current!.getParentId(1)).toBe(null);
      });
    });

    describe('isItemExpanded', () => {
      it('should return true for expanded items', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }],
          defaultExpandedItems: ['1'],
        });

        expect(view.actionsRef.current!.isItemExpanded('1')).toBe(true);
      });

      it('should return false for collapsed items', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }],
        });

        expect(view.actionsRef.current!.isItemExpanded('1')).toBe(false);
      });
    });

    describe('isItemSelected', () => {
      it('should return true for selected items', async () => {
        const view = await render({
          items: [{ id: '1' }, { id: '2' }],
          defaultSelectedItems: ['1'],
        });

        expect(view.actionsRef.current!.isItemSelected('1')).toBe(true);
      });

      it('should return false for non-selected items', async () => {
        const view = await render({
          items: [{ id: '1' }, { id: '2' }],
        });

        expect(view.actionsRef.current!.isItemSelected('1')).toBe(false);
      });
    });
  });

  describe('invalid tree data', () => {
    it('should warn when two items have the same id', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await render({
          items: [{ id: '1' }, { id: '1' }],
        });

        expect(consoleError.mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(consoleError.mock.calls[0][0]).toContain('same');
      } finally {
        consoleError.mockRestore();
      }
    });

    it('should warn when an item has id="all"', async () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        await render({
          items: [{ id: 'all' }],
        });

        expect(consoleWarn.mock.calls.length).toBeGreaterThanOrEqual(1);
        expect(consoleWarn.mock.calls[0][0]).toContain('all');
      } finally {
        consoleWarn.mockRestore();
      }
    });
  });

  describe('deep trees', () => {
    it('should render and navigate a tree with depth 100', async () => {
      // Build a deeply nested tree: 1 → 1.1 → 1.1.1 → ... (100 levels)
      function buildDeepTree(depth: number): any {
        if (depth === 0) {
          return { id: `d${depth}` };
        }
        return { id: `d${depth}`, children: [buildDeepTree(depth - 1)] };
      }

      const items = [buildDeepTree(100)];

      // Expand all so all items are visible
      const expandedItems: string[] = [];
      for (let i = 100; i > 0; i -= 1) {
        expandedItems.push(`d${i}`);
      }

      const view = await render({
        items,
        defaultExpandedItems: expandedItems,
      });

      // Should render top-level and deepest items
      expect(view.getItemRoot('d100')).toBeTruthy();
      expect(view.getItemRoot('d0')).toBeTruthy();
    });
  });

  describe('accessibility attributes', () => {
    it('should have role="tree" on the root element', async () => {
      const view = await render({
        items: [{ id: '1' }],
      });

      expect(view.getRoot()).toHaveAttribute('role', 'tree');
    });

    it('should have correct aria-level on items', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1', children: [{ id: '1.1.1' }] }] }],
        defaultExpandedItems: ['1', '1.1'],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-level', '1');
      expect(view.getItemRoot('1.1')).toHaveAttribute('aria-level', '2');
      expect(view.getItemRoot('1.1.1')).toHaveAttribute('aria-level', '3');
    });

    it('should have correct aria-setsize and aria-posinset', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1' }, { id: '1.2' }, { id: '1.3' }] }, { id: '2' }],
        defaultExpandedItems: ['1'],
      });

      // Root level: 2 items
      expect(view.getItemRoot('1')).toHaveAttribute('aria-setsize', '2');
      expect(view.getItemRoot('1')).toHaveAttribute('aria-posinset', '1');
      expect(view.getItemRoot('2')).toHaveAttribute('aria-setsize', '2');
      expect(view.getItemRoot('2')).toHaveAttribute('aria-posinset', '2');

      // Nested level: 3 items
      expect(view.getItemRoot('1.1')).toHaveAttribute('aria-setsize', '3');
      expect(view.getItemRoot('1.1')).toHaveAttribute('aria-posinset', '1');
      expect(view.getItemRoot('1.3')).toHaveAttribute('aria-posinset', '3');
    });

    it('should have aria-expanded on expandable items', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        defaultExpandedItems: ['1'],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-expanded', 'true');
      // Non-expandable items should not have aria-expanded
      expect(view.getItemRoot('2')).not.toHaveAttribute('aria-expanded');
    });

    it('should set aria-expanded="false" on collapsed expandable items', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1' }] }],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-disabled on disabled items and their descendants', async () => {
      const view = await render({
        items: [
          {
            id: '1',
            disabled: true,
            children: [{ id: '1.1' }],
          },
          { id: '2' },
        ],
        defaultExpandedItems: ['1'],
      });

      expect(view.getItemRoot('1')).toHaveAttribute('aria-disabled', 'true');
      expect(view.getItemRoot('1.1')).toHaveAttribute('aria-disabled', 'true');
      expect(view.getItemRoot('2')).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('flat DOM structure', () => {
    it('should render all items as siblings', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1' }] }],
        defaultExpandedItems: ['1'],
      });

      const parentRoot = view.getItemRoot('1');
      const childRoot = view.getItemRoot('1.1');

      // In flat DOM structure, the child is NOT a descendant of the parent
      expect(parentRoot.contains(childRoot)).toBe(false);
      // Both items should be siblings (same parent)
      expect(parentRoot.parentElement).toBe(childRoot.parentElement);
    });

    it('should render deeply nested items correctly', async () => {
      const view = await render({
        items: [{ id: '1', children: [{ id: '1.1', children: [{ id: '1.1.1' }] }] }],
        defaultExpandedItems: ['1', '1.1'],
      });

      const item1 = view.getItemRoot('1');
      const item11 = view.getItemRoot('1.1');
      const item111 = view.getItemRoot('1.1.1');

      // All items should be siblings in flat structure
      expect(item1.parentElement).toBe(item11.parentElement);
      expect(item11.parentElement).toBe(item111.parentElement);
    });

    it('should render items with numeric ids', async () => {
      const view = await render({
        items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      });

      expect(view.getAllTreeItemIds()).toEqual(['1', '2', '3']);
    });

    it('should render nested items with numeric ids', async () => {
      const view = await render({
        items: [{ id: 1, children: [{ id: 11 }, { id: 12 }] }, { id: 2 }],
        defaultExpandedItems: [1],
      });

      expect(view.getAllTreeItemIds()).toEqual(['1', '11', '12', '2']);
    });
  });
});
