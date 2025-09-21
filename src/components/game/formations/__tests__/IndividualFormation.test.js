import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { IndividualFormation } from '../IndividualFormation';
import { TEAM_CONFIGS, createMockFormation, createMockPlayers } from '../../../../game/testUtils';

const createDefaultProps = (overrides = {}) => {
  const teamConfig = overrides.teamConfig || TEAM_CONFIGS.INDIVIDUAL_7;
  const formation = overrides.formation || createMockFormation(teamConfig);
  const allPlayers = overrides.allPlayers || createMockPlayers(teamConfig.squadSize || 7, teamConfig);

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
    renderSection: 'substitutes',
    ...overrides,
  };
};

describe('IndividualFormation - substitute position indicators', () => {
  it('shows the target position for the next substitute', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const props = createDefaultProps({
      formation,
      nextPlayerIdToSubOut: formation.leftDefender,
      nextNextPlayerIdToSubOut: formation.rightAttacker,
    });

    render(<IndividualFormation {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Substitute (Next: Left Defender)' })
    ).toBeInTheDocument();
  });

  it('shows the target position for the next-next substitute when available', () => {
    const formation = createMockFormation(TEAM_CONFIGS.INDIVIDUAL_7);
    const props = createDefaultProps({
      formation,
      nextPlayerIdToSubOut: formation.leftDefender,
      nextNextPlayerIdToSubOut: formation.rightAttacker,
    });

    render(<IndividualFormation {...props} />);

    expect(
      screen.getByRole('heading', { name: 'Substitute (Next: Right Attacker)' })
    ).toBeInTheDocument();
  });

  it('does not render indicators for substitutes beyond next-next', () => {
    const teamConfig = TEAM_CONFIGS.INDIVIDUAL_10;
    const formation = createMockFormation(teamConfig);
    const props = createDefaultProps({
      teamConfig,
      formation,
      nextPlayerIdToSubOut: formation.leftDefender,
      nextNextPlayerIdToSubOut: formation.rightAttacker,
    });

    render(<IndividualFormation {...props} />);

    const thirdSubstituteCard = screen.getByTestId('player-7');
    const heading = within(thirdSubstituteCard).getByRole('heading');
    expect(heading).toHaveTextContent('Substitute');
    expect(heading).not.toHaveTextContent('(');
  });
});
