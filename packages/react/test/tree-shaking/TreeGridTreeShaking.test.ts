import * as path from 'node:path';
import { build } from 'vite';
import { describe, expect, it } from 'vitest';

const fixtureBuilds = new Map<string, Promise<string[]>>();

function buildFixture(name: string): Promise<string[]> {
  const cached = fixtureBuilds.get(name);
  if (cached) {
    return cached;
  }
  const pending = buildFixtureOnce(name);
  fixtureBuilds.set(name, pending);
  return pending;
}

async function buildFixtureOnce(name: string): Promise<string[]> {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: true,
      lib: {
        entry: path.join(import.meta.dirname, 'fixtures', name),
        formats: ['es'],
      },
      rollupOptions: {
        external: ['react', 'react/jsx-runtime', 'react-dom'],
      },
    },
  });
  const outputs = Array.isArray(result) ? result : [result];
  return outputs.flatMap((output) =>
    'output' in output
      ? output.output.flatMap((chunk) => (chunk.type === 'chunk' ? Object.keys(chunk.modules) : []))
      : [],
  );
}

const includes = (modules: string[], pattern: RegExp) => modules.some((id) => pattern.test(id));

describe('TreeGrid tree shaking', () => {
  it.each([
    { name: 'the filtering plugin', pattern: /\/tree-grid\/plugins\/TreeGridFilteringPlugin\.ts$/ },
    { name: 'the filter parts', pattern: /\/tree-grid\/(filter-provider|input|clear)\// },
    { name: 'the collator-based matcher', pattern: /\/internals\/filter\.ts$/ },
  ])('keeps $name out of a tree without TreeGrid.FilterProvider', async ({ pattern }) => {
    const rootOnly = await buildFixture('tree-grid-root-only.tsx');
    const itemList = await buildFixture('tree-grid-list.tsx');
    const withFilter = await buildFixture('tree-grid-with-filter-provider.tsx');
    expect(includes(rootOnly, pattern)).toBe(false);
    expect(includes(itemList, pattern)).toBe(false);
    expect(includes(withFilter, pattern)).toBe(true);
  });

  it.each([
    {
      name: 'the status plugin',
      fixture: 'tree-grid-with-status.tsx',
      pattern: /\/tree-grid\/plugins\/TreeGridStatusPlugin\.ts$/,
    },
  ])('keeps $name out of an item list without its provider', async ({ fixture, pattern }) => {
    const itemList = await buildFixture('tree-grid-list.tsx');
    const withProvider = await buildFixture(fixture);
    expect(includes(itemList, pattern)).toBe(false);
    expect(includes(withProvider, pattern)).toBe(true);
  });

  it('keeps the public createItems factory out of a standard TreeGrid.Root-only build', async () => {
    const rootOnly = await buildFixture('tree-grid-root-only.tsx');
    const withCreateItems = await buildFixture('tree-grid-with-create-items.tsx');

    expect(rootOnly.some((id) => id.endsWith('/tree-grid/items/createItems.ts'))).toBe(false);
    expect(withCreateItems.some((id) => id.endsWith('/tree-grid/items/createItems.ts'))).toBe(true);
  });
});
