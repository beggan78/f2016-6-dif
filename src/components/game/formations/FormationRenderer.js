import React from 'react';
import { TEAM_MODES } from '../../../constants/playerConstants';
import { isIndividualMode } from '../../../constants/gameModes';
import { PairsFormation } from './PairsFormation';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamMode, ...props }) {
  if (teamMode === TEAM_MODES.PAIRS_7) {
    return <PairsFormation data-testid="formation-renderer" {...props} />;
  } else if (isIndividualMode(teamMode)) {
    return <IndividualFormation data-testid="formation-renderer" teamMode={teamMode} {...props} />;
  }

  return <div data-testid="formation-renderer">Unsupported team mode: {teamMode}</div>;
}