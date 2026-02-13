import { act, renderHook, waitFor } from '@testing-library/react';
import { useProviderAvailability } from '../useProviderAvailability';
import { getMatchPlayerAvailability } from '../../services/matchIntegrationService';

jest.mock('../../services/matchIntegrationService', () => ({
  getMatchPlayerAvailability: jest.fn()
}));

describe('useProviderAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty state when there are no matches', () => {
    const { result } = renderHook(() => useProviderAvailability([]));

    expect(result.current.providerUnavailableByMatch).toEqual({});
    expect(result.current.providerAvailabilityLoading).toBe(false);
    expect(getMatchPlayerAvailability).not.toHaveBeenCalled();
  });

  it('derives unavailable players from provider availability and declined responses', async () => {
    getMatchPlayerAvailability.mockResolvedValue({
      success: true,
      availabilityByMatch: {
        'match-1': {
          'player-1': { availability: 'available', response: 'accepted' },
          'player-2': { availability: 'unavailable', response: 'accepted' },
          'player-3': { availability: 'available', response: 'declined' }
        },
        'match-2': {
          'player-4': { availability: 'unavailable', response: 'declined' },
          'player-5': { availability: 'unknown', response: 'no_response' }
        }
      }
    });

    const matches = [{ id: 'match-1' }, { id: 'match-2' }];
    const { result } = renderHook(() => useProviderAvailability(matches));

    await waitFor(() => {
      expect(result.current.providerAvailabilityLoading).toBe(false);
    });

    expect(getMatchPlayerAvailability).toHaveBeenCalledWith(['match-1', 'match-2']);
    expect(result.current.providerUnavailableByMatch).toEqual({
      'match-1': ['player-2', 'player-3'],
      'match-2': ['player-4']
    });
  });

  it('tracks loading while fetching provider availability', async () => {
    let resolveRequest;
    getMatchPlayerAvailability.mockImplementation(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );

    const { result } = renderHook(() => useProviderAvailability([{ id: 'match-1' }]));

    expect(result.current.providerAvailabilityLoading).toBe(true);

    act(() => {
      resolveRequest({ success: true, availabilityByMatch: {} });
    });

    await waitFor(() => {
      expect(result.current.providerAvailabilityLoading).toBe(false);
    });
  });

  it('falls back to empty state when service returns failure', async () => {
    getMatchPlayerAvailability.mockResolvedValue({
      success: false,
      error: 'Database error'
    });

    const { result } = renderHook(() => useProviderAvailability([{ id: 'match-1' }]));

    await waitFor(() => {
      expect(result.current.providerAvailabilityLoading).toBe(false);
    });

    expect(result.current.providerUnavailableByMatch).toEqual({});
  });

  describe('providerResponseByMatch', () => {
    it('returns response map per match from availability data', async () => {
      getMatchPlayerAvailability.mockResolvedValue({
        success: true,
        availabilityByMatch: {
          'match-1': {
            'player-1': { availability: 'available', response: 'accepted' },
            'player-2': { availability: 'unavailable', response: 'declined' },
            'player-3': { availability: 'available', response: 'no_response' }
          },
          'match-2': {
            'player-4': { availability: 'available', response: 'accepted' }
          }
        }
      });

      const { result } = renderHook(() => useProviderAvailability([{ id: 'match-1' }, { id: 'match-2' }]));

      await waitFor(() => {
        expect(result.current.providerAvailabilityLoading).toBe(false);
      });

      expect(result.current.providerResponseByMatch).toEqual({
        'match-1': {
          'player-1': 'accepted',
          'player-2': 'declined',
          'player-3': 'no_response'
        },
        'match-2': {
          'player-4': 'accepted'
        }
      });
    });

    it('excludes matches with no response data', async () => {
      getMatchPlayerAvailability.mockResolvedValue({
        success: true,
        availabilityByMatch: {
          'match-1': {
            'player-1': { availability: 'available' }
          },
          'match-2': {
            'player-2': { availability: 'available', response: 'accepted' }
          }
        }
      });

      const { result } = renderHook(() => useProviderAvailability([{ id: 'match-1' }, { id: 'match-2' }]));

      await waitFor(() => {
        expect(result.current.providerAvailabilityLoading).toBe(false);
      });

      expect(result.current.providerResponseByMatch).toEqual({
        'match-2': { 'player-2': 'accepted' }
      });
    });

    it('returns empty object on failure', async () => {
      getMatchPlayerAvailability.mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const { result } = renderHook(() => useProviderAvailability([{ id: 'match-1' }]));

      await waitFor(() => {
        expect(result.current.providerAvailabilityLoading).toBe(false);
      });

      expect(result.current.providerResponseByMatch).toEqual({});
    });

    it('returns empty object when there are no matches', () => {
      const { result } = renderHook(() => useProviderAvailability([]));

      expect(result.current.providerResponseByMatch).toEqual({});
    });
  });
});
