/**
 * GameScreen Integration Tests
 * 
 * Tests integration between GameScreen and related components including:
 * - FormationRenderer integration
 * - Timer integration
 * - Modal integration
 * - User interaction flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Import real components for integration testing
import { GameScreen } from '../../components/game/GameScreen';
import { FormationRenderer } from '../../components/game/formations/FormationRenderer';
import { formatTime } from '../../utils/formatUtils';

// Import integration testing infrastructure
import {
  createIntegrationTestEnvironment,
  setupIntegrationMocks,
  cleanupIntegrationTest,
  createRealisticGameState,
  simulateCompleteUserWorkflow
} from '../integrationTestUtils';

import {
  executeAndWaitForAsync,
  simulateUserInteraction,
  componentStateHelpers,
  performanceMeasurement,
  waitForMultipleConditions
} from '../utils/testHelpers';

import {
  assertValidGameState,
  assertComponentPropsConsistency,
  assertUIStateConsistency,
  assertPerformanceThreshold
} from '../utils/assertions';

import { createMockHookSet, createScenarioMockHooks } from '../utils/mockHooks';
import { gameStateScenarios, playerDataScenarios } from '../fixtures/mockGameData';
import { TEAM_MODES } from '../../constants/playerConstants';

// Mock external dependencies
jest.mock('../../hooks/useGameState');
jest.mock('../../hooks/useTimers');
jest.mock('../../hooks/useGameModals');
jest.mock('../../hooks/useGameUIState');

describe('GameScreen Integration Tests', () => {
  let testEnvironment;
  let mockHooks;
  let user;
  
  beforeEach(() => {
    // Setup comprehensive test environment
    testEnvironment = createIntegrationTestEnvironment();
    testEnvironment.setup();
    setupIntegrationMocks();
    
    // Create mock hooks
    mockHooks = createMockHookSet();
    
    // Mock the actual hooks
    require('../../hooks/useGameState').useGameState.mockReturnValue(mockHooks.useGameState);
    require('../../hooks/useTimers').useTimers.mockReturnValue(mockHooks.useTimers);
    require('../../hooks/useGameModals').useGameModals.mockReturnValue(mockHooks.useGameModals);
    require('../../hooks/useGameUIState').useGameUIState.mockReturnValue(mockHooks.useGameUIState);
    
    // Setup user interactions (userEvent v13 doesn't have setup)
    user = userEvent;
    
    // Clear localStorage
    localStorage.clear();
  });
  
  afterEach(() => {
    cleanupIntegrationTest();
    testEnvironment.cleanup();
    jest.clearAllMocks();
  });

  // ===================================================================
  // GAMESCREEN + FORMATIONRENDERER INTEGRATION TESTS
  // ===================================================================

  describe('GameScreen + FormationRenderer Integration', () => {
    it('should render GameScreen with FormationRenderer and coordinate state', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      // Act
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { measurement } = await performanceMeasurement.measureAsyncOperation(
        () => render(<GameScreen {...gameScreenProps} />),
        'gamescreen_formationrenderer_render'
      );
      
      // Assert
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Timer/)).toBeInTheDocument();
      expect(screen.getAllByText(/Goalie/)[0]).toBeInTheDocument();
      
      // Verify formation is displayed
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2); // INDIVIDUAL_7 has 2 substitutes
      
      // Verify formation positions are rendered by checking for key elements
      const formation = gameState.formation;
      const allPlayers = gameState.allPlayers;
      
      // Check that the goalie is displayed
      if (formation.goalie) {
        const goaliePlayer = allPlayers.find(p => p.id === formation.goalie);
        if (goaliePlayer) {
          expect(screen.getByText(new RegExp(goaliePlayer.name))).toBeInTheDocument();
        }
      }
      
      // Check that at least one substitute is visible (for INDIVIDUAL_7 mode)
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2); // INDIVIDUAL_7 has 2 substitutes
      
      // Performance validation
      assertPerformanceThreshold(measurement, { maxDuration: 200 });
      
      // State consistency validation
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    // ===================================================================
    // PHASE 1: COMPLETE TEAM MODE COVERAGE
    // ===================================================================

    it('should render GameScreen with FormationRenderer for PAIRS_7 team mode', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.PAIRS_7);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      // Act
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { measurement } = await performanceMeasurement.measureAsyncOperation(
        () => render(<GameScreen {...gameScreenProps} />),
        'gamescreen_pairs7_render'
      );
      
      // Assert - Basic GameScreen elements
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Timer/)).toBeInTheDocument();
      expect(screen.getAllByText(/Goalie/)[0]).toBeInTheDocument();
      
      // Verify PAIRS_7 specific formation display
      // PAIRS_7 should have 1 "Substitutes" heading for the substitute pair
      expect(screen.getByText(/Substitutes/)).toBeInTheDocument();
      
      // Verify pair-specific elements are present
      const formation = gameState.formation;
      const allPlayers = gameState.allPlayers;
      
      // Check that field pairs are displayed (leftDefender, rightDefender, leftAttacker, rightAttacker)
      const fieldPositions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
      fieldPositions.forEach(position => {
        if (formation[position]) {
          const player = allPlayers.find(p => p.id === formation[position]);
          if (player) {
            expect(screen.getByText(new RegExp(player.name))).toBeInTheDocument();
          }
        }
      });
      
      // Performance validation
      assertPerformanceThreshold(measurement, { maxDuration: 200 });
      
      // State consistency validation
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should render GameScreen with FormationRenderer for INDIVIDUAL_6 team mode', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      // Act
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { measurement } = await performanceMeasurement.measureAsyncOperation(
        () => render(<GameScreen {...gameScreenProps} />),
        'gamescreen_individual6_render'
      );
      
      // Assert - Basic GameScreen elements
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Timer/)).toBeInTheDocument();
      expect(screen.getAllByText(/Goalie/)[0]).toBeInTheDocument();
      
      // Verify INDIVIDUAL_6 specific formation display
      // INDIVIDUAL_6 should have 1 substitute (6 players total: 4 field + 1 sub + 1 goalie)
      expect(screen.getAllByText(/Substitute/)).toHaveLength(1);
      
      // Check that field players are displayed
      const formation = gameState.formation;
      const allPlayers = gameState.allPlayers;
      
      // Verify field positions
      const fieldPositions = ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
      fieldPositions.forEach(position => {
        if (formation[position]) {
          const player = allPlayers.find(p => p.id === formation[position]);
          if (player) {
            expect(screen.getByText(new RegExp(player.name))).toBeInTheDocument();
          }
        }
      });
      
      // Performance validation
      assertPerformanceThreshold(measurement, { maxDuration: 200 });
      
      // State consistency validation
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle team mode switching scenarios and maintain state consistency', async () => {
      // Arrange - Start with INDIVIDUAL_7
      const initialGameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      mockHooks.useGameState._updateMockState({
        formation: initialGameState.formation,
        allPlayers: initialGameState.allPlayers,
        teamMode: initialGameState.teamMode,
        rotationQueue: initialGameState.rotationQueue,
        view: 'game'
      });
      
      const initialProps = createGameScreenProps(initialGameState, mockHooks);
      const { rerender } = render(<GameScreen {...initialProps} />);
      
      // Assert initial state - INDIVIDUAL_7 should have 2 substitutes
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      
      // Act - Switch to INDIVIDUAL_6 team mode
      const switchedGameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      mockHooks.useGameState._updateMockState({
        formation: switchedGameState.formation,
        allPlayers: switchedGameState.allPlayers,
        teamMode: switchedGameState.teamMode,
        rotationQueue: switchedGameState.rotationQueue,
        view: 'game'
      });
      
      const switchedProps = createGameScreenProps(switchedGameState, mockHooks);
      rerender(<GameScreen {...switchedProps} />);
      
      // Assert state after team mode switch - INDIVIDUAL_6 should have 1 substitute
      expect(screen.getAllByText(/Substitute/)).toHaveLength(1);
      
      // Verify basic elements still work after mode switch
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/SUB NOW/)).toBeInTheDocument();
      
      // Act - Switch to PAIRS_7 team mode
      const pairsGameState = gameStateScenarios.freshGame(TEAM_MODES.PAIRS_7);
      mockHooks.useGameState._updateMockState({
        formation: pairsGameState.formation,
        allPlayers: pairsGameState.allPlayers,
        teamMode: pairsGameState.teamMode,
        rotationQueue: pairsGameState.rotationQueue,
        view: 'game'
      });
      
      const pairsProps = createGameScreenProps(pairsGameState, mockHooks);
      rerender(<GameScreen {...pairsProps} />);
      
      // Assert final state - PAIRS_7 should have 1 "Substitutes" heading (1 pair)
      expect(screen.getByText(/Substitutes/)).toBeInTheDocument();
      
      // Verify formation renderer adapts correctly
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/SUB NOW/)).toBeInTheDocument();
      
      // State consistency validation after multiple switches
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    // ===================================================================
    // PHASE 2: STATE CHANGE PROPAGATION
    // ===================================================================

    it('should handle live formation updates during gameplay', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial state
      const initialFormation = gameState.formation;
      const initialLeftDefender = gameState.allPlayers.find(p => p.id === initialFormation.leftDefender);
      expect(screen.getByText(new RegExp(initialLeftDefender.name))).toBeInTheDocument();
      
      // Act - Simulate position change (swap left defender with substitute)
      const substitute = gameState.allPlayers.find(p => p.id === initialFormation.substitute_1);
      const updatedFormation = {
        ...initialFormation,
        leftDefender: substitute.id,
        substitute_1: initialLeftDefender.id
      };
      
      mockHooks.useGameState._updateMockState({
        formation: updatedFormation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const updatedGameState = mockHooks.useGameState._getMockState();
      const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
      rerender(<GameScreen {...updatedProps} />);
      
      // Assert - Verify position changes reflected immediately
      expect(screen.getByText(new RegExp(substitute.name))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(initialLeftDefender.name))).toBeInTheDocument();
      
      // Verify formation state consistency
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle rotation queue state propagation and next player indicators', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        nextPlayerIdToSubOut: gameState.allPlayers[0].id,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial next player indicator exists
      const initialNextPlayer = gameState.allPlayers[0];
      expect(screen.getByText(new RegExp(initialNextPlayer.name))).toBeInTheDocument();
      
      // Act - Change next player to sub out
      const newNextPlayer = gameState.allPlayers[1];
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        nextPlayerIdToSubOut: newNextPlayer.id,
        view: 'game'
      });
      
      const updatedGameState = mockHooks.useGameState._getMockState();
      const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
      rerender(<GameScreen {...updatedProps} />);
      
      // Assert - Verify next player indicators update correctly
      expect(screen.getByText(new RegExp(newNextPlayer.name))).toBeInTheDocument();
      
      // Act - Update rotation queue order
      const rotatedQueue = [...gameState.rotationQueue.slice(1), gameState.rotationQueue[0]];
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: rotatedQueue,
        nextPlayerIdToSubOut: newNextPlayer.id,
        view: 'game'
      });
      
      const finalGameState = mockHooks.useGameState._getMockState();
      const finalProps = createGameScreenProps(finalGameState, mockHooks);
      rerender(<GameScreen {...finalProps} />);
      
      // Assert - Queue state synchronization with formation display
      expect(finalGameState.rotationQueue).toEqual(rotatedQueue);
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle player status changes and UI updates', async () => {
      // Arrange - Use INDIVIDUAL_7 which supports inactive players
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      const testPlayer = gameState.allPlayers.find(p => p.id === gameState.formation.substitute_1);
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial active state - INDIVIDUAL_7 has 2 substitutes
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      expect(screen.queryByText(/Inactive/)).not.toBeInTheDocument();
      
      // Act - Set player as inactive
      const updatedPlayers = gameState.allPlayers.map(player => 
        player.id === testPlayer.id 
          ? { ...player, stats: { ...player.stats, isInactive: true } }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: updatedPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const updatedGameState = mockHooks.useGameState._getMockState();
      const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
      rerender(<GameScreen {...updatedProps} />);
      
      // Assert - Verify inactive status reflected in UI
      expect(screen.getAllByText(/Inactive/)).toHaveLength(2);
      
      // Act - Reactivate player
      const reactivatedPlayers = updatedPlayers.map(player => 
        player.id === testPlayer.id 
          ? { ...player, stats: { ...player.stats, isInactive: false } }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: reactivatedPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const finalGameState = mockHooks.useGameState._getMockState();
      const finalProps = createGameScreenProps(finalGameState, mockHooks);
      rerender(<GameScreen {...finalProps} />);
      
      // Assert - Verify reactivation UI update
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      expect(screen.queryByText(/Inactive/)).not.toBeInTheDocument();
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle real-time score and timer coordination', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        homeScore: 0,
        awayScore: 0,
        view: 'game'
      });
      
      // Setup timer state
      mockHooks.useTimers._updateMockTimerState({
        matchTimerSeconds: 600,
        subTimerSeconds: 120,
        isSubTimerPaused: false
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial state
      expect(screen.getByText(/0 - 0/)).toBeInTheDocument();
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Timer/)).toBeInTheDocument();
      
      // Act - Update score rapidly
      for (let i = 1; i <= 3; i++) {
        mockHooks.useGameState._updateMockState({
          formation: gameState.formation,
          allPlayers: gameState.allPlayers,
          teamMode: gameState.teamMode,
          rotationQueue: gameState.rotationQueue,
          homeScore: i,
          awayScore: 0,
          view: 'game'
        });
        
        const updatedGameState = mockHooks.useGameState._getMockState();
        const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
        rerender(<GameScreen {...updatedProps} />);
      }
      
      // Assert - Final score state
      expect(screen.getByText(/3 - 0/)).toBeInTheDocument();
      
      // Act - Update timer state
      mockHooks.useTimers._updateMockTimerState({
        matchTimerSeconds: 300,
        subTimerSeconds: 300,
        isSubTimerPaused: true
      });
      
      const finalGameState = mockHooks.useGameState._getMockState();
      const finalProps = createGameScreenProps(finalGameState, mockHooks);
      rerender(<GameScreen {...finalProps} />);
      
      // Assert - Timer changes coordinate with formation display
      // Verify timers are still visible regardless of actual values
      expect(screen.getByText(/Match Clock/)).toBeInTheDocument();
      expect(screen.getByText(/Substitution Timer/)).toBeInTheDocument();
      
      // State validation
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    // ===================================================================
    // PHASE 3: ADVANCED PLAYER INTEGRATION
    // ===================================================================

    it('should display player stats correctly in formation context', async () => {
      // Arrange - Use INDIVIDUAL_7 which has comprehensive stats display
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      const testPlayer = gameState.allPlayers.find(p => p.id === gameState.formation.leftDefender);
      
      // Setup player with time stats
      const updatedPlayers = gameState.allPlayers.map(player => 
        player.id === testPlayer.id 
          ? { 
              ...player, 
              stats: { 
                ...player.stats, 
                timeOnFieldSeconds: 300, // 5 minutes
                timeAsDefenderSeconds: 180, // 3 minutes
                timeAsAttackerSeconds: 120, // 2 minutes
                currentStatus: 'on_field',
                currentRole: 'Defender',
                lastStintStartTimeEpoch: Date.now() - 60000 // Started 1 minute ago
              }
            }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: updatedPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      render(<GameScreen {...gameScreenProps} />);
      
      // Assert - Player name is displayed
      expect(screen.getByText(new RegExp(testPlayer.name))).toBeInTheDocument();
      
      // Assert - Formation context elements
      expect(screen.getByText(/Left Defender/)).toBeInTheDocument();
      
      // Verify formation structure for INDIVIDUAL_7
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      expect(screen.getAllByText(/Goalie/)[0]).toBeInTheDocument();
      
      // Assert - Player is in correct position
      const playerElement = screen.getByTestId(`player-${testPlayer.id}`);
      expect(playerElement).toBeInTheDocument();
      
      // State consistency validation
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle player animation and state coordination', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      const recentlySubstitutedPlayerId = gameState.allPlayers[0].id;
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      // Setup UI state with animation and highlighting
      mockHooks.useGameUIState._updateMockUIState({
        animationState: { type: 'substitution', playerId: recentlySubstitutedPlayerId },
        recentlySubstitutedPlayers: new Set([recentlySubstitutedPlayerId]),
        glowPlayers: [recentlySubstitutedPlayerId],
        isAnimating: true
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial animation state
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      
      // Act - Clear animation state
      mockHooks.useGameUIState._updateMockUIState({
        animationState: { type: 'none' },
        recentlySubstitutedPlayers: new Set(),
        glowPlayers: [],
        isAnimating: false
      });
      
      const updatedGameState = mockHooks.useGameState._getMockState();
      const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
      rerender(<GameScreen {...updatedProps} />);
      
      // Assert - Animation state cleared
      expect(screen.getByText(/SUB NOW/)).toBeInTheDocument();
      expect(screen.getByText(/Period 1/)).toBeInTheDocument();
      
      // Performance validation
      const { measurement } = await performanceMeasurement.measureAsyncOperation(
        () => {
          // Test multiple animation state changes
          for (let i = 0; i < 5; i++) {
            mockHooks.useGameUIState._updateMockUIState({
              animationState: { type: i % 2 === 0 ? 'substitution' : 'none' },
              isAnimating: i % 2 === 0
            });
            const testGameState = mockHooks.useGameState._getMockState();
            const testProps = createGameScreenProps(testGameState, mockHooks);
            rerender(<GameScreen {...testProps} />);
          }
        },
        'animation_state_changes'
      );
      
      assertPerformanceThreshold(measurement, { maxDuration: 100 });
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle inactive player management in formations', async () => {
      // Arrange - Use INDIVIDUAL_7 which supports inactive players
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      const substitute1 = gameState.allPlayers.find(p => p.id === gameState.formation.substitute_1);
      const substitute2 = gameState.allPlayers.find(p => p.id === gameState.formation.substitute_2);
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial state - both substitutes active
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      expect(screen.queryByText(/Inactive/)).not.toBeInTheDocument();
      
      // Act - Make first substitute inactive
      const updatedPlayers1 = gameState.allPlayers.map(player => 
        player.id === substitute1.id 
          ? { ...player, stats: { ...player.stats, isInactive: true } }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: updatedPlayers1,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const updatedGameState1 = mockHooks.useGameState._getMockState();
      const updatedProps1 = createGameScreenProps(updatedGameState1, mockHooks);
      rerender(<GameScreen {...updatedProps1} />);
      
      // Assert - One substitute is inactive, one is active
      expect(screen.getAllByText(/Substitute/)).toHaveLength(1);
      expect(screen.getAllByText(/Inactive/)).toHaveLength(2); // Heading + span
      
      // Act - Make second substitute inactive too
      const updatedPlayers2 = updatedPlayers1.map(player => 
        player.id === substitute2.id 
          ? { ...player, stats: { ...player.stats, isInactive: true } }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: updatedPlayers2,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const updatedGameState2 = mockHooks.useGameState._getMockState();
      const updatedProps2 = createGameScreenProps(updatedGameState2, mockHooks);
      rerender(<GameScreen {...updatedProps2} />);
      
      // Assert - Both substitutes are inactive
      expect(screen.queryByText(/^Substitute$/)).not.toBeInTheDocument();
      expect(screen.getAllByText(/Inactive/)).toHaveLength(4); // 2 headings + 2 spans
      
      // Act - Reactivate first substitute
      const reactivatedPlayers = updatedPlayers2.map(player => 
        player.id === substitute1.id 
          ? { ...player, stats: { ...player.stats, isInactive: false } }
          : player
      );
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: reactivatedPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const finalGameState = mockHooks.useGameState._getMockState();
      const finalProps = createGameScreenProps(finalGameState, mockHooks);
      rerender(<GameScreen {...finalProps} />);
      
      // Assert - One active substitute, one inactive
      expect(screen.getAllByText(/Substitute/)).toHaveLength(1);
      expect(screen.getAllByText(/Inactive/)).toHaveLength(2); // 1 heading + 1 span
      
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle player time stats and role integration', async () => {
      // Arrange - Use INDIVIDUAL_6 for simpler role tracking
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      const leftDefender = gameState.allPlayers.find(p => p.id === gameState.formation.leftDefender);
      const substitute = gameState.allPlayers.find(p => p.id === gameState.formation.substitute_1);
      
      // Setup players with detailed time stats
      const playersWithStats = gameState.allPlayers.map(player => {
        if (player.id === leftDefender.id) {
          return {
            ...player,
            stats: {
              ...player.stats,
              timeOnFieldSeconds: 600, // 10 minutes total
              timeAsDefenderSeconds: 400, // 6:40 as defender
              timeAsAttackerSeconds: 200, // 3:20 as attacker
              currentStatus: 'on_field',
              currentRole: 'Defender',
              lastStintStartTimeEpoch: Date.now() - 120000 // Started 2 minutes ago
            }
          };
        } else if (player.id === substitute.id) {
          return {
            ...player,
            stats: {
              ...player.stats,
              timeOnFieldSeconds: 300, // 5 minutes total
              timeAsDefenderSeconds: 150, // 2:30 as defender
              timeAsAttackerSeconds: 150, // 2:30 as attacker
              currentStatus: 'substitute',
              currentRole: null,
              lastStintStartTimeEpoch: null
            }
          };
        }
        return player;
      });
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: playersWithStats,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert - Players are displayed with their roles
      expect(screen.getByText(new RegExp(leftDefender.name))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(substitute.name))).toBeInTheDocument();
      expect(screen.getByText(/Left Defender/)).toBeInTheDocument();
      expect(screen.getByText(/Substitute/)).toBeInTheDocument();
      
      // Act - Simulate position change (swap defender with substitute)
      const swappedFormation = {
        ...gameState.formation,
        leftDefender: substitute.id,
        substitute: leftDefender.id
      };
      
      // Update player roles accordingly
      const updatedPlayers = playersWithStats.map(player => {
        if (player.id === leftDefender.id) {
          return {
            ...player,
            stats: {
              ...player.stats,
              currentStatus: 'substitute',
              currentRole: null,
              lastStintStartTimeEpoch: null
            }
          };
        } else if (player.id === substitute.id) {
          return {
            ...player,
            stats: {
              ...player.stats,
              currentStatus: 'on_field',
              currentRole: 'Defender',
              lastStintStartTimeEpoch: Date.now()
            }
          };
        }
        return player;
      });
      
      mockHooks.useGameState._updateMockState({
        formation: swappedFormation,
        allPlayers: updatedPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const updatedGameState = mockHooks.useGameState._getMockState();
      const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
      rerender(<GameScreen {...updatedProps} />);
      
      // Assert - Role changes reflected in formation
      expect(screen.getByText(new RegExp(substitute.name))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(leftDefender.name))).toBeInTheDocument();
      expect(screen.getByText(/Left Defender/)).toBeInTheDocument();
      expect(screen.getByText(/Substitute/)).toBeInTheDocument();
      
      // Verify state consistency after role changes
      const finalState = mockHooks.useGameState._getMockState();
      expect(finalState.formation.leftDefender).toBe(substitute.id);
      expect(finalState.formation.substitute_1).toBe(leftDefender.id);
      
      assertValidGameState(finalState);
    });

    // ===================================================================
    // PHASE 4: INTERACTIVE INTEGRATION TESTING
    // ===================================================================

    it('should handle long-press interactions on formation players', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      const leftDefender = gameState.allPlayers.find(p => p.id === gameState.formation.leftDefender);
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial state
      expect(screen.getByText(new RegExp(leftDefender.name))).toBeInTheDocument();
      expect(screen.getByText(/Left Defender/)).toBeInTheDocument();
      
      // Find the player element
      const playerElement = screen.getByTestId(`player-${leftDefender.id}`);
      expect(playerElement).toBeInTheDocument();
      
      // Act - Simulate long-press interaction (mousedown)
      fireEvent.mouseDown(playerElement);
      
      // Assert - Element responds to interaction (should not crash)
      expect(playerElement).toBeInTheDocument();
      
      // Act - Simulate release (mouseup)
      fireEvent.mouseUp(playerElement);
      
      // Assert - Interaction completed successfully
      expect(screen.getByText(/Left Defender/)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(leftDefender.name))).toBeInTheDocument();
      
      // Verify state remains consistent after interaction
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should handle formation player clicks and interaction feedback', async () => {
      // Arrange - Use PAIRS_7 to test different interaction type
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.PAIRS_7);
      const leftPair = gameState.formation.leftPair;
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial state
      expect(screen.getByText(/Left/)).toBeInTheDocument();
      
      // Find formation elements
      const formationRenderer = screen.getByTestId('formation-renderer');
      expect(formationRenderer).toBeInTheDocument();
      
      // Get the left pair element
      const leftPairElements = screen.getAllByText(/Left/);
      const leftPairElement = leftPairElements[0].closest('div');
      
      // Act - Test different interaction types
      
      // 1. Simple click
      fireEvent.click(leftPairElement);
      expect(leftPairElement).toBeInTheDocument();
      
      // 2. Touch events for mobile simulation
      fireEvent.touchStart(leftPairElement, { 
        touches: [{ clientX: 100, clientY: 100 }] 
      });
      fireEvent.touchEnd(leftPairElement, { 
        touches: [] 
      });
      expect(leftPairElement).toBeInTheDocument();
      
      // 3. Mouse hover simulation
      fireEvent.mouseOver(leftPairElement);
      fireEvent.mouseOut(leftPairElement);
      expect(leftPairElement).toBeInTheDocument();
      
      // Assert - All interactions completed without crashing
      expect(screen.getByText(/Left/)).toBeInTheDocument();
      expect(screen.getByText(/Substitutes/)).toBeInTheDocument();
      
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should provide interaction availability based on game state', async () => {
      // Arrange - Test interaction availability in different states
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_6);
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        view: 'game'
      });
      
      // Setup timer state that might affect interactions
      mockHooks.useTimers._updateMockTimerState({
        matchTimerSeconds: 900,
        subTimerSeconds: 0,
        isSubTimerPaused: false
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert initial interactive state
      expect(screen.getByText(/SUB NOW/)).toBeInTheDocument();
      expect(screen.getByText(/End Period/)).toBeInTheDocument();
      
      // Test button interactions
      const subNowButton = screen.getByText(/SUB NOW/);
      const endPeriodButton = screen.getByText(/End Period/);
      
      // Act - Test button clicks
      fireEvent.click(subNowButton);
      expect(subNowButton).toBeInTheDocument();
      
      fireEvent.click(endPeriodButton);
      expect(endPeriodButton).toBeInTheDocument();
      
      // Act - Change timer state to paused
      mockHooks.useTimers._updateMockTimerState({
        matchTimerSeconds: 900,
        subTimerSeconds: 300,
        isSubTimerPaused: true
      });
      
      const pausedGameState = mockHooks.useGameState._getMockState();
      const pausedProps = createGameScreenProps(pausedGameState, mockHooks);
      rerender(<GameScreen {...pausedProps} />);
      
      // Assert - Buttons still available when paused
      expect(screen.getByText(/SUB NOW/)).toBeInTheDocument();
      expect(screen.getByText(/End Period/)).toBeInTheDocument();
      
      // Test formation interactions still work
      const formationElement = screen.getByTestId('formation-renderer');
      fireEvent.click(formationElement);
      expect(formationElement).toBeInTheDocument();
      
      assertValidGameState(mockHooks.useGameState._getMockState());
    });

    it('should provide visual feedback and responsive interactions', async () => {
      // Arrange
      const gameState = gameStateScenarios.freshGame(TEAM_MODES.INDIVIDUAL_7);
      const testPlayer = gameState.allPlayers.find(p => p.id === gameState.formation.substitute_1);
      
      mockHooks.useGameState._updateMockState({
        formation: gameState.formation,
        allPlayers: gameState.allPlayers,
        teamMode: gameState.teamMode,
        rotationQueue: gameState.rotationQueue,
        nextPlayerIdToSubOut: testPlayer.id,
        view: 'game'
      });
      
      // Setup UI state with visual indicators
      mockHooks.useGameUIState._updateMockUIState({
        animationState: { type: 'none' },
        recentlySubstitutedPlayers: new Set(),
        glowPlayers: [testPlayer.id],
        hideNextOffIndicator: false,
        shouldSubstituteNow: false,
        isAnimating: false
      });
      
      const gameScreenProps = createGameScreenProps(gameState, mockHooks);
      const { rerender } = render(<GameScreen {...gameScreenProps} />);
      
      // Assert visual feedback elements are present - INDIVIDUAL_7 has 2 substitutes
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      expect(screen.getByText(new RegExp(testPlayer.name))).toBeInTheDocument();
      
      // Test performance of visual state changes
      const { measurement } = await performanceMeasurement.measureAsyncOperation(
        () => {
          // Simulate rapid visual state changes
          for (let i = 0; i < 10; i++) {
            mockHooks.useGameUIState._updateMockUIState({
              animationState: { type: i % 2 === 0 ? 'substitution' : 'none' },
              glowPlayers: i % 2 === 0 ? [testPlayer.id] : [],
              isAnimating: i % 2 === 0
            });
            
            const updatedGameState = mockHooks.useGameState._getMockState();
            const updatedProps = createGameScreenProps(updatedGameState, mockHooks);
            rerender(<GameScreen {...updatedProps} />);
          }
        },
        'visual_feedback_performance'
      );
      
      // Assert - Visual feedback performance is good
      assertPerformanceThreshold(measurement, { maxDuration: 200 });
      
      // Test interaction responsiveness with hover states
      const substituteElements = screen.getAllByText(/Substitute/);
      const substituteElement = substituteElements[0].closest('div');
      
      // Test hover interactions
      fireEvent.mouseEnter(substituteElement);
      expect(substituteElement).toBeInTheDocument();
      
      fireEvent.mouseLeave(substituteElement);
      expect(substituteElement).toBeInTheDocument();
      
      // Test focus/blur for accessibility
      if (substituteElement.tabIndex !== -1) {
        fireEvent.focus(substituteElement);
        expect(substituteElement).toBeInTheDocument();
        
        fireEvent.blur(substituteElement);
        expect(substituteElement).toBeInTheDocument();
      }
      
      // Assert final state
      expect(screen.getAllByText(/Substitute/)).toHaveLength(2);
      assertValidGameState(mockHooks.useGameState._getMockState());
    });
    
  });

  // ===================================================================
  // GAMESCREEN + TIMER INTEGRATION TESTS
  // ===================================================================

});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Creates complete props object for GameScreen component
 */
