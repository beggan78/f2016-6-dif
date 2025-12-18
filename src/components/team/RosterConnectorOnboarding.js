import React from 'react';
import PropTypes from 'prop-types';
import { Link, ArrowRight } from 'lucide-react';
import { Button } from '../shared/UI';
import { ProviderLogo } from '../connectors/ProviderLogo';
import { getAllProviders } from '../../constants/connectorProviders';

/**
 * RosterConnectorOnboarding Component
 *
 * Displays a banner encouraging users to connect external platforms to sync
 * roster data. Shows when team has < 4 active players and no connected provider.
 *
 * @param {Function} onNavigateToConnectors - Callback to navigate to Connectors tab
 */
export function RosterConnectorOnboarding({ onNavigateToConnectors }) {
  const providers = getAllProviders();

  return (
    <div className="bg-sky-900/20 border border-sky-600 rounded-lg p-4">
      {/* Header Section */}
      <div className="flex items-start space-x-3 mb-7">
        <Link className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sky-200 font-medium text-sm mb-1">
            Sync Players from External Platforms
          </h3>
          <p className="text-sky-300/80 text-xs">
            Connect to your team management platform to automatically sync your roster and practice attendance.
          </p>
        </div>
      </div>

      {/* Provider Logos Grid */}
      <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`relative ${provider.comingSoon ? 'opacity-60' : ''}`}
          >
            <ProviderLogo provider={provider} className="w-28 h-9" />
            {provider.comingSoon && (
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-slate-600/90 text-slate-200 rounded text-[10px] font-medium shadow-sm border border-slate-500">
                Soon
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="flex justify-end ml-8">
        <Button
          onClick={onNavigateToConnectors}
          variant="primary"
          size="sm"
          Icon={ArrowRight}
        >
          Go to Connectors
        </Button>
      </div>
    </div>
  );
}

RosterConnectorOnboarding.propTypes = {
  onNavigateToConnectors: PropTypes.func.isRequired
};
