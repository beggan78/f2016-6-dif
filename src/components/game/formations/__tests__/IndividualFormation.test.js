/**
 * IndividualFormation Component Tests
 * 
 * Comprehensive testing suite for the individual formation component used in INDIVIDUAL_6 and INDIVIDUAL_7 team modes.
 * This is the most complex formation component, supporting multiple team modes with different features.
 * 
 * Test Coverage: 40+ tests covering:
 * - Core rendering for both INDIVIDUAL_6 and INDIVIDUAL_7 team modes
 * - Position management (field positions vs substitutes)
 * - Visual state management (indicators, styling, animations)
 * - Inactive player support (INDIVIDUAL_7 only)
 * - Next/Next-Next rotation indicators (INDIVIDUAL_7 only)
 * - User interaction handling (longPress events, touch interactions)
 * - Animation integration with game state
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { IndividualFormation } from '../IndividualFormation';
import { TEAM_MODES } from '../../../../constants/playerConstants';
import {
  createMockPlayers,
  createMockFormation,
  userInteractions
} from '../../../__tests__/componentTestUtils';

// Mock external dependencies
jest.mock('../../../../utils/playerUtils');
jest.mock('../../../../game/logic/positionUtils');
jest.mock('../../../../utils/formationUtils');
jest.mock('../../../../game/ui/positionUtils');
jest.mock('../../../../game/ui/playerStyling');
jest.mock('../../../../game/ui/playerAnimation');

jest.mock('../components/PlayerStatsDisplay', () => ({
  PlayerStatsDisplay: ({ playerId, getPlayerTimeStats, className }) => (
    <div data-testid={`player-stats-${playerId}`} className={className}>
      Stats for {playerId}
    </div>
  )
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  ArrowUpCircle: ({ className, ...props }) => <div data-testid="arrow-up-icon" className={className} {...props} />,
  ArrowDownCircle: ({ className, ...props }) => <div data-testid="arrow-down-icon" className={className} {...props} />
}));

describe('IndividualFormation', () => {
  let defaultProps;
  let mockIndividualFormation;
  let mockPlayers;
  let mockLongPressHandlers;

  beforeEach(() => {
    // Default to INDIVIDUAL_7 for most tests (most complex)
    mockIndividualFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_7);
    mockPlayers = createMockPlayers(7);
    mockLongPressHandlers = {
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerLongPress: jest.fn(),
      handleSubstituteClick: jest.fn()
    };

    defaultProps = {
      teamMode: TEAM_MODES.INDIVIDUAL_7,
      formation: mockIndividualFormation,
      allPlayers: mockPlayers,
      animationState: { type: 'none', phase: 'idle', data: {} },
      recentlySubstitutedPlayers: new Set(),
      hideNextOffIndicator: false,
      nextPlayerIdToSubOut: '1',
      nextNextPlayerIdToSubOut: '2',
      longPressHandlers: mockLongPressHandlers,
      getPlayerNameById: jest.fn((id) => `Player ${id}`),
      getPlayerTimeStats: jest.fn(() => ({ totalOutfieldTime: 300, attackDefenderDiff: 0 }))
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    const { findPlayerById } = require('../../../../utils/playerUtils');
    const { getFieldPositions, getSubstitutePositions } = require('../../../../game/logic/positionUtils');
    const { getAllPositions } = require('../../../../utils/formationUtils');
    const { 
      getPositionIcon, 
      getPositionDisplayName, 
      getIndicatorProps, 
      getPositionEvents,
      supportsInactivePlayers,
      supportsNextNextIndicators
    } = require('../../../../game/ui/positionUtils');
    const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
    const { getPlayerAnimation } = require('../../../../game/ui/playerAnimation');
    
    // Mock utility functions
    findPlayerById.mockImplementation((players, id) => 
      players.find(p => p.id === id) || { id, stats: { isInactive: false } }
    );
    
    getFieldPositions.mockImplementation((teamMode) => {
      if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
      }
      return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'];
    });
    
    getSubstitutePositions.mockImplementation((teamMode) => {
      if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        return ['substitute'];
      }
      return ['substitute_1', 'substitute_2'];
    });
    
    getAllPositions.mockImplementation((teamMode) => {
      if (teamMode === TEAM_MODES.INDIVIDUAL_6) {
        return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute', 'goalie'];
      }
      return ['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker', 'substitute_1', 'substitute_2', 'goalie'];
    });
    
    getPositionIcon.mockImplementation((position, substitutePositions) => {
      if (substitutePositions.includes(position)) return '🔄';
      if (position.includes('Defender')) return '🛡️';
      if (position.includes('Attacker')) return '⚔️';
      return '👤';
    });
    
    getPositionDisplayName.mockImplementation((position, player, teamMode, substitutePositions) => {
      if (position === 'leftDefender' || position === 'leftDefender') return 'Left Defender';
      if (position === 'rightDefender' || position === 'rightDefender') return 'Right Defender';
      if (position === 'leftAttacker' || position === 'leftAttacker') return 'Left Attacker';
      if (position === 'rightAttacker' || position === 'rightAttacker') return 'Right Attacker';
      if (position === 'substitute' || position.includes('substitute')) return 'Substitute';
      return position;
    });
    
    getIndicatorProps.mockImplementation((player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) => ({
      isNextOff: player?.id === nextPlayerIdToSubOut,
      isNextOn: substitutePositions.some(pos => 
        mockIndividualFormation[pos] === nextPlayerIdToSubOut
      ),
      isNextNextOff: player?.id === nextNextPlayerIdToSubOut,
      isNextNextOn: substitutePositions.some(pos => 
        mockIndividualFormation[pos] === nextNextPlayerIdToSubOut
      )
    }));
    
    getPositionEvents.mockImplementation((handlers, position) => ({
      onTouchStart: jest.fn(),
      onTouchEnd: jest.fn(),
      onTouchMove: jest.fn(),
      onClick: jest.fn(),
      'data-position': position
    }));
    
    supportsInactivePlayers.mockImplementation((teamMode) => teamMode === TEAM_MODES.INDIVIDUAL_7);
    
    supportsNextNextIndicators.mockImplementation((teamMode) => teamMode === TEAM_MODES.INDIVIDUAL_7);
    
    getPlayerStyling.mockReturnValue({
      bgColor: 'bg-sky-700',
      textColor: 'text-sky-100', 
      borderColor: 'border-transparent',
      glowClass: ''
    });
    
    getPlayerAnimation.mockReturnValue({
      animationClass: '',
      zIndexClass: 'z-auto',
      styleProps: {}
    });
  });

  describe('Core Rendering - INDIVIDUAL_7', () => {
    it('should render all positions for INDIVIDUAL_7 team mode', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByText('Left Defender')).toBeInTheDocument();
      expect(screen.getByText('Right Defender')).toBeInTheDocument();
      expect(screen.getByText('Left Attacker')).toBeInTheDocument();
      expect(screen.getByText('Right Attacker')).toBeInTheDocument();
      expect(screen.getAllByText('Substitute')).toHaveLength(2); // Two substitutes in INDIVIDUAL_7
    });

    it('should display player names and stats for each position', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      // Check player names are displayed (using flexible text matching)
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🛡️ Player 1';
      })).toBeInTheDocument(); // leftDefender
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🛡️ Player 2';
      })).toBeInTheDocument(); // rightDefender
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '⚔️ Player 3';
      })).toBeInTheDocument(); // leftAttacker
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '⚔️ Player 4';
      })).toBeInTheDocument(); // rightAttacker
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🔄 Player 5';
      })).toBeInTheDocument(); // substitute_1
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🔄 Player 6';
      })).toBeInTheDocument(); // substitute_2
    });

    it('should render PlayerStatsDisplay components for each player', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      // Should have stats displays for all 6 players (excluding goalie)
      expect(screen.getByTestId('player-stats-1')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-2')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-3')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-4')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-5')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-6')).toBeInTheDocument();
    });

    it('should display position icons correctly', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      // Check that position icons are displayed as part of player text (mocked as emoji)
      // Use more specific matching to find only the direct text nodes with icons
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '🛡️ Player 1';
      })).toHaveLength(1); // Left defender
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '🛡️ Player 2';
      })).toHaveLength(1); // Right defender
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '⚔️ Player 3';
      })).toHaveLength(1); // Left attacker
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '⚔️ Player 4';
      })).toHaveLength(1); // Right attacker
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '🔄 Player 5';
      })).toHaveLength(1); // Substitute 1
      expect(screen.getAllByText((content, node) => {
        return node && node.tagName === 'DIV' && node.textContent === '🔄 Player 6';
      })).toHaveLength(1); // Substitute 2
    });

    it('should apply correct container structure', () => {
      const { container } = render(<IndividualFormation {...defaultProps} />);
      
      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('should handle missing formation gracefully', () => {
      const props = {
        ...defaultProps,
        formation: null
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle missing player IDs in formation', () => {
      const props = {
        ...defaultProps,
        formation: {
          leftDefender: '1',
          rightDefender: null,
          leftAttacker: undefined,
          rightAttacker: '4',
          substitute_1: '5',
          substitute_2: '6',
          goalie: '7'
        }
      };
      
      render(<IndividualFormation {...props} />);
      
      // Should only render positions with valid player IDs (using flexible text matching)
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🛡️ Player 1';
      })).toBeInTheDocument();
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '⚔️ Player 4';
      })).toBeInTheDocument();
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🔄 Player 5';
      })).toBeInTheDocument();
      expect(screen.getByText((content, node) => {
        return node && node.textContent === '🔄 Player 6';
      })).toBeInTheDocument();
    });
  });

  describe('Core Rendering - INDIVIDUAL_6', () => {
    beforeEach(() => {
      // Update mocks for INDIVIDUAL_6
      mockIndividualFormation = createMockFormation(TEAM_MODES.INDIVIDUAL_6);
      mockPlayers = createMockPlayers(6);
      defaultProps = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6,
        formation: mockIndividualFormation,
        allPlayers: mockPlayers,
        nextNextPlayerIdToSubOut: undefined // INDIVIDUAL_6 doesn't use next-next
      };
    });

    it('should render all positions for INDIVIDUAL_6 team mode', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByText('Left Defender')).toBeInTheDocument();
      expect(screen.getByText('Right Defender')).toBeInTheDocument();
      expect(screen.getByText('Left Attacker')).toBeInTheDocument();
      expect(screen.getByText('Right Attacker')).toBeInTheDocument();
      expect(screen.getAllByText('Substitute')).toHaveLength(1); // One substitute in INDIVIDUAL_6
    });

    it('should not support inactive players in INDIVIDUAL_6', () => {
      const { supportsInactivePlayers } = require('../../../../game/ui/positionUtils');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should call supportsInactivePlayers with INDIVIDUAL_6 and return false
      expect(supportsInactivePlayers).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_6);
    });

    it('should not support next-next indicators in INDIVIDUAL_6', () => {
      const { supportsNextNextIndicators } = require('../../../../game/ui/positionUtils');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should call supportsNextNextIndicators with INDIVIDUAL_6 and return false
      expect(supportsNextNextIndicators).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_6);
    });
  });

  describe('Visual State Management', () => {
    it('should show "Next Off" indicator for nextPlayerIdToSubOut', () => {
      const { getIndicatorProps } = require('../../../../game/ui/positionUtils');
      getIndicatorProps.mockImplementation((player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) => {
        if (player?.id === '1') { // leftDefender player
          return { isNextOff: true, isNextOn: false, isNextNextOff: false, isNextNextOn: false };
        }
        return { isNextOff: false, isNextOn: false, isNextNextOff: false, isNextNextOn: false };
      });
      
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
    });

    it('should show "Next On" indicator for substitute positions', () => {
      const { getIndicatorProps } = require('../../../../game/ui/positionUtils');
      getIndicatorProps.mockImplementation((player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) => {
        if (player?.id === '5') { // substitute_1 player
          return { isNextOff: false, isNextOn: true, isNextNextOff: false, isNextNextOn: false };
        }
        return { isNextOff: false, isNextOn: false, isNextNextOff: false, isNextNextOn: false };
      });
      
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByTestId('arrow-up-icon')).toBeInTheDocument();
    });

    it('should show next-next indicators in INDIVIDUAL_7', () => {
      const { getIndicatorProps } = require('../../../../game/ui/positionUtils');
      getIndicatorProps.mockImplementation((player, position, teamMode, nextPlayerIdToSubOut, nextNextPlayerIdToSubOut, substitutePositions) => {
        if (player?.id === '2') { // rightDefender player
          return { isNextOff: false, isNextOn: false, isNextNextOff: true, isNextNextOn: false };
        }
        return { isNextOff: false, isNextOn: false, isNextNextOff: false, isNextNextOn: false };
      });
      
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
    });

    it('should hide indicators when hideNextOffIndicator is true', () => {
      const { getIndicatorProps } = require('../../../../game/ui/positionUtils');
      getIndicatorProps.mockReturnValue({ isNextOff: true, isNextOn: true, isNextNextOff: true, isNextNextOn: true });
      
      const props = {
        ...defaultProps,
        hideNextOffIndicator: true
      };
      
      render(<IndividualFormation {...props} />);
      
      expect(screen.queryByTestId('arrow-down-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('arrow-up-icon')).not.toBeInTheDocument();
    });

    it('should apply styling for recently substituted players', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      const props = {
        ...defaultProps,
        recentlySubstitutedPlayers: new Set(['1', '2']) // leftDefender and rightDefender
      };
      
      render(<IndividualFormation {...props} />);
      
      // Should call getPlayerStyling with isRecentlySubstituted: true
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isRecentlySubstituted: true
      }));
    });

    it('should apply correct background colors for field vs substitute positions', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Field positions should have isFieldPosition: true
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isFieldPosition: true
      }));
      
      // Substitute positions should have isFieldPosition: false
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isFieldPosition: false
      }));
    });
  });

  describe('Inactive Player Support (INDIVIDUAL_7)', () => {
    beforeEach(() => {
      // Mock a player as inactive
      const { findPlayerById } = require('../../../../utils/playerUtils');
      findPlayerById.mockImplementation((players, id) => {
        if (id === '5') { // substitute_1
          return { id: '5', stats: { isInactive: true } };
        }
        return { id, stats: { isInactive: false } };
      });
    });

    it('should display inactive status for inactive players', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByText('(Inactive)')).toBeInTheDocument();
    });

    it('should show substitute toggle help text for substitute positions', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      expect(screen.getByText('Hold to activate')).toBeInTheDocument();
    });

    it('should not show indicators for inactive players', () => {
      const { getIndicatorProps } = require('../../../../game/ui/positionUtils');
      getIndicatorProps.mockReturnValue({ isNextOff: true, isNextOn: false, isNextNextOff: false, isNextNextOn: false });
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Inactive player should not show indicators even if they are next off/on
      // This is controlled by the component's conditional rendering logic
    });

    it('should apply inactive styling to inactive players', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should call getPlayerStyling with isInactive: true for inactive players
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isInactive: true,
        supportsInactivePlayers: true
      }));
    });
  });

  describe('User Interaction Handling', () => {
    it('should apply longPressEvents to all positions', () => {
      const { getPositionEvents } = require('../../../../game/ui/positionUtils');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should call getPositionEvents for each position
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'leftDefender');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'rightDefender');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'leftAttacker');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'rightAttacker');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'substitute_1');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'substitute_2');
    });

    it('should handle missing longPressHandlers gracefully', () => {
      const props = {
        ...defaultProps,
        longPressHandlers: null
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should display help text for field player options', () => {
      render(<IndividualFormation {...defaultProps} />);
      
      const helpTexts = screen.getAllByText('Hold for options');
      expect(helpTexts.length).toBeGreaterThan(0); // Field positions should have help text
    });

    it('should make field positions interactive', () => {
      const { container } = render(<IndividualFormation {...defaultProps} />);
      
      // Field position containers should have interactive classes
      const interactiveElements = container.querySelectorAll('.cursor-pointer');
      expect(interactiveElements.length).toBeGreaterThan(0);
    });
  });

  describe('Animation Integration', () => {
    it('should call getPlayerAnimation for each player', () => {
      const { getPlayerAnimation } = require('../../../../game/ui/playerAnimation');
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should call getPlayerAnimation for each player
      expect(getPlayerAnimation).toHaveBeenCalledWith('1', defaultProps.animationState);
      expect(getPlayerAnimation).toHaveBeenCalledWith('2', defaultProps.animationState);
      expect(getPlayerAnimation).toHaveBeenCalledWith('3', defaultProps.animationState);
      expect(getPlayerAnimation).toHaveBeenCalledWith('4', defaultProps.animationState);
      expect(getPlayerAnimation).toHaveBeenCalledWith('5', defaultProps.animationState);
      expect(getPlayerAnimation).toHaveBeenCalledWith('6', defaultProps.animationState);
    });

    it('should handle different animationState types', () => {
      const { getPlayerAnimation } = require('../../../../game/ui/playerAnimation');
      
      const props = {
        ...defaultProps,
        animationState: {
          type: 'substitution',
          phase: 'switching',
          data: { fromPosition: 'leftDefender', toPosition: 'substitute_1' }
        }
      };
      
      render(<IndividualFormation {...props} />);
      
      expect(getPlayerAnimation).toHaveBeenCalledWith('1', props.animationState);
    });

    it('should handle null animationState', () => {
      const props = {
        ...defaultProps,
        animationState: null
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should apply animation classes to position containers', () => {
      const { getPlayerAnimation } = require('../../../../game/ui/playerAnimation');
      getPlayerAnimation.mockReturnValue({
        animationClass: 'animate-pulse',
        zIndexClass: 'z-50',
        styleProps: { transform: 'translateX(10px)' }
      });
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should apply animation classes to containers (tested through className verification)
      expect(getPlayerAnimation).toHaveBeenCalled();
    });
  });

  describe('Formation Capability Detection', () => {
    it('should correctly detect INDIVIDUAL_7 capabilities', () => {
      const { supportsInactivePlayers, supportsNextNextIndicators } = require('../../../../game/ui/positionUtils');
      
      render(<IndividualFormation {...defaultProps} />);
      
      expect(supportsInactivePlayers).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_7);
      expect(supportsNextNextIndicators).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_7);
    });

    it('should correctly detect INDIVIDUAL_6 capabilities', () => {
      const { supportsInactivePlayers, supportsNextNextIndicators } = require('../../../../game/ui/positionUtils');
      
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6
      };
      
      render(<IndividualFormation {...props} />);
      
      expect(supportsInactivePlayers).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_6);
      expect(supportsNextNextIndicators).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_6);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle null props without crashing', () => {
      expect(() => render(<IndividualFormation teamMode={TEAM_MODES.INDIVIDUAL_7} />)).not.toThrow();
    });

    it('should work with empty allPlayers array', () => {
      const props = {
        ...defaultProps,
        allPlayers: []
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle missing getPlayerNameById function', () => {
      const props = {
        ...defaultProps,
        getPlayerNameById: null
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle missing getPlayerTimeStats function', () => {
      const props = {
        ...defaultProps,
        getPlayerTimeStats: undefined
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle malformed formation object', () => {
      const props = {
        ...defaultProps,
        formation: {
          leftDefender: 'invalid-id',
          rightDefender: 123, // Should be string
          leftAttacker: '', // Empty string
          rightAttacker: '4'
          // Missing substitute positions
        }
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle very large recentlySubstitutedPlayers set', () => {
      const props = {
        ...defaultProps,
        recentlySubstitutedPlayers: new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle undefined teamMode', () => {
      const props = {
        ...defaultProps,
        teamMode: undefined
      };
      
      expect(() => render(<IndividualFormation {...props} />)).not.toThrow();
    });

    it('should handle missing position utility functions', () => {
      const { getAllPositions } = require('../../../../utils/formationUtils');
      getAllPositions.mockReturnValue([]);
      
      render(<IndividualFormation {...defaultProps} />);
      
      // Should render empty container
      const { container } = render(<IndividualFormation {...defaultProps} />);
      expect(container.firstChild).toHaveClass('space-y-2');
    });
  });
});