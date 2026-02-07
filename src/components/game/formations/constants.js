// Shared styling constants for formation components
import i18next from 'i18next';

// Base styling classes
export const FORMATION_STYLES = {
  // Container styles
  containerBase: 'p-2 rounded-lg shadow-md transition-all duration-300 border-2 relative',
  
  // Background colors
  bgColors: {
    field: 'bg-sky-700',        // Players on field (default for attackers)
    defenderField: 'bg-sky-900', // Defender players on field
    midfielderField: 'bg-sky-800', // Midfielder players on field
    substitute: 'bg-slate-700', // Substitute players
    inactive: 'bg-slate-800',    // Inactive players (7+ modes)
    goalie: 'bg-emerald-700'      // Goalie player (suggestions: bg-emerald-700, bg-purple-700, bg-indigo-700)
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

// Position display name mappings (dynamically resolved for i18n)
export const getPositionDisplayName = (positionKey) => {
  const baseKey = positionKey.startsWith('substitute_') ? 'substitute' : positionKey;
  return i18next.t(`game:formation.positions.${baseKey}`, { defaultValue: positionKey });
};

// Static fallback for code that iterates over all keys
export const POSITION_DISPLAY_NAMES = new Proxy({}, {
  get(_, prop) {
    if (typeof prop !== 'string') return undefined;
    const baseKey = prop.startsWith('substitute_') ? 'substitute' : prop;
    return i18next.t(`game:formation.positions.${baseKey}`, { defaultValue: prop });
  }
});

// Help text messages
export const HELP_MESSAGES = {
  fieldPlayerOptions: () => i18next.t('game:helpMessages.fieldPlayerOptions'),
  substituteToggle: (isInactive) => isInactive
    ? i18next.t('game:helpMessages.substituteToggleActivate')
    : i18next.t('game:helpMessages.substituteToggleInactivate')
};
