import * as React from 'react';
import { act, fireEvent } from '@mui/internal-test-utils';
import { describeTree } from '../../../test/describeTree';

describeTree('TreeRoot - Editing', ({ render }) => {
  describe('F2 key', () => {
    it('should enter edit mode on F2 when isItemEditable is true', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }, { id: '2' }],
        isItemEditable: true,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      expect(view.getItemLabelInput('1')).not.toBe(null);
    });

    it('should not enter edit mode on F2 when isItemEditable is false', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      expect(view.getItemLabelInput('1')).toBe(null);
    });

    it('should not enter edit mode on F2 when the item is disabled', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1', disabled: true }],
        isItemEditable: true,
        itemFocusableWhenDisabled: true,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      expect(view.getItemLabelInput('1')).toBe(null);
    });
  });

  describe('double-click', () => {
    it('should enter edit mode on double-click when isItemEditable is true', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      const label = view.getItemLabel('1')!;
      fireEvent.doubleClick(label);

      expect(view.getItemLabelInput('1')).not.toBe(null);
    });

    it('should not enter edit mode on double-click when isItemEditable is false', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
      });

      const label = view.getItemLabel('1')!;
      fireEvent.doubleClick(label);

      expect(view.getItemLabelInput('1')).toBe(null);
    });
  });

  describe('isItemEditable as function', () => {
    it('should allow editing only items that return true', async () => {
      const view = await render({
        items: [
          { id: '1', label: 'Editable' },
          { id: '2', label: 'Not editable' },
        ],
        isItemEditable: (item: any) => item.label === 'Editable',
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });
      expect(view.getItemLabelInput('1')).not.toBe(null);

      // Cancel editing on item 1 first
      fireEvent.keyDown(view.getItemLabelInput('1')!, { key: 'Escape' });

      await act(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });

      act(() => {
        view.getItemRoot('2').focus();
      });
      fireEvent.keyDown(view.getItemRoot('2'), { key: 'F2' });
      expect(view.getItemLabelInput('2')).toBe(null);
    });
  });

  describe('Enter key', () => {
    it('should save the edited label on Enter', async () => {
      const onItemsChange = vi.fn();
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
        onItemsChange,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      const input = view.getItemLabelInput('1')!;
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onItemsChange).toHaveBeenCalled();
      const newItems = onItemsChange.mock.calls[0][0];
      expect(newItems[0].label).toBe('New Label');
    });
  });

  describe('Escape key', () => {
    it('should cancel editing on Escape without saving', async () => {
      const onItemsChange = vi.fn();
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
        onItemsChange,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      const input = view.getItemLabelInput('1')!;
      fireEvent.change(input, { target: { value: 'New Label' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onItemsChange).not.toHaveBeenCalled();
      expect(view.getItemLabelInput('1')).toBe(null);
    });
  });

  describe('blur', () => {
    it('should save the edited label on blur', async () => {
      const onItemsChange = vi.fn();
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
        onItemsChange,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      const input = view.getItemLabelInput('1')!;
      fireEvent.change(input, { target: { value: 'Blurred Label' } });
      fireEvent.blur(input);

      expect(onItemsChange).toHaveBeenCalled();
      const newItems = onItemsChange.mock.calls[0][0];
      expect(newItems[0].label).toBe('Blurred Label');
    });
  });

  describe('keyboard suppression during editing', () => {
    it('should not expand on Enter while editing', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1', children: [{ id: '1.1' }] }],
        isItemEditable: true,
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      expect(view.isItemExpanded('1')).toBe(false);

      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      // Enter on the input should save, not expand the item
      const input = view.getItemLabelInput('1')!;
      fireEvent.keyDown(input, { key: 'Enter' });

      await act(async () => {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      });

      expect(view.isItemExpanded('1')).toBe(false);
    });
  });

  describe('data attributes', () => {
    it('should set data-editing on the item when editing', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      expect(view.getItemRoot('1').hasAttribute('data-editing')).toBe(false);

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      expect(view.getItemRoot('1').hasAttribute('data-editing')).toBe(true);
    });

    it('should set data-editable on the label when item is editable', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      const label = view.getItemLabel('1')!;
      expect(label.hasAttribute('data-editable')).toBe(true);
    });
  });

  describe('imperative API', () => {
    it('should start editing via actionsRef.startEditing', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      act(() => {
        view.actionsRef.current!.startEditing('1');
      });

      expect(view.getItemLabelInput('1')).not.toBe(null);
    });

    it('should cancel editing via actionsRef.cancelEditing', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      act(() => {
        view.actionsRef.current!.startEditing('1');
      });
      expect(view.getItemLabelInput('1')).not.toBe(null);

      act(() => {
        view.actionsRef.current!.cancelEditing();
      });
      expect(view.getItemLabelInput('1')).toBe(null);
    });

    it('should not start editing a non-editable item via actionsRef', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: false,
      });

      act(() => {
        view.actionsRef.current!.startEditing('1');
      });

      expect(view.getItemLabelInput('1')).toBe(null);
    });
  });

  describe('label visibility', () => {
    it('should show input and hide label text when editing', async () => {
      const view = await render({
        items: [{ id: '1', label: 'Item 1' }],
        isItemEditable: true,
      });

      // Label should be visible before editing
      const item = view.getItemRoot('1');
      expect(item.textContent).toContain('Item 1');
      expect(view.getItemLabelInput('1')).toBe(null);

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'F2' });

      // Input should be visible, and the editing wrapper should have data-editing
      expect(view.getItemLabelInput('1')).not.toBe(null);
      expect(item.querySelector('[data-editing]')).not.toBe(null);
    });
  });

  describe('setItemLabel via actionsRef', () => {
    it('should update the item label', async () => {
      const onItemsChange = vi.fn();
      const view = await render({
        items: [{ id: '1', label: 'Old Label' }],
        onItemsChange,
      });

      act(() => {
        view.actionsRef.current!.setItemLabel('1', 'New Label');
      });

      expect(onItemsChange).toHaveBeenCalled();
      const newItems = onItemsChange.mock.calls[0][0];
      expect(newItems[0].label).toBe('New Label');
    });
  });
});
