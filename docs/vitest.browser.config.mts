import { resolve } from 'node:path';
import { mergeConfig, defineProject } from 'vitest/config';
// eslint-disable-next-line import/no-relative-packages
import sharedConfig from '../vitest.shared.mts';

export default mergeConfig(
  sharedConfig,
  defineProject({
    oxc: { jsx: { runtime: 'automatic' } },
    optimizeDeps: {
      entries: [resolve(import.meta.dirname, 'src/**/*.browser.test.tsx')],
      include: ['react', 'react-dom', '@mui/internal-test-utils'],
      holdUntilCrawlEnd: true,
    },
    test: {
      name: 'docs-browser',
      browser: { viewport: { width: 1000, height: 800 } },
      include: ['src/**/*.browser.test.tsx'],
    },
    define: { 'process.env.NODE_ENV': JSON.stringify('test') },
  }),
);
