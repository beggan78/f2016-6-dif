/**
 * Configuration constants for the Tactical Board component
 * Centralizes magic numbers and reusable values
 */

// Coordinate boundaries and constraints
export const BOARD_CONSTRAINTS = {
  // Minimum distance from board edges (percentage)
  BOUNDARY_MARGIN: 3,
  
  // Maximum coordinates (percentage)
  MAX_X: 97,
  MAX_Y: 97,
  
  // Minimum coordinates (percentage)  
  MIN_X: 3,
  MIN_Y: 3
};

// Timing constants
export const TIMING = {
  // Double-tap detection window (milliseconds)
  DOUBLE_TAP_DELAY: 300,
  
  // CSS transition duration (milliseconds)
  TRANSITION_DURATION: 200,
  
  // Animation easing
  TRANSITION_EASING: 'ease'
};

// Chip appearance constants
export const CHIP_APPEARANCE = {
  // Player chip dimensions
  PLAYER_CHIP: {
    WIDTH: 'w-7 h-7 sm:w-8 sm:h-8',
    BORDER: 'border-2',
    TEXT_SIZE: 'text-xs sm:text-sm'
  },
  
  // Soccer ball chip dimensions
  SOCCER_BALL_CHIP: {
    WIDTH: 'w-4 h-4 sm:w-5 sm:h-5'
  },
  
  // Common chip styles
  COMMON: {
    SHADOW: 'shadow-lg hover:shadow-xl',
    HOVER_SCALE: 'hover:scale-105',
    TRANSITION: 'transition-all duration-200'
  }
};

// Drag and drop constants
export const DRAG_DROP = {
  // Z-index for placed chips
  CHIP_Z_INDEX: 10,
  
  // Z-index for ghost chips during drag
  GHOST_Z_INDEX: 100,
  
  // Ghost chip opacity during drag
  GHOST_OPACITY: 0.7
};

// Color scheme for player chips
export const CHIP_COLORS = {
  white: 'bg-white text-slate-900 border-slate-300',
  red: 'bg-red-500 text-white border-red-600',
  blue: 'bg-blue-500 text-white border-blue-600',
  yellow: 'bg-yellow-500 text-slate-900 border-yellow-600',
  green: 'bg-green-500 text-white border-green-600',
  orange: 'bg-orange-500 text-white border-orange-600',
  purple: 'bg-purple-500 text-white border-purple-600',
  black: 'bg-slate-800 text-white border-slate-700',
  djurgarden: 'bg-sky-400 text-white border-sky-500'
};

// Available chip configurations
export const AVAILABLE_COLORS = [
  'djurgarden',
  'white',
  'red', 
  'blue',
  'yellow',
  'green',
  'orange',
  'purple',
  'black'
];

export const SOCCER_BALL_VARIATIONS = [
  'ball-v1'
];

// Utility functions for common operations
export const UTILS = {
  /**
   * Clamp coordinate to board boundaries
   * @param {number} value - Coordinate value
   * @param {number} margin - Boundary margin (default: BOUNDARY_MARGIN)
   * @returns {number} Clamped value
   */
  clampToBounds: (value, margin = BOARD_CONSTRAINTS.BOUNDARY_MARGIN) => {
    return Math.max(margin, Math.min(100 - margin, value));
  },
  
  /**
   * Generate unique chip ID
   * @returns {string} Unique identifier
   */
  generateChipId: () => {
    return `chip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};