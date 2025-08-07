/**
 * Unit tests for player styling utility functions
 * Tests style calculation logic for player appearance
 */

import { getPlayerStyling } from '../playerStyling';
import { FORMATION_STYLES } from '../../../components/game/formations/constants';

describe('playerStyling', () => {
  describe('getPlayerStyling', () => {
    test('should return default substitute styling', () => {
      const result = getPlayerStyling({});
      
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.substitute);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.substitute);
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
      expect(result.glowClass).toBe('');
    });

    test('should return field player styling', () => {
      const result = getPlayerStyling({
        isFieldPosition: true
      });
      
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.field);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.field);
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
      expect(result.glowClass).toBe('');
    });

    test('should handle inactive player styling when supported', () => {
      const result = getPlayerStyling({
        isInactive: true,
        supportsInactiveUsers: true
      });
      
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.inactive);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.inactive);
    });

    test('should ignore inactive styling when not supported', () => {
      const result = getPlayerStyling({
        isInactive: true,
        supportsInactiveUsers: false
      });
      
      // Should use default substitute styling since inactive is not supported
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.substitute);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.substitute);
    });

    test('should show next off indicator', () => {
      const result = getPlayerStyling({
        isNextOff: true
      });
      
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.nextOff);
      expect(result.glowClass).toBe('');
    });

    test('should show next on indicator', () => {
      const result = getPlayerStyling({
        isNextOn: true
      });
      
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.nextOn);
      expect(result.glowClass).toBe('');
    });

    test('should hide next off indicator when hideNextOffIndicator is true', () => {
      const result = getPlayerStyling({
        isNextOff: true,
        hideNextOffIndicator: true
      });
      
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
    });

    test('should hide next on indicator when hideNextOffIndicator is true', () => {
      const result = getPlayerStyling({
        isNextOn: true,
        hideNextOffIndicator: true
      });
      
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
    });

    test('should prioritize recently substituted over next indicators', () => {
      const result = getPlayerStyling({
        isNextOff: true,
        isNextOn: true,
        isRecentlySubstituted: true
      });
      
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.recentlySubstituted);
      expect(result.glowClass).toBe(FORMATION_STYLES.glowEffects.recentlySubstituted);
    });

    test('should combine field position with next indicators', () => {
      const result = getPlayerStyling({
        isFieldPosition: true,
        isNextOff: true
      });
      
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.field);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.field);
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.nextOff);
    });

    test('should combine inactive with field position when supported', () => {
      const result = getPlayerStyling({
        isFieldPosition: true,
        isInactive: true,
        supportsInactiveUsers: true
      });
      
      // Inactive styling should override field styling
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.inactive);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.inactive);
    });

    test('should handle multiple flags with precedence rules', () => {
      const result = getPlayerStyling({
        isFieldPosition: true,
        isInactive: true,
        isNextOff: true,
        isRecentlySubstituted: true,
        supportsInactiveUsers: true
      });
      
      // Recently substituted should take precedence for border/glow
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.recentlySubstituted);
      expect(result.glowClass).toBe(FORMATION_STYLES.glowEffects.recentlySubstituted);
      
      // Inactive should take precedence for background/text
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.inactive);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.inactive);
    });

    test('should handle conflicting next indicators (nextOff takes precedence)', () => {
      const result = getPlayerStyling({
        isNextOff: true,
        isNextOn: true
      });
      
      // nextOff should take precedence when both are true
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.nextOff);
    });

    test('should return all expected properties', () => {
      const result = getPlayerStyling({});
      
      expect(result).toHaveProperty('bgColor');
      expect(result).toHaveProperty('textColor');
      expect(result).toHaveProperty('borderColor');
      expect(result).toHaveProperty('glowClass');
      
      expect(typeof result.bgColor).toBe('string');
      expect(typeof result.textColor).toBe('string');
      expect(typeof result.borderColor).toBe('string');
      expect(typeof result.glowClass).toBe('string');
    });

    test('should handle null/undefined flags gracefully', () => {
      const result = getPlayerStyling({
        isFieldPosition: null,
        isInactive: undefined,
        isNextOff: null,
        isNextOn: undefined,
        isRecentlySubstituted: null,
        hideNextOffIndicator: undefined,
        supportsInactiveUsers: null
      });
      
      // Should treat null/undefined as false and return default styling
      expect(result.bgColor).toBe(FORMATION_STYLES.bgColors.substitute);
      expect(result.textColor).toBe(FORMATION_STYLES.textColors.substitute);
      expect(result.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
      expect(result.glowClass).toBe('');
    });
  });

  describe('integration scenarios', () => {
    test('should handle typical field player scenarios', () => {
      // Regular field player
      const regular = getPlayerStyling({ isFieldPosition: true });
      expect(regular.bgColor).toBe(FORMATION_STYLES.bgColors.field);
      
      // Field player next to come off
      const nextOff = getPlayerStyling({ 
        isFieldPosition: true, 
        isNextOff: true 
      });
      expect(nextOff.borderColor).toBe(FORMATION_STYLES.borderColors.nextOff);
      
      // Recently substituted field player
      const recentlySub = getPlayerStyling({ 
        isFieldPosition: true, 
        isRecentlySubstituted: true 
      });
      expect(recentlySub.glowClass).toBe(FORMATION_STYLES.glowEffects.recentlySubstituted);
    });

    test('should handle typical substitute player scenarios', () => {
      // Regular substitute
      const regular = getPlayerStyling({});
      expect(regular.bgColor).toBe(FORMATION_STYLES.bgColors.substitute);
      
      // Substitute next to come on
      const nextOn = getPlayerStyling({ isNextOn: true });
      expect(nextOn.borderColor).toBe(FORMATION_STYLES.borderColors.nextOn);
      
      // Inactive substitute (7-player mode)
      const inactive = getPlayerStyling({ 
        isInactive: true, 
        supportsInactiveUsers: true 
      });
      expect(inactive.bgColor).toBe(FORMATION_STYLES.bgColors.inactive);
    });

    test('should handle animation state scenarios', () => {
      // During animation (indicators hidden)
      const duringAnimation = getPlayerStyling({
        isNextOff: true,
        hideNextOffIndicator: true
      });
      expect(duringAnimation.borderColor).toBe(FORMATION_STYLES.borderColors.transparent);
      
      // Recently substituted (post-animation glow)
      const postAnimation = getPlayerStyling({
        isRecentlySubstituted: true
      });
      expect(postAnimation.glowClass).toBe(FORMATION_STYLES.glowEffects.recentlySubstituted);
    });
  });
});