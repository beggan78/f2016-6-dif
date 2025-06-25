export const createScoreHandlers = (
  stateUpdaters,
  modalHandlers
) => {
  const { 
    setScore,
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
    setScore(newHomeScore, newAwayScore);
    closeScoreEditModal();
  };

  const handleOpenScoreEdit = () => {
    openScoreEditModal();
  };

  const scoreCallback = () => {
    handleOpenScoreEdit();
  };

  return {
    handleAddHomeGoal,
    handleAddAwayGoal,
    handleScoreEdit,
    handleOpenScoreEdit,
    scoreCallback
  };
};