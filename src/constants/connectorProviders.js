// Connector provider definitions and metadata
// Supports SportAdmin (active) and Svenska Lag (coming soon)

export const CONNECTOR_PROVIDERS = {
  SPORTADMIN: {
    id: 'sportadmin',
    name: 'SportAdmin',
    description: 'Swedish team management platform for practice attendance and match scheduling',
    features: ['Practice Attendance', 'Upcoming Matches'],
    comingSoon: false
  },
  SVENSKA_LAG: {
    id: 'svenska_lag',
    name: 'Svenska Lag',
    description: 'Swedish team management platform',
    features: ['Coming Soon'],
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
  CANCELLED: 'cancelled'
};

// Sync job type constants (matches database enum)
export const SYNC_JOB_TYPE = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  VERIFICATION: 'verification'
};

// Get status badge color and icon based on connector status
export function getStatusBadgeStyle(status) {
  switch (status) {
    case CONNECTOR_STATUS.CONNECTED:
      return {
        color: 'bg-emerald-600 text-emerald-100',
        icon: 'check-circle',
        label: 'Connected'
      };
    case CONNECTOR_STATUS.VERIFYING:
      return {
        color: 'bg-yellow-600 text-yellow-100',
        icon: 'loader',
        label: 'Verifying'
      };
    case CONNECTOR_STATUS.ERROR:
      return {
        color: 'bg-rose-600 text-rose-100',
        icon: 'alert-circle',
        label: 'Error'
      };
    case CONNECTOR_STATUS.DISCONNECTED:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: 'Disconnected'
      };
    default:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: 'Unknown'
      };
  }
}

// Get sync job status badge style
export function getSyncJobStatusStyle(status) {
  switch (status) {
    case SYNC_JOB_STATUS.COMPLETED:
      return {
        color: 'bg-emerald-600 text-emerald-100',
        icon: 'check-circle',
        label: 'Completed'
      };
    case SYNC_JOB_STATUS.RUNNING:
      return {
        color: 'bg-sky-600 text-sky-100',
        icon: 'loader',
        label: 'Running'
      };
    case SYNC_JOB_STATUS.WAITING:
      return {
        color: 'bg-yellow-600 text-yellow-100',
        icon: 'clock',
        label: 'Waiting'
      };
    case SYNC_JOB_STATUS.FAILED:
      return {
        color: 'bg-rose-600 text-rose-100',
        icon: 'x-circle',
        label: 'Failed'
      };
    case SYNC_JOB_STATUS.CANCELLED:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'x',
        label: 'Cancelled'
      };
    default:
      return {
        color: 'bg-slate-600 text-slate-100',
        icon: 'circle',
        label: 'Unknown'
      };
  }
}
