import { expect, vi } from 'vitest';
import * as React from 'react';
import { Listbox } from '@base-ui/react/listbox';
import { screen } from '@mui/internal-test-utils';
import { createRenderer } from '#test-utils';

vi.mock('react', async (importOriginal) => {
  const original = await importOriginal<typeof import('react')>();
  return { ...original, useId: undefined };
});

describe('<Listbox.Root /> with the React 17 id fallback', () => {
  const { render } = createRenderer();

  it('renders items without React.useId', async () => {
    await render(
      <Listbox.Root>
        <Listbox.List>
          <Listbox.Item value="a">a</Listbox.Item>
          <Listbox.Item value="b">b</Listbox.Item>
        </Listbox.List>
      </Listbox.Root>,
    );

    expect(screen.getAllByRole('option')).toHaveLength(2);
  });
});
