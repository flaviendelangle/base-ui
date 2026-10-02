import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@mui/internal-test-utils';
import { reset as resetWarnings } from '@base-ui/utils/warn';
import { Listbox } from '@base-ui/react/listbox';
import { createRenderer } from '#test-utils';

function List() {
  return (
    <Listbox.List>
      <Listbox.Item value="a">a</Listbox.Item>
      <Listbox.Item value="b">b</Listbox.Item>
    </Listbox.List>
  );
}

const misplaced = (name: string) =>
  expect.stringContaining(`<Listbox.${name}> has no effect inside <Listbox.Root>`);

describe('Listbox root features', () => {
  const { render } = createRenderer();

  afterEach(() => {
    resetWarnings();
    vi.restoreAllMocks();
  });

  it('warns when a provider is rendered between the root and its list', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Listbox.Root>
        <Listbox.KeyboardSortableProvider onItemsReorder={() => {}}>
          <List />
        </Listbox.KeyboardSortableProvider>
      </Listbox.Root>,
    );
    expect(warn).toHaveBeenCalledWith(misplaced('KeyboardSortableProvider'));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('warns when a provider without children is rendered inside the root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Listbox.Root>
        <Listbox.SortableProvider onItemsReorder={() => {}} />
        <List />
      </Listbox.Root>,
    );
    expect(warn).toHaveBeenCalledWith(misplaced('SortableProvider'));
  });

  it('applies a provider to a root nested in another root', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Listbox.Root>
        <Listbox.KeyboardSortableProvider onItemsReorder={() => {}}>
          <Listbox.Root>
            <List />
          </Listbox.Root>
        </Listbox.KeyboardSortableProvider>
      </Listbox.Root>,
    );
    expect(warn).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not warn for a provider whose nested root renders later', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function App({ open }: { open: boolean }) {
      return (
        <Listbox.Root>
          <Listbox.KeyboardSortableProvider onItemsReorder={() => {}}>
            {open && (
              <Listbox.Root>
                <List />
              </Listbox.Root>
            )}
          </Listbox.KeyboardSortableProvider>
        </Listbox.Root>
      );
    }
    const view = await render(<App open={false} />);
    await view.rerender(<App open />);
    expect(warn).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each(['SortHandle', 'SortPreview'] as const)(
    'throws when Listbox.%s is outside a Listbox.SortableProvider',
    async (part) => {
      const Part = Listbox[part];
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await expect(
          render(
            <Listbox.KeyboardSortableProvider onItemsReorder={() => {}}>
              <Listbox.Root>
                <Listbox.List>
                  <Listbox.Item value="a">
                    <Part />
                  </Listbox.Item>
                </Listbox.List>
              </Listbox.Root>
            </Listbox.KeyboardSortableProvider>,
          ),
        ).rejects.toThrow(
          new RegExp(
            `<Listbox\\.${part}> must be placed in a listbox wrapped in <Listbox\\.SortableProvider>`,
          ),
        );
      } finally {
        consoleError.mockRestore();
      }
    },
  );
});
