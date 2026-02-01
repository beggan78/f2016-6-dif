import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Users,
  Settings,
  UserPlus,
  Shield,
  Clock,
  Target,
  UserCheck,
  Trophy,
  CheckCircle,
  Edit3,
  Trash2,
  Hash,
  Eye,
  EyeOff,
  Rows4,
  Link,
  Unlink,
  Ghost,
  Loader,
  X,
  HelpCircle,
  Repeat,
  BarChart3
} from 'lucide-react';
import { Button, Select } from '../shared/UI';
import { Tooltip } from '../shared';
import { TeamSelector } from './TeamSelector';
import { TeamCreationWizard } from './TeamCreationWizard';
import { TeamAccessRequestModal } from './TeamAccessRequestModal';
import { TeamInviteModal } from './TeamInviteModal';
import { TeamRoleManagementModal } from './TeamRoleManagementModal';
import { AddRosterPlayerModal } from './AddRosterPlayerModal';
import { EditPlayerModal } from './EditPlayerModal';
import { DeletePlayerConfirmModal } from './DeletePlayerConfirmModal';
import { PlayerMatchingModal } from './PlayerMatchingModal';
import { PlayerLoanModal } from './PlayerLoanModal';
import PlayerLoansView from './PlayerLoansView';
import { RosterConnectorOnboarding } from './RosterConnectorOnboarding';
import { ConnectorsSection } from '../connectors/ConnectorsSection';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBrowserBackIntercept } from '../../hooks/useBrowserBackIntercept';
import { getPlayerConnectionDetails, acceptGhostPlayer, dismissGhostPlayer } from '../../services/connectorService';
import { recordPlayerLoans } from '../../services/playerLoanService';
import { formatPlayerDisplayName, shouldShowRosterConnectorOnboarding } from '../../utils/playerUtils';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { DEFAULT_PREFERENCES } from '../../types/preferences';
import { TAB_VIEWS } from '../../constants/teamManagementTabs';
import {
  FORMATS,
  FORMATION_DEFINITIONS,
  FORMAT_CONFIGS,
  getValidFormations
} from '../../constants/teamConfiguration';

