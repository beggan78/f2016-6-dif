import sportAdminLogo from '../assets/images/sportAdmin-250-80.png';
import svenskaLagLogo from '../assets/images/svenskalag-250-80.png';
import myClubLogo from '../assets/images/myClub-250-80.png';

// Connector provider definitions and metadata
// Supports SportAdmin (active) and Svenska Lag/MyClub (coming soon)

export const CONNECTOR_PROVIDERS = {
  SPORTADMIN: {
    id: 'sportadmin',
    name: 'SportAdmin',
    description: 'Swedish team management platform',
    features: ['Practice Attendance', 'Upcoming Matches'],
    logo: sportAdminLogo,
    comingSoon: false
  },
  SVENSKA_LAG: {
    id: 'svenska_lag',
    name: 'Svenska Lag',
    description: 'Swedish team management platform',
    features: ['Coming Soon'],
    logo: svenskaLagLogo,
    comingSoon: true
  },
  MYCLUB: {
    id: 'myclub',
    name: 'MyClub',
    description: 'Team management platform',
    features: ['Coming Soon'],
    logo: myClubLogo,
    comingSoon: true
  }
};

// Get provider by ID
export function getProviderById(providerId) {
  return Object.values(CONNECTOR_PROVIDERS).find(p => p.id === providerId);
}

// Get all active (non-coming-soon) providers
export function getActiveProviders() {
  return Object.values(CONNECTOR_PROVIDERS).filter(p => !p.comingSoon);
}

// Get all providers (including coming soon)
export function getAllProviders() {
  return Object.values(CONNECTOR_PROVIDERS);
}

// Connector status constants (matches database enum)
export const CONNECTOR_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  VERIFYING: 'verifying'
};

// Sync job status constants (matches database enum)
export const SYNC_JOB_STATUS = {
  WAITING: 'waiting',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  RETRYING: 'retrying',
  CANCELLED: 'cancelled'
};

// Sync job type constants (matches database enum)
export const SYNC_JOB_TYPE = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  VERIFICATION: 'verification'
};

// Get translated connector providers
export function getConnectorProviders(t) {
  return {
    SPORTADMIN: {
      ...CONNECTOR_PROVIDERS.SPORTADMIN,
      description: t('connectors:providers.sportadmin.description'),
      features: [
        t('connectors:providers.sportadmin.features.practiceAttendance'),
        t('connectors:providers.sportadmin.features.upcomingMatches')
      ]
    },
    SVENSKA_LAG: {
      ...CONNECTOR_PROVIDERS.SVENSKA_LAG,
      description: t('connectors:providers.svenska_lag.description'),
      features: [
        t('connectors:providers.svenska_lag.features.comingSoon')
      ]
    },
    MYCLUB: {
      ...CONNECTOR_PROVIDERS.MYCLUB,
      description: t('connectors:providers.myclub.description'),
      features: [
        t('connectors:providers.myclub.features.comingSoon')
      ]
    }
  };
}

// Get status badge color and icon based on connector status
export function getStatusBadgeStyle(status, t) {
  const labels = t ? {
    connected: t('connectors:statusLabels.connected'),
    verifying: t('connectors:statusLabels.verifying'),
    error: t('connectors:statusLabels.error'),
    disconnected: t('connectors:statusLabels.disconnected'),
    unknown: t('connectors:statusLabels.unknown')
  } : {
    connected: 'Connected',
    verifying: 'Verifying',
    error: 'Error',
    disconnected: 'Disconnected',
    unknown: 'Unknown'
  };

  switch (status) {
    case CONNECTOR_STATUS.CONNECTED:
      return {
        color: 'bg-emerald-600 text-emerald-100',
        icon: 'check-circle',
        label: labels.connected
      };
    case CONNECTOR_STATUS.VERIFYING:
      return {
        color: 'bg-yellow-600 text-yellow-100',
        icon: 'loader',
        label: labels.verifying
      };
    case CONNECTOR_STATUS.ERROR:
      return {
        color: 'bg-rose-600 text-rose-100',
        icon: 'alert-circle',
        label: labels.error
      };
    case CONNECTOR_STATUS.DISCONNECTED:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: labels.disconnected
      };
    default:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: labels.unknown
      };
  }
}

// Get sync job status badge style
export function getSyncJobStatusStyle(status, t) {
  const labels = t ? {
    completed: t('connectors:syncStatusLabels.completed'),
    running: t('connectors:syncStatusLabels.running'),
    waiting: t('connectors:syncStatusLabels.waiting'),
    retrying: t('connectors:syncStatusLabels.retrying'),
    failed: t('connectors:syncStatusLabels.failed'),
    cancelled: t('connectors:syncStatusLabels.cancelled'),
    unknown: t('connectors:syncStatusLabels.unknown')
  } : {
    completed: 'Completed',
    running: 'Running',
    waiting: 'Waiting',
    retrying: 'Retrying',
    failed: 'Failed',
    cancelled: 'Cancelled',
    unknown: 'Unknown'
  };

  switch (status) {
    case SYNC_JOB_STATUS.COMPLETED:
      return {
        color: 'bg-emerald-600 text-emerald-100',
        icon: 'check-circle',
        label: labels.completed
      };
    case SYNC_JOB_STATUS.RUNNING:
      return {
        color: 'bg-sky-600 text-sky-100',
        icon: 'loader',
        label: labels.running
      };
    case SYNC_JOB_STATUS.WAITING:
      return {
        color: 'bg-yellow-600 text-yellow-100',
        icon: 'clock',
        label: labels.waiting
      };
    case SYNC_JOB_STATUS.RETRYING:
      return {
        color: 'bg-amber-600 text-amber-100',
        icon: 'refresh-cw',
        label: labels.retrying
      };
    case SYNC_JOB_STATUS.FAILED:
      return {
        color: 'bg-rose-600 text-rose-100',
        icon: 'x-circle',
        label: labels.failed
      };
    case SYNC_JOB_STATUS.CANCELLED:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'x',
        label: labels.cancelled
      };
    default:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: labels.unknown
      };
  }
}
