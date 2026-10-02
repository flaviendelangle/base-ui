import * as React from 'react';
import { screen, within, createRenderer } from '@mui/internal-test-utils';
import { describe, expect, it } from 'vitest';
// eslint-disable-next-line import/no-relative-packages
import { firePointer } from '../../../../../../../../packages/react/test/pointer';
// eslint-disable-next-line import/no-relative-packages
import { flushRaf, setupDragEngineTests } from '../../../../../../../../packages/react/test/dnd';
import '@testing-library/jest-dom/vitest';
import CrossCSS from './cross-list-dnd/css-modules';
import CrossTailwind from './cross-list-dnd/tailwind';
import ExternalCSS from './external-dnd/css-modules';
import ExternalTailwind from './external-dnd/tailwind';
import '../../../../../../css/index.css';

setupDragEngineTests();
describe.skipIf(window.navigator.userAgent.includes('jsdom'))('Listbox drag demos', () => {
  const { render } = createRenderer();
  async function hover(source: HTMLElement, target: HTMLElement, y = 0.8) {
    const sourceRect = source.getBoundingClientRect();
    const clientX = sourceRect.left + sourceRect.width / 2;
    const clientY = sourceRect.top + sourceRect.height / 2;
    firePointer.down(source, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX,
      clientY,
      timeStamp: 10,
    });
    firePointer.move(source, {
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
      clientX: clientX + 8,
      clientY,
      timeStamp: 100,
    });
    await flushRaf();
    const rect = target.getBoundingClientRect();
    const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height * y };
    firePointer.move(source, {
      pointerId: 1,
      pointerType: 'mouse',
      buttons: 1,
      ...point,
      timeStamp: 200,
    });
    await flushRaf();
    return point;
  }

  async function move(source: HTMLElement, target: HTMLElement) {
    const handle = source.querySelector<HTMLElement>('[aria-label="Drag track"]') ?? source;
    const point = await hover(handle, target);
    firePointer.up(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      ...point,
      timeStamp: 300,
    });
    await flushRaf();
  }
  it.each([
    ['CSS Modules', CrossCSS],
    ['Tailwind', CrossTailwind],
  ])('transfers, sorts, and refills an empty queue in %s', async (_, Demo) => {
    await render(<Demo />);
    const queue = screen.getByRole('listbox', { name: 'Queue' });
    const next = screen.getByRole('listbox', { name: 'Up next' });
    const titles = (list: HTMLElement) =>
      within(list)
        .queryAllByRole('option')
        .map((row) => row.textContent);
    const source = within(queue).getAllByRole('option')[0];
    await move(source, within(next).getAllByRole('option')[0]);
    expect(titles(queue)).toHaveLength(2);
    expect(titles(next)).toEqual([
      'SuperstitionStevie Wonder',
      'Bohemian RhapsodyQueen',
      'Dancing QueenABBA',
    ]);
    await move(within(next).getAllByRole('option')[0], within(next).getAllByRole('option')[2]);
    expect(titles(next)).toEqual([
      'Bohemian RhapsodyQueen',
      'Dancing QueenABBA',
      'SuperstitionStevie Wonder',
    ]);
    for (const row of within(queue).getAllByRole('option')) {
      // Each drag must finish before the next one starts.
      // eslint-disable-next-line no-await-in-loop
      await move(row, within(next).getAllByRole('option')[0]);
    }
    expect(titles(queue)).toHaveLength(0);
    await move(within(next).getAllByRole('option')[0], queue);
    expect(titles(queue)).toHaveLength(1);
    expect(titles(next)).toHaveLength(4);
  });
  it.each([
    ['CSS Modules', ExternalCSS],
    ['Tailwind', ExternalTailwind],
  ])('adds library tracks and archives queue tracks in %s', async (_, Demo) => {
    await render(<Demo />);
    const queue = screen.getByRole('listbox', { name: 'Queue' });
    await move(screen.getByLabelText('Hotel California'), within(queue).getAllByRole('option')[0]);
    expect(
      within(queue)
        .getAllByRole('option')
        .map((row) => row.textContent),
    ).toEqual(['Bohemian RhapsodyQueen', 'Hotel CaliforniaEagles', 'Billie JeanMichael Jackson']);
    const archive = screen.getByLabelText('Archive tracks');
    for (const row of within(queue).getAllByRole('option')) {
      // Each drag must finish before the next one starts.
      // eslint-disable-next-line no-await-in-loop
      await move(row, archive);
    }
    expect(within(queue).queryAllByRole('option')).toHaveLength(0);
    expect(archive).toHaveTextContent('Hotel California');
    await move(screen.getByLabelText('Superstition'), queue);
    expect(within(queue).getAllByRole('option')).toHaveLength(1);
  });
});
