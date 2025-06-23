export const createScoreHandlers = (
  stateUpdaters,
  modalHandlers
) => {
  const { 
    setHomeScore, 
    setAwayScore,
    addHomeGoal,
    addAwayGoal 
  } = stateUpdaters;
  
  const { openScoreEditModal, closeScoreEditModal } = modalHandlers;

  const handleAddHomeGoal = () => {
    addHomeGoal();
  };

  const handleAddAwayGoal = () => {
    addAwayGoal();
  };

  const handleScoreEdit = (newHomeScore, newAwayScore) => {
    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    closeScoreEditModal();
  };

  const handleOpenScoreEdit = () => {
    openScoreEditModal();
  };

  return {
    handleAddHomeGoal,
    handleAddAwayGoal,
    handleScoreEdit,
    handleOpenScoreEdit
  };
};