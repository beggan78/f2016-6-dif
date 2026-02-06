import React from 'react';
import PropTypes from 'prop-types';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';

/**
 * UnmappedPlayersBanner Component
 *
 * Displays a banner notifying users about unmapped "ghost players" from connected
 * providers that are waiting to be matched to the roster. Shows when team has < 4
 * active roster players and unmapped players exist.
 *
 * @param {string} firstProviderName - Name of the first provider with unmapped players
 * @param {Function} onNavigateToRoster - Callback to navigate to Roster Management tab
 */
export function UnmappedPlayersBanner({ firstProviderName, onNavigateToRoster }) {
  const { t } = useTranslation('navigation');

  return (
    <div className="bg-sky-900/20 border border-sky-600 rounded-lg p-4 text-center">
      {/* Header Section */}
      <div className="flex items-start space-x-3 mb-4">
        <Users className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sky-200 font-medium text-sm mb-1">
            Players Available to Match
          </h3>
          <p className="text-sky-300/80 text-xs">
            You have unmapped players from {firstProviderName} waiting to be matched to your roster.
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="flex justify-center">
        <Button
          onClick={onNavigateToRoster}
          variant="primary"
          Icon={ArrowRight}
        >
          {t('goTo.rosterManagement')}
        </Button>
      </div>
    </div>
  );
}

UnmappedPlayersBanner.propTypes = {
  firstProviderName: PropTypes.string.isRequired,
  onNavigateToRoster: PropTypes.func.isRequired
};
