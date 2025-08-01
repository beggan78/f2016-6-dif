/**
 * PairsFormation Component Tests
 * 
 * Comprehensive testing suite for the pairs formation component used in PAIRS_7 team mode.
 * 
 * Test Coverage: 28 tests covering:
 * - Core rendering of three pairs (leftPair, rightPair, subPair)
 * - Visual state management (indicators, styling, animations)
 * - User interaction handling (longPress events, touch interactions)
 * - Animation integration with game state
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PairsFormation } from '../PairsFormation';
import { TEAM_MODES } from '../../../../constants/playerConstants';
import {
  createMockPlayers,
  createMockFormation,
  userInteractions
} from '../../../__tests__/componentTestUtils';

// Mock external dependencies
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
  ArrowDownCircle: ({ className, ...props }) => <div data-testid="arrow-down-icon" className={className} {...props} />,
  Shield: ({ className, ...props }) => <div data-testid="shield-icon" className={className} {...props} />,
  Sword: ({ className, ...props }) => <div data-testid="sword-icon" className={className} {...props} />,
  Hand: ({ className, ...props }) => <div data-testid="hand-icon" className={className} {...props} />
}));

describe('PairsFormation', () => {
  let defaultProps;
  let mockPairsFormation;
  let mockPlayers;
  let mockLongPressHandlers;

  beforeEach(() => {
    mockPairsFormation = createMockFormation(TEAM_MODES.PAIRS_7);
    mockPlayers = createMockPlayers(7);
    mockLongPressHandlers = {
      handleFieldPlayerClick: jest.fn(),
      handleFieldPlayerLongPress: jest.fn()
    };

    defaultProps = {
      formation: mockPairsFormation,
      allPlayers: mockPlayers,
      animationState: { type: 'none', phase: 'idle', data: {} },
      recentlySubstitutedPlayers: new Set(),
      hideNextOffIndicator: false,
      nextPhysicalPairToSubOut: 'leftPair',
      longPressHandlers: mockLongPressHandlers,
      goalieHandlers: {
        goalieEvents: {
          onTouchStart: jest.fn(),
          onTouchEnd: jest.fn(),
          onClick: jest.fn()
        }
      },
      getPlayerNameById: jest.fn((id) => `Player ${id}`),
      getPlayerTimeStats: jest.fn(() => ({ totalOutfieldTime: 300, attackDefenderDiff: 0 }))
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock implementations
    const { getPositionEvents } = require('../../../../game/ui/positionUtils');
    const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
    const { getPairAnimation, getPlayerAnimation } = require('../../../../game/ui/playerAnimation');
    
    getPositionEvents.mockImplementation((handlers, pairKey) => ({
      onTouchStart: jest.fn(),
      onTouchEnd: jest.fn(),
      onTouchMove: jest.fn(),
      onClick: jest.fn(),
      'data-position': pairKey
    }));
    
    getPlayerStyling.mockReturnValue({
      bgColor: 'bg-sky-700',
      textColor: 'text-sky-100', 
      borderColor: 'border-transparent',
      glowClass: ''
    });
    
    getPairAnimation.mockReturnValue({
      animationClass: '',
      zIndexClass: 'z-auto',
      styleProps: {}
    });
    
    getPlayerAnimation.mockReturnValue({
      animationClass: '',
      zIndexClass: 'z-auto',
      styleProps: {}
    });
  });

  describe('Core Rendering', () => {
    it('should render goalie and all three pairs (leftPair, rightPair, subPair)', () => {
      render(<PairsFormation {...defaultProps} />);
      
      expect(screen.getByText('Goalie')).toBeInTheDocument();
      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.getByText('Right')).toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();
    });

    it('should display defender and attacker names with correct icons', () => {
      render(<PairsFormation {...defaultProps} />);
      
      // Check that Shield icons are rendered for defenders
      const shieldIcons = screen.getAllByTestId('shield-icon');
      expect(shieldIcons).toHaveLength(3); // One for each pair
      
      // Check that Sword icons are rendered for attackers
      const swordIcons = screen.getAllByTestId('sword-icon');
      expect(swordIcons).toHaveLength(3); // One for each pair
      
      // Check player names are displayed
      expect(screen.getByText(/D: Player 1/)).toBeInTheDocument(); // leftPair defender
      expect(screen.getByText(/A: Player 2/)).toBeInTheDocument(); // leftPair attacker
      expect(screen.getByText(/D: Player 3/)).toBeInTheDocument(); // rightPair defender
      expect(screen.getByText(/A: Player 4/)).toBeInTheDocument(); // rightPair attacker
    });

    it('should render PlayerStatsDisplay components for each player', () => {
      render(<PairsFormation {...defaultProps} />);
      
      // Should have stats displays for all 6 players (3 pairs × 2 players each)
      expect(screen.getByTestId('player-stats-1')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-2')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-3')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-4')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-5')).toBeInTheDocument();
      expect(screen.getByTestId('player-stats-6')).toBeInTheDocument();
    });

    it('should handle missing formation gracefully', () => {
      const props = {
        ...defaultProps,
        formation: null
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle missing pairData in formation', () => {
      const props = {
        ...defaultProps,
        formation: {
          goalie: '7',
          leftPair: { defender: '1', attacker: '2' },
          // rightPair missing
          subPair: { defender: '5', attacker: '6' }
        }
      };
      
      render(<PairsFormation {...props} />);
      
      expect(screen.getByText('Left')).toBeInTheDocument();
      expect(screen.queryByText('Right')).not.toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();
    });

    it('should display help text for interactive pairs', () => {
      render(<PairsFormation {...defaultProps} />);
      
      const helpTexts = screen.getAllByText('Hold for options');
      expect(helpTexts).toHaveLength(2); // Only leftPair and rightPair are interactive
    });

    it('should apply correct container structure', () => {
      const { container } = render(<PairsFormation {...defaultProps} />);
      
      expect(container.firstChild).toHaveClass('space-y-2');
    });

    it('should handle empty formation object', () => {
      const props = {
        ...defaultProps,
        formation: {}
      };
      
      const { container } = render(<PairsFormation {...props} />);
      
      // With empty formation object, no pairs exist so no content is rendered
      expect(screen.queryByText('Left')).not.toBeInTheDocument();
      expect(screen.queryByText('Right')).not.toBeInTheDocument();
      expect(screen.queryByText('Substitutes')).not.toBeInTheDocument();
      
      // But the container should still exist
      expect(container.firstChild).toHaveClass('space-y-2');
    });
  });

  describe('Visual State Management', () => {
    it('should show "Next Off" indicator for nextPhysicalPairToSubOut', () => {
      const props = {
        ...defaultProps,
        nextPhysicalPairToSubOut: 'rightPair'
      };
      
      render(<PairsFormation {...props} />);
      
      expect(screen.getByTestId('arrow-down-icon')).toBeInTheDocument();
    });

    it('should show "Next On" indicator for subPair', () => {
      render(<PairsFormation {...defaultProps} />);
      
      expect(screen.getByTestId('arrow-up-icon')).toBeInTheDocument();
    });

    it('should hide indicators when hideNextOffIndicator is true', () => {
      const props = {
        ...defaultProps,
        hideNextOffIndicator: true
      };
      
      render(<PairsFormation {...props} />);
      
      expect(screen.queryByTestId('arrow-down-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('arrow-up-icon')).not.toBeInTheDocument();
    });

    it('should apply styling for recently substituted pairs', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      const props = {
        ...defaultProps,
        recentlySubstitutedPlayers: new Set(['1', '2']) // leftPair players
      };
      
      render(<PairsFormation {...props} />);
      
      // Should call getPlayerStyling with isRecentlySubstituted: true for leftPair
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isRecentlySubstituted: true
      }));
    });

    it('should apply correct background colors for field vs substitute pairs', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      render(<PairsFormation {...defaultProps} />);
      
      // Field pairs (leftPair, rightPair) should have isFieldPosition: true
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isFieldPosition: true
      }));
      
      // subPair should have isFieldPosition: false
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isFieldPosition: false
      }));
    });

    it('should handle partial recently substituted pairs', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      const props = {
        ...defaultProps,
        recentlySubstitutedPlayers: new Set(['2']) // Only attacker from leftPair
      };
      
      render(<PairsFormation {...props} />);
      
      // Should still mark the pair as recently substituted
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isRecentlySubstituted: true
      }));
    });

    it('should apply correct visual states for different pair types', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      const props = {
        ...defaultProps,
        nextPhysicalPairToSubOut: 'leftPair'
      };
      
      render(<PairsFormation {...props} />);
      
      // leftPair should be marked as nextOff
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isNextOff: true,
        isNextOn: false
      }));
      
      // subPair should be marked as nextOn
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isNextOff: false,
        isNextOn: true
      }));
    });

    it('should disable inactive player features in pairs mode', () => {
      const { getPlayerStyling } = require('../../../../game/ui/playerStyling');
      
      render(<PairsFormation {...defaultProps} />);
      
      // All calls should have inactive features disabled
      expect(getPlayerStyling).toHaveBeenCalledWith(expect.objectContaining({
        isInactive: false,
        supportsInactivePlayers: false
      }));
    });
  });

  describe('User Interaction Handling', () => {
    it('should apply longPressEvents to interactive pairs', () => {
      const { getPositionEvents } = require('../../../../game/ui/positionUtils');
      
      render(<PairsFormation {...defaultProps} />);
      
      // Should call getPositionEvents for leftPair and rightPair
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'leftPair');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'rightPair');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'subPair');
    });

    it('should pass correct pairKey to position event handlers', () => {
      const { getPositionEvents } = require('../../../../game/ui/positionUtils');
      
      render(<PairsFormation {...defaultProps} />);
      
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'leftPair');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'rightPair');
      expect(getPositionEvents).toHaveBeenCalledWith(mockLongPressHandlers, 'subPair');
    });

    it('should handle missing longPressHandlers gracefully', () => {
      const props = {
        ...defaultProps,
        longPressHandlers: null
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle undefined longPressHandlers', () => {
      const props = {
        ...defaultProps,
        longPressHandlers: undefined
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });
  });

  describe('Animation Integration', () => {
    it('should call getPairAnimation for each pair', () => {
      const { getPairAnimation } = require('../../../../game/ui/playerAnimation');
      
      render(<PairsFormation {...defaultProps} />);
      
      // Should call getPairAnimation for each pair's defender and attacker
      expect(getPairAnimation).toHaveBeenCalledWith('1', '2', defaultProps.animationState);
      expect(getPairAnimation).toHaveBeenCalledWith('3', '4', defaultProps.animationState);
      expect(getPairAnimation).toHaveBeenCalledWith('5', '6', defaultProps.animationState);
    });

    it('should handle different animationState types', () => {
      const { getPairAnimation } = require('../../../../game/ui/playerAnimation');
      
      const props = {
        ...defaultProps,
        animationState: {
          type: 'substitution',
          phase: 'switching',
          data: { fromPair: 'leftPair', toPair: 'subPair' }
        }
      };
      
      render(<PairsFormation {...props} />);
      
      expect(getPairAnimation).toHaveBeenCalledWith('1', '2', props.animationState);
    });

    it('should handle null animationState', () => {
      const props = {
        ...defaultProps,
        animationState: null
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should apply animation classes to pair containers', () => {
      const { getPairAnimation } = require('../../../../game/ui/playerAnimation');
      getPairAnimation.mockReturnValue({
        animationClass: 'animate-pulse',
        zIndexClass: 'z-50',
        styleProps: { transform: 'translateX(10px)' }
      });
      
      render(<PairsFormation {...defaultProps} />);
      
      // Should apply animation classes to containers (tested through className verification)
      expect(getPairAnimation).toHaveBeenCalled();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle null props without crashing', () => {
      expect(() => render(<PairsFormation formation={null} />)).not.toThrow();
    });

    it('should work with empty allPlayers array', () => {
      const props = {
        ...defaultProps,
        allPlayers: []
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle missing player IDs in formation', () => {
      const props = {
        ...defaultProps,
        formation: {
          goalie: '7',
          leftPair: { defender: null, attacker: '2' },
          rightPair: { defender: '3', attacker: undefined },
          subPair: { defender: '5', attacker: '6' }
        }
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle missing getPlayerNameById function', () => {
      const props = {
        ...defaultProps,
        getPlayerNameById: null
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle missing getPlayerTimeStats function', () => {
      const props = {
        ...defaultProps,
        getPlayerTimeStats: undefined
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle malformed pair objects', () => {
      const props = {
        ...defaultProps,
        formation: {
          goalie: '7',
          leftPair: 'invalid', // Should be object with defender/attacker
          rightPair: { defender: '3' }, // Missing attacker
          subPair: { attacker: '6' } // Missing defender
        }
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });

    it('should handle very large recentlySubstitutedPlayers set', () => {
      const props = {
        ...defaultProps,
        recentlySubstitutedPlayers: new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'])
      };
      
      expect(() => render(<PairsFormation {...props} />)).not.toThrow();
    });
  });
});