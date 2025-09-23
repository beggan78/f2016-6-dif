import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Users, Trophy, Calendar, Edit3 } from 'lucide-react';
import { TeamStatistics } from './TeamStatistics';
import { PlayerStatistics } from './PlayerStatistics';
import { MatchesList } from './MatchesList';
import { MatchDetails } from './MatchDetails';
import { useTeam } from '../../contexts/TeamContext';

export function StatisticsScreen({ onNavigateBack }) {
  const [activeTab, setActiveTab] = useState('team');
  const [selectedMatch, setSelectedMatch] = useState(null);
  const { canManageTeam } = useTeam();

  const handleMatchSelect = (match) => {
    setSelectedMatch(match);
    setActiveTab('match-details');
  };

  const handleBackToMatches = () => {
    setSelectedMatch(null);
    setActiveTab('matches');
  };

  const tabs = [
    { id: 'team', label: 'Team Stats', icon: BarChart3 },
    { id: 'players', label: 'Player Stats', icon: Users },
    { id: 'matches', label: 'Match History', icon: Calendar }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'team':
        return <TeamStatistics />;
      case 'players':
        return <PlayerStatistics />;
      case 'matches':
        return <MatchesList onMatchSelect={handleMatchSelect} />;
      case 'match-details':
        return (
          <MatchDetails
            match={selectedMatch}
            onNavigateBack={handleBackToMatches}
            canEdit={canManageTeam}
          />
        );
      default:
        return <TeamStatistics />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onNavigateBack}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-sky-400" />
                <h1 className="text-2xl font-bold text-slate-100">Statistics</h1>
              </div>
            </div>
            {canManageTeam && activeTab === 'match-details' && (
              <div className="flex items-center space-x-2 text-sm text-slate-400">
                <Edit3 className="w-4 h-4" />
                <span>Edit Mode Available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      {activeTab !== 'match-details' && (
        <div className="bg-slate-800 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-sky-400 text-sky-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
    </div>
  );
}