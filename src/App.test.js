import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Sport Wizard app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/Sport Wizard/i);
  expect(titleElement).toBeInTheDocument();
});
