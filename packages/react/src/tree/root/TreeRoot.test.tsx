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

    it('should not mark an item as expandable if its children is an empty array', async () => {
      const view = await render({
        items: [{ id: '1', children: [] }],
        defaultExpandedItems: ['1'],
      });

      expect(view.getItemRoot('1')).not.toHaveAttribute('aria-expanded');
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
    describe('getItem', () => {
      it('should return the item model', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        });

        expect(view.actionsRef.current!.getItem('1')).toEqual({
          id: '1',
          label: '1',
          children: [{ id: '1.1', label: '1.1' }],
        });
      });

      it('should have up to date data when items change', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        });

        await view.setItems([{ id: '1' }, { id: '2' }]);

        expect(view.actionsRef.current!.getItem('1')).toEqual({
          id: '1',
          label: '1',
        });
      });
    });

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
    });

    describe('getItemTree', () => {
      it('should return the tree', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        });

        expect(view.actionsRef.current!.getItemTree()).toEqual([
          { id: '1', label: '1', children: [{ id: '1.1', label: '1.1' }] },
          { id: '2', label: '2' },
        ]);
      });

      it('should have up to date tree when items change', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }] }, { id: '2' }],
        });

        await view.setItems([{ id: '1' }, { id: '2' }]);

        expect(view.actionsRef.current!.getItemTree()).toEqual([
          { id: '1', label: '1' },
          { id: '2', label: '2' },
        ]);
      });
    });

    describe('getItemOrderedChildrenIds', () => {
      it('should return the children of an item in their rendering order', async () => {
        const view = await render({
          items: [{ id: '1', children: [{ id: '1.1' }, { id: '1.2' }] }],
        });

        expect(view.actionsRef.current!.getItemOrderedChildrenIds('1')).toEqual([
          '1.1',
          '1.2',
        ]);
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

        expect(view.actionsRef.current!.getItemOrderedChildrenIds('1')).toEqual([
          '1.1',
          '1.2',
        ]);
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
  });
});
