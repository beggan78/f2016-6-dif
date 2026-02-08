import React from 'react';
import { useTranslation } from 'react-i18next';
import { IndividualFormation } from './IndividualFormation';

export function FormationRenderer({ teamConfig, selectedFormation, renderSection = 'all', ...props }) {
  const { t } = useTranslation('game');
  const testId = renderSection === 'all' ? 'formation-renderer' : `formation-renderer-${renderSection}`;

  if (!teamConfig) {
    return <div data-testid={testId}>{t('formation.noConfig')}</div>;
  }

  const hasRequiredFields =
    typeof teamConfig.format === 'string' &&
    typeof teamConfig.formation === 'string' &&
    typeof teamConfig.squadSize === 'number';

  if (!hasRequiredFields) {
    return <div data-testid={testId}>{t('formation.invalidConfig')}</div>;
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
