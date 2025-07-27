import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing drag and drop operations on the tactical board
 * Handles both new chips from palette and existing chips on the board
 * 
 * @param {Object} boardRef - Ref to the tactical board container
 * @param {Function} onChipPlace - Callback for placing new chips
 * @param {Function} onChipMove - Callback for moving existing chips
 * @param {Function} getNextChipNumber - Function to get next chip number for a color
 * 
 * @returns {Object} Drag state and handlers
 */
export function useDragAndDrop(boardRef, onChipPlace, onChipMove, getNextChipNumber) {
  const [draggedChip, setDraggedChip] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [ghostChip, setGhostChip] = useState(null);

  const handlePointerStart = useCallback((chipData, event) => {
    event.preventDefault();
    setDraggedChip(chipData);
    setIsDragging(true);
    
    if (boardRef.current) {
      const rect = boardRef.current.getBoundingClientRect();
      
      if (chipData.isNewChip) {
        // For new chips from palette, create ghost chip and track mouse position
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        
        setGhostChip({
          type: chipData.type,
          color: chipData.color,
          variation: chipData.variation,
          number: chipData.type === 'player' ? getNextChipNumber(chipData.color) : null,
          x: Math.max(3, Math.min(97, x)),
          y: Math.max(3, Math.min(97, y))
        });
        setDragOffset({ x: 0, y: 0 });
      } else {
        // For existing chips, create ghost chip at current position
        const chipX = (chipData.x / 100) * rect.width;
        const chipY = (chipData.y / 100) * rect.height;
        
        setDragOffset({
          x: event.clientX - rect.left - chipX,
          y: event.clientY - rect.top - chipY
        });
        
        // Create ghost chip for existing chip
        setGhostChip({
          type: chipData.type,
          color: chipData.color,
          variation: chipData.variation,
          number: chipData.number,
          x: chipData.x,
          y: chipData.y
        });
      }
    }
    
    // Capture pointer for smooth tracking
    if (event.target.setPointerCapture) {
      event.target.setPointerCapture(event.pointerId);
    }
  }, [boardRef, getNextChipNumber]);

  const handlePointerMove = useCallback((event) => {
    if (!isDragging || !draggedChip || !boardRef.current || !ghostChip) return;
    
    event.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    
    // Update ghost chip position for both new and existing chips
    let x, y;
    
    if (draggedChip.isNewChip) {
      // For new chips from palette
      x = ((event.clientX - rect.left) / rect.width) * 100;
      y = ((event.clientY - rect.top) / rect.height) * 100;
    } else {
      // For existing chips, use drag offset for smooth movement
      x = ((event.clientX - rect.left - dragOffset.x) / rect.width) * 100;
      y = ((event.clientY - rect.top - dragOffset.y) / rect.height) * 100;
    }
    
    setGhostChip(prev => ({
      ...prev,
      x: Math.max(3, Math.min(97, x)),
      y: Math.max(3, Math.min(97, y))
    }));
  }, [isDragging, draggedChip, dragOffset, ghostChip, boardRef]);

  const handlePointerEnd = useCallback((event) => {
    if (!isDragging || !draggedChip || !boardRef.current || !ghostChip) return;
    
    event.preventDefault();
    
    if (draggedChip.isNewChip) {
      // Create new chip from palette using ghost chip position
      const newChip = {
        id: `chip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: ghostChip.type,
        color: ghostChip.color,
        variation: ghostChip.variation,
        number: ghostChip.number,
        x: ghostChip.x,
        y: ghostChip.y
      };
      onChipPlace(newChip);
    } else {
      // Update existing chip position using ghost chip final position
      onChipMove(draggedChip.id, { x: ghostChip.x, y: ghostChip.y });
    }

    // Clear all drag state
    setDraggedChip(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setGhostChip(null);
  }, [isDragging, draggedChip, ghostChip, onChipPlace, onChipMove, boardRef]);

  // Add global pointer event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerEnd);
      document.addEventListener('pointercancel', handlePointerEnd);
      
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerEnd);
        document.removeEventListener('pointercancel', handlePointerEnd);
      };
    }
  }, [isDragging, handlePointerMove, handlePointerEnd]);

  return {
    // State
    draggedChip,
    isDragging,
    ghostChip,
    
    // Handlers
    handlePointerStart,
    
    // Utility functions
    isChipBeingDragged: (chipId) => {
      return isDragging && draggedChip && !draggedChip.isNewChip && draggedChip.id === chipId;
    }
  };
}