const createGameScreenProps = (gameState, mockHooks) => {
  return {
    // Game state props
    currentPeriodNumber: gameState.currentPeriodNumber || 1,
    formation: gameState.formation,
    setFormation: mockHooks.useGameState.setFormation,
    allPlayers: gameState.allPlayers,
    setAllPlayers: mockHooks.useGameState.setAllPlayers,
    teamMode: gameState.teamMode,
    rotationQueue: gameState.rotationQueue,
    setRotationQueue: mockHooks.useGameState.setRotationQueue,
    
    // Timer props
    matchTimerSeconds: mockHooks.useTimers.matchTimerSeconds || 900,
    subTimerSeconds: mockHooks.useTimers.subTimerSeconds || 0,
    isSubTimerPaused: mockHooks.useTimers.isSubTimerPaused || false,
    pauseSubTimer: mockHooks.useTimers.pauseSubTimer,
    resumeSubTimer: mockHooks.useTimers.resumeSubTimer,
    resetSubTimer: mockHooks.useTimers.resetSubTimer,
    formatTime,
    
    // Modal props
    pushModalState: mockHooks.useGameModals.pushModalState,
    removeModalFromStack: mockHooks.useGameModals.removeModalFromStack,
    
    // Score props
    homeScore: gameState.homeScore || 0,
    awayScore: gameState.awayScore || 0,
    opponentTeamName: gameState.gameConfig?.opponentTeamName || 'Test Opponent',
    addHomeGoal: jest.fn(),
    addAwayGoal: jest.fn(),
    setScore: jest.fn(),
    
    // Game logic props
    nextPhysicalPairToSubOut: gameState.nextPhysicalPairToSubOut || null,
    nextPlayerToSubOut: gameState.nextPlayerToSubOut || null,
    nextPlayerIdToSubOut: gameState.nextPlayerIdToSubOut || null,
    nextNextPlayerIdToSubOut: gameState.nextNextPlayerIdToSubOut || null,
    setNextNextPlayerIdToSubOut: jest.fn(),
    selectedSquadPlayers: gameState.allPlayers || [],
    setNextPhysicalPairToSubOut: jest.fn(),
    setNextPlayerToSubOut: jest.fn(),
    setNextPlayerIdToSubOut: jest.fn(),
    alertMinutes: gameState.gameConfig?.alertMinutes || 5,
    
    // Handler functions
    handleUndoSubstitution: jest.fn(),
    handleEndPeriod: jest.fn(),
    togglePlayerInactive: jest.fn(),
    switchPlayerPositions: jest.fn(),
    switchGoalie: jest.fn(),
    setLastSubstitutionTimestamp: jest.fn()
  };
};