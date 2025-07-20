import React, { useState } from 'react';
import { hasInactivePlayersInSquad } from '../../utils/playerUtils';
import { useAuth } from '../../contexts/AuthContext';
import { AuthModal, useAuthModal } from '../auth/AuthModal';

export function HamburgerMenu({ onRestartMatch, onAddPlayer, currentView, teamMode, onSplitPairs, onFormPairs, allPlayers, selectedSquadIds }) {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, userProfile, signOut } = useAuth();
  const authModal = useAuthModal();

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
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfile = () => {
    setIsOpen(false);
    // TODO: Implement profile navigation in Phase 4
    console.log('Profile clicked - to be implemented in Phase 4');
  };

  const isConfigScreen = currentView === 'config';
  const isGameScreen = currentView === 'game';
  const showFormationOptions = isGameScreen && (teamMode === 'pairs_7' || teamMode === 'individual_7');
  
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
        className="p-2 text-sky-400 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
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
                    Profile
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
                </>
              )}

              {/* App Functions */}
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
              {showFormationOptions && teamMode === 'pairs_7' && (
                <button
                  onClick={handleSplitPairs}
                  className="block w-full text-left px-4 py-2 text-sm text-slate-100 hover:bg-slate-600 hover:text-sky-400 transition-colors duration-200"
                >
                  Split Pairs
                </button>
              )}
              {showFormationOptions && teamMode === 'individual_7' && (
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
      
      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModal.isOpen}
        onClose={authModal.closeModal}
        initialMode={authModal.mode}
      />
    </div>
  );
}