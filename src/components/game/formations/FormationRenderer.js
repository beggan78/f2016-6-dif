import React from 'react';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamConfig, selectedFormation, renderSection = 'all', ...props }) {
  const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;

  if (!teamConfig) {
    return <div data-testid={testId}>No team configuration available</div>;
  }

  const hasRequiredFields =
    typeof teamConfig.format === 'string' &&
    typeof teamConfig.formation === 'string' &&
    typeof teamConfig.squadSize === 'number';

  if (!hasRequiredFields) {
    return <div data-testid={testId}>Invalid team configuration</div>;
  }

  return (
    <IndividualFormation
      data-testid={testId}
      teamConfig={teamConfig}
      selectedFormation={selectedFormation}
      renderSection={renderSection}
      {...props}
    />
  );
}
