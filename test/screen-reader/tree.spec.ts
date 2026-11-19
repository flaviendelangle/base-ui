import { expect } from '@playwright/test';
import { screenReaderTest as test } from '@guidepup/playwright';
import { openFixture, tabToItem, waitForPhrase } from './utils';

test.skip(process.platform !== 'win32', 'The keys and announcements are checked with NVDA.');
test.use({ screenReaderStartOptions: { capture: true } });

// NVDA switches to focus mode for tree view items, so arrow keys reach the tree rather than
// moving the browse mode cursor.

test('announces the tree name and an item by its level and position', async ({
  page,
  screenReader,
}) => {
  await openFixture(page, screenReader, 'tree/Basic');

  const rootPhrase = await tabToItem(screenReader, /documents/i);
  await waitForPhrase(screenReader, /file system/i);
  expect(rootPhrase).toMatch(/level 1/i);
  expect(rootPhrase).toMatch(/1 of 3/i);

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('ArrowDown');
  const childPhrase = await waitForPhrase(screenReader, /resume/i);
  expect(childPhrase).toMatch(/level 2/i);
  expect(childPhrase).toMatch(/1 of 2/i);
});

test('announces when an item expands and collapses', async ({ page, screenReader }) => {
  await openFixture(page, screenReader, 'tree/Basic');
  const item = page.getByRole('treeitem', { name: 'Documents' });

  expect(await tabToItem(screenReader, /documents/i)).toMatch(/expanded/i);

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('ArrowLeft');
  await expect(item).toHaveAttribute('aria-expanded', 'false');
  await waitForPhrase(screenReader, /collapsed/i);

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('ArrowRight');
  await expect(item).toHaveAttribute('aria-expanded', 'true');
  await waitForPhrase(screenReader, /expanded/i);
});

test('announces the selection of an item', async ({ page, screenReader }) => {
  await openFixture(page, screenReader, 'tree/Basic');
  await tabToItem(screenReader, /documents/i);

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('Space');
  await expect(page.getByRole('treeitem', { name: 'Documents' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await waitForPhrase(screenReader, /(?<!not )selected/i);
});

test('announces the selection of a checkbox item', async ({ page, screenReader }) => {
  await openFixture(page, screenReader, 'tree/CheckboxSelection');
  await tabToItem(screenReader, /documents/i);
  await screenReader.press('ArrowDown');
  const resume = page.getByRole('treeitem', { name: 'Resume' });

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('Space');
  await expect(resume).toHaveAttribute('aria-selected', 'true');
  await waitForPhrase(screenReader, /(?<!not )selected/i);

  await screenReader.clearSpokenPhraseLog();
  await screenReader.press('Space');
  await expect(resume).toHaveAttribute('aria-selected', 'false');
  await waitForPhrase(screenReader, /not selected/i);
});

test('names the tree from Tree.Label', async ({ page, screenReader }) => {
  await openFixture(page, screenReader, 'tree/CheckboxSelection');

  await tabToItem(screenReader, /documents/i);

  // The log starts after the reader settled into the page, so the label's text here is the name
  // of the tree that focus entered, not page content read in browse mode.
  await waitForPhrase(screenReader, /files to share/i);
});
