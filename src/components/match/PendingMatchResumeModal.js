import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { Play, Trash2, X, Calendar, Users, Clock, Target, Plus, User } from 'lucide-react';

/**
 * Modal component for handling pending match resume actions
 * Shows when user signs in and has pending match configurations
 * Supports both single and multiple pending matches
 */
export function PendingMatchResumeModal({
  isOpen,
  onClose,
  onResume,
  onDiscard,
  pendingMatches = [], // Now expects array instead of single match
  isLoading = false,
  error = ''
}) {
  const [deletingMatchId, setDeletingMatchId] = useState(null);
  const [resumingMatchId, setResumingMatchId] = useState(null);


  if (!isOpen) return null;

  const handleResume = async (matchId) => {
    if (isLoading || resumingMatchId) return;
    
    setResumingMatchId(matchId);
    try {
      await onResume(matchId);
    } finally {
      setResumingMatchId(null);
    }
  };

  const handleDelete = async (matchId) => {
    if (isLoading || deletingMatchId) return;
    
    setDeletingMatchId(matchId);
    try {
      await onDiscard(matchId);
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleClose = () => {
    if (isLoading || deletingMatchId || resumingMatchId) return;
    onClose();
  };

  // Format creation date
  const formatMatchDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Resume Match Setup</h2>
              <p className="text-sm text-slate-400">
                {pendingMatches.length === 0 
                  ? 'No saved matches found' 
                  : `${pendingMatches.length} saved match${pendingMatches.length === 1 ? '' : 'es'} found`
                }
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={isLoading || deletingMatchId || resumingMatchId}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Error Display */}
          {error && (
            <div className="p-4 mx-6 mt-6 bg-rose-900/20 border border-rose-600 rounded-lg">
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          {/* Empty State */}
          {pendingMatches.length === 0 && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Pending Matches</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-sm">
                You don't have any saved match configurations.
              </p>
              <Button 
                onClick={handleClose}
                variant="accent"
                Icon={Plus}
                disabled={isLoading}
              >
                Continue to Configure New Match
              </Button>
            </div>
          )}

          {/* Match List */}
          {pendingMatches.length > 0 && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pendingMatches.map((match) => {
                const { initial_config, opponent, created_at, id, creatorName, created_by_profile } = match;
                const matchConfig = initial_config?.matchConfig || {};
                const teamConfig = initial_config?.teamConfig || {};
                const createdByName = creatorName || created_by_profile?.name || null;
                
                // Extract key details for display
                const opponentName = opponent || matchConfig.opponentTeam || 'Unknown Opponent';
                const matchType = matchConfig.matchType || 'match';
                const periods = matchConfig.periods || 3;
                const duration = matchConfig.periodDurationMinutes || 15;
                const squadSize = teamConfig.squadSize || initial_config?.squadSelection?.length || 0;
                const formation = teamConfig.formation || 'Unknown';

                return (
                  <div 
                    key={id}
                    className="bg-slate-700 rounded-lg border border-slate-600 p-4 hover:bg-slate-650 transition-colors"
                  >
                    {/* Match Header */}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-medium text-slate-200 flex items-center space-x-2">
                        <Target className="w-4 h-4 text-slate-400" />
                        <span>vs {opponentName}</span>
                      </h3>
                      <div className="flex flex-col items-end space-y-1 text-xs text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatMatchDate(created_at)}</span>
                        </div>
                        {createdByName && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>Created by {createdByName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match Details */}
                    <div className="bg-slate-600 rounded-lg p-3 mb-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-medium text-slate-200 capitalize">{matchType}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Format:</span>
                        <span className="font-medium text-slate-200">
                          {periods} × {duration} min periods
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Squad:</span>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="font-medium text-slate-200">
                            {squadSize} players, {formation} formation
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleResume(id)}
                        variant="accent"
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={isLoading || deletingMatchId || resumingMatchId}
                        Icon={resumingMatchId === id ? undefined : Play}
                      >
                        {resumingMatchId === id ? 'Resuming...' : 'Resume Setup'}
                      </Button>
                      
                      <Button
                        onClick={() => handleDelete(id)}
                        variant="danger"
                        size="sm"
                        disabled={isLoading || deletingMatchId || resumingMatchId}
                        Icon={deletingMatchId === id ? undefined : Trash2}
                      >
                        {deletingMatchId === id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Actions */}
          {pendingMatches.length > 0 && (
            <div className="border-t border-slate-600 p-6 flex-shrink-0">
              <div className="flex space-x-3">
                <Button 
                  onClick={handleClose}
                  variant="accent"
                  className="flex-1"
                  disabled={isLoading || deletingMatchId || resumingMatchId}
                  Icon={Plus}
                >
                  Configure New Match
                </Button>
                
                <Button 
                  onClick={handleClose}
                  variant="secondary"
                  className="px-6"
                  disabled={isLoading || deletingMatchId || resumingMatchId}
                >
                  Cancel
                </Button>
              </div>

              {/* Info Tip */}
              <div className="mt-4 p-2 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400 text-center">
                  💡 <strong>Tip:</strong> Resume Setup takes you to the Configuration Screen where you can review and modify settings
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Loading State Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800 bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-sm text-slate-300">Processing...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PendingMatchResumeModal;
