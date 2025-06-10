import { render, screen } from '@testing-library/react';
import App from './App';

test('renders DIF Coach app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/DIF F16-6 Coach/i);
  expect(titleElement).toBeInTheDocument();
});
