/**
 * Goal Scorer & Correction Modal
 * Enhanced modal component for goal attribution and correction
 */

import React, { useState, useMemo, useEffect } from 'react';
import { X, Users, Trophy, Sword, Shield, RotateCcw, ArrowDownUp, Hand } from 'lucide-react';
import { getPlayerName } from '../../utils/playerUtils';
import { getPlayerCurrentRole } from '../../utils/playerSortingUtils';
import { PLAYER_ROLES } from '../../constants/playerConstants';

const GoalScorerModal = ({
  isOpen,
  onClose,
  onSelectScorer,
  onCorrectGoal,
  eligiblePlayers = [],
  mode = 'new', // 'new', 'correct', 'view'
  eventId = null,           // Direct eventId prop (new approach)
  currentScorerId = null,   // Direct currentScorerId prop (new approach)  
  existingGoalData = null,  // Keep for backward compatibility
  matchTime = '00:00',
  goalType = 'scored'
}) => {
  // Default to "No specific scorer" for new goals, existing scorer for corrections
  // Use direct props first, fall back to existingGoalData for backward compatibility
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    mode === 'new' ? null : (currentScorerId ?? existingGoalData?.scorerId ?? null)
  );
  
  // Reset selection when modal opens or when props change
  useEffect(() => {
    if (isOpen) {
      const newSelection = mode === 'new' ? null : (currentScorerId ?? existingGoalData?.scorerId ?? null);
      setSelectedPlayerId(newSelection);
    }
  }, [isOpen, currentScorerId, existingGoalData, mode]);
  // Note: eligiblePlayers is intentionally excluded to prevent selection reset when player list updates

  // Get position icon for a player
  const getPositionIcon = (player) => {
    if (!player) return RotateCcw;
    
    const role = getPlayerCurrentRole(player);
    
    switch (role) {
      case PLAYER_ROLES.ATTACKER:
        return Sword;
      case PLAYER_ROLES.DEFENDER:
        return Shield;
      case PLAYER_ROLES.MIDFIELDER:
        return ArrowDownUp;
      case PLAYER_ROLES.GOALIE:
        return Hand;
      default:
        return RotateCcw;
    }
  };

  // Get position color classes
  const getPositionColorClasses = (player) => {
    if (!player) return 'text-gray-400';
    
    const role = getPlayerCurrentRole(player);
    
    switch (role) {
      case PLAYER_ROLES.ATTACKER:
        return 'text-red-500';
      case PLAYER_ROLES.DEFENDER:
        return 'text-blue-500';
      case PLAYER_ROLES.MIDFIELDER:
        return 'text-yellow-500';
      case PLAYER_ROLES.GOALIE:
        return 'text-green-500';
      default:
        return 'text-gray-400';
    }
  };

  // Determine modal title and primary action based on mode
  const modalConfig = useMemo(() => {
    switch (mode) {
      case 'correct':
        return {
          title: 'Correct Goal Scorer',
          subtitle: `Goal at ${matchTime}`,
          primaryAction: 'Update Scorer',
          primaryColor: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500'
        };
      case 'view':
        return {
          title: 'Goal Information',
          subtitle: `Goal at ${matchTime}`,
          primaryAction: 'Close',
          primaryColor: 'bg-slate-600 hover:bg-slate-500 focus:ring-slate-500'
        };
      default: // 'new'
        return {
          title: 'Who Scored?',
          subtitle: `${goalType === 'scored' ? 'Scored' : 'Conceded'} goal at ${matchTime}`,
          primaryAction: 'Confirm Scorer',
          primaryColor: 'bg-sky-600 hover:bg-sky-500 focus:ring-sky-500'
        };
    }
  }, [mode, matchTime, goalType]);

  const handlePlayerSelect = (playerId) => {
    setSelectedPlayerId(playerId);
  };

  const handlePrimaryAction = () => {
    if (mode === 'view') {
      onClose();
      return;
    }

    if (mode === 'new') {
      onSelectScorer(selectedPlayerId); // Can be null ("No specific scorer") or player ID
    } else if (mode === 'correct') {
      // Use direct eventId prop first, fall back to existingGoalData for backward compatibility
      const actualEventId = eventId || existingGoalData?.eventId;
      if (!actualEventId) {
        console.error('No eventId provided for goal correction');
        return;
      }
      onCorrectGoal(actualEventId, selectedPlayerId);
    }
    
    onClose();
  };

  // Removed: handleSkipScorer, handleUndoGoal, handleConfirmAction, handleCancelAction

  if (!isOpen) return null;

  // Main modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden shadow-xl border border-slate-600">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-sky-300 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>{modalConfig.title}</span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">{modalConfig.subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current scorer display for correct/view modes */}
          {(mode === 'correct' || mode === 'view') && (currentScorerId !== undefined || existingGoalData) && (
            <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span className="text-sm font-medium text-sky-300">Current Scorer</span>
              </div>
              <p className="text-slate-100">
                {(currentScorerId ?? existingGoalData?.scorerId)
                  ? getPlayerName(eligiblePlayers, currentScorerId ?? existingGoalData?.scorerId)
                  : 'No scorer recorded'
                }
              </p>
            </div>
          )}

          {/* Player selection */}
          {mode !== 'view' && (
            <>
              <h3 className="text-sm font-medium text-slate-100 mb-3">
                Select {mode === 'correct' ? 'New ' : ''}Scorer:
              </h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {eligiblePlayers.map((player) => {
                  const PositionIcon = getPositionIcon(player);
                  const positionColorClass = getPositionColorClasses(player);
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => handlePlayerSelect(player.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        selectedPlayerId === player.id
                          ? 'bg-sky-500 bg-opacity-20 border-sky-400 text-slate-100'
                          : 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          selectedPlayerId === player.id ? 'bg-sky-400' : 'bg-slate-500'
                        }`} />
                        <PositionIcon className={`w-4 h-4 ${positionColorClass}`} />
                        <span className="font-medium">{getPlayerName([player], player.id)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* No scorer option for new goals */}
              {mode === 'new' && (
                <button
                  onClick={() => handlePlayerSelect(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors mt-2 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    selectedPlayerId === null
                      ? 'bg-slate-500 bg-opacity-30 border-slate-500 text-slate-100'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      selectedPlayerId === null ? 'bg-slate-400' : 'bg-slate-500'
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
                <h3 className="text-sm font-medium text-slate-100 mb-2">Goal Details:</h3>
                <div className="space-y-2 text-sm text-slate-300">
                  <div>Team: <span className="font-medium text-slate-100">{goalType === 'scored' ? 'Scored' : 'Conceded'}</span></div>
                  <div>Time: <span className="font-medium text-slate-100">{matchTime}</span></div>
                  <div>Period: <span className="font-medium text-slate-100">{existingGoalData?.period || 'Unknown'}</span></div>
                  <div>Scorer: <span className="font-medium text-slate-100">
                    {(currentScorerId ?? existingGoalData?.scorerId)
                      ? getPlayerName(eligiblePlayers, currentScorerId ?? existingGoalData?.scorerId)
                      : 'No scorer recorded'
                    }
                  </span></div>
                </div>
              </div>
              
              <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
                <p className="text-sm text-sky-300">
                  This goal information is read-only. Use the correction mode to make changes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-600">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-300 bg-slate-600 rounded-lg hover:bg-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            >
              Cancel
            </button>
            
            {mode !== 'view' && (
              <button
                onClick={handlePrimaryAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${modalConfig.primaryColor}`}
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