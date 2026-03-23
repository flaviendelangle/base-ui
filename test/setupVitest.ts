import { vi } from 'vitest';
import setupVitest from '@mui/internal-test-utils/setupVitest';
// eslint-disable-next-line import/no-relative-packages
import '../packages/react/test/addVitestMatchers';
import '@testing-library/jest-dom/vitest';
import { reset } from '@base-ui/utils/error';

declare global {
  // eslint-disable-next-line vars-on-top
  var BASE_UI_ANIMATIONS_DISABLED: boolean;
}

setupVitest();

afterEach(() => {
  vi.resetAllMocks();
  reset();
});

globalThis.BASE_UI_ANIMATIONS_DISABLED = true;

if (typeof window !== 'undefined' && window?.navigator?.userAgent?.includes('jsdom')) {
  globalThis.requestAnimationFrame = (cb) => {
    setTimeout(() => cb(0), 0);
    return 0;
  };

  // Polyfill for pragmatic-drag-and-drop-auto-scroll which calls
  // document.elementFromPoint during its rAF loop.
  if (typeof document.elementFromPoint !== 'function') {
    document.elementFromPoint = () => null;
  }
}
