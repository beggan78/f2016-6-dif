import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { TacticalBoard } from './TacticalBoard';
import { createPersistenceManager } from '../../utils/persistenceManager';
import { STORAGE_KEYS } from '../../constants/storageKeys';

export function TacticalBoardScreen({ onNavigateBack, pushNavigationState, removeFromNavigationStack, fromView }) {
  // Memoize the persistence manager to prevent re-creation on every render
  const persistenceManager = useMemo(() => createPersistenceManager(STORAGE_KEYS.TACTICAL_PREFERENCES, {
    pitchMode: 'full',
    interactionMode: 'drag',
    fullModeChips: [],
    halfModeChips: [],
    fullModeDrawings: [],
    halfModeDrawings: [],
    fromView: null, // Add fromView for persistent back navigation
  }), []); // Empty dependency array ensures it's created only once

  const [pitchMode, setPitchMode] = useState('full');
  const [placedChips, setPlacedChips] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [interactionMode, setInteractionMode] = useState('drag');

  const handleBackPress = useCallback(() => {
    const savedState = persistenceManager.loadState();
    onNavigateBack(savedState.fromView);
  }, [onNavigateBack, persistenceManager]);

  // Load saved state on component mount
  useEffect(() => {
    const savedState = persistenceManager.loadState();
    setPitchMode(savedState.pitchMode);
    setInteractionMode(savedState.interactionMode || 'drag');
    const chipsKey = savedState.pitchMode === 'full' ? 'fullModeChips' : 'halfModeChips';
    const drawingsKey = savedState.pitchMode === 'full' ? 'fullModeDrawings' : 'halfModeDrawings';
    setPlacedChips(savedState[chipsKey] || []);
    setDrawings(savedState[drawingsKey] || []);

    // If fromView is provided, it means we have just navigated here.
    // Save it for persistence in case of a page reload.
    if (fromView) {
      persistenceManager.saveState({ ...savedState, fromView });
    }
  }, [persistenceManager, fromView]);

  // Register browser back handler for navigation
  useEffect(() => {
    // Register browser back handler when component mounts
    if (pushNavigationState) {
      pushNavigationState(() => {
        handleBackPress();
      });
    }

    // Cleanup when component unmounts
    return () => {
      if (removeFromNavigationStack) {
        removeFromNavigationStack();
      }
    };
  }, [pushNavigationState, removeFromNavigationStack, handleBackPress]);

  // This function now handles saving the current chips and loading the new set
  const handlePitchModeToggle = useCallback((mode) => {
    if (mode === pitchMode) return;

    // Get the current state from storage
    const savedState = persistenceManager.loadState();

    // Determine keys for saving current chips/drawings and loading new ones
    const currentChipsKey = pitchMode === 'full' ? 'fullModeChips' : 'halfModeChips';
    const newChipsKey = mode === 'full' ? 'fullModeChips' : 'halfModeChips';
    const currentDrawingsKey = pitchMode === 'full' ? 'fullModeDrawings' : 'halfModeDrawings';
    const newDrawingsKey = mode === 'full' ? 'fullModeDrawings' : 'halfModeDrawings';

    // Create the new state object to save
    const newState = {
      ...savedState,
      pitchMode: mode,
      [currentChipsKey]: placedChips,
      [currentDrawingsKey]: drawings,
    };

    // Save the new state
    persistenceManager.saveState(newState);

    // Update React state to reflect the change
    setPitchMode(mode);
    setPlacedChips(newState[newChipsKey] || []);
    setDrawings(newState[newDrawingsKey] || []);
  }, [pitchMode, placedChips, drawings, persistenceManager]);

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

  const updateAndPersistDrawings = useCallback((getNewDrawings) => {
    setDrawings(prevDrawings => {
      const newDrawings = getNewDrawings(prevDrawings);
      const currentDrawingsKey = pitchMode === 'full' ? 'fullModeDrawings' : 'halfModeDrawings';

      persistenceManager.saveState({
        ...persistenceManager.loadState(),
        pitchMode,
        [currentDrawingsKey]: newDrawings,
      });

      return newDrawings;
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

  const handleAddDrawing = useCallback((stroke) => {
    updateAndPersistDrawings(prev => [...prev, stroke]);
  }, [updateAndPersistDrawings]);

  const handleUndoDrawing = useCallback(() => {
    updateAndPersistDrawings(prev => {
      if (prev.length === 0) {
        return prev;
      }
      return prev.slice(0, -1);
    });
  }, [updateAndPersistDrawings]);

  const handleClearChips = useCallback(() => {
    setPlacedChips([]); // Clear chips from the view

    // Determine which set of chips to clear in storage
    const currentChipsKey = pitchMode === 'full' ? 'fullModeChips' : 'halfModeChips';

    // Update localStorage
    persistenceManager.saveState({
      ...persistenceManager.loadState(),
      [currentChipsKey]: [],
    });
  }, [pitchMode, persistenceManager]);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]);
    const currentDrawingsKey = pitchMode === 'full' ? 'fullModeDrawings' : 'halfModeDrawings';
    persistenceManager.saveState({
      ...persistenceManager.loadState(),
      [currentDrawingsKey]: [],
    });
  }, [pitchMode, persistenceManager]);

  const handleClearAction = useCallback(() => {
    handleClearDrawings();
    if (interactionMode === 'drag') {
      handleClearChips();
    }
  }, [interactionMode, handleClearChips, handleClearDrawings]);

  const handleInteractionModeChange = useCallback((mode) => {
    if (mode === interactionMode) return;
    setInteractionMode(mode);
    persistenceManager.saveState({
      ...persistenceManager.loadState(),
      interactionMode: mode,
    });
  }, [interactionMode, persistenceManager]);

  const canUndoDrawing = interactionMode === 'draw' && drawings.length > 0;
  const clearButtonLabel = interactionMode === 'draw' ? 'Clear' : 'Clear All';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-2 sm:p-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[110px] flex justify-start">
            <button
              onClick={handleBackPress}
              className="bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-200 shadow-md"
            >
              Back
            </button>
          </div>

          <div className="flex-1 min-w-[110px] flex justify-center">
            {interactionMode === 'draw' && (
              <button
                onClick={handleUndoDrawing}
                disabled={!canUndoDrawing}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-200 shadow-md ${
                  canUndoDrawing
                    ? 'bg-slate-700 hover:bg-slate-600 text-white'
                    : 'bg-slate-700/60 text-slate-400 cursor-not-allowed'
                }`}
              >
                Undo
              </button>
            )}
          </div>

          <div className="flex-1 min-w-[110px] flex justify-end">
            <button
              onClick={handleClearAction}
              className="bg-slate-600 hover:bg-slate-500 text-white rounded-lg px-3 py-1 text-sm font-medium transition-colors duration-200 shadow-md"
            >
              {clearButtonLabel}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-3">
          {/* Interaction Mode Toggle */}
          <div className="bg-slate-800 border border-slate-600 rounded-full p-0.5 inline-flex">
            <button
              onClick={() => handleInteractionModeChange('drag')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                interactionMode === 'drag'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Drag
            </button>
            <button
              onClick={() => handleInteractionModeChange('draw')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                interactionMode === 'draw'
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Draw
            </button>
          </div>

          {/* Pitch Mode Toggle */}
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
        </div>
      </div>

      {/* Tactical Board */}
      <TacticalBoard
        pitchMode={pitchMode}
        placedChips={placedChips}
        onChipPlace={handleChipPlace}
        onChipMove={handleChipMove}
        onChipDelete={handleChipDelete}
        interactionMode={interactionMode}
        drawings={drawings}
        onAddDrawing={handleAddDrawing}
      />
    </div>
  );
}
