import React from 'react';
import { PairsFormation } from './PairsFormation';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamConfig, selectedFormation, renderSection = 'all', ...props }) {
  const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;

  if (!teamConfig) {
    return <div data-testid={testId}>No team configuration available</div>;
  }

  if (teamConfig.substitutionType === 'pairs') {
    return <PairsFormation data-testid={testId} teamConfig={teamConfig} selectedFormation={selectedFormation} renderSection={renderSection} {...props} />;
  } else if (teamConfig.substitutionType === 'individual') {
    return <IndividualFormation data-testid={testId} teamConfig={teamConfig} selectedFormation={selectedFormation} renderSection={renderSection} {...props} />;
  }

  return <div data-testid={testId}>Unsupported substitution type: {teamConfig.substitutionType}</div>;
}