export function TeamManagement({ onNavigateBack, openToTab, openAddRosterPlayerModal, onShowSuccessMessage }) {
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
  
  const { pushNavigationState, removeFromNavigationStack } = useBrowserBackIntercept();

  // Create persistence manager for tab state
  const tabPersistence = useMemo(
    () => createPersistenceManager(STORAGE_KEYS.TEAM_MANAGEMENT_ACTIVE_TAB, { tab: TAB_VIEWS.OVERVIEW }),
    []
  );

  // Track if this is the initial mount to prevent overriding persisted tab on page refresh
  const isInitialMount = useRef(true);

  // Initialize activeTab from openToTab prop or localStorage
  const [activeTab, setActiveTab] = useState(() => {
    // openToTab prop takes precedence over stored value
    if (openToTab && Object.values(TAB_VIEWS).includes(openToTab)) {
      return openToTab;
    }
    const stored = tabPersistence.loadState();
    return stored.tab && Object.values(TAB_VIEWS).includes(stored.tab)
      ? stored.tab
      : TAB_VIEWS.OVERVIEW;
  });
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');


  // Main team management view - define tabs early to avoid hooks order issues
  const tabs = React.useMemo(() => {
    const orderedTabs = [
      { 
        id: TAB_VIEWS.OVERVIEW, 
        label: 'Overview', 
        icon: Users,
        description: 'Team information and members'
      },
      canManageTeam ? { 
        id: TAB_VIEWS.ROSTER, 
        label: 'Roster', 
        icon: Rows4,
        description: 'Manage team players'
      } : null,
      canManageTeam ? {
        id: TAB_VIEWS.LOANS,
        label: 'Loans',
        icon: Repeat,
        description: 'Track player loan matches'
      } : null,
      isTeamAdmin ? {
        id: TAB_VIEWS.ACCESS,
        label: 'Access Management',
        icon: Shield,
        description: 'Approve requests and invite users',
        badge: pendingRequestsCount > 0 ? pendingRequestsCount : null
      } : null,
      isTeamAdmin ? {
        id: TAB_VIEWS.CONNECTORS,
        label: 'Connectors',
        icon: Link,
        description: 'Manage external provider integrations'
      } : null,
      canManageTeam ? {
        id: TAB_VIEWS.PREFERENCES,
        label: 'Preferences',
        icon: Settings,
        description: 'Team settings and preferences'
      } : null
    ];

    return orderedTabs.filter(Boolean);
  }, [isTeamAdmin, canManageTeam, pendingRequestsCount]);

  // Ensure activeTab always matches an available tab
  // Skip on initial mount to preserve persisted tab selection from localStorage
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (tabs.length > 0) {
      const activeTabExists = tabs.some(tab => tab.id === activeTab);

      if (!activeTabExists) {
        const fallbackTab = tabs[0].id;
        setActiveTab(fallbackTab);
      }
    }
  }, [activeTab, tabs]);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    tabPersistence.saveState({ tab: activeTab });
  }, [activeTab, tabPersistence]);

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

  const handleShowRoleModal = () => {
    setShowRoleModal(true);
    // Add modal to browser back button handling
    pushNavigationState(() => {
      setShowRoleModal(false);
    });
  };

  const handleRoleModalClose = () => {
    setShowRoleModal(false);
    removeFromNavigationStack();
  };

  const handleRoleModalRefresh = async () => {
    await loadTeamData();
  };

  // Show loading state
  if (teamLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-sky-300">Team Management</h1>
          <Button
            onClick={onNavigateBack}
            variant="secondary"
            size="sm"
          >
            Back
          </Button>
        </div>
        <div className="p-2 bg-slate-700 rounded-lg border border-slate-600">
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
            onClick={onNavigateBack}
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
            onClick={onNavigateBack}
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
          onShowInviteModal={() => setShowInviteModal(true)}
          onShowRoleModal={handleShowRoleModal}
        />;
      case TAB_VIEWS.ROSTER:
        return (
          <RosterManagement
            team={currentTeam}
            onRefresh={loadTeamData}
            onNavigateToConnectors={() => setActiveTab('connectors')}
            activeTab={activeTab}
            openAddPlayerModal={openAddRosterPlayerModal}
          />
        );
      case TAB_VIEWS.LOANS:
        return (
          <PlayerLoansView
            currentTeam={currentTeam}
            canManageTeam={canManageTeam}
          />
        );
      case TAB_VIEWS.CONNECTORS:
        return <TeamConnectors team={currentTeam} onRefresh={loadTeamData} />;
      case TAB_VIEWS.PREFERENCES:
        return (
          <TeamPreferences
            team={currentTeam}
            onRefresh={loadTeamData}
            onShowFloatingSuccess={onShowSuccessMessage}
          />
        );
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
          onClick={onNavigateBack}
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
                {currentTeam.club?.long_name || 'No club'}
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
          <div className="overflow-x-auto">
            <nav className="flex space-x-0 min-w-max">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-2 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors relative flex-shrink-0 whitespace-nowrap ${
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
        </div>

        {/* Tab Content */}
        <div className="p-2">
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

      {/* Team Invite Modal */}
      {showInviteModal && (
        <TeamInviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          team={currentTeam}
        />
      )}

      {/* Team Role Management Modal */}
      {showRoleModal && (
        <TeamRoleManagementModal
          isOpen={showRoleModal}
          onClose={handleRoleModalClose}
          team={currentTeam}
          members={teamMembers}
          onRefresh={handleRoleModalRefresh}
          currentUserRole={currentTeam?.userRole || 'member'}
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
          {members.sort((a, b) => {
            const nameA = a.user?.name || a.user?.email?.split('@')[0] || 'Unknown User';
            const nameB = b.user?.name || b.user?.email?.split('@')[0] || 'Unknown User';
            return nameA.localeCompare(nameB);
          }).map((member) => (
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

// Exported for testing
export { TeamPreferences };

// Access Management Component
function AccessManagement({ team, pendingRequests, onRefresh, onShowModal, onShowInviteModal, onShowRoleModal }) {
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
        <div className="flex items-center space-x-3 mb-3">
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
        {pendingRequests.length > 0 && (
          <Button
            onClick={onShowModal}
            variant="primary"
            size="sm"
            Icon={Shield}
          >
            Review Requests
          </Button>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center space-x-3 mb-3">
            <UserPlus className="w-5 h-5 text-sky-400" />
            <h4 className="text-slate-200 font-medium">Invite Users</h4>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Send invitations to new team members
          </p>
          <Button 
            variant="primary" 
            size="sm"
            onClick={onShowInviteModal}
            Icon={UserPlus}
          >
            Invitations
          </Button>
        </div>

        <div className="bg-slate-800 rounded-lg p-4 border border-slate-600">
          <div className="flex items-center space-x-3 mb-3">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <h4 className="text-slate-200 font-medium">Member Roles</h4>
          </div>
          <p className="text-slate-400 text-sm mb-3">
            Manage team member permissions
          </p>
          <Button 
            variant="primary" 
            size="sm"
            onClick={onShowRoleModal}
            Icon={UserCheck}
          >
            Manage Roles
          </Button>
        </div>
      </div>
    </div>
  );
}

// Roster Management Component
function RosterManagement({ team, onRefresh, onNavigateToConnectors, activeTab, openAddPlayerModal }) {
  const { 
    getTeamRoster, 
    addRosterPlayer, 
    updateRosterPlayer, 
    removeRosterPlayer, 
    refreshTeamPlayers,
    checkPlayerGameHistory,
    getAvailableJerseyNumbers 
  } = useTeam();
  
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deletingPlayer, setDeletingPlayer] = useState(null);
  const [deletingPlayerHasGameHistory, setDeletingPlayerHasGameHistory] = useState(false);
  const [matchingPlayer, setMatchingPlayer] = useState(null); // For player matching modal
  const [loanModalPlayer, setLoanModalPlayer] = useState(null);
  const [loanModalOpen, setLoanModalOpen] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState({
    matchedConnections: new Map(),
    unmatchedExternalPlayers: [],
    hasConnectedProvider: false
  });
  const [acceptingGhostPlayerId, setAcceptingGhostPlayerId] = useState(null);
  const [dismissingGhostPlayerId, setDismissingGhostPlayerId] = useState(null);
  const hasOpenedAddModalRef = useRef(false);

  // Load roster data
  const loadRoster = useCallback(async () => {
    if (!team?.id) return;

    try {
      setLoading(true);
      setError(null);
      const rosterData = await getTeamRoster(team.id);
      setRoster(rosterData || []);
    } catch (err) {
      console.error('Error loading roster:', err);
      setError(err.message || 'Failed to load team roster');
    } finally {
      setLoading(false);
    }
  }, [team?.id, getTeamRoster]);

  // Load player connection details
  const loadPlayerConnections = useCallback(async () => {
    if (!team?.id) return;

    try {
      const details = await getPlayerConnectionDetails(team.id, showInactive);
      setConnectionDetails(details);
    } catch (err) {
      console.error('Error loading player connections:', err);
      // Non-critical error - just log it, don't show to user
    }
  }, [team?.id, showInactive]);

  // Load roster on component mount and team change
  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Load player connections on component mount and team change
  useEffect(() => {
    loadPlayerConnections();
  }, [loadPlayerConnections]);

  // Reload connection details when switching to Roster tab
  // This ensures banner visibility reflects recent connector changes
  useEffect(() => {
    if (activeTab === TAB_VIEWS.ROSTER) {
      loadPlayerConnections();
    }
  }, [activeTab, loadPlayerConnections]);

  useEffect(() => {
    if (!openAddPlayerModal || hasOpenedAddModalRef.current) {
      return;
    }

    if (activeTab === TAB_VIEWS.ROSTER) {
      setShowAddModal(true);
      hasOpenedAddModalRef.current = true;
    }
  }, [openAddPlayerModal, activeTab]);

  // Auto-clear success message after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000); // Clear after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filter roster based on visibility settings, then sort by display_name
  // Also append ghost players (unmatched connected_player records) when provider is connected
  const filteredRoster = useMemo(() => {
    // Filter and sort roster players
    const rosterPlayers = roster.filter(player => {
      // Show active players by default, include former players when toggle is enabled
      return player.on_roster || showInactive;
    }).sort((a, b) => {
      const aName = a.display_name || '';
      const bName = b.display_name || '';
      return aName.localeCompare(bName);
    });

    // Only show ghost players if provider is connected
    if (!connectionDetails.hasConnectedProvider) {
      return rosterPlayers;
    }

    // Filter ghost players: only show if connector status is 'connected'
    const ghostPlayers = (connectionDetails.unmatchedExternalPlayers || [])
      .filter(ghost => ghost.connectorStatus === 'connected')
      .map(ghost => ({
        id: `ghost-${ghost.externalPlayerId}`,
        isGhost: true,
        externalPlayerId: ghost.externalPlayerId,
        display_name: ghost.playerNameInProvider,
        playerNameInProvider: ghost.playerNameInProvider,
        providerName: ghost.providerName,
        connectorId: ghost.connectorId,
        // No first_name, last_name, jersey_number, on_roster
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));

    // Roster players first, then ghost players
    return [...rosterPlayers, ...ghostPlayers];
  }, [roster, showInactive, connectionDetails]);

  // Calculate if we should show the connector onboarding banner
  const shouldShowOnboarding = shouldShowRosterConnectorOnboarding(
    roster,
    connectionDetails.hasConnectedProvider
  );

  // Handle player matched successfully
  const handlePlayerMatched = async (matchedAttendance, rosterPlayer) => {
    if (matchedAttendance && rosterPlayer) {
      setConnectionDetails(prev => {
        const updatedMatched = new Map(prev.matchedConnections);
        const existingMatches = updatedMatched.get(rosterPlayer.id) || [];

        // Normalize record so tooltip rendering stays consistent
        const normalizedRecord = {
          attendanceId: matchedAttendance.attendanceId,
          providerName: matchedAttendance.providerName,
          providerId: matchedAttendance.providerId,
          playerNameInProvider: matchedAttendance.playerNameInProvider,
          connectorStatus: matchedAttendance.connectorStatus,
          connectorId: matchedAttendance.connectorId
        };

        updatedMatched.set(rosterPlayer.id, [...existingMatches, normalizedRecord]);

        const updatedUnmatched = prev.unmatchedExternalPlayers.filter(
          record => record.attendanceId !== matchedAttendance.attendanceId
        );

        return {
          ...prev,
          matchedConnections: updatedMatched,
          unmatchedExternalPlayers: updatedUnmatched
        };
      });
    }

    await loadPlayerConnections(); // Reload connection data for consistency
    setSuccessMessage('Player successfully matched to attendance data');
  };

  // Handle accept ghost player (add external player to roster)
  const handleAcceptGhostPlayer = async (ghostPlayer) => {
    let needsTeamRefresh = false;

    try {
      setAcceptingGhostPlayerId(ghostPlayer.externalPlayerId);
      setError(null);

      // Create and match player
      await acceptGhostPlayer(ghostPlayer.externalPlayerId, team.id, addRosterPlayer);

      // Reload roster and connections
      await loadRoster();
      await loadPlayerConnections();

      // Show success message
      setSuccessMessage(`${ghostPlayer.playerNameInProvider} added to roster`);
    } catch (error) {
      console.error('Error accepting ghost player:', error);
      setError(error.message || 'Failed to add player to roster');
      needsTeamRefresh = true;
    } finally {
      setAcceptingGhostPlayerId(null);

      if (needsTeamRefresh) {
        try {
          await refreshTeamPlayers(team.id);
        } catch (refreshError) {
          console.error('Error refreshing team players after ghost accept failure:', refreshError);
        }
      }
    }
  };

  // Handle dismiss ghost player (mark as dismissed so it won't appear)
  const handleDismissGhostPlayer = async (ghostPlayer) => {
    try {
      setDismissingGhostPlayerId(ghostPlayer.externalPlayerId);
      setError(null);

      // Dismiss the ghost player
      await dismissGhostPlayer(ghostPlayer.externalPlayerId);

      // Reload roster and connections to remove the dismissed player from the list
      await loadRoster();
      await loadPlayerConnections();

      // Show success message
      setSuccessMessage(`${ghostPlayer.playerNameInProvider} dismissed`);
    } catch (error) {
      console.error('Error dismissing ghost player:', error);
      setError(error.message || 'Failed to dismiss player');
    } finally {
      setDismissingGhostPlayerId(null);
    }
  };

  // Handle add player
  const handleAddPlayer = () => {
    setShowAddModal(true);
  };

  // Handle player added
  const handlePlayerAdded = async (playerData) => {
    try {
      await addRosterPlayer(team.id, playerData);
      await loadRoster();
      if (onRefresh) onRefresh();
    } catch (error) {
      // Error is handled by the modal component through the addRosterPlayer throw
      console.error('Error in handlePlayerAdded:', error);
    }
  };

  // Handle edit player
  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
  };

  // Handle player updated
  const handlePlayerUpdated = async (playerId, updates) => {
    try {
      await updateRosterPlayer(playerId, updates);
      setEditingPlayer(null);
      await loadRoster();
      if (onRefresh) onRefresh();
    } catch (error) {
      // Error is handled by the modal component through the updateRosterPlayer throw
      console.error('Error in handlePlayerUpdated:', error);
    }
  };

  // Handle delete player
  const handleDeletePlayer = async (player) => {
    setDeletingPlayer(player);
    // Check if player has game history to show appropriate confirmation message
    try {
      const hasGameHistory = await checkPlayerGameHistory(player.id);
      setDeletingPlayerHasGameHistory(hasGameHistory);
    } catch (error) {
      console.error('Error checking player game history:', error);
      setDeletingPlayerHasGameHistory(false);
    }
  };

  // Handle player deleted
  const handlePlayerDeleted = async () => {
    if (!deletingPlayer) return;
    
    try {
      const result = await removeRosterPlayer(deletingPlayer.id);
      setDeletingPlayer(null);
      setDeletingPlayerHasGameHistory(false);
      
      // Show appropriate success message based on operation type
      if (result.operation === 'deactivated') {
        setSuccessMessage(`${deletingPlayer.display_name} has been deactivated but kept in records due to game history.`);
      } else {
        setSuccessMessage(`${deletingPlayer.display_name} has been removed from the roster.`);
      }
      
      await loadRoster();
      if (onRefresh) onRefresh();
    } catch (error) {
      // Error is handled by the component through the removeRosterPlayer throw
      console.error('Error in handlePlayerDeleted:', error);
      setError(error.message || 'Failed to remove player');
    }
  };

  const handleOpenLoanModal = (player) => {
    setLoanModalPlayer(player);
    setLoanModalOpen(true);
  };

  const handleCloseLoanModal = () => {
    setLoanModalOpen(false);
    setLoanModalPlayer(null);
  };

  const handleSaveLoan = async ({ playerIds, receivingTeamName, loanDate }) => {
    if (!team?.id) {
      throw new Error('Team ID is required');
    }

    const result = await recordPlayerLoans(playerIds, {
      teamId: team.id,
      receivingTeamName,
      loanDate
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to record loan');
    }

    if (playerIds.length === 1) {
      const playerName = formatPlayerDisplayName(roster.find(player => player.id === playerIds[0]) || loanModalPlayer);
      setSuccessMessage(`${playerName} loan match recorded.`);
      return;
    }

    setSuccessMessage(`${playerIds.length} players loan match recorded.`);
  };


  if (loading && roster.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200">Roster Management</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin h-6 w-6 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          <span className="ml-3 text-slate-300">Loading roster...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-slate-200">Roster Management</h3>
          <span className="text-sm text-slate-400">
            • {roster.filter(p => p.on_roster).length} players
          </span>
        </div>
        <Button onClick={handleAddPlayer} variant="primary" size="sm" Icon={UserPlus}>
          Add Player
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
          <p className="text-rose-200 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
          <p className="text-emerald-200 text-sm">{successMessage}</p>
        </div>
      )}

      {/* Filters */}
      {roster.filter(p => !p.on_roster).length > 0 && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showInactive ? 'Hide' : 'Show'} Former Players</span>
          </button>
        </div>
      )}


      {/* Roster Table */}
      <div className="bg-slate-800 rounded-lg border border-slate-600 overflow-hidden">
        {filteredRoster.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            {roster.length === 0 ? (
              <>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">No Players Yet</p>
                <p className="text-sm mb-4">Start building your team roster by adding players.</p>
                <div className="flex justify-center">
                  <Button onClick={handleAddPlayer} variant="primary" size="sm" Icon={UserPlus}>
                    Add First Player
                  </Button>
                </div>
                {shouldShowOnboarding && (
                  <div className="mt-4 px-4">
                    <RosterConnectorOnboarding onNavigateToConnectors={onNavigateToConnectors} />
                  </div>
                )}
              </>
            ) : (
              <>
                <Users className="w-8 h-8 mx-auto mb-2 text-sky-200 opacity-50" />
                <p className="text-sm text-sky-200">No active players found.</p>
                {shouldShowOnboarding && (
                  <div className="mt-4 px-4">
                    <RosterConnectorOnboarding onNavigateToConnectors={onNavigateToConnectors} />
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-slate-300" title="Connection Status">
                    <Link className="w-4 h-4 inline-block" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-600">
                {filteredRoster.map((player) => {
                  // Check if this is a ghost player (unmatched external player)
                  if (player.isGhost) {
                    return (
                      <tr key={player.id} className="bg-slate-800/30 border-l-2 border-slate-600">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-slate-600">
                              <Ghost className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-400 italic">
                                {player.display_name}
                              </span>
                              <span className="text-xs text-slate-500">
                                From {player.providerName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          {/* No connection icon for ghost players */}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-slate-500 text-sm">-</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleAcceptGhostPlayer(player)}
                              disabled={acceptingGhostPlayerId === player.externalPlayerId || dismissingGhostPlayerId === player.externalPlayerId}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              {acceptingGhostPlayerId === player.externalPlayerId ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span>Adding...</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-4 h-4" />
                                  <span>Accept</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDismissGhostPlayer(player)}
                              disabled={acceptingGhostPlayerId === player.externalPlayerId || dismissingGhostPlayerId === player.externalPlayerId}
                              className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center space-x-1"
                            >
                              {dismissingGhostPlayerId === player.externalPlayerId ? (
                                <>
                                  <Loader className="w-4 h-4 animate-spin" />
                                  <span>Dismissing...</span>
                                </>
                              ) : (
                                <>
                                  <X className="w-4 h-4" />
                                  <span>Dismiss</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  // Regular player row
                  // Build full name from first_name and last_name for display in roster
                  const fullName = player.last_name
                    ? `${player.first_name} ${player.last_name}`
                    : player.first_name;

                  return (
                  <tr key={player.id} className={`hover:bg-slate-700 transition-colors ${
                    !player.on_roster ? 'opacity-60' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                          player.on_roster ? 'bg-sky-600' : 'bg-slate-500'
                        }`}>
                          <span className="text-white text-sm font-medium">
                            {player.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className={`font-medium ${
                          player.on_roster ? 'text-slate-100' : 'text-slate-100 italic'
                        }`}>
                          {fullName}
                          {!player.on_roster && <span className="text-slate-400 ml-2">(Former)</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      {(() => {
                        const connections = connectionDetails.matchedConnections.get(player.id);
                        const hasConnection = connections && connections.length > 0;
                        const needsMatching = connectionDetails.hasConnectedProvider && !hasConnection;

                        if (!hasConnection && !needsMatching) {
                          return null; // No connection and no provider connected
                        }

                        const IconComponent = hasConnection ? Link : Unlink;
                        const iconColor = hasConnection ? 'text-emerald-400 hover:text-emerald-300' : 'text-amber-400 hover:text-amber-300';

                        const tooltipContent = (
                          <div className="text-xs space-y-2">
                            {hasConnection ? (
                              <>
                                <div className="font-semibold text-slate-100">Connected Providers:</div>
                                {connections.map((conn, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <Link className="w-3 h-3 text-emerald-400" />
                                      <span className="text-slate-200">{conn.providerName}</span>
                                    </div>
                                    <div className="pl-5 text-slate-300">
                                      Matched as: <span className="font-medium">{conn.playerNameInProvider}</span>
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <>
                                <div className="font-semibold text-amber-200">Needs Matching</div>
                                <div className="text-slate-300">
                                  This player is not matched to any provider data yet.
                                </div>
                                {connectionDetails.unmatchedExternalPlayers.length > 0 && (
                                  <button
                                    className="mt-2 w-full px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setMatchingPlayer(player);
                                    }}
                                  >
                                    Match Player
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        );

                        return (
                          <Tooltip content={tooltipContent} position="bottom">
                            <IconComponent className={`w-4 h-4 ${iconColor} transition-colors`} />
                          </Tooltip>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {player.jersey_number ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-600 text-amber-100">
                          <Hash className="w-3 h-3 mr-1" />
                          {player.jersey_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEditPlayer(player)}
                          className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
                          title="Edit player"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenLoanModal(player)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                          title="Record Loan"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Remove player"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connector Onboarding - shown below table when 0-3 active players */}
      {shouldShowOnboarding && filteredRoster.length > 0 && (
        <div className="mt-4">
          <RosterConnectorOnboarding onNavigateToConnectors={onNavigateToConnectors} />
        </div>
      )}

      {/* Add Player Modal */}
      {showAddModal && (
        <AddRosterPlayerModal
          team={team}
          onClose={() => setShowAddModal(false)}
          onPlayerAdded={handlePlayerAdded}
          getAvailableJerseyNumbers={getAvailableJerseyNumbers}
        />
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <EditPlayerModal
          player={editingPlayer}
          team={team}
          onClose={() => setEditingPlayer(null)}
          onPlayerUpdated={handlePlayerUpdated}
          getAvailableJerseyNumbers={getAvailableJerseyNumbers}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingPlayer && (
        <DeletePlayerConfirmModal
          player={deletingPlayer}
          hasGameHistory={deletingPlayerHasGameHistory}
          onClose={() => setDeletingPlayer(null)}
          onConfirm={handlePlayerDeleted}
        />
      )}

      {/* Player Matching Modal */}
      {matchingPlayer && connectionDetails.unmatchedExternalPlayers.length > 0 && (
        <PlayerMatchingModal
          rosterPlayer={matchingPlayer}
          unmatchedExternalPlayers={connectionDetails.unmatchedExternalPlayers}
          onClose={() => setMatchingPlayer(null)}
          onMatched={handlePlayerMatched}
        />
      )}

      {loanModalOpen && (
        <PlayerLoanModal
          isOpen={loanModalOpen}
          onClose={handleCloseLoanModal}
          onSave={handleSaveLoan}
          players={roster}
          defaultPlayerId={loanModalPlayer?.id || ''}
        />
      )}
    </div>
  );
}

// Team Connectors Component
function TeamConnectors({ team, onRefresh }) {
  return (
    <div className="space-y-6">
      <ConnectorsSection team={team} onRefresh={onRefresh} />
    </div>
  );
}

// Team Preferences Component
function TeamPreferences({ team, onRefresh, onShowFloatingSuccess }) {
  const { loadTeamPreferences, saveTeamPreferences, getTeamRoster } = useTeam();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [teamCaptainMode, setTeamCaptainMode] = useState(DEFAULT_PREFERENCES.teamCaptain);
  const [permanentCaptainId, setPermanentCaptainId] = useState('');
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const autoSaveReadyRef = useRef(false);
  const hasAppliedInitialPreferencesRef = useRef(false);
  const successMessageTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (successMessageTimeoutRef.current) {
        clearTimeout(successMessageTimeoutRef.current);
      }
    };
  }, []);

  const deriveTeamCaptainMode = useCallback((value) => {
    if (value === 'assign_each_match') return 'assign_each_match';
    if (value === 'permanent') return 'permanent';
    if (!value || value === 'none') return 'none';
    return 'permanent';
  }, []);

  // Load preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      if (!team?.id) {
        autoSaveReadyRef.current = false;
        return;
      }

      autoSaveReadyRef.current = false;
      hasAppliedInitialPreferencesRef.current = false;

      try {
        setLoading(true);
        setError(null);
        const loadedPrefs = await loadTeamPreferences(team.id);

        // Merge with defaults and normalize captain preference
        const mergedPrefs = {
          ...DEFAULT_PREFERENCES,
          ...loadedPrefs
        };

        const derivedMode = deriveTeamCaptainMode(mergedPrefs.teamCaptain);
        const normalizedCaptainValue =
          derivedMode === 'permanent' && mergedPrefs.teamCaptain === 'permanent'
            ? ''
            : mergedPrefs.teamCaptain || '';

        setTeamCaptainMode(derivedMode);
        setPermanentCaptainId(
          derivedMode === 'permanent' && normalizedCaptainValue
            ? normalizedCaptainValue
            : ''
        );

        setPreferences({
          ...mergedPrefs,
          teamCaptain: derivedMode === 'permanent' ? normalizedCaptainValue : mergedPrefs.teamCaptain
        });
      } catch (err) {
        console.error('Failed to load preferences:', err);
        setError('Failed to load preferences');
      } finally {
        setLoading(false);
        autoSaveReadyRef.current = true;
      }
    };

    loadPrefs();
  }, [team?.id, loadTeamPreferences, deriveTeamCaptainMode]);

  // Load roster for captain selection
  useEffect(() => {
    const loadRoster = async () => {
      if (!team?.id) return;

      try {
        setRosterLoading(true);
        const rosterData = await getTeamRoster(team.id);
        setRoster(rosterData || []);
      } catch (err) {
        console.error('Failed to load roster:', err);
        setError('Failed to load team roster');
      } finally {
        setRosterLoading(false);
      }
    };

    loadRoster();
  }, [team?.id, getTeamRoster]);

  const handleFormatChange = useCallback((newFormat) => {
    // Get valid formations for the new format (default squadSize to 6)
    const validFormations = getValidFormations(newFormat, 6);

    // Check if current formation is valid for new format
    const currentFormationValid = validFormations.includes(preferences.formation);

    // Get default formation for the new format
    const formatConfig = FORMAT_CONFIGS[newFormat] || FORMAT_CONFIGS[FORMATS.FORMAT_5V5];
    const defaultFormation = formatConfig.defaultFormation;

    // Update preferences
    setPreferences(prev => ({
      ...prev,
      matchFormat: newFormat,
      // Keep current formation if valid, otherwise use default
      formation: currentFormationValid ? prev.formation : defaultFormation
    }));
  }, [preferences.formation]);

  const buildCaptainLabel = useCallback((player) => {
    const baseName = player.display_name || [player.first_name, player.last_name].filter(Boolean).join(' ').trim();
    const safeName = baseName || 'Unnamed Player';
    return player.jersey_number ? `#${player.jersey_number} ${safeName}` : safeName;
  }, []);

  const captainOptions = useMemo(() => {
    const activePlayers = roster.filter(player => player.on_roster);
    const playersToUse = activePlayers.length > 0 ? activePlayers : roster;

    const sortedPlayers = [...playersToUse].sort((a, b) => {
      const nameA = (a.display_name || [a.first_name, a.last_name].filter(Boolean).join(' ')).trim();
      const nameB = (b.display_name || [b.first_name, b.last_name].filter(Boolean).join(' ')).trim();
      return nameA.localeCompare(nameB);
    });

    const options = sortedPlayers.map(player => ({
      value: player.id,
      label: buildCaptainLabel(player)
    }));

    if (
      teamCaptainMode === 'permanent' &&
      permanentCaptainId &&
      !options.some(opt => opt.value === permanentCaptainId)
    ) {
      options.unshift({
        value: permanentCaptainId,
        label: 'Previously selected captain'
      });
    }

    return options;
  }, [roster, buildCaptainLabel, teamCaptainMode, permanentCaptainId]);

  const handleTeamCaptainModeChange = useCallback((value) => {
    setTeamCaptainMode(value);

    if (value === 'permanent') {
      setPreferences(prev => ({ ...prev, teamCaptain: permanentCaptainId || '' }));
      return;
    }

    setPreferences(prev => ({ ...prev, teamCaptain: value }));
  }, [permanentCaptainId]);

  const handlePermanentCaptainChange = useCallback((playerId) => {
    setPermanentCaptainId(playerId);
    setPreferences(prev => ({ ...prev, teamCaptain: playerId }));
  }, []);

  useEffect(() => {
    if (!team?.id) return;
    if (!autoSaveReadyRef.current) return;

    if (!hasAppliedInitialPreferencesRef.current) {
      hasAppliedInitialPreferencesRef.current = true;
      return;
    }

    const teamCaptainValue = teamCaptainMode === 'permanent'
      ? permanentCaptainId
      : teamCaptainMode;

    setSuccessMessage(null);

    if (teamCaptainMode === 'permanent' && !teamCaptainValue) {
      setError('Please select a player to serve as the permanent team captain.');
      return;
    }

    if (['9v9', '11v11'].includes(preferences.matchFormat)) {
      setError('Only 5v5 and 7v7 formats are currently supported. Please select a supported format before saving.');
      return;
    }

    const preferencesToSave = {
      ...preferences,
      teamCaptain: teamCaptainValue
    };

    let isActive = true;

    const savePreferences = async () => {
      try {
        setError(null);

        await saveTeamPreferences(team.id, preferencesToSave);
        if (!isActive) return;

        if (onShowFloatingSuccess) {
          onShowFloatingSuccess('Preferences saved successfully');
        } else {
          setSuccessMessage('Preferences saved successfully');
          if (successMessageTimeoutRef.current) {
            clearTimeout(successMessageTimeoutRef.current);
          }
          successMessageTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
        }

        if (onRefresh) onRefresh();
      } catch (err) {
        console.error('Failed to save preferences:', err);
        if (!isActive) return;
        setError('Failed to save preferences. Please try again.');
        setSuccessMessage(null);
      }
    };

    savePreferences();

    return () => {
      isActive = false;
    };
  }, [
    preferences,
    teamCaptainMode,
    permanentCaptainId,
    team?.id,
    onRefresh,
    saveTeamPreferences,
    onShowFloatingSuccess
  ]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-slate-400">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {!onShowFloatingSuccess && successMessage && (
        <div className="bg-green-800/20 border border-green-700 text-green-200 text-sm rounded-lg p-4">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-800/20 border border-red-700 text-red-200 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">Team Preferences</h3>
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
              onChange={handleFormatChange}
              options={[
                { value: '5v5', label: '5v5' },
                { value: '7v7', label: '7v7' },
                { value: '9v9', label: '9v9 (Coming Soon)' },
                { value: '11v11', label: '11v11 (Coming Soon)' }
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Formation
            </label>
            <Select
              value={preferences.formation}
              onChange={(value) => setPreferences(prev => ({ ...prev, formation: value }))}
              options={getValidFormations(preferences.matchFormat, 6).map(formationKey => {
                const formationDef = FORMATION_DEFINITIONS[formationKey];
                const isAvailable = formationDef.status === 'available';

                return {
                  value: formationKey,
                  label: isAvailable ? formationDef.label : `${formationDef.label} (Coming Soon)`,
                  disabled: !isAvailable
                };
              })}
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
            <input
              type="number"
              min="5"
              max="45"
              value={preferences.periodLength}
              onChange={(e) => setPreferences(prev => ({
                ...prev,
                periodLength: parseInt(e.target.value, 10)
              }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Number of Periods
            </label>
            <Select
              value={preferences.numPeriods}
              onChange={(value) => setPreferences(prev => ({
                ...prev,
                numPeriods: parseInt(value, 10)
              }))}
              options={[
                { value: 1, label: '1 Period' },
                { value: 2, label: '2 Periods' },
                { value: 3, label: '3 Periods' },
                { value: 4, label: '4 Periods' }
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

        {/* Alternate Roles Checkbox - MOVED HERE (BEFORE Substitution Logic) */}
        <div className="space-y-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.alternateRoles}
              onChange={(e) => setPreferences(prev => ({ ...prev, alternateRoles: e.target.checked }))}
              className="sr-only"
            />
            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
              preferences.alternateRoles
                ? 'bg-sky-600 border-sky-600'
                : 'border-slate-400'
            }`}>
              {preferences.alternateRoles && (
                <CheckCircle className="w-3 h-3 text-white" />
              )}
            </div>
            <span className="text-slate-300">Alternate roles fairly over time</span>
            <Tooltip
              content={
                <div className="text-xs">
                  <div className="font-semibold text-slate-100 mb-2">Fair Role Rotation</div>
                  <div className="text-slate-300">
                    When enabled, the app will suggest substitutions that ensure all players
                    experience similar time in each role (defender, midfielder, attacker) over
                    the course of the season.
                  </div>
                </div>
              }
              position="right"
            >
              <HelpCircle className="w-4 h-4 ml-2 text-slate-400 hover:text-slate-300 transition-colors cursor-pointer" />
            </Tooltip>
          </label>
        </div>

        {/* Substitution Logic dropdown - NOW APPEARS AFTER checkbox */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <label className="flex items-center cursor-pointer">
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

        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Fair Play Award
          </label>
          <Select
            value={preferences.fairPlayAward}
            onChange={(value) => setPreferences(prev => ({ ...prev, fairPlayAward: value }))}
            options={[
              { value: 'none', label: 'No Awards' },
              { value: 'league_only', label: 'Only League' },
              { value: 'competitive', label: 'League, Cup and Tournament' },
              { value: 'all_games', label: 'All Games' }
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Team Captain
          </label>
          <Select
            value={teamCaptainMode}
            onChange={handleTeamCaptainModeChange}
            options={[
              { value: 'none', label: 'No Team Captain' },
              { value: 'permanent', label: 'Permanent Team Captain' },
              { value: 'assign_each_match', label: 'Assign Each Match' }
            ]}
          />
          {teamCaptainMode === 'permanent' && (
            <div className="mt-3 space-y-1">
              <label className="block text-xs font-medium text-slate-400">
                Permanent Team Captain
              </label>
              <Select
                value={permanentCaptainId}
                onChange={handlePermanentCaptainChange}
                options={captainOptions}
                placeholder={rosterLoading ? 'Loading players...' : 'Select Team Captain'}
                disabled={rosterLoading || captainOptions.length === 0}
              />
              {!rosterLoading && captainOptions.length === 0 && (
                <p className="text-xs text-slate-400">
                  Add players to your roster to choose a team captain.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Statistics Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-slate-300 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2" />
          Statistics
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Loan Match Weight
            </label>
            <Select
              value={String(preferences.loanMatchWeight)}
              onChange={(value) => setPreferences(prev => ({ ...prev, loanMatchWeight: parseFloat(value) }))}
              options={[
                { value: '1.0', label: 'Full Match (1.0)' },
                { value: '0.5', label: 'Half Match (0.5)' },
                { value: '0.0', label: 'No Credit (0.0)' }
              ]}
            />
            <p className="text-xs text-slate-400 mt-1">
              Controls how loan matches count toward season statistics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
