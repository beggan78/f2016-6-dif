import React, { useState } from 'react';
import { Button } from '../shared/UI';
import { History, Trash2, X, Calendar, Clock, Trophy, Users } from 'lucide-react';
import { FORMATS } from '../../constants/teamConfiguration';

/**
 * Modal for recovering finished matches that weren't saved to history
 * 
 * Presents users with options to either save the match to history
 * or delete it permanently when a recoverable match is detected on login.
 * 
 * @param {boolean} isOpen - Whether modal is visible
 * @param {Object} match - Match data from database
 * @param {function} onSave - Called when user chooses to save match to history
 * @param {function} onDelete - Called when user chooses to delete match
 * @param {function} onClose - Called when modal is closed without action
 */
export function MatchRecoveryModal({ 
  isOpen, 
  match, 
  onSave, 
  onDelete, 
  onClose 
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen || !match) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  // Format date for display
  const formatMatchDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Format duration for display
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return 'Unknown duration';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get outcome display with appropriate styling
  const getOutcomeDisplay = (outcome, goalsScored, goalsConceded) => {
    if (!outcome) return { text: 'Unknown', color: 'text-slate-400' };
    
    const score = `${goalsScored || 0}-${goalsConceded || 0}`;
    
    switch (outcome) {
      case 'win':
        return { text: `Won ${score}`, color: 'text-emerald-400' };
      case 'loss':
        return { text: `Lost ${score}`, color: 'text-rose-400' };
      case 'draw':
        return { text: `Drew ${score}`, color: 'text-amber-400' };
      default:
        return { text: score, color: 'text-slate-300' };
    }
  };

  const outcomeDisplay = getOutcomeDisplay(match.outcome, match.goals_scored, match.goals_conceded);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Recover Unsaved Match</h2>
              <p className="text-sm text-slate-400">
                Found a finished match that wasn't saved
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            disabled={saving || deleting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Match Details */}
          <div className="bg-slate-700 rounded-lg p-4 mb-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-slate-200">Match Details</h3>
              <span className={`text-sm font-semibold ${outcomeDisplay.color}`}>
                {outcomeDisplay.text}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  {formatMatchDate(match.finished_at)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  {formatDuration(match.match_duration_seconds)}
                </span>
              </div>
              
              {match.opponent && (
                <div className="flex items-center space-x-2 col-span-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">vs {match.opponent}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 col-span-2">
                <Trophy className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300">
                  Format: {match.format || FORMATS.FORMAT_5V5} • Formation: {match.formation || '2-2'}
                </span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="mb-6 p-3 bg-blue-900/20 border border-blue-600 rounded-lg">
            <p className="text-sm text-blue-200 leading-relaxed">
              This match was completed but not saved to your match history. You can either save it now to preserve the statistics, or delete it permanently.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleSave} 
              variant="accent"
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={saving || deleting}
              Icon={saving ? undefined : History}
            >
              {saving ? 'Saving Match...' : 'Save to Match History'}
            </Button>
            
            <Button 
              onClick={handleDelete} 
              variant="danger"
              className="w-full"
              disabled={saving || deleting}
              Icon={deleting ? undefined : Trash2}
            >
              {deleting ? 'Deleting Match...' : 'Delete Match Permanently'}
            </Button>
          </div>

          {/* Warning for delete action */}
          <div className="mt-4 p-2 bg-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-400 text-center">
              💡 <strong>Tip:</strong> Saving to history preserves player statistics and performance data
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
