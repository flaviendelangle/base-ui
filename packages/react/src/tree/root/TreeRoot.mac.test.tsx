import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent } from '@mui/internal-test-utils';
import { describeTree } from '../../../test/describeTree';

vi.mock('@base-ui/utils/platform', async () => {
  const actual =
    await vi.importActual<typeof import('@base-ui/utils/platform')>('@base-ui/utils/platform');
  return { platform: { ...actual.platform, os: { ...actual.platform.os, mac: true } } };
});

describeTree('TreeRoot on macOS', ({ render }) => {
  describe('opt-in multiple selection', () => {
    it.each([
      { name: 'a space', key: ' ' },
      { name: 'a non-breaking space', key: ' ' },
    ])('toggles the focused item on Option+Space reported as $name', async ({ key }) => {
      const view = await render({
        items: [{ id: '1' }, { id: '2' }],
        multiple: 'opt-in',
        defaultSelectedItems: ['1'],
      });

      act(() => {
        view.getItemRoot('2').focus();
      });
      fireEvent.keyDown(view.getItemRoot('2'), { key, code: 'Space', altKey: true });
      expect(view.getSelectedTreeItems()).toEqual(['1', '2']);
    });

    it('moves focus without changing the selection on Option+ArrowDown', async () => {
      const view = await render({
        items: [{ id: '1' }, { id: '2' }],
        multiple: 'opt-in',
        defaultSelectedItems: ['1'],
      });

      act(() => {
        view.getItemRoot('1').focus();
      });
      fireEvent.keyDown(view.getItemRoot('1'), { key: 'ArrowDown', altKey: true });
      expect(view.getFocusedItemId()).toBe('2');
      expect(view.getSelectedTreeItems()).toEqual(['1']);
    });
  });
});
