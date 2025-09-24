import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Users, History } from 'lucide-react';
import { Button } from '../shared/UI';
import { TeamStatsView } from './TeamStatsView';
import { PlayerStatsView } from './PlayerStatsView';
import { MatchHistoryView } from './MatchHistoryView';
import { MatchDetailsView } from './MatchDetailsView';

const STATS_TABS = {
  TEAM: 'team',
  PLAYER: 'player',
  HISTORY: 'history'
};

export function StatisticsScreen({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState(STATS_TABS.TEAM);
  const [selectedMatchId, setSelectedMatchId] = useState(null);

  const handleMatchSelect = (matchId) => {
    setSelectedMatchId(matchId);
  };

  const handleBackToHistory = () => {
    setSelectedMatchId(null);
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
      label: 'Player Stats',
      icon: Users,
      description: 'Individual player statistics'
    },
    {
      id: STATS_TABS.HISTORY,
      label: 'Match History',
      icon: History,
      description: 'Complete match history'
    }
  ];

  const renderActiveView = () => {
    if (selectedMatchId) {
      return (
        <MatchDetailsView
          matchId={selectedMatchId}
          onNavigateBack={handleBackToHistory}
        />
      );
    }

    switch (activeTab) {
      case STATS_TABS.TEAM:
        return <TeamStatsView />;
      case STATS_TABS.PLAYER:
        return <PlayerStatsView />;
      case STATS_TABS.HISTORY:
        return <MatchHistoryView onMatchSelect={handleMatchSelect} />;
      default:
        return <TeamStatsView />;
    }
  };

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
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
            <h2 className="text-2xl font-bold text-sky-400">
              {selectedMatchId ? 'Match Details' : 'Statistics'}
            </h2>
            {!selectedMatchId && currentTab && (
              <p className="text-slate-400 text-sm">{currentTab.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation - only show when not viewing match details */}
      {!selectedMatchId && (
        <div className="border-b border-slate-600">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-sky-500 text-sky-300'
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