import React, { useState } from 'react';
import { BarChart3, Users, Calendar, ArrowLeft, Filter } from 'lucide-react';
import { Button } from '../shared/UI';
import { TeamOverview } from './TeamOverview';
import { PlayerStatistics } from './PlayerStatistics';
import { MatchList } from './MatchList';
import { MatchDetails } from './MatchDetails';

const STATISTICS_VIEWS = {
  OVERVIEW: 'overview',
  PLAYERS: 'players',
  MATCHES: 'matches',
  MATCH_DETAILS: 'matchDetails'
};

export function StatisticsScreen({ onNavigateBack }) {
  const [currentView, setCurrentView] = useState(STATISTICS_VIEWS.OVERVIEW);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [dateRange, setDateRange] = useState({ start: null, end: null });

  const handleMatchClick = (matchId) => {
    setSelectedMatchId(matchId);
    setCurrentView(STATISTICS_VIEWS.MATCH_DETAILS);
  };

  const handleBackToMatches = () => {
    setSelectedMatchId(null);
    setCurrentView(STATISTICS_VIEWS.MATCHES);
  };

  const navigationButtons = [
    {
      id: STATISTICS_VIEWS.OVERVIEW,
      label: 'Team Overview',
      icon: BarChart3,
      description: 'Overall team performance'
    },
    {
      id: STATISTICS_VIEWS.PLAYERS,
      label: 'Player Stats',
      icon: Users,
      description: 'Individual player statistics'
    },
    {
      id: STATISTICS_VIEWS.MATCHES,
      label: 'Match History',
      icon: Calendar,
      description: 'All matches played'
    }
  ];

  const renderView = () => {
    switch (currentView) {
      case STATISTICS_VIEWS.OVERVIEW:
        return <TeamOverview dateRange={dateRange} />;
      case STATISTICS_VIEWS.PLAYERS:
        return <PlayerStatistics dateRange={dateRange} />;
      case STATISTICS_VIEWS.MATCHES:
        return <MatchList onMatchClick={handleMatchClick} dateRange={dateRange} />;
      case STATISTICS_VIEWS.MATCH_DETAILS:
        return <MatchDetails matchId={selectedMatchId} onBack={handleBackToMatches} />;
      default:
        return <TeamOverview dateRange={dateRange} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            onClick={onNavigateBack}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
          >
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-sky-400">Statistics</h1>
            <p className="text-slate-400 text-sm">Team performance analysis</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            className="bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded-md text-sm"
            onChange={(e) => {
              const value = e.target.value;
              const now = new Date();
              let start = null;

              switch (value) {
                case 'month':
                  start = new Date(now.getFullYear(), now.getMonth(), 1);
                  break;
                case 'season':
                  start = new Date(now.getFullYear(), 7, 1); // August 1st
                  break;
                case 'year':
                  start = new Date(now.getFullYear(), 0, 1);
                  break;
                default:
                  start = null;
              }

              setDateRange({ start, end: now });
            }}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="season">This Season</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      {currentView !== STATISTICS_VIEWS.MATCH_DETAILS && (
        <div className="grid grid-cols-3 gap-2">
          {navigationButtons.map((button) => {
            const Icon = button.icon;
            const isActive = currentView === button.id;

            return (
              <button
                key={button.id}
                onClick={() => setCurrentView(button.id)}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  isActive
                    ? 'bg-sky-900/30 border-sky-500 text-sky-200'
                    : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium text-sm">{button.label}</div>
                    <div className="text-xs opacity-75">{button.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-slate-800 rounded-lg p-6">
        {renderView()}
      </div>
    </div>
  );
}