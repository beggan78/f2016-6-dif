import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, BarChart3, Users, History, Calendar } from 'lucide-react';
import { Button } from '../shared/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { useAuthModalIntegration } from '../../hooks/useAuthModalIntegration';
import { TeamStatsView } from './TeamStatsView';
import { PlayerStatsView } from './PlayerStatsView';
import { MatchHistoryView } from './MatchHistoryView';
import { MatchDetailsView } from './MatchDetailsView';
import { AttendanceStatsView } from './AttendanceStatsView';
import { TimeFilter } from './TimeFilter';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TIME_PRESETS } from '../../constants/timePresets';

const STATS_TABS = {
  TEAM: 'team',
  PLAYER: 'player',
  ATTENDANCE: 'attendance',
  HISTORY: 'history'
};

export function StatisticsScreen({ onNavigateBack, authModal: authModalProp }) {
  const tabPersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.STATISTICS_ACTIVE_TAB, { tab: STATS_TABS.TEAM }),
    []
  );
  const timeRangePersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.STATISTICS_TIME_RANGE, {
      presetId: 'all-time',
      customStartDate: null,
      customEndDate: null
    }),
    []
  );

  const initialTimeRange = useMemo(() => {
    const stored = timeRangePersistence.loadState();
    const presetId = stored?.presetId || 'all-time';

    // If custom range, use stored dates
    if (presetId === 'custom') {
      const parseDate = (value) => {
        if (!value) return null;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      };
      return {
        start: parseDate(stored?.customStartDate),
        end: parseDate(stored?.customEndDate),
        presetId: 'custom'
      };
    }

    // For presets, calculate fresh dates
    const preset = TIME_PRESETS.find(p => p.id === presetId);
    const range = preset ? preset.getValue() : { start: null, end: null };

    return {
      start: range.start,
      end: range.end,
      presetId: preset ? presetId : 'all-time'
    };
  }, [timeRangePersistence]);

  const [activeTab, setActiveTab] = useState(() => {
    const stored = tabPersistence.loadState();
    const storedTab = stored && typeof stored === 'object' ? stored.tab : null;
    return storedTab && Object.values(STATS_TABS).includes(storedTab) ? storedTab : STATS_TABS.TEAM;
  });
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [timeRangeStart, setTimeRangeStart] = useState(initialTimeRange.start);
  const [timeRangeEnd, setTimeRangeEnd] = useState(initialTimeRange.end);
  const [selectedPresetId, setSelectedPresetId] = useState(initialTimeRange.presetId);
  const { loading: authLoading, isAuthenticated } = useAuth();
  const {
    loading: teamLoading,
    currentTeam,
    userTeams,
    canViewStatistics,
    teamPlayers
  } = useTeam();
  const authModal = useAuthModalIntegration(authModalProp);

  useEffect(() => {
    tabPersistence.saveState({ tab: activeTab });
  }, [activeTab, tabPersistence]);

  useEffect(() => {
    if (selectedPresetId === 'custom') {
      // For custom ranges, save the actual dates
      timeRangePersistence.saveState({
        presetId: 'custom',
        customStartDate: timeRangeStart ? timeRangeStart.toISOString() : null,
        customEndDate: timeRangeEnd ? timeRangeEnd.toISOString() : null
      });
    } else {
      // For presets, only save the preset ID
      timeRangePersistence.saveState({
        presetId: selectedPresetId,
        customStartDate: null,
        customEndDate: null
      });
    }
  }, [timeRangeStart, timeRangeEnd, selectedPresetId, timeRangePersistence]);

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
    setIsCreatingMatch(false);
  };

  const handleBackToHistory = () => {
    setSelectedMatchId(null);
    setIsCreatingMatch(false);
  };

  const handleTimeRangeChange = (startDate, endDate, presetId = 'all-time') => {
    const normalizeDate = (value) => {
      if (!value) return null;
      const parsed = value instanceof Date ? value : new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    setTimeRangeStart(normalizeDate(startDate));
    setTimeRangeEnd(normalizeDate(endDate));
    setSelectedPresetId(presetId);
  };

  const handleCreateMatch = () => {
    setSelectedMatchId(null);
    setIsCreatingMatch(true);
  };

  const triggerHistoryRefresh = () => {
    setHistoryRefreshKey((prev) => prev + 1);
  };

  const handleManualMatchCreated = (newMatchId) => {
    triggerHistoryRefresh();
    if (newMatchId) {
      setSelectedMatchId(newMatchId);
      setIsCreatingMatch(false);
    } else {
      setSelectedMatchId(null);
      setIsCreatingMatch(false);
    }
  };

  const handleMatchDeleted = () => {
    triggerHistoryRefresh();
    setSelectedMatchId(null);
    setIsCreatingMatch(false);
  };

  const tabs = [
    {
      id: STATS_TABS.TEAM,
      label: 'Team Stats',
      icon: BarChart3,
      description: 'Team performance overview'
    },
    {
      id: STATS_TABS.PLAYER,
      label: 'Player Match Stats',
      icon: Users,
      description: 'Individual player match statistics'
    },
    {
      id: STATS_TABS.ATTENDANCE,
      label: 'Attendance Stats',
      icon: Calendar,
      description: 'Practice attendance tracking'
    },
    {
      id: STATS_TABS.HISTORY,
      label: 'Match History',
      icon: History,
      description: 'Complete match history'
    }
  ];

  const renderActiveView = () => {
    if (selectedMatchId || isCreatingMatch) {
      return (
        <MatchDetailsView
          matchId={isCreatingMatch ? null : selectedMatchId}
          mode={isCreatingMatch ? 'create' : 'view'}
          teamId={currentTeam?.id}
          teamPlayers={teamPlayers}
          onNavigateBack={handleBackToHistory}
          onManualMatchCreated={handleManualMatchCreated}
          onMatchUpdated={triggerHistoryRefresh}
          onMatchDeleted={handleMatchDeleted}
        />
      );
    }

    switch (activeTab) {
      case STATS_TABS.TEAM:
        return <TeamStatsView startDate={timeRangeStart} endDate={timeRangeEnd} onMatchSelect={handleMatchSelect} />;
      case STATS_TABS.PLAYER:
        return <PlayerStatsView startDate={timeRangeStart} endDate={timeRangeEnd} />;
      case STATS_TABS.ATTENDANCE:
        return <AttendanceStatsView startDate={timeRangeStart} endDate={timeRangeEnd} />;
      case STATS_TABS.HISTORY:
        return (
          <MatchHistoryView
            onMatchSelect={handleMatchSelect}
            onCreateMatch={handleCreateMatch}
            startDate={timeRangeStart}
            endDate={timeRangeEnd}
            refreshKey={historyRefreshKey}
          />
        );
      default:
        return <TeamStatsView startDate={timeRangeStart} endDate={timeRangeEnd} onMatchSelect={handleMatchSelect} />;
    }
  };

  const renderAccessState = (subtitle, body, actions = null) => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          onClick={onNavigateBack}
          Icon={ArrowLeft}
          variant="secondary"
          size="md"
        >
          Back
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-sky-400">Statistics</h2>
          {subtitle && (
            <p className="text-slate-400 text-sm">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 text-center space-y-4">
        <p className="text-slate-300 text-sm">{body}</p>
        {actions}
      </div>
    </div>
  );

  if (authLoading || teamLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onNavigateBack}
            Icon={ArrowLeft}
            variant="secondary"
            size="md"
          >
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-sky-400">Statistics</h2>
            <p className="text-slate-400 text-sm">Loading statistics...</p>
          </div>
        </div>
        <div className="flex justify-center py-10">
          <div className="flex items-center space-x-3 text-slate-400">
            <div className="h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>Fetching the latest data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return renderAccessState(
      'Stay close to the action',
      'Sign in with your parent account to explore match history, player stats, and team trends.',
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button onClick={() => authModal.openLogin?.()}>
          Sign In
        </Button>
        <Button
          variant="secondary"
          onClick={() => authModal.openSignup?.()}
        >
          Create Account
        </Button>
      </div>
    );
  }

  if (!currentTeam) {
    const hasTeamMembership = Array.isArray(userTeams) && userTeams.length > 0;
    return renderAccessState(
      hasTeamMembership ? 'Select a team to continue' : 'No team membership detected',
      hasTeamMembership
        ? 'Choose a team from the main dashboard to view its statistics.'
        : 'You need a team membership before you can view statistics. Ask a coach or admin to add you to the team.',
      <div className="flex justify-center">
        <Button variant="secondary" onClick={onNavigateBack}>
          Return to app
        </Button>
      </div>
    );
  }

  if (!canViewStatistics) {
    return renderAccessState(
      'Role update required',
      'Statistics are available for parent accounts. Ask your team administrator to upgrade your access.',
      <div className="flex justify-center">
        <Button variant="secondary" onClick={onNavigateBack}>
          Go back
        </Button>
      </div>
    );
  }

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header - only show when not viewing match details */}
      {!selectedMatchId && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={onNavigateBack}
              Icon={ArrowLeft}
              variant="secondary"
              size="md"
            >
              Back
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-sky-400">Statistics</h2>
              {currentTab && (
                <p className="text-slate-400 text-sm">{currentTab.description}</p>
              )}
            </div>
          </div>

          {/* Time Filter - only show on larger screens */}
          <TimeFilter
            startDate={timeRangeStart}
            endDate={timeRangeEnd}
            selectedPresetId={selectedPresetId}
            onTimeRangeChange={handleTimeRangeChange}
            className="flex-shrink-0 hidden sm:block"
          />
        </div>
      )}

      {/* Time Filter for mobile - show under title but above tabs */}
      {!selectedMatchId && (
        <div className="sm:hidden">
          <TimeFilter
            startDate={timeRangeStart}
            endDate={timeRangeEnd}
            selectedPresetId={selectedPresetId}
            onTimeRangeChange={handleTimeRangeChange}
            className="w-full"
          />
        </div>
      )}

      {/* Tab Navigation - only show when not viewing match details */}
      {!selectedMatchId && (
        <div className="border-b border-slate-600">
          <nav className="flex flex-wrap gap-3 sm:gap-4 md:gap-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-sky-400 text-sky-400'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-96">
        {renderActiveView()}
      </div>
    </div>
  );
}
