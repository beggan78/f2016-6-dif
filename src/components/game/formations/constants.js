// Shared styling constants for formation components

// Base styling classes
export const FORMATION_STYLES = {
  // Container styles
  containerBase: 'p-2 rounded-lg shadow-md transition-all duration-300 border-2 relative',
  
  // Background colors
  bgColors: {
    field: 'bg-sky-700',        // Players on field
    substitute: 'bg-slate-700', // Substitute players
    inactive: 'bg-slate-800'    // Inactive players (7+ modes)
  },
  
  // Text colors
  textColors: {
    field: 'text-sky-100',      // Players on field
    substitute: 'text-slate-300', // Substitute players
    inactive: 'text-slate-500'  // Inactive players (7+ modes)
  },
  
  // Border colors
  borderColors: {
    transparent: 'border-transparent',
    nextOff: 'border-rose-500',
    nextOn: 'border-emerald-500',
    recentlySubstituted: 'border-amber-400'
  },
  
  // Glow effects
  glowEffects: {
    recentlySubstituted: 'animate-pulse shadow-lg shadow-amber-400/50 border-amber-400'
  },
  
  // Interactive states
  interactive: 'cursor-pointer select-none',
  
  // Help text
  helpText: 'text-xs text-slate-400 mt-0.5'
};

// Icon classes
export const ICON_STYLES = {
  small: 'inline h-3 w-3 mr-1',
  medium: 'h-4 w-4',
  large: 'h-5 w-5',
  
  // Indicator colors
  indicators: {
    nextOff: 'text-rose-400',
    nextOn: 'text-emerald-400',
    nextNextOff: 'text-rose-200 opacity-40',
    nextNextOn: 'text-emerald-200 opacity-40'
  }
};

// Position display name mappings
export const POSITION_DISPLAY_NAMES = {
  leftDefender: 'Left Defender',
  rightDefender: 'Right Defender', 
  leftAttacker: 'Left Attacker',
  rightAttacker: 'Right Attacker',
  substitute_1: 'Substitute',
  substitute_2: 'Substitute',
  substitute_3: 'Substitute',
  substitute_4: 'Substitute',
  substitute_5: 'Substitute'
};

// Help text messages
export const HELP_MESSAGES = {
  fieldPlayerOptions: 'Hold for options',
  substituteToggle: (isInactive) => `Hold to ${isInactive ? 'activate' : 'inactivate'}`
};