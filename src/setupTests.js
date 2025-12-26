// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.scrollTo for JSDOM tests (JSDOM doesn't implement this)
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
});

if (typeof globalThis.Deno === 'undefined') {
  globalThis.Deno = {
    env: {
      get: () => undefined
    }
  };
}
