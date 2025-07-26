import React, { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../shared/UI';
import { TacticalBoard } from './TacticalBoard';

export function TacticalBoardScreen({ onNavigateBack, pushModalState, removeModalFromStack }) {
  const [pitchMode, setPitchMode] = useState('half'); // 'full' or 'half' - default to half
  const [placedChips, setPlacedChips] = useState([]);

  const handleBackPress = useCallback(() => {
    onNavigateBack();
  }, [onNavigateBack]);

  const handlePitchModeToggle = useCallback((mode) => {
    setPitchMode(mode);
    // Clear placed chips when switching modes since positions won't be valid
    setPlacedChips([]);
  }, []);

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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={handleBackPress}
            variant="secondary"
            size="sm"
            Icon={ArrowLeft}
            className="flex-shrink-0"
          >
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-sky-400">Tactical Board</h1>
        </div>
      </div>

      {/* Pitch Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-slate-700 rounded-lg p-1 inline-flex">
          <button
            onClick={() => handlePitchModeToggle('full')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pitchMode === 'full'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            Full Pitch
          </button>
          <button
            onClick={() => handlePitchModeToggle('half')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              pitchMode === 'half'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-600'
            }`}
          >
            Half Pitch
          </button>
        </div>
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