import React from 'react';
import { TEAM_MODES } from '../../../constants/playerConstants';
import { PairsFormation } from './PairsFormation';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamMode, ...props }) {
  if (teamMode === TEAM_MODES.PAIRS_7) {
    return <PairsFormation {...props} />;
  } else if (
    teamMode === TEAM_MODES.INDIVIDUAL_6 || 
    teamMode === TEAM_MODES.INDIVIDUAL_7
  ) {
    return <IndividualFormation teamMode={teamMode} {...props} />;
  }

  return <div>Unsupported formation type: {teamMode}</div>;
}