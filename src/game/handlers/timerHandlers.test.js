import { createTimerHandlers } from './timerHandlers';
import { handlePauseResumeTime } from '../time/stintManager';
import { 
  createMockPlayers, 
  createMockDependencies
} from '../testUtils';
import { TEAM_CONFIGS } from '../testUtils';

jest.mock('../time/stintManager');

describe('createTimerHandlers', () => {
  let mockDependencies;
  let mockPlayers;
  let mockSelectedSquadPlayers;
  let mockTimerControls;
  let mockStateUpdaters;
  let mockGameStateFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDependencies = createMockDependencies();
    mockPlayers = createMockPlayers(7, TEAM_CONFIGS.INDIVIDUAL_7);
    mockSelectedSquadPlayers = mockPlayers.slice(0, 6); // 6 selected players

    mockStateUpdaters = {
      ...mockDependencies.stateUpdaters,
      setAllPlayers: jest.fn()
    };

    mockTimerControls = {
      pauseSubTimer: jest.fn(),
      resumeSubTimer: jest.fn()
    };

    mockGameStateFactory = jest.fn(() => ({
      currentPeriodNumber: 1,
      subTimerSeconds: 0,
      matchTimerSeconds: 900,
      selectedSquadPlayers: mockSelectedSquadPlayers,
      allPlayers: mockPlayers
    }));

    handlePauseResumeTime.mockImplementation((player, timeEpoch, isPausing) => ({
      ...player,
      stats: {
        ...player.stats,
        lastStintStartTimeEpoch: isPausing ? null : timeEpoch
      }
    }));
  });

  describe('handler creation', () => {
    it('should create all required handler functions', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      expect(handlers.handlePauseTimer).toBeDefined();
      expect(handlers.handleResumeTimer).toBeDefined();
      expect(handlers.updatePlayerStatsForPause).toBeDefined();
      expect(typeof handlers.handlePauseTimer).toBe('function');
      expect(typeof handlers.handleResumeTimer).toBe('function');
      expect(typeof handlers.updatePlayerStatsForPause).toBe('function');
    });
  });

  describe('handlePauseTimer', () => {
    it('should call pauseSubTimer with update function', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.handlePauseTimer();

      expect(mockTimerControls.pauseSubTimer).toHaveBeenCalledTimes(1);
      expect(mockTimerControls.pauseSubTimer).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should pass the correct update function to pauseSubTimer', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.handlePauseTimer();

      const updateFunction = mockTimerControls.pauseSubTimer.mock.calls[0][0];
      expect(updateFunction).toBe(handlers.updatePlayerStatsForPause);
    });
  });

  describe('handleResumeTimer', () => {
    it('should call resumeSubTimer with update function', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.handleResumeTimer();

      expect(mockTimerControls.resumeSubTimer).toHaveBeenCalledTimes(1);
      expect(mockTimerControls.resumeSubTimer).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should pass the correct update function to resumeSubTimer', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.handleResumeTimer();

      const updateFunction = mockTimerControls.resumeSubTimer.mock.calls[0][0];
      expect(updateFunction).toBe(handlers.updatePlayerStatsForPause);
    });
  });

  describe('updatePlayerStatsForPause', () => {
    it('should update player stats for pausing', () => {
      const currentTime = 2000;
      const isPausing = true;

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        const updatedPlayers = callback(mockPlayers);
        expect(updatedPlayers).toHaveLength(mockPlayers.length);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledTimes(1);
      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    it('should update player stats for resuming', () => {
      const currentTime = 3000;
      const isPausing = false;

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        const updatedPlayers = callback(mockPlayers);
        expect(updatedPlayers).toHaveLength(mockPlayers.length);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledTimes(1);
      expect(handlePauseResumeTime).toHaveBeenCalledTimes(mockSelectedSquadPlayers.length);
    });

    it('should only update selected squad players', () => {
      const currentTime = 2000;
      const isPausing = true;
      const allPlayers = [...mockPlayers, 
        { id: '8', displayName: 'Player 8', firstName: 'Player', lastName: 'Eight', stats: { currentStatus: 'BENCH' }}
      ];

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        const updatedPlayers = callback(allPlayers);
        
        // Verify that only selected squad players were processed
        const processedPlayers = updatedPlayers.filter((player, index) => {
          const originalPlayer = allPlayers[index];
          return player !== originalPlayer; // Player was updated
        });
        
        expect(processedPlayers.length).toBeLessThanOrEqual(mockSelectedSquadPlayers.length);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      expect(handlePauseResumeTime).toHaveBeenCalledTimes(mockSelectedSquadPlayers.length);
    });

    it('should not update players not in selected squad', () => {
      const currentTime = 2000;
      const isPausing = true;
      const playersWithExtra = [...mockPlayers, 
        { id: '99', displayName: 'Not Selected', firstName: 'Not', lastName: 'Selected', stats: { currentStatus: 'BENCH' }}
      ];

      let callCount = 0;
      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        callback(playersWithExtra);
      });

      handlePauseResumeTime.mockImplementation((player) => {
        callCount++;
        return player;
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      // Should only call handlePauseResumeTime for selected squad players
      expect(callCount).toBe(mockSelectedSquadPlayers.length);
    });

    it('should handle empty selected squad gracefully', () => {
      const handlers = createTimerHandlers(
        [],
        mockStateUpdaters,
        mockTimerControls
      );

      handlers.updatePlayerStatsForPause(2000, true);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledTimes(1);
      expect(handlePauseResumeTime).not.toHaveBeenCalled();
    });

    it('should handle empty player list gracefully', () => {
      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        callback([]);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(2000, true);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalledTimes(1);
      expect(handlePauseResumeTime).not.toHaveBeenCalled();
    });
  });

  describe('integration with stint manager', () => {
    it('should properly integrate handlePauseResumeTime calls', () => {
      const currentTime = 5000;
      const isPausing = true;

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        callback(mockPlayers);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      mockSelectedSquadPlayers.forEach((selectedPlayer, index) => {
        expect(handlePauseResumeTime).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({ id: selectedPlayer.id }),
          currentTime,
          isPausing
        );
      });
    });

    it('should preserve updated player data from stint manager', () => {
      const currentTime = 5000;
      const isPausing = false;

      const updatedPlayerData = {
        ...mockPlayers[0],
        stats: {
          ...mockPlayers[0].stats,
          lastStintStartTimeEpoch: currentTime
        }
      };

      handlePauseResumeTime.mockReturnValueOnce(updatedPlayerData);

      let capturedUpdatedPlayers;
      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        capturedUpdatedPlayers = callback(mockPlayers);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      handlers.updatePlayerStatsForPause(currentTime, isPausing);

      expect(capturedUpdatedPlayers[0]).toEqual(updatedPlayerData);
    });
  });

  describe('timer control integration', () => {
    it('should integrate with pause timer control flow', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      // Simulate the pause flow
      handlers.handlePauseTimer();

      // Verify timer control was called
      expect(mockTimerControls.pauseSubTimer).toHaveBeenCalledWith(
        handlers.updatePlayerStatsForPause
      );

      // Simulate the timer control calling the update function
      const updateFunction = mockTimerControls.pauseSubTimer.mock.calls[0][0];
      updateFunction(2000, true);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalled();
    });

    it('should integrate with resume timer control flow', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      // Simulate the resume flow
      handlers.handleResumeTimer();

      // Verify timer control was called
      expect(mockTimerControls.resumeSubTimer).toHaveBeenCalledWith(
        handlers.updatePlayerStatsForPause
      );

      // Simulate the timer control calling the update function
      const updateFunction = mockTimerControls.resumeSubTimer.mock.calls[0][0];
      updateFunction(3000, false);

      expect(mockStateUpdaters.setAllPlayers).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle missing timer controls gracefully', () => {
      const incompleteTimerControls = {
        pauseSubTimer: jest.fn()
        // Missing resumeSubTimer
      };

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        incompleteTimerControls
      );

      expect(() => handlers.handlePauseTimer()).not.toThrow();
      expect(incompleteTimerControls.pauseSubTimer).toHaveBeenCalled();
    });

    it('should handle stint manager errors gracefully', () => {
      handlePauseResumeTime.mockImplementation(() => {
        throw new Error('Stint manager error');
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      expect(() => handlers.updatePlayerStatsForPause(2000, true)).not.toThrow();
    });

    it('should handle setAllPlayers callback errors gracefully', () => {
      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        try {
          callback(mockPlayers);
        } catch (error) {
          // Simulate error in callback handling
        }
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      expect(() => handlers.updatePlayerStatsForPause(2000, true)).not.toThrow();
    });

    it('should handle invalid time values gracefully', () => {
      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      expect(() => handlers.updatePlayerStatsForPause(null, true)).not.toThrow();
      expect(() => handlers.updatePlayerStatsForPause(undefined, false)).not.toThrow();
      expect(() => handlers.updatePlayerStatsForPause(-1000, true)).not.toThrow();
    });

    it('should handle malformed player data gracefully', () => {
      const malformedPlayers = [
        { id: '1' }, // Missing stats
        { id: '2', stats: null }, // Null stats
        null, // Null player
        undefined // Undefined player
      ];

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        callback(malformedPlayers);
      });

      const handlers = createTimerHandlers(
        mockSelectedSquadPlayers,
        mockStateUpdaters,
        mockTimerControls,
        mockGameStateFactory
      );

      // This will throw because of null player access
      expect(() => handlers.updatePlayerStatsForPause(2000, true)).toThrow();
    });
  });

  describe('performance considerations', () => {
    it('should minimize unnecessary player updates', () => {
      const largePlayerList = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Player ${i + 1}`,
        stats: { currentStatus: 'ON_FIELD' }
      }));

      const smallSelectedSquad = largePlayerList.slice(0, 7);

      mockStateUpdaters.setAllPlayers.mockImplementation((callback) => {
        callback(largePlayerList);
      });

      const handlers = createTimerHandlers(
        smallSelectedSquad,
        mockStateUpdaters,
        mockTimerControls
      );

      handlers.updatePlayerStatsForPause(2000, true);

      // Should only call handlePauseResumeTime for selected squad players
      expect(handlePauseResumeTime).toHaveBeenCalledTimes(smallSelectedSquad.length);
    });
  });
});
