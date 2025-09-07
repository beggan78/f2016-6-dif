import React from 'react';
import { Play, Trash2, X, Clock, Users, Target } from 'lucide-react';
import { ConfirmationModal } from '../shared/UI';

/**
 * Modal component for handling pending match resume actions
 * Shows when user signs in and has a pending match configuration
 */
export function PendingMatchResumeModal({
  isOpen,
  onClose,
  onResume,
  onDiscard,
  pendingMatch,
  isLoading = false
}) {
  if (!isOpen || !pendingMatch) {
    return null;
  }

  const { initial_config, opponent, created_at } = pendingMatch;
  const matchConfig = initial_config?.matchConfig || {};
  const teamConfig = initial_config?.teamConfig || {};
  
  // Format creation date
  const createdDate = new Date(created_at).toLocaleDateString();
  const createdTime = new Date(created_at).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Extract key details for display
  const opponentName = opponent || matchConfig.opponentTeam || 'Unknown Opponent';
  const matchType = matchConfig.matchType || 'match';
  const periods = matchConfig.periods || 3;
  const duration = matchConfig.periodDurationMinutes || 15;
  const squadSize = teamConfig.squadSize || initial_config?.squadSelection?.length || 0;
  const formation = teamConfig.formation || 'Unknown';

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md mx-auto"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold text-gray-900">
              Resume Match Setup
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Details */}
        <div className="mb-6">
          <p className="text-gray-600 mb-3">
            You have a saved match configuration from {createdDate} at {createdTime}
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Opponent:</span>
              <span className="font-medium text-gray-900">{opponentName}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Type:</span>
              <span className="font-medium text-gray-900 capitalize">{matchType}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Format:</span>
              <span className="font-medium text-gray-900">
                {periods} × {duration} min periods
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Squad:</span>
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-gray-900">
                  {squadSize} players, {formation} formation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Resume Button */}
          <button
            onClick={onResume}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            <Play className="w-4 h-4" />
            <span>Resume Match Setup</span>
          </button>

          {/* Discard Button */}
          <button
            onClick={onDiscard}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Discard & Start Fresh</span>
          </button>

          {/* Cancel Button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-4 py-3 rounded-lg transition-colors font-medium"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-4 text-center">
            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-500 mt-2">Processing...</p>
          </div>
        )}
      </div>
    </ConfirmationModal>
  );
}

export default PendingMatchResumeModal;