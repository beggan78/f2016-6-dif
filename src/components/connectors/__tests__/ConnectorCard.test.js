import React from 'react';
import { render, screen } from '@testing-library/react';
import { RefreshCw } from 'lucide-react';
import { ConnectorCard } from '../ConnectorCard';
import { CONNECTOR_STATUS, SYNC_JOB_STATUS } from '../../../constants/connectorProviders';
import * as connectorProviders from '../../../constants/connectorProviders';

const statusBadgeProps = [];

jest.mock('../../shared/StatusBadge', () => {
  const React = require('react');
  return {
    StatusBadge: (props) => {
      statusBadgeProps.push(props);
      const { icon: Icon, label } = props;
      return (
        <div data-testid={`status-badge-${label}`} data-icon={Icon?.name || 'none'}>
          {label}
        </div>
      );
    }
  };
});

describe('ConnectorCard', () => {
  const baseConnector = {
    provider: 'sportadmin',
    status: CONNECTOR_STATUS.CONNECTED,
    last_verified_at: '2024-01-01T00:00:00Z',
    last_sync_at: '2024-01-01T00:00:00Z',
    last_error: null
  };

  const retryingSyncJob = {
    status: SYNC_JOB_STATUS.RETRYING,
    created_at: '2024-01-02T00:00:00Z'
  };

  beforeEach(() => {
    statusBadgeProps.length = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('disables manual sync while a retrying sync job is active', () => {
    render(
      <ConnectorCard
        connector={baseConnector}
        latestSyncJob={retryingSyncJob}
        onManualSync={jest.fn()}
        onDisconnect={jest.fn()}
        onRetry={jest.fn()}
        loading={false}
      />
    );

    expect(screen.getByRole('button', { name: /manual sync/i })).toBeDisabled();
  });

  it('renders RefreshCw icon for retrying sync status', () => {
    render(
      <ConnectorCard
        connector={baseConnector}
        latestSyncJob={retryingSyncJob}
        onManualSync={jest.fn()}
        onDisconnect={jest.fn()}
        onRetry={jest.fn()}
        loading={false}
      />
    );

    const retryBadgeProps = statusBadgeProps.find((props) => props.label === 'Retrying');
    expect(retryBadgeProps).toBeDefined();
    expect(retryBadgeProps.icon).toBe(RefreshCw);
  });

  it('shows fallback provider label when logo is missing', () => {
    jest.spyOn(connectorProviders, 'getProviderById').mockReturnValue({
      id: 'sportadmin',
      name: 'SportAdmin',
      logo: null
    });

    render(
      <ConnectorCard
        connector={baseConnector}
        latestSyncJob={null}
        onManualSync={jest.fn()}
        onDisconnect={jest.fn()}
        onRetry={jest.fn()}
        loading={false}
      />
    );

    expect(screen.getByText('SportAdmin')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /sportadmin logo/i })).not.toBeInTheDocument();
  });
});
