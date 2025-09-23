import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { ArrowLeft, BarChart3, Users, History } from 'lucide-react';
import { TeamStatsView } from './TeamStatsView';
import { PlayerStatsView } from './PlayerStatsView';
import { MatchHistoryView } from './MatchHistoryView';

const TABS = {
  TEAM: 'team',
  PLAYERS: 'players',
  MATCHES: 'matches'
};

export function StatisticsScreen({
  onNavigateBack,
  onNavigateToMatchDetails,
  isAdminUser = false
}) {
  const [activeTab, setActiveTab] = useState(TABS.TEAM);

  const renderContent = () => {
    switch (activeTab) {
      case TABS.TEAM:
        return <TeamStatsView />;
      case TABS.PLAYERS:
        return <PlayerStatsView />;
      case TABS.MATCHES:
        return <MatchHistoryView onNavigateToMatchDetails={onNavigateToMatchDetails} isAdminUser={isAdminUser} />;
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
            size="sm"
            Icon={ArrowLeft}
          >
            Back
          </Button>
          <h2 className="text-2xl font-bold text-sky-300">Statistics</h2>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-slate-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab(TABS.TEAM)}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === TABS.TEAM
              ? 'bg-slate-600 text-sky-300'
              : 'text-slate-300 hover:text-sky-300'
          }`}
        >
          <BarChart3 size={16} />
          <span>Team Stats</span>
        </button>
        <button
          onClick={() => setActiveTab(TABS.PLAYERS)}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === TABS.PLAYERS
              ? 'bg-slate-600 text-sky-300'
              : 'text-slate-300 hover:text-sky-300'
          }`}
        >
          <Users size={16} />
          <span>Player Stats</span>
        </button>
        <button
          onClick={() => setActiveTab(TABS.MATCHES)}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === TABS.MATCHES
              ? 'bg-slate-600 text-sky-300'
              : 'text-slate-300 hover:text-sky-300'
          }`}
        >
          <History size={16} />
          <span>Match History</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-slate-700 rounded-lg p-6">
        {renderContent()}
      </div>
    </div>
  );
}