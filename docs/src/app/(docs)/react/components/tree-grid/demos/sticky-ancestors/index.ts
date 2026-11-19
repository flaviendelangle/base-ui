import { createDemoWithVariants } from 'docs/src/utils/createDemo';
import CssModules from './css-modules';
import Tailwind from './tailwind';

export const DemoTreeGridStickyAncestors = createDemoWithVariants(import.meta.url, {
  CssModules,
  Tailwind,
});
