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

// Mock requestAnimationFrame and cancelAnimationFrame for tests
if (typeof global.requestAnimationFrame === 'undefined') {
  let rafId = 0;
  global.requestAnimationFrame = (callback) => {
    const id = ++rafId;
    setTimeout(() => callback(Date.now()), 0);
    return id;
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
  };
}

// Mock PointerEvent for tests (not available in jsdom)
if (typeof global.PointerEvent === 'undefined') {
  global.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, props = {}) {
      super(type, props);
      Object.defineProperty(this, 'pointerId', { value: props.pointerId || 0, writable: false });
      Object.defineProperty(this, 'pointerType', { value: props.pointerType || 'mouse', writable: false });
    }
  };
}
