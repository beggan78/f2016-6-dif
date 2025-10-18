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

// Clean up after all tests to prevent hanging
// This is especially important for Supabase client which creates timers
afterAll(async () => {
  // Give async cleanup operations a chance to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
