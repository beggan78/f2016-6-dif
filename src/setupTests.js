// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Initialize i18n globally for all tests so useTranslation returns actual translations
import './locales/i18n';

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
// Keep it simple to avoid conflicts with Jest fake timers
if (typeof global.requestAnimationFrame === 'undefined') {
  let rafId = 0;
  global.requestAnimationFrame = (callback) => {
    const id = ++rafId;
    // Use queueMicrotask instead of setTimeout to avoid fake timer conflicts
    queueMicrotask(() => callback(Date.now()));
    return id;
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  // No-op implementation - microtasks can't be cancelled
  global.cancelAnimationFrame = () => {};
}

// Mock PointerEvent for tests (ensure it's always compatible with user-event)
// Always override to ensure properties are writable for @testing-library/user-event
global.PointerEvent = class PointerEvent extends MouseEvent {
  constructor(type, props = {}) {
    super(type, props);
    // Make properties writable so user-event can modify them
    Object.defineProperty(this, 'pointerId', {
      value: props.pointerId || 0,
      writable: true,
      configurable: true
    });
    Object.defineProperty(this, 'pointerType', {
      value: props.pointerType || 'mouse',
      writable: true,
      configurable: true
    });
  }
};
