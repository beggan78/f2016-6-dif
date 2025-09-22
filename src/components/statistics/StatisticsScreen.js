import React, { useState } from 'react';
import { StatisticsDashboard } from './StatisticsDashboard';
import { MatchList } from './MatchList';
import { PlayerStatisticsTable } from './PlayerStatisticsTable';
import { MatchDetailView } from './MatchDetailView';
// import { useAuth } from '../../contexts/AuthContext'; // Available for future features
import { useTeam } from '../../contexts/TeamContext';

/**
 * StatisticsScreen - Main statistics view orchestrator
 * Handles navigation between different statistics views and manages state
 */
export function StatisticsScreen({ onNavigateBack }) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  // const { user } = useAuth(); // Not used currently but available for future features
  const { canManageTeam } = useTeam();

  // Admin status - users who can manage teams can edit match data
  const isAdmin = canManageTeam;

  const handleNavigateToMatches = () => {
    setCurrentView('matches');
  };

  const handleNavigateToPlayers = () => {
    setCurrentView('players');
  };

  const handleNavigateToMatchDetail = (matchId) => {
    setSelectedMatchId(matchId);
    setCurrentView('matchDetail');
  };

  const handleNavigateBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedMatchId(null);
  };

  const handleNavigateBackToMatches = () => {
    setCurrentView('matches');
    setSelectedMatchId(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <StatisticsDashboard
            onNavigateToMatches={handleNavigateToMatches}
            onNavigateToPlayers={handleNavigateToPlayers}
            onNavigateToMatchDetail={handleNavigateToMatchDetail}
          />
        );

      case 'matches':
        return (
          <MatchList
            onNavigateBack={handleNavigateBackToDashboard}
            onNavigateToMatchDetail={handleNavigateToMatchDetail}
          />
        );

      case 'players':
        return (
          <PlayerStatisticsTable
            onNavigateBack={handleNavigateBackToDashboard}
          />
        );

      case 'matchDetail':
        return (
          <MatchDetailView
            matchId={selectedMatchId}
            onNavigateBack={handleNavigateBackToMatches}
            isAdmin={isAdmin}
          />
        );

      default:
        return (
          <StatisticsDashboard
            onNavigateToMatches={handleNavigateToMatches}
            onNavigateToPlayers={handleNavigateToPlayers}
            onNavigateToMatchDetail={handleNavigateToMatchDetail}
          />
        );
    }
  };

  return (
    <div className="w-full">
      {currentView === 'dashboard' && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onNavigateBack}
              className="text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-2"
            >
              <span>←</span> Back to Main Menu
            </button>
            {isAdmin && (
              <div className="text-xs text-slate-500">
                Admin Mode: You can edit match details and player statistics
              </div>
            )}
          </div>
        </div>
      )}

      {renderCurrentView()}
    </div>
  );
}