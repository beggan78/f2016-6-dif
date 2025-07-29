import { useCallback } from 'react';

/**
 * Custom hook for handling coordinate transformations between screen pixels and board percentages
 * 
 * @param {Object} boardRef - Ref to the tactical board container element
 * @returns {Object} Coordinate transformation utilities
 */
export function useCoordinateTransform(boardRef) {
  /**
   * Convert screen coordinates to board percentage coordinates
   * @param {number} clientX - X coordinate from mouse/touch event
   * @param {number} clientY - Y coordinate from mouse/touch event
   * @returns {Object} Object with x, y percentages (0-100)
   */
  const screenToBoard = useCallback((clientX, clientY) => {
    if (!boardRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    return { x, y };
  }, [boardRef]);

  /**
   * Convert board percentage coordinates to screen pixel coordinates
   * @param {number} percentageX - X coordinate as percentage (0-100)
   * @param {number} percentageY - Y coordinate as percentage (0-100)
   * @returns {Object} Object with x, y pixel coordinates
   */
  const boardToScreen = useCallback((percentageX, percentageY) => {
    if (!boardRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = boardRef.current.getBoundingClientRect();
    const x = (percentageX / 100) * rect.width;
    const y = (percentageY / 100) * rect.height;

    return { x, y };
  }, [boardRef]);

  /**
   * Clamp coordinates to stay within board boundaries
   * @param {number} x - X coordinate as percentage
   * @param {number} y - Y coordinate as percentage
   * @param {number} margin - Margin from edges as percentage (default: 3)
   * @returns {Object} Clamped coordinates
   */
  const clampToBounds = useCallback((x, y, margin = 3) => {
    return {
      x: Math.max(margin, Math.min(100 - margin, x)),
      y: Math.max(margin, Math.min(100 - margin, y))
    };
  }, []);

  /**
   * Calculate drag offset between cursor and chip center
   * @param {number} clientX - Current cursor X
   * @param {number} clientY - Current cursor Y  
   * @param {number} chipX - Chip X percentage
   * @param {number} chipY - Chip Y percentage
   * @returns {Object} Drag offset in pixels
   */
  const calculateDragOffset = useCallback((clientX, clientY, chipX, chipY) => {
    if (!boardRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = boardRef.current.getBoundingClientRect();
    const chipPixelX = (chipX / 100) * rect.width;
    const chipPixelY = (chipY / 100) * rect.height;

    return {
      x: clientX - rect.left - chipPixelX,
      y: clientY - rect.top - chipPixelY
    };
  }, [boardRef]);

  return {
    screenToBoard,
    boardToScreen,
    clampToBounds,
    calculateDragOffset
  };
}