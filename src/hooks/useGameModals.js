import { useState, useCallback } from 'react';

export function useGameModals(pushModalState, removeModalFromStack) {
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
  }, [pushModalState]);

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
    closeUndoConfirmModal
  };
}