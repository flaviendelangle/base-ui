import { createDemoWithVariants } from 'docs/src/utils/createDemo';
import CssModules from './css-modules';

export const DemoTreeFileExplorer = createDemoWithVariants(import.meta.url, {
  CssModules,
});
