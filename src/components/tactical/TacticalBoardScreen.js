import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TacticalBoard } from './TacticalBoard';
import { createPersistenceManager } from '../../utils/persistenceManager';

export function TacticalBoardScreen({ onNavigateBack, pushModalState, removeModalFromStack }) {
  // Memoize the persistence manager to prevent re-creation on every render
  const persistenceManager = useMemo(() => createPersistenceManager('sport-wizard-tactical-preferences', {
    pitchMode: 'full',
    fullModeChips: [],
    halfModeChips: [],
  }), []); // Empty dependency array ensures it's created only once

  const [pitchMode, setPitchMode] = useState('full');
  const [placedChips, setPlacedChips] = useState([]);

  // Load saved state on component mount
  useEffect(() => {
    const savedState = persistenceManager.loadState();
    setPitchMode(savedState.pitchMode);
    const chipsToLoad = savedState.pitchMode === 'full' ? savedState.fullModeChips : savedState.halfModeChips;
    setPlacedChips(chipsToLoad || []);
  }, [persistenceManager]);

  const handleBackPress = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  // This function now handles saving the current chips and loading the new set
  const handlePitchModeToggle = useCallback((mode) => {
    if (mode === pitchMode) return;

    // Get the current state from storage
    const savedState = persistenceManager.loadState();

    // Determine keys for saving current chips and loading new ones
    const currentChipsKey = pitchMode === 'full' ? 'fullModeChips' : 'halfModeChips';
    const newChipsKey = mode === 'full' ? 'fullModeChips' : 'halfModeChips';

    // Create the new state object to save
    const newState = {
      ...savedState,
      pitchMode: mode,
      [currentChipsKey]: placedChips,
    };

    // Save the new state
    persistenceManager.saveState(newState);

    // Update React state to reflect the change
    setPitchMode(mode);
    setPlacedChips(newState[newChipsKey] || []);
  }, [pitchMode, placedChips, persistenceManager]);

  // A helper to update chips and persist them
  const updateAndPersistChips = useCallback((getNewChips) => {
    setPlacedChips(prevChips => {
      const newChips = getNewChips(prevChips);
      const currentChipsKey = pitchMode === 'full' ? 'fullModeChips' : 'halfModeChips';
      
      persistenceManager.saveState({
        ...persistenceManager.loadState(),
        pitchMode, // ensure current pitchMode is saved
        [currentChipsKey]: newChips,
      });
      
      return newChips;
    });
  }, [pitchMode, persistenceManager]);

  const handleChipPlace = useCallback((chip) => {
    updateAndPersistChips(prev => [...prev, chip]);
  }, [updateAndPersistChips]);

  const handleChipMove = useCallback((chipId, newPosition) => {
    updateAndPersistChips(prev =>
      prev.map(chip =>
        chip.id === chipId
          ? { ...chip, x: newPosition.x, y: newPosition.y }
          : chip
      )
    );
  }, [updateAndPersistChips]);

  const handleChipDelete = useCallback((chipId) => {
    updateAndPersistChips(prev => prev.filter(chip => chip.id !== chipId));
  }, [updateAndPersistChips]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-2 sm:p-4">
      {/* Navigation and Pitch Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={handleBackPress}
          className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 shadow-md flex-shrink-0"
        >
          Back
        </button>
        
        <div className="bg-slate-800 border border-slate-600 rounded-full p-0.5 inline-flex">
          <button
            onClick={() => handlePitchModeToggle('full')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              pitchMode === 'full'
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Full
          </button>
          <button
            onClick={() => handlePitchModeToggle('half')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              pitchMode === 'half'
                ? 'bg-sky-500 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Half
          </button>
        </div>
        
        <div className="w-16"></div> {/* Spacer for visual balance */}
      </div>

      {/* Tactical Board */}
      <TacticalBoard
        pitchMode={pitchMode}
        placedChips={placedChips}
        onChipPlace={handleChipPlace}
        onChipMove={handleChipMove}
        onChipDelete={handleChipDelete}
        pushModalState={pushModalState}
        removeModalFromStack={removeModalFromStack}
      />
    </div>
  );
}