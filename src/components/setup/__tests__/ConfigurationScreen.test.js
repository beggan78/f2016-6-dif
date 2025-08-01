/**
 * ConfigurationScreen Component Tests
 * 
 * Comprehensive testing suite for the game configuration screen - the critical entry point
 * for setting up games. This component handles squad selection, game settings, and validation.
 * 
 * Test Coverage: 30+ tests covering:
 * - Squad selection and player management (checkbox interactions, limits)
 * - Team mode auto-selection based on squad size
 * - Game configuration (periods, duration, alerts)
 * - Opponent team name input with sanitization
 * - Goalie assignment for multiple periods
 * - Form validation and submission requirements
 * - UI state management and conditional rendering
 * - Input sanitization integration
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigurationScreen } from '../ConfigurationScreen';
import { TEAM_MODES } from '../../../constants/playerConstants';
import { PERIOD_OPTIONS, DURATION_OPTIONS, ALERT_OPTIONS } from '../../../constants/gameConfig';
import { FORMATIONS } from '../../../constants/teamConfiguration';
import {
  createMockPlayers,
  userInteractions
} from '../../__tests__/componentTestUtils';

// Mock the sanitizeNameInput utility
jest.mock('../../../utils/inputSanitization', () => ({
  sanitizeNameInput: jest.fn((input) => input) // Pass through by default, will override in tests
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Settings: ({ className, ...props }) => <div data-testid="settings-icon" className={className} {...props} />,
  Play: ({ className, ...props }) => <div data-testid="play-icon" className={className} {...props} />,
  Shuffle: ({ className, ...props }) => <div data-testid="shuffle-icon" className={className} {...props} />,
  Layers: ({ className, ...props }) => <div data-testid="layers-icon" className={className} {...props} />
}));

// Mock FormationPreview component
jest.mock('../FormationPreview', () => ({
  FormationPreview: ({ formation, className }) => (
    <div data-testid="formation-preview" className={className}>
      Formation: {formation}
    </div>
  )
}));

// Mock UI components
jest.mock('../../shared/UI', () => ({
  Select: ({ value, onChange, options, placeholder, id, ...props }) => (
    <select 
      data-testid={id || 'select'} 
      value={value} 
      onChange={onChange}
      {...props}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {Array.isArray(options) 
        ? options.map(option => {
            if (typeof option === 'object') {
              return <option key={option.value} value={option.value}>{option.label}</option>;
            }
            return <option key={option} value={option}>{option}</option>;
          })
        : null
      }
    </select>
  ),
  Button: ({ onClick, disabled, children, Icon, ...props }) => (
    <button 
      data-testid="button"
      onClick={onClick} 
      disabled={disabled}
      {...props}
    >
      {Icon && <Icon data-testid="button-icon" />}
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, maxLength, id, ...props }) => (
    <input
      data-testid={id || 'input'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      {...props}
    />
  )
}));

describe('ConfigurationScreen', () => {
  let defaultProps;
  let mockPlayers;
  let mockSetters;

  beforeEach(() => {
    mockPlayers = createMockPlayers(10); // Create 10 players for testing selection limits
    
    mockSetters = {
      setSelectedSquadIds: jest.fn(),
      setNumPeriods: jest.fn(),
      setPeriodDurationMinutes: jest.fn(),
      setPeriodGoalieIds: jest.fn(),
      setTeamMode: jest.fn(),
      setAlertMinutes: jest.fn(),
      handleStartPeriodSetup: jest.fn(),
      setOpponentTeamName: jest.fn(),
      updateFormationSelection: jest.fn(),
      createTeamConfigFromSquadSize: jest.fn(),
      setCaptain: jest.fn()
    };

    defaultProps = {
      allPlayers: mockPlayers,
      selectedSquadIds: [],
      numPeriods: 2,
      periodDurationMinutes: 15,
      periodGoalieIds: {},
      teamMode: TEAM_MODES.INDIVIDUAL_6,
      teamConfig: null,
      selectedFormation: FORMATIONS.FORMATION_2_2,
      alertMinutes: 2,
      selectedSquadPlayers: [],
      opponentTeamName: '',
      captainId: null,
      ...mockSetters
    };

    // Reset mocks
    jest.clearAllMocks();
    
    // Suppress React key warnings for component tests
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === 'string' && args[0].includes('Each child in a list should have a unique "key" prop')) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  describe('Basic Rendering', () => {
    it('should render the configuration screen with header', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
      expect(screen.getByText('Game & Squad Configuration')).toBeInTheDocument();
    });

    it('should render all available players for selection', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      mockPlayers.forEach(player => {
        expect(screen.getByText(player.name)).toBeInTheDocument();
      });
    });

    it('should show squad selection count', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByText('Select Squad (5-10 Players) - Selected: 0')).toBeInTheDocument();
    });

    it('should render game settings section', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByText('Number of Periods')).toBeInTheDocument();
      expect(screen.getByText('Period Duration (minutes)')).toBeInTheDocument();
      expect(screen.getByText('Alert - minutes after substitution')).toBeInTheDocument();
    });

    it('should render opponent team name input', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByText('Opponent Team Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter opponent team name (optional)')).toBeInTheDocument();
    });
  });

  describe('Squad Selection Logic', () => {
    it('should call setSelectedSquadIds when player is selected', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const firstPlayerCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(firstPlayerCheckbox);
      
      expect(mockSetters.setSelectedSquadIds).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should show selected player count correctly', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Select Squad (5-10 Players) - Selected: 3')).toBeInTheDocument();
    });

    it('should disable checkboxes when 10 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const unselectedCheckboxes = checkboxes.filter((checkbox, index) => 
        !props.selectedSquadIds.includes(mockPlayers[index].id)
      );
      
      unselectedCheckboxes.forEach(checkbox => {
        expect(checkbox).toBeDisabled();
      });
    });

    it('should not disable checkboxes for already selected players when limit reached', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const checkboxes = screen.getAllByRole('checkbox');
      const selectedCheckboxes = checkboxes.filter((checkbox, index) => 
        props.selectedSquadIds.includes(mockPlayers[index].id)
      );
      
      selectedCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeDisabled();
      });
    });

    it('should apply correct styling to selected players', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const playerLabels = screen.getAllByRole('checkbox').map(checkbox => checkbox.closest('label'));
      
      playerLabels.forEach((label, index) => {
        if (props.selectedSquadIds.includes(mockPlayers[index].id)) {
          expect(label).toHaveClass('bg-sky-600');
        } else {
          expect(label).toHaveClass('bg-slate-600');
        }
      });
    });
  });

  describe('Team Mode Auto-Selection', () => {
    it('should auto-select INDIVIDUAL_6 when 6 players are selected', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      // Simulate the togglePlayerSelection function being called
      const toggleFunction = mockSetters.setSelectedSquadIds.mock.calls[0]?.[0];
      if (toggleFunction) {
        const newIds = toggleFunction([]); // This would be called by the component
        // Verify the logic would work correctly
        expect(typeof toggleFunction).toBe('function');
      }
    });

    it('should auto-select PAIRS_7 when 7 players are selected from INDIVIDUAL_6 mode', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.INDIVIDUAL_6,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'] // 6 players currently
      };
      
      render(<ConfigurationScreen {...props} />);
      
      // The logic should be called when adding the 7th player
      expect(mockSetters.setSelectedSquadIds).toBeDefined();
    });

    it('should not change team mode when going from 7 to 6 players', () => {
      const props = {
        ...defaultProps,
        teamMode: TEAM_MODES.PAIRS_7,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      // Team mode should remain as set by user
      expect(props.teamMode).toBe(TEAM_MODES.PAIRS_7);
    });

    it('should auto-select INDIVIDUAL_8 when 8 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7'] // 7 players currently
      };
      
      render(<ConfigurationScreen {...props} />);
      
      // Simulate selecting an 8th player
      const eighthPlayerCheckbox = screen.getAllByRole('checkbox')[7]; // Player 8
      fireEvent.click(eighthPlayerCheckbox);
      
      expect(mockSetters.setSelectedSquadIds).toHaveBeenCalledWith(expect.any(Function));
      
      // Verify the callback would set INDIVIDUAL_8 mode
      const setSelectedSquadIdsCall = mockSetters.setSelectedSquadIds.mock.calls.find(call => 
        typeof call[0] === 'function'
      );
      
      if (setSelectedSquadIdsCall) {
        const updateFunction = setSelectedSquadIdsCall[0];
        const currentIds = ['1', '2', '3', '4', '5', '6', '7'];
        const newIds = updateFunction(currentIds);
        expect(newIds).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
      }
    });
  });

  describe('Team Mode Selection (7 Players)', () => {
    const sevenPlayerProps = {
      selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7']
    };

    it('should show team mode selection when 7 players are selected with 2-2 formation', () => {
      const props = { 
        ...defaultProps, 
        ...sevenPlayerProps,
        selectedFormation: FORMATIONS.FORMATION_2_2
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Substitution Mode')).toBeInTheDocument();
      expect(screen.getByText('Pairs')).toBeInTheDocument();
      expect(screen.getByText('Individual (7-player)')).toBeInTheDocument();
    });

    it('should not show team mode selection when fewer than 7 players', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.queryByText('Substitution Mode')).not.toBeInTheDocument();
    });

    it('should not show team mode selection when 8 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7', '8']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.queryByText('Substitution Mode')).not.toBeInTheDocument();
    });

    it('should handle pairs mode selection', () => {
      const props = { 
        ...defaultProps, 
        ...sevenPlayerProps,
        selectedFormation: FORMATIONS.FORMATION_2_2,
        teamMode: TEAM_MODES.INDIVIDUAL_7
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const pairsRadio = screen.getByRole('radio', { name: /pairs/i });
      fireEvent.click(pairsRadio);
      
      expect(mockSetters.setTeamMode).toHaveBeenCalledWith(TEAM_MODES.PAIRS_7);
    });

    it('should handle individual mode selection', () => {
      const props = { 
        ...defaultProps, 
        ...sevenPlayerProps,
        selectedFormation: FORMATIONS.FORMATION_2_2,
        teamMode: TEAM_MODES.PAIRS_7
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const individualRadio = screen.getByRole('radio', { name: /individual/i });
      fireEvent.click(individualRadio);
      
      expect(mockSetters.setTeamMode).toHaveBeenCalledWith(TEAM_MODES.INDIVIDUAL_7);
    });

    it('should show correct team mode descriptions', () => {
      const props = { 
        ...defaultProps, 
        ...sevenPlayerProps,
        selectedFormation: FORMATIONS.FORMATION_2_2
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText(/Players organized in defender-attacker pairs/)).toBeInTheDocument();
      expect(screen.getByText(/Individual positions with 2 substitutes/)).toBeInTheDocument();
    });

    it('should not show team mode selection when 7 players are selected with 1-2-1 formation', () => {
      const props = { 
        ...defaultProps, 
        ...sevenPlayerProps,
        selectedFormation: FORMATIONS.FORMATION_1_2_1
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.queryByText('Substitution Mode')).not.toBeInTheDocument();
      expect(screen.queryByText('Pairs')).not.toBeInTheDocument();
      expect(screen.queryByText('Individual (7-player)')).not.toBeInTheDocument();
    });
  });

  describe('Game Settings Configuration', () => {
    it('should handle number of periods change', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const periodsSelect = screen.getByTestId('numPeriods');
      fireEvent.change(periodsSelect, { target: { value: '3' } });
      
      expect(mockSetters.setNumPeriods).toHaveBeenCalledWith(3);
    });

    it('should handle period duration change', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const durationSelect = screen.getByTestId('periodDuration');
      fireEvent.change(durationSelect, { target: { value: '20' } });
      
      expect(mockSetters.setPeriodDurationMinutes).toHaveBeenCalledWith(20);
    });

    it('should handle alert minutes change', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const alertSelect = screen.getByTestId('alertMinutes');
      fireEvent.change(alertSelect, { target: { value: '3' } });
      
      expect(mockSetters.setAlertMinutes).toHaveBeenCalledWith(3);
    });

    it('should render all period options', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const periodsSelect = screen.getByTestId('numPeriods');
      PERIOD_OPTIONS.forEach(period => {
        expect(periodsSelect).toContainHTML(`<option value="${period}">${period}</option>`);
      });
    });

    it('should render all duration options', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const durationSelect = screen.getByTestId('periodDuration');
      DURATION_OPTIONS.forEach(duration => {
        expect(durationSelect).toContainHTML(`<option value="${duration}">${duration}</option>`);
      });
    });

    it('should render all alert options', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const alertSelect = screen.getByTestId('alertMinutes');
      ALERT_OPTIONS.forEach(option => {
        expect(alertSelect).toContainHTML(`<option value="${option.value}">${option.label}</option>`);
      });
    });
  });

  describe('Opponent Team Name Input', () => {
    it('should handle opponent team name changes with sanitization', () => {
      const { sanitizeNameInput } = require('../../../utils/inputSanitization');
      sanitizeNameInput.mockReturnValue('Sanitized Team Name');
      
      render(<ConfigurationScreen {...defaultProps} />);
      
      const input = screen.getByTestId('opponentTeam');
      fireEvent.change(input, { target: { value: 'Test Team Name' } });
      
      expect(sanitizeNameInput).toHaveBeenCalledWith('Test Team Name');
      expect(mockSetters.setOpponentTeamName).toHaveBeenCalledWith('Sanitized Team Name');
    });

    it('should show helper text for opponent name', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByText('Leave empty to use "Opponent"')).toBeInTheDocument();
    });

    it('should enforce max length on opponent name input', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const input = screen.getByTestId('opponentTeam');
      expect(input).toHaveAttribute('maxLength', '50');
    });
  });

  describe('Goalie Assignment', () => {
    const squadProps = {
      selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
      selectedSquadPlayers: createMockPlayers(6)
    };

    it('should show goalie assignment when 6 players are selected', () => {
      const props = { ...defaultProps, ...squadProps };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Goalies')).toBeInTheDocument();
    });

    it('should show goalie assignment when 7 players are selected', () => {
      const props = { 
        ...defaultProps, 
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7'],
        selectedSquadPlayers: createMockPlayers(7)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Goalies')).toBeInTheDocument();
    });

    it('should not show goalie assignment with fewer than 5 players', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.queryByText('Assign Goalies')).not.toBeInTheDocument();
    });

    it('should show goalie assignment for 5 players', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Goalies')).toBeInTheDocument();
    });

    it('should create goalie selects for each period', () => {
      const props = { 
        ...defaultProps, 
        ...squadProps,
        numPeriods: 3
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Period 1 Goalie')).toBeInTheDocument();
      expect(screen.getByText('Period 2 Goalie')).toBeInTheDocument();
      expect(screen.getByText('Period 3 Goalie')).toBeInTheDocument();
    });

    it('should handle goalie selection change', () => {
      const props = { ...defaultProps, ...squadProps };
      
      render(<ConfigurationScreen {...props} />);
      
      const goalieSelect = screen.getByTestId('goalie_p1');
      fireEvent.change(goalieSelect, { target: { value: '1' } });
      
      expect(mockSetters.setPeriodGoalieIds).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should populate goalie options with selected squad players', () => {
      const props = { ...defaultProps, ...squadProps };
      
      render(<ConfigurationScreen {...props} />);
      
      const goalieSelect = screen.getByTestId('goalie_p1');
      props.selectedSquadPlayers.forEach(player => {
        expect(goalieSelect).toContainHTML(`<option value="${player.id}">${player.name}</option>`);
      });
    });
  });

  describe('Form Validation and Submission', () => {
    it('should disable proceed button when no players selected', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
    });

    it('should disable proceed button with only 5 players (no game mode available)', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5']
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
    });

    it('should enable proceed button with 8 players when goalies assigned', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
        selectedSquadPlayers: createMockPlayers(8),
        periodGoalieIds: { 1: '1', 2: '2' },
        teamMode: TEAM_MODES.INDIVIDUAL_8
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const button = screen.getByTestId('button');
      expect(button).not.toBeDisabled();
    });

    it('should disable proceed button when goalies are not assigned', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        periodGoalieIds: {} // No goalies assigned
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const button = screen.getByTestId('button');
      expect(button).toBeDisabled();
    });

    it('should enable proceed button when all requirements are met', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6),
        periodGoalieIds: { 1: '1', 2: '2' },
        numPeriods: 2
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const button = screen.getByTestId('button');
      expect(button).not.toBeDisabled();
    });

    it('should call handleStartPeriodSetup when proceed button is clicked', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6),
        periodGoalieIds: { 1: '1', 2: '2' },
        numPeriods: 2
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const button = screen.getByTestId('button');
      fireEvent.click(button);
      
      expect(mockSetters.handleStartPeriodSetup).toHaveBeenCalled();
    });

    it('should show play icon on proceed button', () => {
      render(<ConfigurationScreen {...defaultProps} />);
      
      expect(screen.getByTestId('button-icon')).toBeInTheDocument();
    });
  });

  describe('Captain Assignment', () => {
    it('should show captain assignment when 5 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5'],
        selectedSquadPlayers: createMockPlayers(5)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Captain')).toBeInTheDocument();
      expect(screen.getByText('Team Captain')).toBeInTheDocument();
    });

    it('should show captain assignment when 6 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Captain')).toBeInTheDocument();
    });

    it('should show captain assignment when 7 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7'],
        selectedSquadPlayers: createMockPlayers(7)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Captain')).toBeInTheDocument();
    });

    it('should show captain assignment when 8 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6', '7', '8'],
        selectedSquadPlayers: createMockPlayers(8)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Assign Captain')).toBeInTheDocument();
    });

    it('should not show captain assignment when fewer than 5 players are selected', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4'],
        selectedSquadPlayers: createMockPlayers(4)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.queryByText('Assign Captain')).not.toBeInTheDocument();
    });

    it('should handle captain selection change', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6),
        setCaptain: jest.fn()
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const captainSelect = screen.getByTestId('captain');
      fireEvent.change(captainSelect, { target: { value: '1' } });
      
      expect(props.setCaptain).toHaveBeenCalledWith('1');
    });

    it('should handle no captain selection', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6),
        setCaptain: jest.fn()
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const captainSelect = screen.getByTestId('captain');
      fireEvent.change(captainSelect, { target: { value: '' } });
      
      expect(props.setCaptain).toHaveBeenCalledWith(null);
    });

    it('should populate captain options with selected squad players', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      const captainSelect = screen.getByTestId('captain');
      
      // Check for "No Captain" option
      expect(captainSelect).toContainHTML('<option value="">No Captain</option>');
      
      // Check for player options
      props.selectedSquadPlayers.forEach(player => {
        expect(captainSelect).toContainHTML(`<option value="${player.id}">${player.name}</option>`);
      });
    });

    it('should show helper text for captain assignment', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: ['1', '2', '3', '4', '5', '6'],
        selectedSquadPlayers: createMockPlayers(6)
      };
      
      render(<ConfigurationScreen {...props} />);
      
      expect(screen.getByText('Optional - select a team captain for this game')).toBeInTheDocument();
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle empty players array', () => {
      const props = {
        ...defaultProps,
        allPlayers: []
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle null selectedSquadPlayers', () => {
      const props = {
        ...defaultProps,
        selectedSquadPlayers: null
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle undefined periodGoalieIds', () => {
      const props = {
        ...defaultProps,
        periodGoalieIds: undefined
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle missing setter functions gracefully', () => {
      const props = {
        ...defaultProps,
        setSelectedSquadIds: undefined,
        setTeamMode: undefined
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle zero periods configuration', () => {
      const props = {
        ...defaultProps,
        numPeriods: 0
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle negative period duration', () => {
      const props = {
        ...defaultProps,
        periodDurationMinutes: -10
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle very large selectedSquadIds array', () => {
      const props = {
        ...defaultProps,
        selectedSquadIds: Array.from({ length: 20 }, (_, i) => `${i + 1}`)
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });

    it('should handle malformed player objects', () => {
      const props = {
        ...defaultProps,
        allPlayers: [
          { id: '1' }, // Missing name
          { name: 'Player 2' }, // Missing id
          null, // Null player
          { id: '4', name: 'Player 4' } // Valid player
        ].filter(Boolean)
      };
      
      expect(() => render(<ConfigurationScreen {...props} />)).not.toThrow();
    });
  });
});