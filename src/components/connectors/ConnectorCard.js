import React, { useState, useEffect } from 'react';
import { Button } from '../shared/UI';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  RefreshCw,
  Unplug,
  Clock,
  Calendar
} from 'lucide-react';
import {
  getProviderById,
  getStatusBadgeStyle,
  getSyncJobStatusStyle,
  CONNECTOR_STATUS
} from '../../constants/connectorProviders';

export function ConnectorCard({ connector, onManualSync, onDisconnect, onRetry, loading, latestSyncJob }) {
  const [isSyncing, setIsSyncing] = useState(false);

  const provider = getProviderById(connector.provider);
  const statusStyle = getStatusBadgeStyle(connector.status);
  const syncJobStyle = latestSyncJob ? getSyncJobStatusStyle(latestSyncJob.status) : null;

  useEffect(() => {
    setIsSyncing(loading);
  }, [loading]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await onManualSync();
    } finally {
      // Keep syncing state for a bit to show feedback
      setTimeout(() => setIsSyncing(false), 1000);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  const getStatusIcon = () => {
    switch (connector.status) {
      case CONNECTOR_STATUS.CONNECTED:
        return <CheckCircle className="w-4 h-4" />;
      case CONNECTOR_STATUS.VERIFYING:
        return <Clock className="w-4 h-4" />;
      case CONNECTOR_STATUS.ERROR:
        return <AlertCircle className="w-4 h-4" />;
      case CONNECTOR_STATUS.DISCONNECTED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const canSync = connector.status === CONNECTOR_STATUS.CONNECTED && !isSyncing;
  const hasError = connector.status === CONNECTOR_STATUS.ERROR;

  return (
    <div className="bg-slate-700 rounded-lg border border-slate-600 p-4">
      {/* Provider Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h4 className="text-slate-100 font-medium text-lg">{provider?.name || connector.provider}</h4>
          <p className="text-slate-400 text-sm">{provider?.description}</p>
        </div>

        {/* Status Badge */}
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusStyle.color}`}>
          {getStatusIcon()}
          <span>{statusStyle.label}</span>
        </div>
      </div>

      {/* Connection Details */}
      <div className="space-y-2 mb-4 text-sm">
        {connector.last_verified_at && (
          <div className="flex items-center text-slate-300">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
            <span className="text-slate-400">Last verified:</span>
            <span className="ml-2">{formatDateTime(connector.last_verified_at)}</span>
          </div>
        )}

        {connector.last_sync_at && (
          <div className="flex items-center text-slate-300">
            <Clock className="w-4 h-4 mr-2 text-sky-400" />
            <span className="text-slate-400">Last sync:</span>
            <span className="ml-2">{formatDateTime(connector.last_sync_at)}</span>
          </div>
        )}
      </div>

      {/* Latest Sync Job Status */}
      {latestSyncJob && (
        <div className="bg-slate-800 rounded-lg p-3 mb-4 border border-slate-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 text-sm font-medium">Latest Sync</span>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center space-x-1 ${syncJobStyle.color}`}>
              {latestSyncJob.status === 'running' && <Loader className="w-3 h-3 animate-spin" />}
              {latestSyncJob.status === 'completed' && <CheckCircle className="w-3 h-3" />}
              {latestSyncJob.status === 'failed' && <XCircle className="w-3 h-3" />}
              {latestSyncJob.status === 'waiting' && <Clock className="w-3 h-3" />}
              <span>{syncJobStyle.label}</span>
            </div>
          </div>

          <div className="text-slate-400 text-xs">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDateTime(latestSyncJob.created_at)}
            </div>

            {latestSyncJob.error_message && (
              <div className="mt-2 text-rose-300">
                Error: {latestSyncJob.error_message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {hasError && connector.last_error && (
        <div className="bg-rose-900/20 border border-rose-600 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-rose-200 text-sm font-medium">Connection Error</p>
              <p className="text-rose-300 text-xs mt-1">{connector.last_error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {hasError && onRetry ? (
          <Button
            onClick={onRetry}
            variant="primary"
            size="sm"
            className="flex-1"
            Icon={RefreshCw}
            disabled={isSyncing}
          >
            Retry Connection
          </Button>
        ) : (
          <Button
            onClick={handleManualSync}
            variant="primary"
            size="sm"
            className="flex-1"
            Icon={RefreshCw}
            disabled={!canSync}
          >
            {isSyncing ? 'Syncing...' : 'Manual Sync'}
          </Button>
        )}

        <Button
          onClick={onDisconnect}
          variant="secondary"
          size="sm"
          Icon={Unplug}
          disabled={isSyncing}
        >
          Disconnect
        </Button>
      </div>

    </div>
  );
}
