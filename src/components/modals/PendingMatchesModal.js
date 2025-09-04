import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { Play, Trash2, X, Calendar, Users, Trophy, Settings, Plus } from 'lucide-react';
import { formatMatchDate } from '../../utils/dateFormatting';
import { formatSubstitutionConfig } from '../../utils/substitutionFormatting';
import { UI_DEFAULTS, MATCH_DEFAULTS } from '../../constants/matchDefaults';

/**
 * Modal for displaying and managing pending matches
 * 
 * Allows users to resume previously configured matches, delete unwanted ones,
 * or configure a new match instead. Integrates with useMatchRecovery hook.
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Array<object>} [pendingMatches=[]] - Array of pending match objects from database with id, opponent, created_at, formation, initial_config
 * @param {boolean} [isLoading=false] - Whether async operations are in progress
 * @param {string} [error=''] - Error message to display, if any
 * @param {function} onResume - Called when user chooses to resume a match, receives matchId as parameter
 * @param {function} onDelete - Called when user chooses to delete a match, receives matchId as parameter
 * @param {function} onClose - Called when modal is closed without action
 * @param {function} onConfigureNew - Called when user chooses to configure new match
 * @returns {React.ReactElement|null} Modal component or null when not open
 */
export function PendingMatchesModal({ 
  isOpen, 
  pendingMatches = [], 
  isLoading = false,
  error = '',
  onResume,
  onDelete,
  onClose,
  onConfigureNew
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
      await onDelete(matchId);
    } finally {
      setDeletingMatchId(null);
    }
  };

  const handleConfigureNew = () => {
    if (isLoading) return;
    onConfigureNew();
  };

  const handleClose = () => {
    if (isLoading || deletingMatchId || resumingMatchId) return;
    onClose();
  };



  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Resume Pending Match</h2>
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
                <Settings className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-300 mb-2">No Pending Matches</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-sm">
                You don't have any saved match configurations. Configure a new match to get started.
              </p>
              <Button 
                onClick={handleConfigureNew}
                variant="accent"
                Icon={Plus}
                disabled={isLoading}
              >
                Configure New Match
              </Button>
            </div>
          )}

          {/* Match List */}
          {pendingMatches.length > 0 && (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {pendingMatches.map((match) => (
                <div 
                  key={match.id}
                  className="bg-slate-700 rounded-lg border border-slate-600 p-4 hover:bg-slate-650 transition-colors"
                >
                  {/* Match Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-medium text-slate-200 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span>{match.opponent || UI_DEFAULTS.UNKNOWN_OPPONENT}</span>
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-slate-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatMatchDate(match.created_at)}</span>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="flex items-center justify-between mb-4 text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <Trophy className="w-3 h-3 text-slate-400" />
                        <span>{match.formation || MATCH_DEFAULTS.FORMATION}</span>
                      </div>
                      <div className="text-slate-400">
                        {formatSubstitutionConfig(match.initial_config?.teamConfig ? {
                          type: match.initial_config.teamConfig.substitutionType,
                          pairRoleRotation: match.initial_config.teamConfig.pairRoleRotation
                        } : null)}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleResume(match.id)}
                      variant="accent"
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isLoading || deletingMatchId || resumingMatchId}
                      Icon={resumingMatchId === match.id ? undefined : Play}
                    >
                      {resumingMatchId === match.id ? 'Resuming...' : 'Resume Setup'}
                    </Button>
                    
                    <Button
                      onClick={() => handleDelete(match.id)}
                      variant="danger"
                      size="sm"
                      disabled={isLoading || deletingMatchId || resumingMatchId}
                      Icon={deletingMatchId === match.id ? undefined : Trash2}
                    >
                      {deletingMatchId === match.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Actions - Only show if we have matches */}
          {pendingMatches.length > 0 && (
            <div className="border-t border-slate-600 p-6 flex-shrink-0">
              <div className="flex space-x-3">
                <Button 
                  onClick={handleConfigureNew}
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
                  💡 <strong>Tip:</strong> Resume Setup takes you to Period Setup where you can review and modify settings
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}