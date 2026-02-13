/**
 * GameScreen Modal Actions Integration Tests
 *
 * Tests that handler functions from createSubstitutionHandlers produce correct
 * state transformations. Uses REAL handler logic and pure game state functions;
 * only external side effects (time, logging) and state updaters are mocked.
 *
 * Tested handlers:
 *   - handleSetNextSubstitution (single-sub + multi-sub modes)
 *   - handleRemoveFromNextSubstitution (single-sub + multi-sub modes)
 *   - handleSubstituteNow (single substitute, multiple substitutes)
 *   - handleChangePosition (show-options, back, select player)
 *   - handleInactivatePlayer
 *   - handleActivatePlayer
 *   - handleSetAsNextToGoIn
 *   - handleChangeNextPosition (show-options, back, select position)
 *   - handleSelectSubstituteForImmediate
 *   - handleCancelFieldPlayerModal / handleCancelSubstituteModal / handleCancelSubstituteSelection
 *
 * Tested across formation variations: 2-2 (7p), 1-2-1 (7p), 2-2-2 (9p)
 */

import { createSubstitutionHandlers } from '../game/handlers/substitutionHandlers';
import { createMockGameState, createMockDependencies, TEAM_CONFIGS } from '../game/testUtils';
import { ANIMATION_DURATION } from '../game/animation/animationSupport';

// Mock external side effects only
jest.mock('../utils/timeUtils', () => ({
  getCurrentTimestamp: jest.fn(() => 5000)
}));

jest.mock('../utils/gameEventLogger', () => ({
  logEvent: jest.fn(() => ({ id: 'test-event-1' })),
  removeEvent: jest.fn(),
  calculateMatchTime: jest.fn(() => '05:00'),
  EVENT_TYPES: {
    SUBSTITUTION: 'SUBSTITUTION',
    SUBSTITUTION_UNDONE: 'SUBSTITUTION_UNDONE',
    POSITION_CHANGE: 'POSITION_CHANGE',
    PLAYER_INACTIVATED: 'PLAYER_INACTIVATED',
    PLAYER_ACTIVATED: 'PLAYER_ACTIVATED'
  }
}));

// ===================================================================
// HELPERS
// ===================================================================

/**
 * Formation configs to test across: covers 5v5 2-2, 5v5 1-2-1, and 7v7 2-2-2
 */
const FORMATION_VARIANTS = [
  { name: '5v5 2-2 7p', teamConfig: TEAM_CONFIGS.INDIVIDUAL_7 },
  { name: '5v5 1-2-1 7p', teamConfig: TEAM_CONFIGS.INDIVIDUAL_7_1_2_1 },
  { name: '7v7 2-2-2 9p', teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_222 },
  { name: '7v7 2-3-1 10p', teamConfig: TEAM_CONFIGS.INDIVIDUAL_7V7_231 }
];

/**
 * Create a full handler setup with real logic, mock state updaters.
 * Returns { handlers, deps, gameState } where deps contains the mock functions.
 */
const createHandlerSetup = (teamConfig, gameStateOverrides = {}, substitutionCount = 1) => {
  const gameState = createMockGameState(teamConfig, gameStateOverrides);
  const deps = createMockDependencies();

  // Wire up the gameStateFactory to return our test game state
  deps.gameStateFactory.mockReturnValue(gameState);

  // Add extra state updaters that createSubstitutionHandlers expects
  deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
  deps.stateUpdaters.setSubstitutionOverride = jest.fn();
  deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
  deps.stateUpdaters.setLastSubstitution = jest.fn();
  deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
  deps.stateUpdaters.resetSubTimer = jest.fn();
  deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();

  // Add modals reference to modalHandlers (needed by handleChangeNextPosition)
  deps.modalHandlers.modals = {
    substitute: {
      isOpen: true,
      playerId: null,
      playerName: '',
      isCurrentlyInactive: false,
      canSetAsNextToGoIn: false,
      canChangeNextPosition: false,
      availableNextPositions: [],
      showPositionSelection: false
    }
  };

  const handlers = createSubstitutionHandlers(
    deps.gameStateFactory,
    deps.stateUpdaters,
    deps.animationHooks,
    deps.modalHandlers,
    teamConfig,
    () => substitutionCount
  );

  return { handlers, deps, gameState };
};

