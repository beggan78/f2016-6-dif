import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useOpponentNameSuggestions } from '../useOpponentNameSuggestions';
import { getOpponentNameHistory } from '../../services/opponentNameService';

jest.mock('../../services/opponentNameService', () => ({
  getOpponentNameHistory: jest.fn()
}));

function TestComponent({ teamId }) {
  const { names, loading, error, refresh } = useOpponentNameSuggestions(teamId);

  return (
    <div>
      <div data-testid="names">{names.join(',')}</div>
      <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="error">{error || ''}</div>
      <button data-testid="refresh" onClick={() => refresh()}>
        refresh
      </button>
    </div>
  );
}

describe('useOpponentNameSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads names for the initial team id', async () => {
    getOpponentNameHistory.mockResolvedValue({
      success: true,
      names: ['Alpha FC', 'Beta United']
    });

    render(<TestComponent teamId="team-1" />);

    expect(getOpponentNameHistory).toHaveBeenCalledWith('team-1', { limit: 100 });
    expect(screen.getByTestId('loading').textContent).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('names').textContent).toBe('Alpha FC,Beta United');
    });

    expect(screen.getByTestId('loading').textContent).toBe('idle');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('exposes error state when loading fails', async () => {
    getOpponentNameHistory.mockResolvedValue({
      success: false,
      names: [],
      error: 'Failed to load opponent history.'
    });

    render(<TestComponent teamId="team-2" />);

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Failed to load opponent history.');
    });

    expect(screen.getByTestId('names').textContent).toBe('');
  });

  it('refetches when the team id changes', async () => {
    getOpponentNameHistory
      .mockResolvedValueOnce({ success: true, names: ['Alpha FC'] })
      .mockResolvedValueOnce({ success: true, names: ['Gamma City'] });

    const { rerender } = render(<TestComponent teamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('names').textContent).toBe('Alpha FC');
    });

    rerender(<TestComponent teamId="team-2" />);

    await waitFor(() => {
      expect(screen.getByTestId('names').textContent).toBe('Gamma City');
    });

    expect(getOpponentNameHistory).toHaveBeenCalledTimes(2);
    expect(getOpponentNameHistory).toHaveBeenNthCalledWith(2, 'team-2', { limit: 100 });
  });

  it('supports manual refresh', async () => {
    getOpponentNameHistory
      .mockResolvedValueOnce({ success: true, names: ['Initial Team'] })
      .mockResolvedValueOnce({ success: true, names: ['Refreshed Team'] });

    render(<TestComponent teamId="team-1" />);

    await waitFor(() => {
      expect(screen.getByTestId('names').textContent).toBe('Initial Team');
    });

    fireEvent.click(screen.getByTestId('refresh'));

    await waitFor(() => {
      expect(screen.getByTestId('names').textContent).toBe('Refreshed Team');
    });

    expect(getOpponentNameHistory).toHaveBeenCalledTimes(2);
  });
});
