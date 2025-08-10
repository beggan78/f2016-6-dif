import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Sport Wizard app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Sport Wizard/i);
  expect(titleElement).toBeInTheDocument();
});

// Note: More comprehensive integration testing for browser back functionality
// is covered by individual component tests:
// - TacticalBoardScreen.test.js: Tests navigation handler registration and cleanup
// - useBrowserBackIntercept.test.js: Tests the hook's navigation handling behavior
// These focused tests provide better coverage than complex App-level mocking.
