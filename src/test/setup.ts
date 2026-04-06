import "@testing-library/jest-dom";
import { vi } from 'vitest';

vi.mock('@/services/api', async () => import('@/test/mockApiService'));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
