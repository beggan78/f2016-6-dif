import { FORMATION_STYLES } from '../../components/game/formations/constants';

/**
 * Game-screen utility function for calculating player styling
 * Handles background colors, text colors, borders, and glow effects
 */
export function getPlayerStyling({
  isFieldPosition = false,
  isInactive = false,
  isNextOff = false,
  isNextOn = false,
  isRecentlySubstituted = false,
  hideNextOffIndicator = false,
  supportsInactivePlayers = false,
  role = null, // Add role prop
  isGoalie = false // Add isGoalie prop
}) {
  // Background color logic
  let bgColor = FORMATION_STYLES.bgColors.substitute; // Default for substitute
  
  if (isGoalie) {
    bgColor = FORMATION_STYLES.bgColors.goalie;
  } else if (isFieldPosition) {
    if (role === 'Defender') {
      bgColor = FORMATION_STYLES.bgColors.defenderField;
    } else {
      bgColor = FORMATION_STYLES.bgColors.field;
    }
  }
  
  // Inactive players get dimmed appearance (only for formations that support it)
  if (supportsInactivePlayers && isInactive) {
    bgColor = FORMATION_STYLES.bgColors.inactive;
  }
  
  // Text color logic
  let textColor = FORMATION_STYLES.textColors.substitute; // Default for substitute
  
  if (isFieldPosition) {
    textColor = FORMATION_STYLES.textColors.field;
  }
  
  // Inactive players get dimmed text (only for formations that support it)
  if (supportsInactivePlayers && isInactive) {
    textColor = FORMATION_STYLES.textColors.inactive;
  }
  
  // Border color logic
  let borderColor = FORMATION_STYLES.borderColors.transparent;
  let glowClass = '';
  
  // Recently substituted players override other border colors
  if (isRecentlySubstituted) {
    glowClass = FORMATION_STYLES.glowEffects.recentlySubstituted;
    borderColor = FORMATION_STYLES.borderColors.recentlySubstituted;
  } else {
    // Only apply next indicators if not recently substituted and not hidden
    if (!hideNextOffIndicator) {
      if (isNextOff) {
        borderColor = FORMATION_STYLES.borderColors.nextOff;
      } else if (isNextOn) {
        borderColor = FORMATION_STYLES.borderColors.nextOn;
      }
    }
  }
  
  return {
    bgColor,
    textColor,
    borderColor,
    glowClass
  };
}