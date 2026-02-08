import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAttendanceStats } from '../services/connectorService';

export const useAttendanceStats = (teamId, startDate, endDate) => {
  const { t } = useTranslation('common');
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    if (!teamId) {
      setAttendanceStats([]);
      return;
    }

    let isActive = true;
    setStatsLoading(true);
    setStatsError(null);

    getAttendanceStats(teamId, startDate, endDate)
      .then((data) => {
        if (!isActive) return;
        setAttendanceStats(data || []);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load attendance stats:', error);
        setStatsError(error?.message || t('errors.failedToLoadAttendanceStats'));
      })
      .finally(() => {
        if (!isActive) return;
        setStatsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [teamId, startDate, endDate, t]);

  return { attendanceStats, statsLoading, statsError };
};
