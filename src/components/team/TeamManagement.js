import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Settings, 
  UserPlus, 
  Shield, 
  Clock, 
  Target,
  Trophy,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import { Button, Select, Input } from '../shared/UI';
import { TeamSelector } from './TeamSelector';
import { TeamCreationWizard } from './TeamCreationWizard';
import { TeamAccessRequestModal } from './TeamAccessRequestModal';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { VIEWS } from '../../constants/viewConstants';

const TAB_VIEWS = {
  OVERVIEW: 'overview',
  ACCESS: 'access',
  ROSTER: 'roster',
  PREFERENCES: 'preferences'
};

export function TeamManagement({ setView }) {
  const { user } = useAuth();
  const { 
    hasTeams, 
    hasClubs, 
    currentTeam, 
    isTeamAdmin, 
    canManageTeam,
    pendingRequestsCount,
    loading: teamLoading,
    getTeamAccessRequests,
    getTeamMembers
  } = useTeam();
  
  const [activeTab, setActiveTab] = useState(TAB_VIEWS.OVERVIEW);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Load team data when current team changes
  const loadTeamData = useCallback(async () => {
    if (!currentTeam) return;
    
    if (isTeamAdmin) {
      const requests = await getTeamAccessRequests(currentTeam.id);
      setPendingRequests(requests);
    }
    
    const members = await getTeamMembers(currentTeam.id);
    setTeamMembers(members);
  }, [currentTeam, isTeamAdmin, getTeamAccessRequests, getTeamMembers]);

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  // Clear success messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleCreateTeam = () => {
    setShowCreateWizard(true);
  };

  const handleWizardComplete = () => {
    setShowCreateWizard(false);
    setSuccessMessage('Team created successfully!');
    loadTeamData();
  };

  const handleWizardCancel = () => {
    setShowCreateWizard(false);
  };

  const handleAccessModalSuccess = () => {
    setShowAccessModal(false);
    setSuccessMessage('Access request processed successfully!');
    loadTeamData();
  };

  // Show loading state
  if (teamLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Team Management</h1>
          <Button
            onClick={() => setView(VIEWS.CONFIG)}
            variant="secondary"
            size="sm"
          >
            Back
          </Button>
        </div>
        <div className="p-6 bg-slate-700 rounded-lg border border-slate-600">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full"></div>
            <span className="text-slate-300">Loading team information...</span>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, don't show team management
  if (!user) {
    return null;
  }

  // Show create team wizard if needed
  if (showCreateWizard || (!hasClubs || (hasClubs && !hasTeams))) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Team Setup</h1>
          <Button
            onClick={() => setView(VIEWS.CONFIG)}
            variant="secondary"
            size="sm"
          >
            Back
          </Button>
        </div>
        
        <TeamCreationWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </div>
    );
  }

  // Show team selector if no current team
  if (!currentTeam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Team Management</h1>
          <Button
            onClick={() => setView(VIEWS.CONFIG)}
            variant="secondary"
            size="sm"
          >
            Back
          </Button>
        </div>
        
        <TeamSelector onCreateNew={handleCreateTeam} />
      </div>
    );
  }

  // Main team management view
  const tabs = [
    { 
      id: TAB_VIEWS.OVERVIEW, 
      label: 'Overview', 
      icon: Users,
      description: 'Team information and members'
    },
    ...(isTeamAdmin ? [{ 
      id: TAB_VIEWS.ACCESS, 
      label: 'Access Management', 
      icon: Shield,
      description: 'Approve requests and invite users',
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
    }] : []),
    ...(canManageTeam ? [{ 
      id: TAB_VIEWS.ROSTER, 
      label: 'Roster', 
      icon: UserPlus,
      description: 'Manage team players'
    }] : []),
    ...(canManageTeam ? [{ 
      id: TAB_VIEWS.PREFERENCES, 
      label: 'Preferences', 
      icon: Settings,
      description: 'Team settings and preferences'
    }] : [])
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case TAB_VIEWS.OVERVIEW:
        return <TeamOverview team={currentTeam} members={teamMembers} />;
      case TAB_VIEWS.ACCESS:
        return <AccessManagement 
          team={currentTeam} 
          pendingRequests={pendingRequests}
          onRefresh={loadTeamData}
          onShowModal={() => setShowAccessModal(true)}
        />;
      case TAB_VIEWS.ROSTER:
        return <RosterManagement team={currentTeam} onRefresh={loadTeamData} />;
      case TAB_VIEWS.PREFERENCES:
        return <TeamPreferences team={currentTeam} onRefresh={loadTeamData} />;
      default:
        return <TeamOverview team={currentTeam} members={teamMembers} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-sky-300">Team Management</h1>
        <Button
          onClick={() => setView(VIEWS.CONFIG)}
          variant="secondary"
          size="sm"
        >
          Back
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Team Header */}
      <div className="bg-slate-700 rounded-lg border border-slate-600 overflow-hidden">
        <div className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-sky-800 rounded-full flex items-center justify-center border-2 border-sky-400">
              <Users className="w-6 h-6 text-sky-100" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-white">
                {currentTeam.name}
              </h2>
              <p className="text-sky-200 opacity-90">
                {currentTeam.club?.name || 'No club'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sky-200 text-sm">
                {isTeamAdmin ? 'Team Admin' : canManageTeam ? 'Coach' : 'Team User'}
              </div>
              <div className="text-sky-300 text-xs">
                {teamMembers.length} user{teamMembers.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-600">
          <nav className="flex space-x-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                    activeTab === tab.id
                      ? 'border-sky-400 text-sky-300 bg-slate-600/50'
                      : 'border-transparent text-slate-400 hover:text-slate-300 hover:bg-slate-600/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-red-100 text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Access Request Modal */}
      {showAccessModal && (
        <TeamAccessRequestModal
          team={currentTeam}
          onClose={() => setShowAccessModal(false)}
          onSuccess={handleAccessModalSuccess}
          isStandaloneMode={true}
        />
      )}
    </div>
  );
}

