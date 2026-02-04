import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { useDebouncedSearch } from '../useDebouncedSearch';

function TestComponent({ callback, delay = 300 }) {
  const { run, cancel } = useDebouncedSearch(callback, delay);

  return (
    <div>
      <button data-testid="run" onClick={() => run('query')}>
        run
      </button>
      <button data-testid="run-second" onClick={() => run('updated')}>
        run second
      </button>
      <button data-testid="cancel" onClick={cancel}>
        cancel
      </button>
    </div>
  );
}

describe('useDebouncedSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers({ shouldClearNativeTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('invokes the callback after the specified delay', () => {
    const callback = jest.fn();
    const { getByTestId } = render(<TestComponent callback={callback} delay={200} />);

    fireEvent.click(getByTestId('run'));
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledWith('query');
  });

  it('resets the timer when run is called repeatedly', () => {
    const callback = jest.fn();
    const { getByTestId } = render(<TestComponent callback={callback} delay={200} />);

    fireEvent.click(getByTestId('run'));
    act(() => {
      jest.advanceTimersByTime(150);
    });

    fireEvent.click(getByTestId('run-second'));

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('updated');
  });

  it('cancels scheduled execution when cancel is called', () => {
    const callback = jest.fn();
    const { getByTestId } = render(<TestComponent callback={callback} delay={200} />);

    fireEvent.click(getByTestId('run'));
    fireEvent.click(getByTestId('cancel'));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('clears timers on unmount', () => {
    const callback = jest.fn();
    const { getByTestId, unmount } = render(<TestComponent callback={callback} delay={200} />);

    fireEvent.click(getByTestId('run'));
    unmount();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('uses the latest callback when it changes', () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const { getByTestId, rerender } = render(
      <TestComponent callback={firstCallback} delay={100} />
    );

    fireEvent.click(getByTestId('run'));

    rerender(<TestComponent callback={secondCallback} delay={100} />);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith('query');
  });
});
