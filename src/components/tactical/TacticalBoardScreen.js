import React, { useState, useCallback, useEffect } from 'react';
import { TacticalBoard } from './TacticalBoard';
import { createPersistenceManager } from '../../utils/persistenceManager';

export function TacticalBoardScreen({ onNavigateBack, pushModalState, removeModalFromStack }) {
  // Create persistence manager for tactical board preferences
  const persistenceManager = createPersistenceManager('sport-wizard-tactical-preferences', { pitchMode: 'full' });
  
  const [pitchMode, setPitchMode] = useState('full'); // 'full' or 'half' - default to full
  const [placedChips, setPlacedChips] = useState([]);

  // Load saved pitch mode preference on component mount
  useEffect(() => {
    const savedPreferences = persistenceManager.loadState();
    setPitchMode(savedPreferences.pitchMode);
  }, [persistenceManager]);

  const handleBackPress = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handlePitchModeToggle = useCallback((mode) => {
    setPitchMode(mode);
    // Save the preference to localStorage
    persistenceManager.saveState({ pitchMode: mode });
    // Clear placed chips when switching modes since positions won't be valid
    setPlacedChips([]);
  }, [persistenceManager]);

  const handleChipPlace = useCallback((chip) => {
    setPlacedChips(prev => [...prev, chip]);
  }, []);

  const handleChipMove = useCallback((chipId, newPosition) => {
    setPlacedChips(prev => 
      prev.map(chip => 
        chip.id === chipId 
          ? { ...chip, x: newPosition.x, y: newPosition.y }
          : chip
      )
    );
  }, []);

  const handleChipDelete = useCallback((chipId) => {
    setPlacedChips(prev => prev.filter(chip => chip.id !== chipId));
  }, []);

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