// Team Overview Component
function TeamOverview({ team, members }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Team Name
            </label>
            <span className="text-slate-100 text-sm font-medium">{team.name}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Club
            </label>
            <div className="space-y-1">
              {team.club?.long_name && (
                <div className="text-slate-100 text-sm">
                  <span className="font-medium">{team.club.long_name}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Team Created
            </label>
            <span className="text-slate-100 text-sm font-medium">
              {team.created_at ? new Date(team.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
              }) : 'Unknown'}
            </span>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div>
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Team Users</h3>
        <div className="space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-lg">
              <div>
                <span className="text-slate-100 font-medium">
                  {member.user?.name || member.user?.email?.split('@')[0] || 'Unknown User'}
                </span>
                {member.user?.email && (
                  <span className="text-slate-400 text-sm ml-2">
                    ({member.user.email})
                  </span>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                member.role === 'admin' 
                  ? 'bg-emerald-600 text-emerald-100'
                  : member.role === 'coach'
                  ? 'bg-sky-600 text-sky-100'
                  : member.role === 'player'
                  ? 'bg-purple-600 text-purple-100'
                  : member.role === 'parent'
                  ? 'bg-orange-600 text-orange-100'
                  : 'bg-slate-600 text-slate-100'
              }`}>
                {member.role}
              </span>
            </div>
          ))}
          {members.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              No team users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Access Management Component
function AccessManagement({ team, pendingRequests, onRefresh, onShowModal }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Access Management</h3>
        <Button
          onClick={onShowModal}
          variant="primary"
          size="sm"
        >
          Manage Access
        </Button>
      </div>

      {/* Pending Requests Summary */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-sky-400" />
          <div>
            <p className="text-slate-200 font-medium">
              {pendingRequests.length} pending access request{pendingRequests.length !== 1 ? 's' : ''}
            </p>
            <p className="text-slate-400 text-sm">
              {pendingRequests.length > 0 
                ? 'Review and approve new team member requests'
                : 'No pending requests at this time'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center space-x-3 mb-3">
            <UserPlus className="w-5 h-5 text-green-400" />
            <h4 className="text-slate-200 font-medium">Invite Users</h4>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Send invitations to new team members
          </p>
          <Button variant="secondary" size="sm" className="w-full">
            Send Invitations
          </Button>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center space-x-3 mb-3">
            <UserCheck className="w-5 h-5 text-blue-400" />
            <h4 className="text-slate-200 font-medium">Member Roles</h4>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Manage team member permissions
          </p>
          <Button variant="secondary" size="sm" className="w-full">
            Manage Roles
          </Button>
        </div>
      </div>
    </div>
  );
}

// Roster Management Component
function RosterManagement({ team, onRefresh }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Roster Management</h3>
        <Button variant="primary" size="sm">
          Add Player
        </Button>
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
        <div className="text-center py-8 text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium mb-2">Roster Management</p>
          <p className="text-sm">
            Player roster management features coming soon!
          </p>
        </div>
      </div>
    </div>
  );
}

// Team Preferences Component
function TeamPreferences({ team, onRefresh }) {
  const [preferences, setPreferences] = useState({
    matchFormat: '5v5',
    formation: '2-2',
    periodLength: 20,
    numPeriods: 2,
    substitutionMode: 'individual',
    substitutionLogic: 'equal_time',
    trackGoalScorer: true,
    teamCaptain: 'none',
    fairPlayAward: false
  });

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving preferences:', preferences);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Team Preferences</h3>
        <Button onClick={handleSave} variant="primary" size="sm">
          Save Changes
        </Button>
      </div>

      {/* Match Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-slate-300 flex items-center">
          <Target className="w-4 h-4 mr-2" />
          Match Settings
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Match Format
            </label>
            <Select
              value={preferences.matchFormat}
              onChange={(value) => setPreferences(prev => ({ ...prev, matchFormat: value }))}
              options={[
                { value: '5v5', label: '5v5 (Current)' },
                { value: '7v7', label: '7v7 (Coming Soon)' },
                { value: '9v9', label: '9v9 (Coming Soon)' },
                { value: '11v11', label: '11v11 (Coming Soon)' }
              ]}
              disabled={preferences.matchFormat !== '5v5'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Formation
            </label>
            <Select
              value={preferences.formation}
              onChange={(value) => setPreferences(prev => ({ ...prev, formation: value }))}
              options={[
                { value: '2-2', label: '2-2 (Balanced)' },
                { value: '1-2-1', label: '1-2-1 (Diamond)' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Time Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-slate-300 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Time Settings
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Period Length (minutes)
            </label>
            <Input
              type="number"
              min="5"
              max="45"
              value={preferences.periodLength}
              onChange={(e) => setPreferences(prev => ({ ...prev, periodLength: parseInt(e.target.value) }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Number of Periods
            </label>
            <Select
              value={preferences.numPeriods.toString()}
              onChange={(value) => setPreferences(prev => ({ ...prev, numPeriods: parseInt(value) }))}
              options={[
                { value: '1', label: '1 Period' },
                { value: '2', label: '2 Periods' },
                { value: '3', label: '3 Periods' },
                { value: '4', label: '4 Periods' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Substitution Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-slate-300 flex items-center">
          <UserCheck className="w-4 h-4 mr-2" />
          Substitution Settings
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Substitution Mode
            </label>
            <Select
              value={preferences.substitutionMode}
              onChange={(value) => setPreferences(prev => ({ ...prev, substitutionMode: value }))}
              options={[
                { value: 'individual', label: 'Individual' },
                { value: 'pairs', label: 'Pairs' },
                { value: 'all', label: 'All Players' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Substitution Logic
            </label>
            <Select
              value={preferences.substitutionLogic}
              onChange={(value) => setPreferences(prev => ({ ...prev, substitutionLogic: value }))}
              options={[
                { value: 'equal_time', label: 'Equal Time in Each Role' },
                { value: 'same_role', label: 'Keep Same Role' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Game Features */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-slate-300 flex items-center">
          <Trophy className="w-4 h-4 mr-2" />
          Game Features
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.trackGoalScorer}
              onChange={(e) => setPreferences(prev => ({ ...prev, trackGoalScorer: e.target.checked }))}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
              preferences.trackGoalScorer 
                ? 'bg-sky-600 border-sky-600' 
                : 'border-slate-400'
            }`}>
              {preferences.trackGoalScorer && (
                <CheckCircle className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-slate-300">Track Goal Scorers</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.fairPlayAward}
              onChange={(e) => setPreferences(prev => ({ ...prev, fairPlayAward: e.target.checked }))}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
              preferences.fairPlayAward 
                ? 'bg-sky-600 border-sky-600' 
                : 'border-slate-400'
            }`}>
              {preferences.fairPlayAward && (
                <CheckCircle className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-slate-300">Fair Play Award (Coming Soon)</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Team Captain
          </label>
          <Select
            value={preferences.teamCaptain}
            onChange={(value) => setPreferences(prev => ({ ...prev, teamCaptain: value }))}
            options={[
              { value: 'none', label: 'No Team Captain' },
              { value: 'permanent', label: 'Permanent Team Captain' },
              { value: 'assign_each_match', label: 'Assign Each Match' }
            ]}
          />
        </div>
      </div>
    </div>
  );
}