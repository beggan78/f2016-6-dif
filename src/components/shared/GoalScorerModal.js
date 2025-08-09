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
  existingGoalData = null,
  matchTime = '00:00',
  team = 'home'
}) => {
  // Default to "No specific scorer" for new goals, existing scorer for corrections
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    mode === 'new' ? null : (existingGoalData?.scorerId || null)
  );
  
  // Reset selection when modal opens or when existingGoalData changes
  useEffect(() => {
    if (isOpen) {
      const newSelection = mode === 'new' ? null : (existingGoalData?.scorerId || null);
      setSelectedPlayerId(newSelection);
    }
  }, [isOpen, existingGoalData, mode]);
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
          primaryColor: 'bg-amber-600 hover:bg-amber-700'
        };
      case 'view':
        return {
          title: 'Goal Information',
          subtitle: `Goal at ${matchTime}`,
          primaryAction: 'Close',
          primaryColor: 'bg-gray-600 hover:bg-gray-700'
        };
      default: // 'new'
        return {
          title: 'Who Scored?',
          subtitle: `${team === 'home' ? 'Home' : 'Away'} goal at ${matchTime}`,
          primaryAction: 'Confirm Scorer',
          primaryColor: 'bg-emerald-600 hover:bg-emerald-700'
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

    if (mode === 'new') {
      onSelectScorer(selectedPlayerId); // Can be null ("No specific scorer") or player ID
    } else if (mode === 'correct') {
      onCorrectGoal(existingGoalData.eventId, selectedPlayerId);
    }
    
    onClose();
  };

  // Removed: handleSkipScorer, handleUndoGoal, handleConfirmAction, handleCancelAction

  if (!isOpen) return null;

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
                {eligiblePlayers.map((player) => {
                  const PositionIcon = getPositionIcon(player);
                  const positionColorClass = getPositionColorClasses(player);
                  
                  return (
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
                  <div>Scorer: <span className="font-medium">
                    {existingGoalData?.scorerId 
                      ? getPlayerName(eligiblePlayers, existingGoalData.scorerId)
                      : 'No scorer recorded'
                    }
                  </span></div>
                </div>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm text-blue-800">
                  This goal information is read-only. Use the correction mode to make changes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            
            {mode !== 'view' && (
              <button
                onClick={handlePrimaryAction}
                className={`px-4 py-2 text-white rounded-lg transition-colors ${modalConfig.primaryColor}`}
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