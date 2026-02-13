/**
 * PeriodSetupScreen Formation Assignment Integration Tests
 *
 * Tests position assignment across formations (2-2, 1-2-1, 2-2-2) for
 * various squad sizes. Verifies that:
 * - Position selects render correctly per formation
 * - Complete formation enables "Enter Game"
 * - Incomplete formation disables "Enter Game"
 * - Auto-swap behaviour when reassigning players
 * - Goalie changes propagate to state
 * - Navigation buttons respect period number
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../test-utils/i18nTestSetup';
import { PeriodSetupScreen } from '../components/setup/PeriodSetupScreen';
import {
  setupPeriodSetupMocks,
  createPeriodSetupProps,
  buildCompleteFormation,
  buildEmptyFormation,
  defaultGoalieId,
  FORMATION_TEST_MATRIX
} from './matchLifecycleUtils';
import { createMockPlayers } from '../components/__tests__/componentTestUtils';
import { TEAM_CONFIGS } from '../game/testUtils';
import { FORMATS, FORMATIONS } from '../constants/teamConfiguration';

// Shared i18n instance
const testI18n = createTestI18n();

// ===================================================================
// MOCKS — shared factories from setup/sharedMockFactories.js
// ===================================================================

jest.mock('lucide-react', () => require('./setup/sharedMockFactories').lucideReact);
jest.mock('../components/shared/UI', () => require('./setup/sharedMockFactories').sharedUI);
jest.mock('../utils/formatUtils', () => require('./setup/sharedMockFactories').formatUtils);
jest.mock('../utils/debugUtils', () => require('./setup/sharedMockFactories').debugUtils);
jest.mock('../contexts/TeamContext', () => require('./setup/sharedMockFactories').teamContext);
jest.mock('../services/matchStateManager', () => require('./setup/sharedMockFactories').matchStateManager);
jest.mock('../hooks/usePlayerRecommendationData', () => require('./setup/sharedMockFactories').playerRecommendationData);

// Helper to render with i18n
const renderWithI18n = (ui) => render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

describe('PeriodSetupScreen — Formation Assignment Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------
  // 1. 2-2 with 7 players — assign all positions → Enter Game enabled
  // ---------------------------------------------------------------
  describe('2-2 formation with 7 players', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should enable Enter Game when all positions are assigned', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 2 substitute = 7 selects
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(7);

      // Enter Game should be enabled
      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 2. 2-2 with 6 players (1 sub) — complete assignment works
  // ---------------------------------------------------------------
  describe('2-2 formation with 6 players', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_6;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render correct slot count and enable Enter Game when complete', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 1 substitute = 6 selects
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(6);

      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 3. 1-2-1 with 7 players — correct position keys and Midfield group
  // ---------------------------------------------------------------
  describe('1-2-1 formation with 7 players', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7_1_2_1;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render Defence, Midfield, and Offence group headers with correct position keys', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // Role group headers
      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();

      // 1 goalie + 4 field (defender, left, right, attacker) + 2 substitute = 7 selects
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(7);
    });
  });

  // ---------------------------------------------------------------
  // 4. Auto-swap: reassign a player to a different position
  // ---------------------------------------------------------------
  describe('Auto-swap behaviour', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should swap players when reassigning in a complete formation', () => {
      const formation = buildCompleteFormation(teamConfig);
      // formation: leftDefender='1', rightDefender='2', leftAttacker='3', rightAttacker='4', substitute_1='5', substitute_2='6', goalie='7'
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // Find all selects; the field selects come before sub selects
      const selects = screen.getAllByTestId('select');
      // Select player '3' (leftAttacker) into rightDefender position — should trigger swap
      // The goalie select is rendered after the field groups in the DOM;
      // Due to GroupedPositionCards layout: Offence first, then Defence, then goalie, then Substitutes
      // We need to find a field select and change it to a player already assigned elsewhere.

      // Find the select that currently has player '2' (rightDefender) and change it to '3'
      // (player '3' is in leftAttacker). This triggers the swap.
      const rightDefenderSelect = selects.find(s => s.value === '2');
      expect(rightDefenderSelect).toBeDefined();

      fireEvent.change(rightDefenderSelect, { target: { value: '3' } });

      // setFormation should have been called with an updater or direct object
      expect(props.setFormation).toHaveBeenCalled();
      const arg = props.setFormation.mock.calls[0][0];

      if (typeof arg === 'function') {
        // Updater function — call it with the current formation to verify swap
        const updated = arg(formation);
        // Player '3' should now be in rightDefender's position
        expect(updated.rightDefender).toBe('3');
        // Player '2' should move to where player '3' was (leftAttacker)
        expect(updated.leftAttacker).toBe('2');
      } else {
        // Direct object — verify the swap
        expect(arg.rightDefender).toBe('3');
        expect(arg.leftAttacker).toBe('2');
      }
    });
  });

  // ---------------------------------------------------------------
  // 5. Enter Game disabled with incomplete formation
  // ---------------------------------------------------------------
  describe('Incomplete formation', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should disable Enter Game when positions have null values', () => {
      const goalieId = defaultGoalieId(teamConfig);
      const formation = buildEmptyFormation(teamConfig, goalieId);
      // All field and sub positions are null
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 6. Enter Game calls handleStartGame when clicked with complete formation
  // ---------------------------------------------------------------
  describe('Enter Game action', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should call handleStartGame when Enter Game is clicked', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const enterGameButton = screen.getByText('Enter Game');
      fireEvent.click(enterGameButton);

      expect(props.handleStartGame).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------
  // 7. Period 2: no back button shown
  // ---------------------------------------------------------------
  describe('Period 2 navigation', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should not show Back to Configuration button in period 2', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, {
        formation,
        currentPeriodNumber: 2
      });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      expect(screen.queryByText('Back to Configuration')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------
  // 8. Period 1: back button shown and calls onNavigateBack
  // ---------------------------------------------------------------
  describe('Period 1 navigation', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should show Back to Configuration button in period 1 and call onNavigateBack', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const backButton = screen.getByText('Back to Configuration');
      expect(backButton).toBeInTheDocument();

      fireEvent.click(backButton);
      expect(props.onNavigateBack).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------
  // 9. Goalie change updates setPeriodGoalieIds and setFormation
  // ---------------------------------------------------------------
  describe('Goalie change', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should update setPeriodGoalieIds and setFormation when goalie is changed', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // Find the goalie select — it has the current goalie value
      const goalieSelect = screen.getAllByTestId('select').find(s => s.value === defaultGoalieId(teamConfig));
      expect(goalieSelect).toBeDefined();

      // Change goalie to player '1' (currently in a field position)
      fireEvent.change(goalieSelect, { target: { value: '1' } });

      // setPeriodGoalieIds should be called
      expect(props.setPeriodGoalieIds).toHaveBeenCalled();

      // setFormation should be called (to perform the goalie swap)
      expect(props.setFormation).toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------
  // 10. 9 players (4 substitute slots) — all positions rendered
  // ---------------------------------------------------------------
  describe('9-player squad with 4 substitutes', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_9;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render all 9 selects (1 goalie + 4 field + 4 substitute)', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 4 substitute = 9
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(9);

      // Enter Game should be enabled with all positions filled
      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 11. Duplicate prevention — assigning same player triggers swap
  // ---------------------------------------------------------------
  describe('Duplicate prevention via swap', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should trigger swap when assigning same player to two positions in complete formation', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // In a complete formation, assigning player '5' (substitute_1) to leftDefender
      // should swap player '1' (leftDefender) to substitute_1
      const leftDefenderSelect = screen.getAllByTestId('select').find(s => s.value === '1');
      expect(leftDefenderSelect).toBeDefined();

      fireEvent.change(leftDefenderSelect, { target: { value: '5' } });

      expect(props.setFormation).toHaveBeenCalled();
      const arg = props.setFormation.mock.calls[0][0];

      if (typeof arg === 'function') {
        const updated = arg(formation);
        // Player '5' should be at the position where '1' was
        expect(updated).toHaveProperty('leftDefender', '5');
        // Player '1' should have moved to where '5' was
        expect(updated).toHaveProperty('substitute_1', '1');
      } else {
        expect(arg.leftDefender).toBe('5');
        expect(arg.substitute_1).toBe('1');
      }
    });
  });

  // ---------------------------------------------------------------
  // 12. 7v7 2-2-2 with 9 players — 6 field + 2 sub + 1 goalie
  // ---------------------------------------------------------------
  describe('7v7 2-2-2 formation with 9 players', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_222;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 9 selects (1 goalie + 6 field + 2 substitute)', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 2 substitute = 9 selects
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(9);

      // Verify role group headers — 7v7 2-2-2 has Offence, Midfield, Defence
      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();

      // Enter Game should be enabled
      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 13. 5v5 with exactly 5 players (0 subs) — minimum squad
  // ---------------------------------------------------------------
  describe('5v5 2-2 with 5 players (exact minimum, 0 subs)', () => {
    const teamConfig = { format: '5v5', squadSize: 5, formation: '2-2' };

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 5 selects (1 goalie + 4 field + 0 substitutes) and enable Enter Game', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 0 substitute = 5 selects
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(5);

      // No Substitutes header when there are no subs
      expect(screen.queryByText('Substitutes')).not.toBeInTheDocument();

      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).not.toBeDisabled();
    });

    it('should disable Enter Game when one field position is unassigned', () => {
      const formation = buildCompleteFormation(teamConfig);
      // Clear one field position
      const incompleteFormation = { ...formation, leftAttacker: null };
      const props = createPeriodSetupProps(teamConfig, { formation: incompleteFormation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const enterGameButton = screen.getByText('Enter Game');
      expect(enterGameButton).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 14. 5v5 1-2-1 with 5 players (0 subs) — minimum squad, midfield formation
  // ---------------------------------------------------------------
  describe('5v5 1-2-1 with 5 players (exact minimum, 0 subs)', () => {
    const teamConfig = { format: '5v5', squadSize: 5, formation: '1-2-1' };

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 5 selects with Defence/Midfield/Offence headers and no Substitutes', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(5);

      expect(screen.getByText('Defence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.queryByText('Substitutes')).not.toBeInTheDocument();

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 15. 5v5 2-2 with 8 players (3 subs)
  // ---------------------------------------------------------------
  describe('5v5 2-2 with 8 players (3 subs)', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_8;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 8 selects and enable Enter Game when complete', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 3 substitute = 8
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(8);

      expect(screen.getByText('Substitutes')).toBeInTheDocument();
      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 16. 5v5 2-2 with 10 players (5 subs)
  // ---------------------------------------------------------------
  describe('5v5 2-2 with 10 players (5 subs)', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_10;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 10 selects and enable Enter Game when complete', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 4 field + 5 substitute = 10
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(10);

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 17. 7v7 with exactly 7 players (0 subs) — minimum squad for 7v7
  // ---------------------------------------------------------------
  describe('7v7 2-2-2 with 7 players (exact minimum, 0 subs)', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_MIN;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 7 selects (1 goalie + 6 field + 0 substitutes) and enable Enter Game', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 0 substitute = 7
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(7);

      expect(screen.queryByText('Substitutes')).not.toBeInTheDocument();
      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });

    it('should disable Enter Game when one field position is unassigned', () => {
      const formation = buildCompleteFormation(teamConfig);
      const incompleteFormation = { ...formation, leftMidfielder: null };
      const props = createPeriodSetupProps(teamConfig, { formation: incompleteFormation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      expect(screen.getByText('Enter Game')).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 18. 7v7 2-3-1 with 10 players (3 subs)
  // ---------------------------------------------------------------
  describe('7v7 2-3-1 with 10 players (3 subs)', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_231;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 10 selects (1 goalie + 6 field + 3 substitute) with correct headers', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 3 substitute = 10
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(10);

      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });

    it('should call handleStartGame when Enter Game is clicked', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      fireEvent.click(screen.getByText('Enter Game'));
      expect(props.handleStartGame).toHaveBeenCalledTimes(1);
    });

    it('should support auto-swap between field and substitute positions', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // Swap: assign player '7' (substitute) into a field position occupied by player '1'
      const fieldSelect = screen.getAllByTestId('select').find(s => s.value === '1');
      expect(fieldSelect).toBeDefined();

      fireEvent.change(fieldSelect, { target: { value: '7' } });

      expect(props.setFormation).toHaveBeenCalled();
      const arg = props.setFormation.mock.calls[0][0];
      if (typeof arg === 'function') {
        const updated = arg(formation);
        // Player '7' should now be at position where '1' was
        expect(updated.leftDefender).toBe('7');
        // Player '1' should have moved to where '7' was
        expect(updated.substitute_1).toBe('1');
      }
    });
  });

  // ---------------------------------------------------------------
  // 19. 7v7 2-3-1 with 8 players (1 sub)
  // ---------------------------------------------------------------
  describe('7v7 2-3-1 with 8 players (1 sub)', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_7V7_231_8;

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 8 selects (1 goalie + 6 field + 1 substitute)', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 1 substitute = 8
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(8);

      expect(screen.getByText('Substitutes')).toBeInTheDocument();
      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });

    it('should disable Enter Game with incomplete formation', () => {
      const formation = buildCompleteFormation(teamConfig);
      const incompleteFormation = { ...formation, centerMidfielder: null };
      const props = createPeriodSetupProps(teamConfig, { formation: incompleteFormation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      expect(screen.getByText('Enter Game')).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 20. 7v7 2-3-1 with 7 players (0 subs) — exact minimum for 7v7
  // ---------------------------------------------------------------
  describe('7v7 2-3-1 with 7 players (exact minimum, 0 subs)', () => {
    const teamConfig = { format: '7v7', squadSize: 7, formation: '2-3-1' };

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 7 selects (1 goalie + 6 field + 0 substitutes) and no Substitutes header', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 0 substitute = 7
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(7);

      expect(screen.queryByText('Substitutes')).not.toBeInTheDocument();
      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------
  // 21. 7v7 2-3-1 with 12 players (5 subs) — large squad
  // ---------------------------------------------------------------
  describe('7v7 2-3-1 with 12 players (5 subs)', () => {
    const teamConfig = { format: '7v7', squadSize: 12, formation: '2-3-1' };

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 12 selects (1 goalie + 6 field + 5 substitutes)', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // 1 goalie + 6 field + 5 substitute = 12
      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(12);

      expect(screen.getByText('Substitutes')).toBeInTheDocument();
      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });

    it('should swap correctly between two substitute positions', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      // Player '7' is in substitute_1, player '8' is in substitute_2
      // Assign player '8' to the select currently holding '7'
      const sub1Select = screen.getAllByTestId('select').find(s => s.value === '7');
      expect(sub1Select).toBeDefined();

      fireEvent.change(sub1Select, { target: { value: '8' } });

      expect(props.setFormation).toHaveBeenCalled();
      const arg = props.setFormation.mock.calls[0][0];
      if (typeof arg === 'function') {
        const updated = arg(formation);
        expect(updated.substitute_1).toBe('8');
        expect(updated.substitute_2).toBe('7');
      }
    });
  });

  // ---------------------------------------------------------------
  // 22. 7v7 2-2-2 with 10 players (3 subs)
  // ---------------------------------------------------------------
  describe('7v7 2-2-2 with 10 players (3 subs)', () => {
    const teamConfig = { format: '7v7', squadSize: 10, formation: '2-2-2' };

    beforeEach(() => {
      setupPeriodSetupMocks(teamConfig);
    });

    it('should render 10 selects (1 goalie + 6 field + 3 substitutes)', () => {
      const formation = buildCompleteFormation(teamConfig);
      const props = createPeriodSetupProps(teamConfig, { formation });

      renderWithI18n(<PeriodSetupScreen {...props} />);

      const selects = screen.getAllByTestId('select');
      expect(selects).toHaveLength(10);

      expect(screen.getByText('Offence')).toBeInTheDocument();
      expect(screen.getByText('Midfield')).toBeInTheDocument();
      expect(screen.getByText('Defence')).toBeInTheDocument();
      expect(screen.getByText('Substitutes')).toBeInTheDocument();

      expect(screen.getByText('Enter Game')).not.toBeDisabled();
    });
  });
});
