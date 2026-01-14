/**
 * TeamContext Tests
 *
 * Focused coverage for leave/delete membership actions and current team cleanup.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { TeamProvider, useTeam } from '../TeamContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../AuthContext';
import { getCachedTeamData, cacheTeamData } from '../../utils/cacheUtils';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

jest.mock('../AuthContext', () => ({
  useAuth: jest.fn()
}));

jest.mock('../../utils/cacheUtils', () => ({
  getCachedTeamData: jest.fn(),
  cacheTeamData: jest.fn()
}));

jest.mock('../../utils/persistenceManager', () => ({
  createPersistenceManager: jest.fn(),
  createGamePersistenceManager: jest.fn(() => ({
    loadState: jest.fn(() => ({})),
    saveState: jest.fn(() => true),
    clearState: jest.fn(() => true)
  }))
}));

describe('TeamContext', () => {
  let tableResponses;
  let persistenceManagers;

  const setTableResponses = (table, responses) => {
    tableResponses.set(table, responses.map(response => ({ ...response })));
  };

  const createFromBuilder = (table) => {
    const builder = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      delete: jest.fn(() => builder),
      insert: jest.fn(() => builder),
      update: jest.fn(() => builder),
      upsert: jest.fn(() => builder),
      then: (resolve, reject) => {
        const responseQueue = tableResponses.get(table);
        const response = responseQueue && responseQueue.length > 0
          ? responseQueue.shift()
          : { data: [], error: null };
        return Promise.resolve(response).then(resolve, reject);
      }
    };

    return builder;
  };

  const renderTeamHook = () => {
    const wrapper = ({ children }) => (
      <TeamProvider>{children}</TeamProvider>
    );
    return renderHook(() => useTeam(), { wrapper });
  };

  beforeEach(() => {
    tableResponses = new Map();
    persistenceManagers = new Map();

    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: { id: 'user-1' },
      userProfile: null,
      sessionDetectionResult: null
    });

    getCachedTeamData.mockReturnValue({});

    createPersistenceManager.mockImplementation((storageKey, defaultState = {}) => {
      const manager = {
        storageKey,
        defaultState,
        _state: { ...defaultState },
        loadState: jest.fn(() => manager._state),
        saveState: jest.fn((nextState) => {
          manager._state = { ...manager._state, ...nextState };
          return true;
        }),
        clearState: jest.fn(() => {
          manager._state = { ...defaultState };
          return true;
        })
      };
      persistenceManagers.set(storageKey, manager);
      return manager;
    });

    supabase.from.mockImplementation((table) => createFromBuilder(table));
    supabase.rpc.mockResolvedValue({ data: { success: true }, error: null });
  });

  describe('leaveTeam', () => {
    test('should clear current team and persistence when leaving current team', async () => {
      const team = {
        id: 'team-1',
        name: 'Alpha',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        club: null
      };

      setTableResponses('team_user', [
        { data: [{ role: 'admin', team }], error: null },
        { data: [], error: null }
      ]);
      setTableResponses('club_user', [{ data: [], error: null }]);
      setTableResponses('player', [{ data: [], error: null }]);
      setTableResponses('team_preference', [{ data: [], error: null }]);

      const { result } = renderTeamHook();

      await waitFor(() => {
        expect(result.current.currentTeam?.id).toBe('team-1');
      });

      await act(async () => {
        await result.current.leaveTeam(team);
      });

      await waitFor(() => {
        expect(result.current.currentTeam).toBeNull();
      });

      const teamIdPersistence = persistenceManagers.get(STORAGE_KEYS.CURRENT_TEAM_ID);
      expect(teamIdPersistence.clearState).toHaveBeenCalled();
      expect(cacheTeamData).toHaveBeenCalledWith(expect.objectContaining({
        currentTeam: null,
        teamPlayers: []
      }));
      expect(supabase.rpc).toHaveBeenCalledWith('leave_team', { p_team_id: 'team-1' });
    });
  });

  describe('deleteTeam', () => {
    test('should clear current team when deleting current team', async () => {
      const team = {
        id: 'team-1',
        name: 'Alpha',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        club: null
      };

      setTableResponses('team_user', [
        { data: [{ role: 'admin', team }], error: null },
        { data: [], error: null }
      ]);
      setTableResponses('club_user', [{ data: [], error: null }]);
      setTableResponses('player', [{ data: [], error: null }]);
      setTableResponses('team_preference', [{ data: [], error: null }]);

      supabase.rpc.mockResolvedValueOnce({ data: { success: true }, error: null });

      const { result } = renderTeamHook();

      await waitFor(() => {
        expect(result.current.currentTeam?.id).toBe('team-1');
      });

      await act(async () => {
        await result.current.deleteTeam(team.id);
      });

      await waitFor(() => {
        expect(result.current.currentTeam).toBeNull();
      });

      expect(supabase.rpc).toHaveBeenCalledWith('delete_team', { p_team_id: 'team-1' });
    });
  });

  describe('leaveClub', () => {
    test('should return blocking response for last team member', async () => {
      setTableResponses('team_user', [{ data: [], error: null }]);
      setTableResponses('club_user', [{ data: [], error: null }]);

      supabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'last_team_member',
          teams: ['Alpha']
        },
        error: null
      });

      const { result } = renderTeamHook();

      let leaveResult;
      await act(async () => {
        leaveResult = await result.current.leaveClub('club-1');
      });

      expect(leaveResult).toEqual(expect.objectContaining({
        error: 'last_team_member',
        teams: ['Alpha']
      }));
      expect(result.current.error).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledWith('leave_club', { p_club_id: 'club-1' });
    });
  });

  describe('getUserTeams', () => {
    test('should clear current team when it is no longer available', async () => {
      const team = {
        id: 'team-1',
        name: 'Alpha',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        club: null
      };

      setTableResponses('team_user', [
        { data: [{ role: 'admin', team }], error: null },
        { data: [], error: null }
      ]);
      setTableResponses('club_user', [{ data: [], error: null }]);
      setTableResponses('player', [{ data: [], error: null }]);
      setTableResponses('team_preference', [{ data: [], error: null }]);

      const { result } = renderTeamHook();

      await waitFor(() => {
        expect(result.current.currentTeam?.id).toBe('team-1');
      });

      await act(async () => {
        await result.current.getUserTeams();
      });

      await waitFor(() => {
        expect(result.current.currentTeam).toBeNull();
      });

      const teamIdPersistence = persistenceManagers.get(STORAGE_KEYS.CURRENT_TEAM_ID);
      expect(teamIdPersistence.clearState).toHaveBeenCalled();
      expect(cacheTeamData).toHaveBeenCalledWith(expect.objectContaining({
        currentTeam: null,
        teamPlayers: []
      }));
    });
  });
});
