import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Users, History } from 'lucide-react';
import { Button } from '../shared/UI';
import { TeamStatsView } from './TeamStatsView';
import { PlayerStatsView } from './PlayerStatsView';
import { MatchHistoryView } from './MatchHistoryView';
import { MatchDetailsView } from './MatchDetailsView';

const TABS = {
  TEAM_STATS: 'teamStats',
  PLAYER_STATS: 'playerStats',
  MATCH_HISTORY: 'matchHistory'
};

export function StatisticsScreen({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState(TABS.TEAM_STATS);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
  };

  const handleBackToHistory = () => {
    setSelectedMatch(null);
  };

  const renderTabButton = (tabKey, IconComponent, label) => (
    <button
      key={tabKey}
      onClick={() => setActiveTab(tabKey)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        activeTab === tabKey
          ? 'bg-sky-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white'
      }`}
    >
      <IconComponent className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  const renderContent = () => {
    if (selectedMatch) {
      return (
        <MatchDetailsView
          match={selectedMatch}
          onBack={handleBackToHistory}
        />
      );
    }

    switch (activeTab) {
      case TABS.TEAM_STATS:
        return <TeamStatsView />;
      case TABS.PLAYER_STATS:
        return <PlayerStatsView />;
      case TABS.MATCH_HISTORY:
        return <MatchHistoryView onMatchSelect={handleMatchSelect} />;
      default:
        return <TeamStatsView />;
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
            Icon={ArrowLeft}
            size="sm"
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-sky-400">Statistics</h1>
        </div>
      </div>

      {/* Tab Navigation */}
      {!selectedMatch && (
        <div className="flex space-x-2 bg-slate-800 p-1 rounded-lg">
          {renderTabButton(TABS.TEAM_STATS, BarChart3, 'Team Stats')}
          {renderTabButton(TABS.PLAYER_STATS, Users, 'Player Stats')}
          {renderTabButton(TABS.MATCH_HISTORY, History, 'Match History')}
        </div>
      )}

      {/* Content */}
      <div className="bg-slate-700 rounded-lg p-6">
        {renderContent()}
      </div>
    </div>
  );
}