// ===================================================================
// TEST SUITE
// ===================================================================

describe('GameScreen Modal Actions - Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // =================================================================
  // handleSetNextSubstitution
  // =================================================================

  describe('handleSetNextSubstitution', () => {
    describe('single-sub mode (substitutionCount = 1)', () => {
      FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
        it(`[${name}] sets next player to sub out and closes modal`, () => {
          const { handlers, deps } = createHandlerSetup(teamConfig);
          const fieldPlayerModal = {
            type: 'player',
            target: 'leftDefender',
            sourcePlayerId: '1'
          };

          handlers.handleSetNextSubstitution(fieldPlayerModal);

          expect(deps.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalledWith('leftDefender', false);
          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
        });
      });
    });

    describe('multi-sub mode (substitutionCount = 2)', () => {
      FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
        it(`[${name}] animates player into "next to go off" group and updates queue`, () => {
          const { handlers, deps, gameState } = createHandlerSetup(teamConfig, {}, 2);
          const fieldPlayerModal = {
            type: 'player',
            target: 'leftDefender',
            sourcePlayerId: '3' // Pick a player NOT already in first 2 queue positions
          };

          handlers.handleSetNextSubstitution(fieldPlayerModal);

          // Animation is triggered - advance past ANIMATION_DURATION
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // State updaters should be called with transformed values
          expect(deps.stateUpdaters.setRotationQueue).toHaveBeenCalled();
          const newQueue = deps.stateUpdaters.setRotationQueue.mock.calls[0][0];

          // Player '3' should be moved to front of queue
          expect(newQueue[0]).toBe('3');
          // Original first two players shifted down by one
          expect(newQueue[1]).toBe('1');
          expect(newQueue[2]).toBe('2');
          // No players lost
          expect(newQueue.length).toBe(gameState.rotationQueue.length);

          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
        });
      });
    });

    it('does nothing for non-player type modals', () => {
      const { handlers, deps } = createHandlerSetup(TEAM_CONFIGS.INDIVIDUAL_7);
      const fieldPlayerModal = { type: 'goalie', target: 'goalie', sourcePlayerId: '7' };

      handlers.handleSetNextSubstitution(fieldPlayerModal);

      expect(deps.stateUpdaters.setNextPlayerToSubOut).not.toHaveBeenCalled();
      expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
    });
  });

  // =================================================================
  // handleRemoveFromNextSubstitution
  // =================================================================

  describe('handleRemoveFromNextSubstitution', () => {
    describe('single-sub mode', () => {
      FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
        it(`[${name}] reverts next player to queue-based selection`, () => {
          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const firstPlayerId = gameState.rotationQueue[0];
          const fieldPlayerModal = {
            type: 'player',
            target: 'leftDefender',
            sourcePlayerId: firstPlayerId
          };

          handlers.handleRemoveFromNextSubstitution(fieldPlayerModal);

          // Advance past animation
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Should update rotation queue and next player tracking
          expect(deps.stateUpdaters.setRotationQueue).toHaveBeenCalled();
          const newQueue = deps.stateUpdaters.setRotationQueue.mock.calls[0][0];

          // Removed player moved from position 0 to position 1
          const expectedNewLeaderId = gameState.rotationQueue[1];
          expect(newQueue[0]).toBe(expectedNewLeaderId);
          expect(newQueue[1]).toBe(firstPlayerId);
          expect(newQueue.length).toBe(gameState.rotationQueue.length);

          // Next player tracking updated to new queue leader
          expect(deps.stateUpdaters.setNextPlayerIdToSubOut).toHaveBeenCalledWith(expectedNewLeaderId);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const expectedPosition = definition.fieldPositions.find(
            pos => gameState.formation[pos] === expectedNewLeaderId
          );
          expect(deps.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalledWith(expectedPosition, true);

          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
        });
      });
    });

    describe('multi-sub mode (substitutionCount = 2)', () => {
      it('removes player from "next to go off" group via animation', () => {
        const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;
        const { handlers, deps, gameState } = createHandlerSetup(teamConfig, {}, 2);
        const firstPlayerId = gameState.rotationQueue[0];
        const fieldPlayerModal = {
          type: 'player',
          target: 'leftDefender',
          sourcePlayerId: firstPlayerId
        };

        handlers.handleRemoveFromNextSubstitution(fieldPlayerModal);
        jest.advanceTimersByTime(ANIMATION_DURATION);

        expect(deps.stateUpdaters.setRotationQueue).toHaveBeenCalled();
        const newQueue = deps.stateUpdaters.setRotationQueue.mock.calls[0][0];

        // Player removed from "next 2" group: inserted at position substitutionCount (2)
        expect(newQueue[0]).toBe('2');
        expect(newQueue[1]).toBe('3');
        expect(newQueue[2]).toBe(firstPlayerId); // '1' moved to position 2
        expect(newQueue.length).toBe(gameState.rotationQueue.length);

        expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
      });
    });
  });

  // =================================================================
  // handleSubstituteNow
  // =================================================================

  describe('handleSubstituteNow', () => {
    describe('single active substitute', () => {
      FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
        it(`[${name}] triggers immediate substitution flow`, () => {
          // Create a game state where only one substitute is active
          const gameState = createMockGameState(teamConfig);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          // If there are multiple subs, inactivate all but the first
          if (subPositions.length > 1) {
            for (let i = 1; i < subPositions.length; i++) {
              const subPlayerId = gameState.formation[subPositions[i]];
              const player = gameState.allPlayers.find(p => p.id === subPlayerId);
              if (player) {
                player.stats.isInactive = true;
              }
            }
          }

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const firstFieldPos = definition.fieldPositions[0];

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          const fieldPlayerModal = {
            type: 'player',
            target: firstFieldPos,
            sourcePlayerId: gameState.formation[firstFieldPos],
            playerName: 'Test Player'
          };

          handlers.handleSubstituteNow(fieldPlayerModal);

          // May need to advance timers if an animation reorder happened
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Should trigger immediate sub by setting next player and shouldSubstituteNow
          expect(deps.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalled();
          expect(deps.stateUpdaters.setShouldSubstituteNow).toHaveBeenCalledWith(true);
          expect(deps.stateUpdaters.setSubstitutionOverride).toHaveBeenCalled();
          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
        });
      });
    });

    describe('multiple active substitutes', () => {
      it('opens SubstituteSelectionModal with sorted substitute list', () => {
        const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;
        const { handlers, deps, gameState } = createHandlerSetup(teamConfig);

        const fieldPlayerModal = {
          type: 'player',
          target: 'leftDefender',
          sourcePlayerId: gameState.formation.leftDefender,
          playerName: 'Player 1'
        };

        handlers.handleSubstituteNow(fieldPlayerModal);

        // Multiple active subs -> should open selection modal
        expect(deps.modalHandlers.openSubstituteSelectionModal).toHaveBeenCalled();
        const call = deps.modalHandlers.openSubstituteSelectionModal.mock.calls[0][0];
        expect(call.fieldPlayerId).toBe(gameState.formation.leftDefender);
        expect(call.availableSubstitutes.length).toBeGreaterThan(0);
        expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
      });

      it('opens SubstituteSelectionModal for 7v7 2-2-2 formation', () => {
        const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_222;
        const { handlers, deps, gameState } = createHandlerSetup(teamConfig);

        const fieldPlayerModal = {
          type: 'player',
          target: 'leftDefender',
          sourcePlayerId: gameState.formation.leftDefender,
          playerName: 'Player 1'
        };

        handlers.handleSubstituteNow(fieldPlayerModal);

        expect(deps.modalHandlers.openSubstituteSelectionModal).toHaveBeenCalled();
        const call = deps.modalHandlers.openSubstituteSelectionModal.mock.calls[0][0];
        expect(call.availableSubstitutes.length).toBe(2);
      });
    });
  });

  // =================================================================
  // handleChangePosition
  // =================================================================

  describe('handleChangePosition', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('show-options: opens modal with available field players for swap', () => {
          const gameState = createMockGameState(teamConfig);
          // Add fieldPlayerModal to game state (required by handleChangePosition)
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const firstFieldPos = definition.fieldPositions[0];
          gameState.fieldPlayerModal = {
            type: 'player',
            target: firstFieldPos,
            sourcePlayerId: gameState.formation[firstFieldPos],
            playerName: 'Player 1'
          };

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          handlers.handleChangePosition('show-options');

          // Should open modal with available players (other field players, not subs or self)
          expect(deps.modalHandlers.openFieldPlayerModal).toHaveBeenCalled();
          const call = deps.modalHandlers.openFieldPlayerModal.mock.calls[0][0];
          expect(call.showPositionOptions).toBe(true);
          expect(call.availablePlayers.length).toBe(definition.fieldPositions.length - 1);

          // None of the available players should be a substitute
          const subPlayerIds = definition.substitutePositions.map(pos => gameState.formation[pos]);
          call.availablePlayers.forEach(player => {
            expect(subPlayerIds).not.toContain(player.id);
          });
        });

        it('null: resets modal to main view (go back)', () => {
          const gameState = createMockGameState(teamConfig);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const firstFieldPos = definition.fieldPositions[0];
          gameState.fieldPlayerModal = {
            type: 'player',
            target: firstFieldPos,
            sourcePlayerId: gameState.formation[firstFieldPos],
            playerName: 'Player 1'
          };

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          handlers.handleChangePosition(null);

          expect(deps.modalHandlers.openFieldPlayerModal).toHaveBeenCalled();
          const call = deps.modalHandlers.openFieldPlayerModal.mock.calls[0][0];
          expect(call.showPositionOptions).toBe(false);
          expect(call.availablePlayers).toEqual([]);
        });

        it('playerId: performs animated position switch and updates formation', () => {
          const gameState = createMockGameState(teamConfig);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const fieldPositions = definition.fieldPositions;
          const sourcePos = fieldPositions[0];
          const targetPos = fieldPositions[1];
          const sourcePlayerId = gameState.formation[sourcePos];
          const targetPlayerId = gameState.formation[targetPos];

          gameState.fieldPlayerModal = {
            type: 'player',
            target: sourcePos,
            sourcePlayerId: sourcePlayerId,
            playerName: 'Player 1'
          };

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          handlers.handleChangePosition(targetPlayerId);

          // Advance past animation
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Formation should have swapped positions
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();
          const newFormation = deps.stateUpdaters.setFormation.mock.calls[0][0];
          expect(newFormation[sourcePos]).toBe(targetPlayerId);
          expect(newFormation[targetPos]).toBe(sourcePlayerId);

          // Players should have updated position keys
          expect(deps.stateUpdaters.setAllPlayers).toHaveBeenCalled();
          const newPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
          const updatedSource = newPlayers.find(p => p.id === sourcePlayerId);
          const updatedTarget = newPlayers.find(p => p.id === targetPlayerId);
          expect(updatedSource.stats.currentPositionKey).toBe(targetPos);
          expect(updatedTarget.stats.currentPositionKey).toBe(sourcePos);

          // Modal should close
          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // handleInactivatePlayer
  // =================================================================

  describe('handleInactivatePlayer', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('marks substitute as inactive and moves to bottom position', () => {
          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const firstSubPos = definition.substitutePositions[0];
          const subPlayerId = gameState.formation[firstSubPos];

          const substituteModal = { playerId: subPlayerId };

          handlers.handleInactivatePlayer(
            substituteModal,
            gameState.allPlayers,
            gameState.formation
          );

          // May or may not animate depending on position
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Player should be marked inactive
          expect(deps.stateUpdaters.setAllPlayers).toHaveBeenCalled();
          const updatedPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
          const inactivatedPlayer = updatedPlayers.find(p => p.id === subPlayerId);
          expect(inactivatedPlayer.stats.isInactive).toBe(true);

          // Formation should be updated
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();

          // Rotation queue should be updated
          const queueUpdated = deps.stateUpdaters.setRotationQueue.mock.calls.length > 0;
          const nextIdUpdated = deps.stateUpdaters.setNextPlayerIdToSubOut.mock.calls.length > 0;
          expect(queueUpdated || nextIdUpdated).toBe(true);

          // Modal should close
          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // handleActivatePlayer
  // =================================================================

  describe('handleActivatePlayer', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('reactivates an inactive player and moves to substitute_1', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            // Need at least 2 subs to have meaningful activate test
            return;
          }

          // Create state with second substitute inactive and at bottom
          const gameState = createMockGameState(teamConfig);
          const bottomSubPos = subPositions[subPositions.length - 1];
          const inactivePlayerId = gameState.formation[bottomSubPos];
          const inactivePlayer = gameState.allPlayers.find(p => p.id === inactivePlayerId);
          inactivePlayer.stats.isInactive = true;

          // Remove from rotation queue
          gameState.rotationQueue = gameState.rotationQueue.filter(id => id !== inactivePlayerId);

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          const substituteModal = { playerId: inactivePlayerId };

          handlers.handleActivatePlayer(substituteModal);
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Player should be reactivated
          expect(deps.stateUpdaters.setAllPlayers).toHaveBeenCalled();
          const updatedPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
          const reactivatedPlayer = updatedPlayers.find(p => p.id === inactivePlayerId);
          expect(reactivatedPlayer.stats.isInactive).toBe(false);

          // Formation should be updated
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();

          // Modal should close
          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // handleSetAsNextToGoIn
  // =================================================================

  describe('handleSetAsNextToGoIn', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('reorders substitute to substitute_1 position', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return; // Need multiple subs for reorder
          }

          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const secondSubPos = subPositions[1];
          const secondSubPlayerId = gameState.formation[secondSubPos];

          const substituteModal = { playerId: secondSubPlayerId };

          handlers.handleSetAsNextToGoIn(substituteModal, gameState.formation);
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Formation should be reordered
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();
          const newFormation = deps.stateUpdaters.setFormation.mock.calls[0][0];

          // The target player should now be at substitute_1
          expect(newFormation[subPositions[0]]).toBe(secondSubPlayerId);

          // Players should have updated position keys
          expect(deps.stateUpdaters.setAllPlayers).toHaveBeenCalled();
          const newPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
          const movedPlayer = newPlayers.find(p => p.id === secondSubPlayerId);
          expect(movedPlayer.stats.currentPositionKey).toBe(subPositions[0]);

          // Modal should close
          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
        });

        it('does nothing if player is already at substitute_1', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return;
          }

          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const firstSubPlayerId = gameState.formation[subPositions[0]];

          const substituteModal = { playerId: firstSubPlayerId };

          handlers.handleSetAsNextToGoIn(substituteModal, gameState.formation);
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Should NOT call setFormation since player is already next
          expect(deps.stateUpdaters.setFormation).not.toHaveBeenCalled();

          // Modal should still close
          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // handleChangeNextPosition
  // =================================================================

  describe('handleChangeNextPosition', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('show-options: opens position selection view', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return; // Need at least 2 subs for position change
          }

          // substitutionCount must be >= 2 for substitute target mapping to produce
          // positions for other substitutes (with count=1, only one sub is mapped)
          const gameState = createMockGameState(teamConfig, { substitutionCount: 2 });
          const firstSubPlayerId = gameState.formation[subPositions[0]];

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = {
            substitute: {
              isOpen: true,
              playerId: firstSubPlayerId,
              playerName: 'Sub Player'
            }
          };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 2
          );

          const substituteModal = { playerId: firstSubPlayerId };

          handlers.handleChangeNextPosition(substituteModal, 'show-options');

          // Should update modal to show position selection
          expect(deps.modalHandlers.openSubstituteModal).toHaveBeenCalled();
          const call = deps.modalHandlers.openSubstituteModal.mock.calls[0][0];
          expect(call.showPositionSelection).toBe(true);
          expect(call.availableNextPositions.length).toBeGreaterThan(0);
        });

        it('null: resets modal back to main view', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return;
          }

          const gameState = createMockGameState(teamConfig);
          const firstSubPlayerId = gameState.formation[subPositions[0]];

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = {
            substitute: {
              isOpen: true,
              playerId: firstSubPlayerId,
              showPositionSelection: true
            }
          };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          const substituteModal = { playerId: firstSubPlayerId };

          handlers.handleChangeNextPosition(substituteModal, null);

          expect(deps.modalHandlers.openSubstituteModal).toHaveBeenCalled();
          const call = deps.modalHandlers.openSubstituteModal.mock.calls[0][0];
          expect(call.showPositionSelection).toBe(false);
        });

        it('position key: swaps substitute positions via animation', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return;
          }

          const gameState = createMockGameState(teamConfig);
          const firstSubPos = subPositions[0];
          const secondSubPos = subPositions[1];
          const firstSubPlayerId = gameState.formation[firstSubPos];
          const secondSubPlayerId = gameState.formation[secondSubPos];

          const deps = createMockDependencies();
          deps.gameStateFactory.mockReturnValue(gameState);
          deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
          deps.stateUpdaters.setSubstitutionOverride = jest.fn();
          deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
          deps.stateUpdaters.setLastSubstitution = jest.fn();
          deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
          deps.stateUpdaters.resetSubTimer = jest.fn();
          deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
          deps.modalHandlers.modals = { substitute: {} };

          const handlers = createSubstitutionHandlers(
            deps.gameStateFactory,
            deps.stateUpdaters,
            deps.animationHooks,
            deps.modalHandlers,
            teamConfig,
            () => 1
          );

          const substituteModal = { playerId: firstSubPlayerId };

          handlers.handleChangeNextPosition(substituteModal, secondSubPos);
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Formation should have the two substitutes swapped
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();
          const newFormation = deps.stateUpdaters.setFormation.mock.calls[0][0];
          expect(newFormation[firstSubPos]).toBe(secondSubPlayerId);
          expect(newFormation[secondSubPos]).toBe(firstSubPlayerId);

          // Modal should close
          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // handleSelectSubstituteForImmediate
  // =================================================================

  describe('handleSelectSubstituteForImmediate', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('triggers immediate substitution when selected sub is already first', () => {
          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;
          const firstSubPlayerId = gameState.formation[subPositions[0]];
          const firstFieldPos = definition.fieldPositions[0];

          const substituteSelectionModal = {
            fieldPlayerId: gameState.formation[firstFieldPos],
            fieldPlayerPosition: firstFieldPos,
            fieldPlayerName: 'Player 1'
          };

          handlers.handleSelectSubstituteForImmediate(
            substituteSelectionModal,
            firstSubPlayerId
          );

          // Should trigger immediate sub directly (no reorder needed)
          expect(deps.stateUpdaters.setNextPlayerToSubOut).toHaveBeenCalled();
          expect(deps.stateUpdaters.setShouldSubstituteNow).toHaveBeenCalledWith(true);
          expect(deps.stateUpdaters.setSubstitutionOverride).toHaveBeenCalled();
          expect(deps.modalHandlers.closeSubstituteSelectionModal).toHaveBeenCalled();
        });

        it('reorders subs via animation when selected sub is NOT first', () => {
          const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
          const subPositions = definition.substitutePositions;

          if (subPositions.length < 2) {
            return;
          }

          const { handlers, deps, gameState } = createHandlerSetup(teamConfig);
          const secondSubPlayerId = gameState.formation[subPositions[1]];
          const firstFieldPos = definition.fieldPositions[0];

          const substituteSelectionModal = {
            fieldPlayerId: gameState.formation[firstFieldPos],
            fieldPlayerPosition: firstFieldPos,
            fieldPlayerName: 'Player 1'
          };

          handlers.handleSelectSubstituteForImmediate(
            substituteSelectionModal,
            secondSubPlayerId
          );

          // Advance past animation for the reorder
          jest.advanceTimersByTime(ANIMATION_DURATION);

          // Should reorder formation so selected sub is at substitute_1
          expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();
          const newFormation = deps.stateUpdaters.setFormation.mock.calls[0][0];
          expect(newFormation[subPositions[0]]).toBe(secondSubPlayerId);

          // Then trigger immediate substitution
          expect(deps.stateUpdaters.setShouldSubstituteNow).toHaveBeenCalledWith(true);
          expect(deps.stateUpdaters.setSubstitutionOverride).toHaveBeenCalled();
          expect(deps.modalHandlers.closeSubstituteSelectionModal).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // Cancel handlers
  // =================================================================

  describe('Cancel actions', () => {
    FORMATION_VARIANTS.forEach(({ name, teamConfig }) => {
      describe(`[${name}]`, () => {
        it('handleCancelFieldPlayerModal: clears override and closes modal', () => {
          const { handlers, deps } = createHandlerSetup(teamConfig);

          handlers.handleCancelFieldPlayerModal();

          expect(deps.stateUpdaters.clearSubstitutionOverride).toHaveBeenCalled();
          expect(deps.modalHandlers.closeFieldPlayerModal).toHaveBeenCalled();
          expect(deps.modalHandlers.removeFromNavigationStack).toHaveBeenCalled();
        });

        it('handleCancelSubstituteModal: closes modal and removes from nav stack', () => {
          const { handlers, deps } = createHandlerSetup(teamConfig);

          handlers.handleCancelSubstituteModal();

          expect(deps.modalHandlers.closeSubstituteModal).toHaveBeenCalled();
          expect(deps.modalHandlers.removeFromNavigationStack).toHaveBeenCalled();
        });

        it('handleCancelSubstituteSelection: clears override and closes modal', () => {
          const { handlers, deps } = createHandlerSetup(teamConfig);

          handlers.handleCancelSubstituteSelection();

          expect(deps.stateUpdaters.clearSubstitutionOverride).toHaveBeenCalled();
          expect(deps.modalHandlers.closeSubstituteSelectionModal).toHaveBeenCalled();
          expect(deps.modalHandlers.removeFromNavigationStack).toHaveBeenCalled();
        });
      });
    });
  });

  // =================================================================
  // Cross-formation state consistency
  // =================================================================

  describe('Cross-formation state consistency', () => {
    it('handleChangePosition produces correct role assignments for 2-2 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;
      const gameState = createMockGameState(teamConfig);

      // Swap leftDefender (defender role) with leftAttacker (attacker role)
      gameState.fieldPlayerModal = {
        type: 'player',
        target: 'leftDefender',
        sourcePlayerId: gameState.formation.leftDefender,
        playerName: 'Player 1'
      };

      const deps = createMockDependencies();
      deps.gameStateFactory.mockReturnValue(gameState);
      deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
      deps.stateUpdaters.setSubstitutionOverride = jest.fn();
      deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
      deps.stateUpdaters.setLastSubstitution = jest.fn();
      deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
      deps.stateUpdaters.resetSubTimer = jest.fn();
      deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
      deps.modalHandlers.modals = { substitute: {} };

      const handlers = createSubstitutionHandlers(
        deps.gameStateFactory,
        deps.stateUpdaters,
        deps.animationHooks,
        deps.modalHandlers,
        teamConfig,
        () => 1
      );

      const leftAttackerPlayerId = gameState.formation.leftAttacker;

      handlers.handleChangePosition(leftAttackerPlayerId);
      jest.advanceTimersByTime(ANIMATION_DURATION);

      const newPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
      const playerNowAtDefender = newPlayers.find(p => p.id === leftAttackerPlayerId);
      const playerNowAtAttacker = newPlayers.find(p => p.id === gameState.formation.leftDefender);

      // Player moved to defender position should have DEFENDER role
      expect(playerNowAtDefender.stats.currentRole).toBe('DEFENDER');
      expect(playerNowAtDefender.stats.currentPositionKey).toBe('leftDefender');

      // Player moved to attacker position should have ATTACKER role
      expect(playerNowAtAttacker.stats.currentRole).toBe('ATTACKER');
      expect(playerNowAtAttacker.stats.currentPositionKey).toBe('leftAttacker');
    });

    it('handleChangePosition produces correct role assignments for 1-2-1 formation', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7_1_2_1;
      const gameState = createMockGameState(teamConfig);

      // Swap defender with attacker in 1-2-1
      gameState.fieldPlayerModal = {
        type: 'player',
        target: 'defender',
        sourcePlayerId: gameState.formation.defender,
        playerName: 'Player 1'
      };

      const deps = createMockDependencies();
      deps.gameStateFactory.mockReturnValue(gameState);
      deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
      deps.stateUpdaters.setSubstitutionOverride = jest.fn();
      deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
      deps.stateUpdaters.setLastSubstitution = jest.fn();
      deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
      deps.stateUpdaters.resetSubTimer = jest.fn();
      deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
      deps.modalHandlers.modals = { substitute: {} };

      const handlers = createSubstitutionHandlers(
        deps.gameStateFactory,
        deps.stateUpdaters,
        deps.animationHooks,
        deps.modalHandlers,
        teamConfig,
        () => 1
      );

      const attackerPlayerId = gameState.formation.attacker;

      handlers.handleChangePosition(attackerPlayerId);
      jest.advanceTimersByTime(ANIMATION_DURATION);

      const newPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
      const playerNowAtDefender = newPlayers.find(p => p.id === attackerPlayerId);
      const playerNowAtAttacker = newPlayers.find(p => p.id === gameState.formation.defender);

      // Player at defender position should have DEFENDER role
      expect(playerNowAtDefender.stats.currentRole).toBe('DEFENDER');
      expect(playerNowAtDefender.stats.currentPositionKey).toBe('defender');

      // Player at attacker position should have ATTACKER role
      expect(playerNowAtAttacker.stats.currentRole).toBe('ATTACKER');
      expect(playerNowAtAttacker.stats.currentPositionKey).toBe('attacker');
    });

    it('handleInactivatePlayer cascades position shift for 7v7 2-2-2', () => {
      const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_222;
      const gameState = createMockGameState(teamConfig);
      const definition = require('../constants/gameModes').getModeDefinition(teamConfig);
      const subPositions = definition.substitutePositions;
      const firstSubPlayerId = gameState.formation[subPositions[0]];
      const secondSubPlayerId = gameState.formation[subPositions[1]];

      const deps = createMockDependencies();
      deps.gameStateFactory.mockReturnValue(gameState);
      deps.stateUpdaters.setShouldSubstituteNow = jest.fn();
      deps.stateUpdaters.setSubstitutionOverride = jest.fn();
      deps.stateUpdaters.clearSubstitutionOverride = jest.fn();
      deps.stateUpdaters.setLastSubstitution = jest.fn();
      deps.stateUpdaters.setLastSubstitutionTimestamp = jest.fn();
      deps.stateUpdaters.resetSubTimer = jest.fn();
      deps.stateUpdaters.handleUndoSubstitutionTimer = jest.fn();
      deps.modalHandlers.modals = { substitute: {} };

      const handlers = createSubstitutionHandlers(
        deps.gameStateFactory,
        deps.stateUpdaters,
        deps.animationHooks,
        deps.modalHandlers,
        teamConfig,
        () => 1
      );

      handlers.handleInactivatePlayer(
        { playerId: firstSubPlayerId },
        gameState.allPlayers,
        gameState.formation
      );
      jest.advanceTimersByTime(ANIMATION_DURATION);

      // First sub should be inactive and at bottom
      expect(deps.stateUpdaters.setAllPlayers).toHaveBeenCalled();
      const updatedPlayers = deps.stateUpdaters.setAllPlayers.mock.calls[0][0];
      const inactivated = updatedPlayers.find(p => p.id === firstSubPlayerId);
      expect(inactivated.stats.isInactive).toBe(true);

      // Second sub should have moved up to substitute_1
      expect(deps.stateUpdaters.setFormation).toHaveBeenCalled();
      const newFormation = deps.stateUpdaters.setFormation.mock.calls[0][0];
      expect(newFormation[subPositions[0]]).toBe(secondSubPlayerId);
    });
  });
});
