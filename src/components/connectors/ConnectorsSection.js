import React, { useState, useEffect } from 'react';
import { Button } from '../shared/UI';
import { Link, Info, Plus } from 'lucide-react';
import { ConnectorCard } from './ConnectorCard';
import { SportAdminConnectModal } from './SportAdminConnectModal';
import { DisconnectConfirmModal } from './DisconnectConfirmModal';
import { useTeamConnector } from '../../hooks/useTeamConnector';
import { useTeam } from '../../contexts/TeamContext';
import {
  getAllProviders,
  CONNECTOR_PROVIDERS
} from '../../constants/connectorProviders';

export function ConnectorsSection({ team }) {
  const { isTeamAdmin } = useTeam();
  const {
    connectors,
    loading,
    error,
    syncingConnectorId,
    connectProvider,
    disconnectProvider,
    manualSync,
    retryConnector,
    getLatestSyncJob,
    clearError
  } = useTeamConnector(team?.id);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [syncJobs, setSyncJobs] = useState({});

  // Load latest sync jobs for each connector
  useEffect(() => {
    const loadSyncJobs = async () => {
      const jobs = {};
      for (const connector of connectors) {
        try {
          const job = await getLatestSyncJob(connector.id);
          if (job) {
            jobs[connector.id] = job;
          }
        } catch (err) {
          console.error('Error loading sync job for connector:', connector.id, err);
        }
      }
      setSyncJobs(jobs);
    };

    if (connectors.length > 0) {
      loadSyncJobs();
    }
  }, [connectors, getLatestSyncJob]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Only show to team admins
  if (!isTeamAdmin) {
    return null;
  }

  // Get all available providers
  const allProviders = getAllProviders();

  // Get connected provider IDs
  const connectedProviderIds = connectors.map(c => c.provider);

  // Handle connect provider
  const handleConnect = (providerId) => {
    // For now, only SportAdmin is supported
    if (providerId === CONNECTOR_PROVIDERS.SPORTADMIN.id) {
      setShowConnectModal(true);
    }
  };

  // Handle connection success
  const handleConnected = async (credentials) => {
    try {
      await connectProvider(CONNECTOR_PROVIDERS.SPORTADMIN.id, credentials);
      setShowConnectModal(false);
      setSuccessMessage('SportAdmin connected successfully! Verification in progress...');
    } catch (err) {
      // Error will be shown in modal
      throw err;
    }
  };

  // Handle manual sync
  const handleManualSync = async (connectorId) => {
    try {
      await manualSync(connectorId);
      setSuccessMessage('Sync started successfully!');
    } catch (err) {
      // Error handled by hook
      console.error('Manual sync error:', err);
    }
  };

  // Handle disconnect
  const handleDisconnect = (connector) => {
    setSelectedConnector(connector);
    setShowDisconnectModal(true);
  };

  // Handle disconnect confirm
  const handleDisconnectConfirm = async () => {
    try {
      await disconnectProvider(selectedConnector.id);
      setShowDisconnectModal(false);
      setSelectedConnector(null);
      setSuccessMessage('Provider disconnected successfully!');
    } catch (err) {
      // Error will be shown in modal
      throw err;
    }
  };

  // Handle retry
  const handleRetry = async (connectorId) => {
    try {
      await retryConnector(connectorId);
      setSuccessMessage('Retrying connection...');
    } catch (err) {
      console.error('Retry error:', err);
    }
  };

  const renderProviderLogo = (provider) => {
    if (!provider.logo) return null;

    return (
      <div className="w-32 h-10 flex-shrink-0 overflow-hidden rounded-md border border-slate-600">
        <img src={provider.logo} alt={`${provider.name} logo`} className="w-full h-full object-cover block" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link className="w-5 h-5 text-sky-400" />
          <h4 className="text-md font-medium text-slate-300">Connectors</h4>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-sky-900/20 border border-sky-600 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-sky-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sky-200 text-sm">
              Connect external team management platforms to automatically sync practice attendance and match schedules.
            </p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <p className="text-rose-200 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-rose-300 hover:text-rose-100 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && connectors.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-slate-300">Loading connectors...</span>
        </div>
      )}

      {/* Connected Providers */}
      {connectors.length > 0 && (
        <div className="space-y-4">
          <h5 className="text-sm font-medium text-slate-400">Connected Providers</h5>
          {connectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onManualSync={() => handleManualSync(connector.id)}
              onDisconnect={() => handleDisconnect(connector)}
              onRetry={() => handleRetry(connector.id)}
              loading={syncingConnectorId === connector.id}
              latestSyncJob={syncJobs[connector.id]}
            />
          ))}
        </div>
      )}

      {/* Available Providers */}
      <div className="space-y-4">
        <h5 className="text-sm font-medium text-slate-400">Available Providers</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allProviders.map((provider) => {
            const isConnected = connectedProviderIds.includes(provider.id);
            const isComingSoon = provider.comingSoon;

            return (
              <div
                key={provider.id}
                className={`bg-slate-700 rounded-lg border p-4 ${
                  isComingSoon
                    ? 'border-slate-600 opacity-60'
                    : isConnected
                    ? 'border-emerald-600'
                    : 'border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-3 min-w-0">{renderProviderLogo(provider)}</div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {isConnected && (
                      <span className="px-2 py-1 bg-emerald-600 text-emerald-100 rounded text-xs font-medium">
                        Connected
                      </span>
                    )}
                    {isComingSoon && (
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs font-medium">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>

                {!isConnected && !isComingSoon && (
                  <Button
                    onClick={() => handleConnect(provider.id)}
                    variant="primary"
                    size="sm"
                    className="w-full"
                    Icon={Plus}
                  >
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect Modal */}
      <SportAdminConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        team={team}
        onConnected={handleConnected}
      />

      {/* Disconnect Modal */}
      <DisconnectConfirmModal
        isOpen={showDisconnectModal}
        onClose={() => {
          setShowDisconnectModal(false);
          setSelectedConnector(null);
        }}
        connector={selectedConnector}
        onConfirm={handleDisconnectConfirm}
      />
    </div>
  );
}
