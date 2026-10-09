import { expect, vi, describe, it, beforeEach } from 'vitest';
import { Listbox } from '@base-ui/react/listbox';
import { fireEvent, flushMicrotasks, screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';

vi.mock('@base-ui/utils/platform', async () => {
  const actual =
    await vi.importActual<typeof import('@base-ui/utils/platform')>('@base-ui/utils/platform');
  return { platform: { ...actual.platform, os: { ...actual.platform.os, android: true } } };
});

describe('<Listbox.Item /> Android drag-and-drop', () => {
  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  const { render } = createRenderer();

  it('prevents the native context menu for draggable items', async () => {
    await render(
      <Listbox.ReorderProvider onItemsReorder={vi.fn()}>
        <Listbox.Root>
          <Listbox.List>
            <Listbox.Item value="a">
              <Listbox.ReorderHandle data-testid="handle">drag</Listbox.ReorderHandle>
              <Listbox.ItemText>a</Listbox.ItemText>
            </Listbox.Item>
          </Listbox.List>
        </Listbox.Root>
      </Listbox.ReorderProvider>,
    );

    const handle = screen.getByTestId('handle');
    const eventWasCancelled = !fireEvent.contextMenu(handle);
    await flushMicrotasks();

    expect(eventWasCancelled).toBe(true);
  });

  it('does not prevent the native context menu when drag-and-drop is disabled', async () => {
    await render(
      <Listbox.Root>
        <Listbox.List>
          <Listbox.Item value="a">a</Listbox.Item>
        </Listbox.List>
      </Listbox.Root>,
    );

    const item = screen.getByRole('option', { name: 'a' });
    const eventWasCancelled = !fireEvent.contextMenu(item);
    await flushMicrotasks();

    expect(eventWasCancelled).toBe(false);
  });

  it.each(['provider', 'item', 'draggable'] as const)(
    'keeps the native context menu when sorting is disabled by %s',
    async (mode) => {
      await render(
        <Listbox.ReorderProvider
          onItemsReorder={vi.fn()}
          disabled={mode === 'provider'}
          isItemReorderable={() => mode !== 'item'}
        >
          <Listbox.Root>
            <Listbox.List>
              <Listbox.Item value="a" draggableProps={{ disabled: mode === 'draggable' }}>
                a
              </Listbox.Item>
            </Listbox.List>
          </Listbox.Root>
        </Listbox.ReorderProvider>,
      );
      expect(fireEvent.contextMenu(screen.getByRole('option', { name: 'a' }))).toBe(true);
    },
  );
});
