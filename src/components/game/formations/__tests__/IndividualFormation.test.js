import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { IndividualFormation } from '../IndividualFormation';
import { TEAM_CONFIGS, createMockFormation, createMockPlayers } from '../../../../game/testUtils';

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

describe('IndividualFormation - substitute position indicators', () => {
  it('shows the target position for the next substitute when substitutionCount is 1', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const rotationQueue = [formation.leftDefender, formation.rightDefender, formation.leftAttacker, formation.rightAttacker];
    const props = createDefaultProps({
      formation,
      rotationQueue,
      substitutionCount: 1,
    });

    render(<IndividualFormation {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Substitute (Next: Left Defender)' })
    ).toBeInTheDocument();
  });

  it('shows target positions for N substitutes when substitutionCount is 2', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const rotationQueue = [formation.leftDefender, formation.rightDefender, formation.leftAttacker, formation.rightAttacker];
    const props = createDefaultProps({
      formation,
      rotationQueue,
      substitutionCount: 2,
    });

    render(<IndividualFormation {...props} />);

    // First substitute should show "Next: Left Defender"
    expect(
      screen.getByRole('heading', { name: 'Substitute (Next: Left Defender)' })
    ).toBeInTheDocument();

    // Second substitute should show "Next: Right Defender"
    expect(
      screen.getByRole('heading', { name: 'Substitute (Next: Right Defender)' })
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

    render(<IndividualFormation {...props} />);

    // Third substitute should not show next position indicator
    const thirdSubstituteCard = screen.getByTestId('player-7');
    const heading = within(thirdSubstituteCard).getByRole('heading');
    expect(heading).toHaveTextContent('Substitute');
    expect(heading).not.toHaveTextContent('(');
  });
});
