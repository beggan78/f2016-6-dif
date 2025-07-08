import { useState, useCallback } from 'react';

export function useGameModals(pushModalState, removeModalFromStack) {
  // Pending goal state management
  const [pendingGoal, setPendingGoal] = useState(null);
  
  const [modals, setModals] = useState({
    fieldPlayer: {
      isOpen: false,
      type: null, // 'pair' or 'player'
      target: null, // pairKey or position
      playerName: '',
      sourcePlayerId: null,
      availablePlayers: [],
      showPositionOptions: false
    },
    substitute: {
      isOpen: false,
      playerId: null,
      playerName: '',
      isCurrentlyInactive: false,
      canSetAsNextToGoIn: false
    },
    goalie: {
      isOpen: false,
      currentGoalieName: '',
      availablePlayers: []
    },
    scoreEdit: {
      isOpen: false
    },
    undoConfirm: {
      isOpen: false
    },
    goalScorer: {
      isOpen: false,
      eventId: null,
      team: 'home',
      mode: 'new', // 'new', 'correct', 'view'
      matchTime: '00:00',
      periodNumber: 1,
      existingGoalData: null
    }
  });

  const openModal = useCallback((modalType, modalData = {}) => {
    setModals(prev => ({
      ...prev,
      [modalType]: {
        ...prev[modalType],
        isOpen: true,
        ...modalData
      }
    }));

    // Browser back navigation integration
    if (pushModalState) {
      pushModalState(() => {
        closeModal(modalType);
      });
    }
  }, [pushModalState]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeModal = useCallback((modalType) => {
    setModals(prev => ({
      ...prev,
      [modalType]: {
        ...prev[modalType],
        isOpen: false
      }
    }));
  }, []);

  const closeModalWithNavigation = useCallback((modalType) => {
    closeModal(modalType);
    if (removeModalFromStack) {
      removeModalFromStack();
    }
  }, [closeModal, removeModalFromStack]);

  const closeAllModals = useCallback(() => {
    setModals(prev => {
      const newModals = { ...prev };
      Object.keys(newModals).forEach(key => {
        newModals[key] = { ...newModals[key], isOpen: false };
      });
      return newModals;
    });
  }, []);

  // Specific modal operations for convenience
  const openFieldPlayerModal = useCallback((modalData) => {
    openModal('fieldPlayer', modalData);
  }, [openModal]);

  const closeFieldPlayerModal = useCallback(() => {
    closeModal('fieldPlayer');
  }, [closeModal]);

  const openSubstituteModal = useCallback((modalData) => {
    openModal('substitute', modalData);
  }, [openModal]);

  const closeSubstituteModal = useCallback(() => {
    closeModal('substitute');
  }, [closeModal]);

  const openGoalieModal = useCallback((modalData) => {
    openModal('goalie', modalData);
  }, [openModal]);

  const closeGoalieModal = useCallback(() => {
    closeModal('goalie');
  }, [closeModal]);

  const openScoreEditModal = useCallback(() => {
    openModal('scoreEdit');
  }, [openModal]);

  const closeScoreEditModal = useCallback(() => {
    closeModal('scoreEdit');
  }, [closeModal]);

  const openUndoConfirmModal = useCallback(() => {
    openModal('undoConfirm');
  }, [openModal]);

  const closeUndoConfirmModal = useCallback(() => {
    closeModal('undoConfirm');
  }, [closeModal]);

  const openGoalScorerModal = useCallback((modalData) => {
    openModal('goalScorer', modalData);
  }, [openModal]);

  const closeGoalScorerModal = useCallback(() => {
    closeModal('goalScorer');
  }, [closeModal]);
  
  // Pending goal management functions
  const setPendingGoalData = useCallback((goalData) => {
    console.log('[DEBUG] useGameModals - Setting pending goal:', goalData);
    setPendingGoal(goalData);
  }, []);
  
  const getPendingGoalData = useCallback(() => {
    console.log('[DEBUG] useGameModals - Getting pending goal:', pendingGoal);
    return pendingGoal;
  }, [pendingGoal]);
  
  const clearPendingGoal = useCallback(() => {
    console.log('[DEBUG] useGameModals - Clearing pending goal');
    setPendingGoal(null);
  }, []);

  return {
    modals,
    // Generic modal operations
    openModal,
    closeModal,
    closeModalWithNavigation,
    closeAllModals,
    // Specific modal operations
    openFieldPlayerModal,
    closeFieldPlayerModal,
    openSubstituteModal,
    closeSubstituteModal,
    openGoalieModal,
    closeGoalieModal,
    openScoreEditModal,
    closeScoreEditModal,
    openUndoConfirmModal,
    closeUndoConfirmModal,
    openGoalScorerModal,
    closeGoalScorerModal,
    // Pending goal operations
    setPendingGoalData,
    getPendingGoalData,
    clearPendingGoal
  };
}