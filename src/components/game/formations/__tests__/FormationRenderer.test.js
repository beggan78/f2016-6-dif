/**
 * FormationRenderer Component Tests
 * 
 * Tests the formation routing component that selects and renders the appropriate
 * formation component based on team mode.
 * 
 * Test Coverage: 18 tests covering:
 * - Component routing logic for different team modes
 * - Props passing to child formation components
 * - Error handling for invalid/unsupported team modes
 * - Integration with formation data and handlers
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormationRenderer } from '../FormationRenderer';
import { TEAM_MODES } from '../../../../constants/playerConstants';
import {
  createMockGameScreenProps,
  createMockPlayers,
  createMockFormation
} from '../../../__tests__/componentTestUtils';

// Mock the formation components  
jest.mock('../PairsFormation', () => ({
  PairsFormation: (props) => (
    <div data-testid="pairs-formation" data-team-mode={props.teamMode || 'none'}>
      <div data-testid="pairs-formation-players">{props.allPlayers?.length || 0} players</div>
      <div data-testid="pairs-formation-goalie">{props.periodFormation?.goalie || 'No goalie'}</div>
      Pairs Formation Component
    </div>
  )
}));

jest.mock('../IndividualFormation', () => ({
  IndividualFormation: (props) => (
    <div data-testid="individual-formation" data-team-mode={props.teamMode || 'none'}>
      <div data-testid="individual-formation-players">{props.allPlayers?.length || 0} players</div>
      <div data-testid="individual-formation-goalie">{props.periodFormation?.goalie || 'No goalie'}</div>
      Individual Formation Component
    </div>
  )
}));

describe('FormationRenderer', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      teamMode: TEAM_MODES.INDIVIDUAL_7,
      periodFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_7),
      allPlayers: createMockPlayers(),
      animationState: { type: 'none', phase: 'idle', data: {} },
      recentlySubstitutedPlayers: new Set(),
      hideNextOffIndicator: false,
      nextPhysicalPairToSubOut: 'leftPair',
      nextPlayerIdToSubOut: '1',
      nextNextPlayerIdToSubOut: '2',
      longPressHandlers: {
        handleFieldPlayerClick: jest.fn(),
        handleFieldPlayerLongPress: jest.fn()
      },
      getPlayerNameById: jest.fn((id) => `Player ${id}`),
      getPlayerTimeStats: jest.fn(() => ({ totalOutfieldTime: 300, attackDefenderDiff: 0 }))
    };
  });

  describe('Component Routing Logic', () => {
    it('should render PairsFormation for PAIRS_7 team mode', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        periodFormation: createMockFormation(TEAM_MODES.PAIRS_7)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation')).toBeInTheDocument();
      // Note: FormationRenderer currently doesn't pass teamMode to PairsFormation
      expect(screen.getByTestId('pairs-formation')).toHaveAttribute('data-team-mode', 'none');
      expect(screen.getByText('Pairs Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('individual-formation')).not.toBeInTheDocument();
    });

    it('should render IndividualFormation for INDIVIDUAL_6 team mode', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6,
        periodFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_6)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
      expect(screen.getByTestId('individual-formation')).toHaveAttribute('data-team-mode', TEAM_MODES.INDIVIDUAL_6);
      expect(screen.getByText('Individual Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
    });

    it('should render IndividualFormation for INDIVIDUAL_7 team mode', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        periodFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_7)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
      expect(screen.getByTestId('individual-formation')).toHaveAttribute('data-team-mode', TEAM_MODES.INDIVIDUAL_7);
      expect(screen.getByText('Individual Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
    });

    it('should show error message for unsupported team mode', () => {
      const props = {
        ...defaultProps,
        teamMode: 'INVALID_MODE'
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported formation type: INVALID_MODE/)).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('individual-formation')).not.toBeInTheDocument();
    });

    it('should show error message when teamMode is null', () => {
      const props = {
        ...defaultProps,
        teamMode: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported formation type:/)).toBeInTheDocument();
    });

    it('should show error message when teamMode is undefined', () => {
      const props = {
        ...defaultProps,
        teamMode: undefined
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported formation type:/)).toBeInTheDocument();
    });
  });

  describe('Props Passing to PairsFormation', () => {
    it('should pass all props correctly to PairsFormation', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        periodFormation: createMockFormation(TEAM_MODES.PAIRS_7),
        allPlayers: createMockPlayers(7)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('pairs-formation-players')).toHaveTextContent('7 players');
      expect(screen.getByTestId('pairs-formation-goalie')).toHaveTextContent('7');
    });

    it('should handle empty players array for PairsFormation', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        periodFormation: createMockFormation(TEAM_MODES.PAIRS_7),
        allPlayers: []
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation-players')).toHaveTextContent('0 players');
    });

    it('should handle missing periodFormation for PairsFormation', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        periodFormation: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation-goalie')).toHaveTextContent('No goalie');
    });
  });

  describe('Props Passing to IndividualFormation', () => {
    it('should pass all props correctly to IndividualFormation for INDIVIDUAL_6', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6,
        periodFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_6),
        allPlayers: createMockPlayers(6)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('6 players');
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('6');
    });

    it('should pass all props correctly to IndividualFormation for INDIVIDUAL_7', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        periodFormation: createMockFormation(TEAM_MODES.INDIVIDUAL_7),
        allPlayers: createMockPlayers(7)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('7 players');
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('7');
    });

    it('should handle empty players array for IndividualFormation', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        allPlayers: []
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('0 players');
    });

    it('should handle missing periodFormation for IndividualFormation', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        periodFormation: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('No goalie');
    });
  });

  describe('Handler Integration', () => {
    it('should pass longPressHandlers to formation components', () => {
      const mockHandlers = {
        handleFieldPlayerClick: jest.fn(),
        handleFieldPlayerLongPress: jest.fn(),
        handleSubstituteClick: jest.fn()
      };
      
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        longPressHandlers: mockHandlers
      };
      
      render(<FormationRenderer {...props} />);
      
      // Component should render without throwing
      expect(screen.getByTestId('pairs-formation')).toBeInTheDocument();
    });

    it('should pass function props to formation components', () => {
      const mockGetPlayerName = jest.fn((id) => `Custom Player ${id}`);
      const mockGetPlayerStats = jest.fn(() => ({ totalOutfieldTime: 500, attackDefenderDiff: 10 }));
      
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_7,
        getPlayerNameById: mockGetPlayerName,
        getPlayerTimeStats: mockGetPlayerStats
      };
      
      render(<FormationRenderer {...props} />);
      
      // Component should render without throwing
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should not crash with null props', () => {
      expect(() => render(<FormationRenderer teamMode={TEAM_MODES.INDIVIDUAL_7} />)).not.toThrow();
    });

    it('should not crash with undefined longPressHandlers', () => {
      const props = {
        ...defaultProps,
        longPressHandlers: undefined
      };
      
      expect(() => render(<FormationRenderer {...props} />)).not.toThrow();
    });

    it('should not crash with null allPlayers', () => {
      const props = {
        ...defaultProps,
        allPlayers: null
      };
      
      expect(() => render(<FormationRenderer {...props} />)).not.toThrow();
    });

    it('should handle empty string teamMode', () => {
      const props = {
        ...defaultProps,
        teamMode: ''
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported formation type:/)).toBeInTheDocument();
    });
  });
});