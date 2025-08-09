import React from 'react';
import { PairsFormation } from './PairsFormation';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamConfig, selectedFormation, ...props }) {
  if (!teamConfig) {
    return <div data-testid="formation-renderer">No team configuration available</div>;
  }

  if (teamConfig.substitutionType === 'pairs') {
    return <PairsFormation data-testid="formation-renderer" {...props} />;
  } else if (teamConfig.substitutionType === 'individual') {
    return <IndividualFormation data-testid="formation-renderer" teamConfig={teamConfig} selectedFormation={selectedFormation} {...props} />;
  }

  return <div data-testid="formation-renderer">Unsupported substitution type: {teamConfig.substitutionType}</div>;
}