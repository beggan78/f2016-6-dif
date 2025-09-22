import React, { useState } from 'react';
import { StatisticsOverviewScreen } from './StatisticsOverviewScreen';
import { MatchDetailsScreen } from './MatchDetailsScreen';
import { PlayerStatsScreen } from './PlayerStatsScreen';

const STATS_VIEWS = {
  OVERVIEW: 'overview',
  MATCH_DETAILS: 'match_details', 
  PLAYER_STATS: 'player_stats'
};

export function StatisticsScreen({ onNavigateBack }) {
  const [currentView, setCurrentView] = useState(STATS_VIEWS.OVERVIEW);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Navigation handlers
  const handleNavigateToMatch = (matchId) => {
    setSelectedMatchId(matchId);
    setCurrentView(STATS_VIEWS.MATCH_DETAILS);
  };

  const handleNavigateToPlayer = (playerId) => {
    setSelectedPlayerId(playerId);
    setCurrentView(STATS_VIEWS.PLAYER_STATS);
  };

  const handleBackToOverview = () => {
    setCurrentView(STATS_VIEWS.OVERVIEW);
    setSelectedMatchId(null);
    setSelectedPlayerId(null);
  };

  // Render current view
  const renderCurrentView = () => {
    switch (currentView) {
      case STATS_VIEWS.MATCH_DETAILS:
        return (
          <MatchDetailsScreen
            matchId={selectedMatchId}
            onNavigateBack={handleBackToOverview}
            canEdit={true}
          />
        );
      case STATS_VIEWS.PLAYER_STATS:
        return (
          <PlayerStatsScreen
            playerId={selectedPlayerId}
            onNavigateBack={handleBackToOverview}
            onNavigateToPlayer={handleNavigateToPlayer}
          />
        );
      case STATS_VIEWS.OVERVIEW:
      default:
        return (
          <StatisticsOverviewScreen
            onNavigateToMatch={handleNavigateToMatch}
            onNavigateToPlayer={handleNavigateToPlayer}
            onNavigateBack={onNavigateBack}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {renderCurrentView()}
    </div>
  );
}