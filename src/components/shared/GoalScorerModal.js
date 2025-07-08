/**
 * Goal Scorer & Correction Modal
 * Enhanced modal component for goal attribution and correction
 */

import React, { useState, useMemo } from 'react';
import { X, Users, Trophy, AlertTriangle, Undo } from 'lucide-react';
import { getPlayerName } from '../../utils/playerUtils';

const GoalScorerModal = ({
  isOpen,
  onClose,
  onSelectScorer,
  onCorrectGoal,
  onUndoGoal,
  eligiblePlayers = [],
  mode = 'new', // 'new', 'correct', 'view'
  existingGoalData = null,
  matchTime = '00:00',
  team = 'home'
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    existingGoalData?.scorerId || null
  );
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Determine modal title and primary action based on mode
  const modalConfig = useMemo(() => {
    switch (mode) {
      case 'correct':
        return {
          title: 'Correct Goal Scorer',
          subtitle: `Goal at ${matchTime}`,
          primaryAction: 'Update Scorer',
          primaryColor: 'bg-amber-600 hover:bg-amber-700',
          showUndo: true
        };
      case 'view':
        return {
          title: 'Goal Information',
          subtitle: `Goal at ${matchTime}`,
          primaryAction: 'Close',
          primaryColor: 'bg-gray-600 hover:bg-gray-700',
          showUndo: true
        };
      default: // 'new'
        return {
          title: 'Who Scored?',
          subtitle: `${team === 'home' ? 'Home' : 'Away'} goal at ${matchTime}`,
          primaryAction: 'Confirm Scorer',
          primaryColor: 'bg-emerald-600 hover:bg-emerald-700',
          showUndo: false
        };
    }
  }, [mode, matchTime, team]);

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayerId(playerId);
  };

  const handlePrimaryAction = () => {
    if (mode === 'view') {
      onClose();
      return;
    }

    if (!selectedPlayerId && mode !== 'view') {
      // Allow skipping scorer selection for new goals
      if (mode === 'new') {
        setPendingAction('skip');
        setShowConfirmation(true);
        return;
      }
      return; // Don't allow empty selection for corrections
    }

    if (mode === 'new') {
      onSelectScorer(selectedPlayerId);
    } else if (mode === 'correct') {
      onCorrectGoal(existingGoalData.eventId, selectedPlayerId);
    }
    
    onClose();
  };

  const handleSkipScorer = () => {
    if (mode === 'new') {
      setPendingAction('skip');
      setShowConfirmation(true);
    }
  };

  const handleUndoGoal = () => {
    setPendingAction('undo');
    setShowConfirmation(true);
  };

  const handleConfirmAction = () => {
    if (pendingAction === 'skip') {
      onSelectScorer(null); // No scorer selected
    } else if (pendingAction === 'undo') {
      onUndoGoal(existingGoalData.eventId);
    }
    
    setShowConfirmation(false);
    setPendingAction(null);
    onClose();
  };

  const handleCancelAction = () => {
    setShowConfirmation(false);
    setPendingAction(null);
  };

  if (!isOpen) return null;

  // Confirmation dialog
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {pendingAction === 'skip' ? 'Skip Scorer Selection?' : 'Undo Goal?'}
            </h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            {pendingAction === 'skip'
              ? 'The goal will be recorded without a specific scorer. You can add the scorer later if needed.'
              : 'This will remove the goal from the match. The score will be decreased by 1. This action cannot be undone.'
            }
          </p>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancelAction}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmAction}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                pendingAction === 'skip' 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {pendingAction === 'skip' ? 'Skip Scorer' : 'Undo Goal'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>{modalConfig.title}</span>
              </h2>
              <p className="text-sm text-gray-600 mt-1">{modalConfig.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current scorer display for correct/view modes */}
          {(mode === 'correct' || mode === 'view') && existingGoalData && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current Scorer</span>
              </div>
              <p className="text-blue-800">
                {existingGoalData.scorerId 
                  ? getPlayerName(eligiblePlayers, existingGoalData.scorerId)
                  : 'No scorer recorded'
                }
              </p>
            </div>
          )}

          {/* Player selection */}
          {mode !== 'view' && (
            <>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Select {mode === 'correct' ? 'New ' : ''}Scorer:
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {eligiblePlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedPlayerId === player.id
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white border-gray-200 text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedPlayerId === player.id ? 'bg-blue-500' : 'bg-gray-300'
                      }`} />
                      <span className="font-medium">{getPlayerName([player], player.id)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* No scorer option for new goals */}
              {mode === 'new' && (
                <button
                  onClick={() => handlePlayerSelect(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors mt-2 ${
                    selectedPlayerId === null
                      ? 'bg-gray-50 border-gray-300 text-gray-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPlayerId === null ? 'bg-gray-500' : 'bg-gray-300'
                    }`} />
                    <span className="italic">No specific scorer</span>
                  </div>
                </button>
              )}
            </>
          )}

          {/* View mode information */}
          {mode === 'view' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Goal Details:</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div>Team: <span className="font-medium">{team === 'home' ? 'Home' : 'Away'}</span></div>
                  <div>Time: <span className="font-medium">{matchTime}</span></div>
                  <div>Period: <span className="font-medium">{existingGoalData?.period || 'Unknown'}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex space-x-3">
            {modalConfig.showUndo && mode !== 'new' && (
              <button
                onClick={handleUndoGoal}
                className="flex items-center space-x-2 px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
              >
                <Undo className="w-4 h-4" />
                <span>Undo Goal</span>
              </button>
            )}
            
            <div className="flex-1" />
            
            {mode === 'new' && (
              <button
                onClick={handleSkipScorer}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Skip
              </button>
            )}
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            
            {mode !== 'view' && (
              <button
                onClick={handlePrimaryAction}
                disabled={!selectedPlayerId && mode === 'correct'}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${modalConfig.primaryColor} ${
                  (!selectedPlayerId && mode === 'correct') 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
              >
                {modalConfig.primaryAction}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalScorerModal;