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
      {/* Navigation and Pitch Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <Button 
          onClick={handleBackPress}
          variant="secondary"
          size="sm"
          Icon={ArrowLeft}
          className="flex-shrink-0"
        >
          Back
        </Button>
        
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