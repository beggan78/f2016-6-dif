import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createTestI18n } from '../../../../test-utils/i18nTestSetup';
import { IndividualFormation } from '../IndividualFormation';
import { TEAM_CONFIGS, createMockFormation, createMockPlayers } from '../../../../game/testUtils';

const testI18n = createTestI18n();

const createDefaultProps = (overrides = {}) => {
  const teamConfig = overrides.teamConfig || TEAM_CONFIGS.INDIVIDUAL_7;
  const formation = overrides.formation || createMockFormation(teamConfig);
  const allPlayers = overrides.allPlayers || createMockPlayers(teamConfig.squadSize || 7, teamConfig);

  // Create default rotation queue from formation field positions
  const defaultRotationQueue = overrides.rotationQueue || [
    formation.leftDefender,
    formation.rightDefender,
    formation.leftAttacker,
    formation.rightAttacker
  ].filter(Boolean);

  return {
    teamConfig,
    selectedFormation: overrides.selectedFormation || teamConfig.formation,
    formation,
    allPlayers,
    animationState: { type: 'none', phase: 'idle', data: {} },
    recentlySubstitutedPlayers: new Set(),
    hideNextOffIndicator: false,
    quickTapHandlers: {},
    goalieHandlers: null,
    getPlayerNameById: (id) => `Player ${id}`,
    getPlayerTimeStats: () => ({ totalOutfieldTime: 0, attackDefenderDiff: 0 }),
    nextPlayerIdToSubOut: overrides.nextPlayerIdToSubOut,
    nextNextPlayerIdToSubOut: overrides.nextNextPlayerIdToSubOut,
    substitutionCount: overrides.substitutionCount || 1,
    rotationQueue: defaultRotationQueue,
    renderSection: 'substitutes',
    ...overrides,
  };
};

const renderWithI18n = (ui) => render(<I18nextProvider i18n={testI18n}>{ui}</I18nextProvider>);

describe('IndividualFormation - substitute position indicators', () => {
  it('shows the target position and player name for the next substitute when substitutionCount is 1', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const rotationQueue = [formation.leftDefender, formation.rightDefender, formation.leftAttacker, formation.rightAttacker];
    const props = createDefaultProps({
      formation,
      rotationQueue,
      substitutionCount: 1,
    });

    renderWithI18n(<IndividualFormation {...props} />);

    // Should show "Substitute (Player X - Left Defender)" where X is the player ID at leftDefender
    const leftDefenderPlayerId = formation.leftDefender;
    expect(
      screen.getByRole('heading', { name: `Substitute (Player ${leftDefenderPlayerId} - Left Defender)` })
    ).toBeInTheDocument();
  });

  it('shows target positions and player names for N substitutes when substitutionCount is 2', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const rotationQueue = [formation.leftDefender, formation.rightDefender, formation.leftAttacker, formation.rightAttacker];
    const props = createDefaultProps({
      formation,
      rotationQueue,
      substitutionCount: 2,
    });

    renderWithI18n(<IndividualFormation {...props} />);

    // First substitute should show player name and position
    const leftDefenderPlayerId = formation.leftDefender;
    expect(
      screen.getByRole('heading', { name: `Substitute (Player ${leftDefenderPlayerId} - Left Defender)` })
    ).toBeInTheDocument();

    // Second substitute should show player name and position
    const rightDefenderPlayerId = formation.rightDefender;
    expect(
      screen.getByRole('heading', { name: `Substitute (Player ${rightDefenderPlayerId} - Right Defender)` })
    ).toBeInTheDocument();
  });

  it('does not show next position for substitutes beyond substitutionCount', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_10;
    const formation = createMockFormation(teamConfig);
    const rotationQueue = [formation.leftDefender, formation.rightDefender, formation.leftAttacker, formation.rightAttacker];
    const props = createDefaultProps({
      teamConfig,
      formation,
      rotationQueue,
      substitutionCount: 1, // Only first substitute should show next position
    });

    renderWithI18n(<IndividualFormation {...props} />);

    // Third substitute should not show next position indicator
    const thirdSubstituteCard = screen.getByTestId('player-7');
    const heading = within(thirdSubstituteCard).getByRole('heading');
    expect(heading).toHaveTextContent('Substitute');
    expect(heading).not.toHaveTextContent('(');
  });
});
