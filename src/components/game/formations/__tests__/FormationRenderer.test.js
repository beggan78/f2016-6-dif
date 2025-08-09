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
import { TEAM_CONFIGS } from '../../../../game/testUtils';
import { createTeamConfig } from '../../../../constants/teamConfiguration';
import {
  createMockGameScreenProps,
  createMockPlayers,
  createMockFormation
} from '../../../__tests__/componentTestUtils';


// Mock the formation components  
jest.mock('../PairsFormation', () => ({
  PairsFormation: (props) => (
    <div data-testid="pairs-formation" data-substitution-type="pairs">
      <div data-testid="pairs-formation-players">{props.allPlayers?.length || 0} players</div>
      <div data-testid="pairs-formation-goalie">{props.formation?.goalie || 'No goalie'}</div>
      Pairs Formation Component
    </div>
  )
}));

jest.mock('../IndividualFormation', () => ({
  IndividualFormation: (props) => (
    <div data-testid="individual-formation" data-substitution-type="individual">
      <div data-testid="individual-formation-players">{props.allPlayers?.length || 0} players</div>
      <div data-testid="individual-formation-goalie">{props.formation?.goalie || 'No goalie'}</div>
      Individual Formation Component
    </div>
  )
}));

describe('FormationRenderer', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
      selectedFormation: '2-2',
      formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7),
      allPlayers: createMockPlayers(),
      animationState: { type: 'none', phase: 'idle', data: {} },
      recentlySubstitutedPlayers: new Set(),
      hideNextOffIndicator: false,
      nextPhysicalPairToSubOut: 'leftPair',
      nextPlayerIdToSubOut: '1',
      nextNextPlayerIdToSubOut: '2',
      quickTapHandlers: {
        handleFieldPlayerClick: jest.fn(),
        handleFieldPlayerQuickTap: jest.fn()
      },
      getPlayerNameById: jest.fn((id) => `Player ${id}`),
      getPlayerTimeStats: jest.fn(() => ({ totalOutfieldTime: 300, attackDefenderDiff: 0 }))
    };
  });

  describe('Component Routing Logic', () => {
    it('should render PairsFormation for pairs substitution type', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.PAIRS_7,
        formation: createMockFormation(TEAM_CONFIGS.PAIRS_7)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation')).toBeInTheDocument();
      expect(screen.getByTestId('pairs-formation')).toHaveAttribute('data-substitution-type', 'pairs');
      expect(screen.getByText('Pairs Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('individual-formation')).not.toBeInTheDocument();
    });

    it('should render IndividualFormation for individual substitution type (6 players)', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_6,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_6)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
      expect(screen.getByTestId('individual-formation')).toHaveAttribute('data-substitution-type', 'individual');
      expect(screen.getByText('Individual Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
    });

    it('should render IndividualFormation for individual substitution type (7 players)', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
      expect(screen.getByTestId('individual-formation')).toHaveAttribute('data-substitution-type', 'individual');
      expect(screen.getByText('Individual Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
    });

    it('should render IndividualFormation for individual substitution type (8 players)', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_8,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_8)
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation')).toBeInTheDocument();
      expect(screen.getByTestId('individual-formation')).toHaveAttribute('data-substitution-type', 'individual');
      expect(screen.getByText('Individual Formation Component')).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
    });

    it('should show error message for unsupported substitution type', () => {
      const props = {
        ...defaultProps,
        teamConfig: { substitutionType: 'INVALID_TYPE' }
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported substitution type: INVALID_TYPE/)).toBeInTheDocument();
      expect(screen.queryByTestId('pairs-formation')).not.toBeInTheDocument();
      expect(screen.queryByTestId('individual-formation')).not.toBeInTheDocument();
    });

    it('should show error message when teamConfig is null', () => {
      const props = {
        ...defaultProps,
        teamConfig: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/No team configuration available/)).toBeInTheDocument();
    });

    it('should show error message when teamConfig is undefined', () => {
      const props = {
        ...defaultProps,
        teamConfig: undefined
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/No team configuration available/)).toBeInTheDocument();
    });
  });

  describe('Props Passing to PairsFormation', () => {
    it('should pass all props correctly to PairsFormation', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.PAIRS_7,
        formation: createMockFormation(TEAM_CONFIGS.PAIRS_7),
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
        teamConfig: TEAM_CONFIGS.PAIRS_7,
        formation: createMockFormation(TEAM_CONFIGS.PAIRS_7),
        allPlayers: []
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation-players')).toHaveTextContent('0 players');
    });

    it('should handle missing formation for PairsFormation', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.PAIRS_7,
        formation: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('pairs-formation-goalie')).toHaveTextContent('No goalie');
    });
  });

  describe('Props Passing to IndividualFormation', () => {
    it('should pass all props correctly to IndividualFormation for 6-player individual', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_6,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_6),
        allPlayers: createMockPlayers(6)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('6 players');
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('6');
    });

    it('should pass all props correctly to IndividualFormation for 7-player individual', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7),
        allPlayers: createMockPlayers(7)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('7 players');
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('7');
    });

    it('should pass all props correctly to IndividualFormation for 8-player individual', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_8,
        formation: createMockFormation(TEAM_CONFIGS.INDIVIDUAL_8),
        allPlayers: createMockPlayers(8)
      };
      
      render(<FormationRenderer {...props} />);
      
      // Verify props are passed through
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('8 players');
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('8');
    });

    it('should handle empty players array for IndividualFormation', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
        allPlayers: []
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation-players')).toHaveTextContent('0 players');
    });

    it('should handle missing formation for IndividualFormation', () => {
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
        formation: null
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByTestId('individual-formation-goalie')).toHaveTextContent('No goalie');
    });
  });

  describe('Handler Integration', () => {
    it('should pass quickTapHandlers to formation components', () => {
      const mockHandlers = {
        handleFieldPlayerClick: jest.fn(),
        handleFieldPlayerQuickTap: jest.fn(),
        handleSubstituteClick: jest.fn()
      };
      
      const props = {
        ...defaultProps,
        teamConfig: TEAM_CONFIGS.PAIRS_7,
        quickTapHandlers: mockHandlers
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
        teamConfig: TEAM_CONFIGS.INDIVIDUAL_7,
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
      expect(() => render(<FormationRenderer teamConfig={TEAM_CONFIGS.INDIVIDUAL_7} />)).not.toThrow();
    });

    it('should not crash with undefined quickTapHandlers', () => {
      const props = {
        ...defaultProps,
        quickTapHandlers: undefined
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

    it('should handle empty teamConfig', () => {
      const props = {
        ...defaultProps,
        teamConfig: {}
      };
      
      render(<FormationRenderer {...props} />);
      
      expect(screen.getByText(/Unsupported substitution type:/)).toBeInTheDocument();
    });
  });
});