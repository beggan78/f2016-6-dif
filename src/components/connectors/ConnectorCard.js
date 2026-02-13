import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/UI';
import { StatusBadge } from '../shared/StatusBadge';
import { Card } from '../shared/Card';
import { Alert } from '../shared/Alert';
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
  CONNECTOR_STATUS,
  SYNC_JOB_STATUS
} from '../../constants/connectorProviders';
import { ProviderLogo } from './ProviderLogo';

const STATUS_ICON_MAP = {
  [CONNECTOR_STATUS.CONNECTED]: CheckCircle,
  [CONNECTOR_STATUS.VERIFYING]: Clock,
  [CONNECTOR_STATUS.ERROR]: AlertCircle,
  [CONNECTOR_STATUS.DISCONNECTED]: XCircle
};

const SYNC_JOB_ICON_MAP = {
  [SYNC_JOB_STATUS.COMPLETED]: CheckCircle,
  [SYNC_JOB_STATUS.RUNNING]: Loader,
  [SYNC_JOB_STATUS.FAILED]: XCircle,
  [SYNC_JOB_STATUS.RETRYING]: RefreshCw,
  [SYNC_JOB_STATUS.WAITING]: Clock
};

export function ConnectorCard({ connector, onManualSync, onDisconnect, onRetry, loading, latestSyncJob }) {
  const { t } = useTranslation('connectors');
  const [isSyncing, setIsSyncing] = useState(false);

  const provider = getProviderById(connector.provider);
  const statusStyle = getStatusBadgeStyle(connector.status, t);
  const syncJobStyle = latestSyncJob ? getSyncJobStatusStyle(latestSyncJob.status, t) : null;
  const statusIcon = STATUS_ICON_MAP[connector.status] || XCircle;
  const syncJobIcon = latestSyncJob ? SYNC_JOB_ICON_MAP[latestSyncJob.status] : null;

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
    if (!dateString) return t('connectorCard.never');
    const date = new Date(dateString);
    return date.toLocaleString('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  const isRetrying = latestSyncJob?.status === SYNC_JOB_STATUS.RETRYING;
  const canSync = connector.status === CONNECTOR_STATUS.CONNECTED && !isSyncing && !isRetrying;
  const hasError = connector.status === CONNECTOR_STATUS.ERROR;

  return (
    <Card>
      {/* Provider Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <ProviderLogo provider={provider} />
        </div>

        {/* Status Badge */}
        <StatusBadge
          icon={statusIcon}
          iconClassName="w-4 h-4"
          label={statusStyle.label}
          colorClass={statusStyle.color}
          className="px-3 py-1"
        />
      </div>

      {/* Connection Details */}
      <div className="space-y-2 mb-4 text-sm">
        {connector.last_verified_at && (
          <div className="flex items-center text-slate-300">
            <CheckCircle className="w-4 h-4 mr-2 text-emerald-400" />
            <span className="text-slate-400">{t('connectorCard.lastVerified')}</span>
            <span className="ml-2">{formatDateTime(connector.last_verified_at)}</span>
          </div>
        )}

        {connector.last_sync_at && (
          <div className="flex items-center text-slate-300">
            <Clock className="w-4 h-4 mr-2 text-sky-400" />
            <span className="text-slate-400">{t('connectorCard.lastSync')}</span>
            <span className="ml-2">{formatDateTime(connector.last_sync_at)}</span>
          </div>
        )}
      </div>

      {/* Latest Sync Job Status */}
      {latestSyncJob && (
        <Card variant="dark" padding="sm" className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 text-sm font-medium">{t('connectorCard.connectionCreated')}</span>
            <StatusBadge
              icon={syncJobIcon}
              iconClassName={`w-3 h-3 ${latestSyncJob.status === SYNC_JOB_STATUS.RUNNING ? 'animate-spin' : ''}`}
              label={syncJobStyle.label}
              colorClass={syncJobStyle.color}
              className="px-2 py-0.5"
            />
          </div>

          <div className="text-slate-400 text-xs">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              {formatDateTime(latestSyncJob.created_at)}
            </div>

            {latestSyncJob.error_message && (
              <div className="mt-2 text-rose-300">
                {t('connectorCard.errorPrefix')} {latestSyncJob.error_message}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {hasError && connector.last_error && (
        <Alert variant="error" icon={AlertCircle} className="mb-4">
          <p className="font-medium">{t('connectorCard.connectionError')}</p>
          <p className="text-xs mt-1 opacity-80">{connector.last_error}</p>
        </Alert>
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
            {t('connectorCard.buttons.retryConnection')}
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
            {isSyncing ? t('connectorCard.buttons.syncing') : t('connectorCard.buttons.manualSync')}
          </Button>
        )}

        <Button
          onClick={onDisconnect}
          variant="secondary"
          size="sm"
          Icon={Unplug}
          disabled={isSyncing}
        >
          {t('connectorCard.buttons.disconnect')}
        </Button>
      </div>

    </Card>
  );
}
