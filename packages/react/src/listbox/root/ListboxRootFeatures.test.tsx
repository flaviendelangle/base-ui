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

describe('Listbox root features', () => {
  const { render } = createRenderer();

  afterEach(() => {
    resetWarnings();
    vi.restoreAllMocks();
  });

  it('warns when a provider is rendered inside the root it should wrap', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await render(
      <Listbox.Root>
        <Listbox.KeyboardSortableProvider onItemsReorder={() => {}}>
          <List />
        </Listbox.KeyboardSortableProvider>
      </Listbox.Root>,
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '<Listbox.KeyboardSortableProvider> has no effect inside <Listbox.Root>',
      ),
    );
    expect(screen.queryByRole('status')).toBeNull();
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
});
