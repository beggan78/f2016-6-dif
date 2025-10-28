import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useTypeaheadDropdown } from '../useTypeaheadDropdown';

function TestComponent({ initialValue = '', blurCloseDelay }) {
  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    containerRef,
    inputRef,
    handleFocus,
    handleBlur,
    handleKeyDown
  } = useTypeaheadDropdown({ initialValue, blurCloseDelay });

  return (
    <div data-testid="container" ref={containerRef}>
      <input
        data-testid="input"
        ref={inputRef}
        value={query}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onChange={(event) => setQuery(event.target.value)}
      />
      <button data-testid="toggle" onClick={() => setIsOpen(!isOpen)}>
        toggle
      </button>
      <div data-testid="open-state">{isOpen ? 'open' : 'closed'}</div>
      <div data-testid="query-value">{query}</div>
    </div>
  );
}

describe('useTypeaheadDropdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with provided initial value', () => {
    const { getByTestId } = render(<TestComponent initialValue="Djurgården" />);
    expect(getByTestId('query-value').textContent).toBe('Djurgården');
  });

  it('opens on focus and closes on blur after delay', () => {
    const { getByTestId } = render(<TestComponent blurCloseDelay={200} />);
    const input = getByTestId('input');

    fireEvent.focus(input);
    expect(getByTestId('open-state').textContent).toBe('open');

    fireEvent.blur(input);
    expect(getByTestId('open-state').textContent).toBe('open');

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(getByTestId('open-state').textContent).toBe('open');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getByTestId('open-state').textContent).toBe('closed');
  });

  it('clears the blur timeout if focus returns before delay completes', () => {
    const { getByTestId } = render(<TestComponent blurCloseDelay={200} />);
    const input = getByTestId('input');

    fireEvent.focus(input);
    fireEvent.blur(input);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    fireEvent.focus(input); // Should cancel the pending close
    expect(getByTestId('open-state').textContent).toBe('open');

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(getByTestId('open-state').textContent).toBe('open');
  });

  it('closes when Escape is pressed and blurs the input', () => {
    const { getByTestId } = render(<TestComponent />);
    const input = getByTestId('input');

    fireEvent.focus(input);
    expect(getByTestId('open-state').textContent).toBe('open');

    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    expect(getByTestId('open-state').textContent).toBe('closed');
    expect(document.activeElement).not.toBe(input);
  });

  it('closes when clicking outside the container', () => {
    const { getByTestId } = render(
      <div>
        <TestComponent />
        <button data-testid="outside">outside</button>
      </div>
    );

    const input = getByTestId('input');
    fireEvent.focus(input);
    expect(getByTestId('open-state').textContent).toBe('open');

    fireEvent.mouseDown(getByTestId('outside'));
    expect(getByTestId('open-state').textContent).toBe('closed');
  });

  it('cleans up timers and listeners on unmount', () => {
    const { unmount, getByTestId } = render(<TestComponent blurCloseDelay={200} />);
    const input = getByTestId('input');

    fireEvent.focus(input);
    fireEvent.blur(input);

    unmount();

    act(() => {
      jest.runOnlyPendingTimers();
    });
  });
});
