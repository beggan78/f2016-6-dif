import React, { useState } from 'react';
import { Users, UserPen, Dice5 } from 'lucide-react';
import { hasInactivePlayersInSquad } from '../../utils/playerUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { VIEWS } from '../../constants/viewConstants';

export function HamburgerMenu({ onRestartMatch, onAddPlayer, onNavigateToTacticalBoard, currentView, teamConfig, onSplitPairs, onFormPairs, allPlayers, selectedSquadIds, setView, authModal, onOpenTeamAdminModal, onSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, userProfile } = useAuth();
  const { hasTeams, canManageTeam, hasPendingRequests, pendingRequestsCount } = useTeam();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleRestartMatch = () => {
    setIsOpen(false);
    onRestartMatch();
  };

  const handleAddPlayer = () => {
    setIsOpen(false);
    onAddPlayer();
  };

  const handleSplitPairs = () => {
    setIsOpen(false);
    onSplitPairs();
  };

  const handleFormPairs = () => {
    setIsOpen(false);
    onFormPairs();
  };

  const handleNavigateToTacticalBoard = () => {
    setIsOpen(false);
    onNavigateToTacticalBoard();
  };

  const handleLogin = () => {
    setIsOpen(false);
    authModal.openLogin();
  };

  const handleSignup = () => {
    setIsOpen(false);
    authModal.openSignup();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await onSignOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfile = () => {
    setIsOpen(false);
    if (setView) {
      setView(VIEWS.PROFILE);
    }
  };

  const handleTeamManagement = () => {
    setIsOpen(false);
    if (setView) {
      setView(VIEWS.TEAM_MANAGEMENT);
    }
  };

  const handleMatchHistory = () => {
    setIsOpen(false);
    // TODO: Navigate to match history view
    console.log('Match history clicked');
  };

  const handleCreateTeam = () => {
    setIsOpen(false);
    // TODO: Open create team modal
    console.log('Create team clicked');
  };

  const isConfigScreen = currentView === 'config';
  const isGameScreen = currentView === 'game';
  const showFormationOptions = isGameScreen && teamConfig?.formation === '2-2' && (
    (teamConfig?.substitutionType === 'pairs' && teamConfig?.squadSize === 7) || 
    (teamConfig?.substitutionType === 'individual' && teamConfig?.squadSize === 7)
  );
  
  // Check for inactive players in the selected squad
  const hasInactivePlayers = hasInactivePlayersInSquad(allPlayers, selectedSquadIds);
  
  // Disable "Form Pairs" if there are inactive players
  const canFormPairs = !hasInactivePlayers;

  // Get user display name
  const getUserDisplayName = () => {
    if (userProfile?.name) {
      return userProfile.name;
    }
    if (user?.email) {
      return user.email.split('@')[0]; // Use part before @ as fallback
    }
    return 'User';
  };

  return (
    <div className="relative">
      <button
        onClick={toggleMenu}
        className="p-2 text-sky-400 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded relative"
        aria-label="Menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        {hasPendingRequests && canManageTeam && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
            <span className="text-white text-[6px] font-bold leading-none">
              {pendingRequestsCount}
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-slate-700 rounded-lg shadow-lg border border-slate-600 z-20">
            <div className="py-1">
              {/* Authentication Section */}
              {isAuthenticated ? (
                <>
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-600">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-sky-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {getUserDisplayName().charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-100 text-sm font-medium truncate">
                          {getUserDisplayName()}
                        </p>
                        <p className="text-slate-400 text-xs truncate">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Button */}
                  <button
                    onClick={handleProfile}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <UserPen className="w-4 h-4" />
                      <span>Profile</span>
                    </div>
                  </button>

                  {/* Team Management - Protected Feature */}
                  {hasTeams ? (
                    <button
                      onClick={handleTeamManagement}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>Team Management</span>
                        {hasPendingRequests && canManageTeam && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex items-center justify-center ml-1">
                            <span className="text-white text-[6px] font-bold leading-none">
                              {pendingRequestsCount}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateTeam}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create Team</span>
                      </div>
                    </button>
                  )}

                  {/* Match History - Protected Feature */}
                  <button
                    onClick={handleMatchHistory}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>Match History</span>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  {/* Login/Signup Buttons */}
                  <button
                    onClick={handleLogin}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={handleSignup}
                    className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                  >
                    Create Account
                  </button>

                  {/* Divider */}
                  <div className="border-t border-slate-600 my-1"></div>

                  {/* Protected Features Preview for Anonymous Users */}
                  <div className="px-4 py-2">
                    <p className="text-xs text-slate-400 mb-2">Sign in to unlock:</p>
                    <div className="space-y-1">
                      <button
                        onClick={handleSignup}
                        className="flex items-center justify-between w-full text-left py-1 text-xs text-slate-300 hover:text-sky-400 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Team Management</span>
                        </div>
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleSignup}
                        className="flex items-center justify-between w-full text-left py-1 text-xs text-slate-300 hover:text-sky-400 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span>Match History</span>
                        </div>
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                      <button
                        onClick={handleSignup}
                        className="flex items-center justify-between w-full text-left py-1 text-xs text-slate-300 hover:text-sky-400 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903C6.69 5.97 9.217 4 12 4s5.31 1.97 5.88 4.097A4 4 0 0117 16H7z" />
                          </svg>
                          <span>Cloud Sync</span>
                        </div>
                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-600 my-1"></div>
                </>
              )}

              {/* App Functions */}
              <button
                onClick={handleNavigateToTacticalBoard}
                className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
              >
                <div className="flex items-center space-x-2">
                  <Dice5 className="w-4 h-4" />
                  <span>Tactical Board</span>
                </div>
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!isConfigScreen}
                className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${
                  isConfigScreen 
                    ? 'text-slate-100 hover:bg-slate-600 hover:text-sky-400' 
                    : 'text-slate-400 cursor-not-allowed'
                }`}
              >
                Add Player
              </button>
              {showFormationOptions && teamConfig?.substitutionType === 'pairs' && (
                <button
                  onClick={handleSplitPairs}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                >
                  Split Pairs
                </button>
              )}
              {showFormationOptions && teamConfig?.substitutionType === 'individual' && (
                <button
                  onClick={handleFormPairs}
                  disabled={!canFormPairs}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-200 ${
                    canFormPairs 
                      ? 'text-slate-100 hover:bg-slate-600 hover:text-sky-400' 
                      : 'text-slate-400 cursor-not-allowed'
                  }`}
                  title={!canFormPairs ? "Cannot form pairs while there are inactive players" : ""}
                >
                  Form Pairs
                </button>
              )}
              <button
                onClick={handleRestartMatch}
                className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
              >
                New Game
              </button>

              {/* Logout Button */}
              {isAuthenticated && (
                <>
                  <div className="border-t border-slate-600 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-rose-300 hover:bg-slate-600 hover:text-rose-200 transition-colors duration-200"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}