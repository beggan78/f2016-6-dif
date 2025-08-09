/**
 * Unit tests for UI position utility functions
 * Tests position-related UI utilities for rendering consistency
 */

import React from 'react';
import {
  getPositionIcon,
  getPositionDisplayName,
  getIndicatorProps,
  getPositionEvents,
  supportsNextNextIndicators
} from '../positionUtils';
import { supportsInactiveUsers } from '../../../constants/gameModes';

import { TEAM_CONFIGS } from '../../testUtils';
import { createTeamConfig } from '../../../constants/teamConfiguration';
import { POSITION_KEYS } from '../../../constants/positionConstants';
import { createMockPlayers } from '../../testUtils';

// Mock the Lucide React icons
jest.mock('lucide-react', () => {
  const mockReact = require('react');
  return {
    Shield: ({ className }) => mockReact.createElement('div', { 'data-testid': 'shield-icon', className }),
    Sword: ({ className }) => mockReact.createElement('div', { 'data-testid': 'sword-icon', className }),
    RotateCcw: ({ className }) => mockReact.createElement('div', { 'data-testid': 'rotate-ccw-icon', className })
  };
});

describe('UI positionUtils', () => {
  const mockSubstitutePositions6 = [POSITION_KEYS.SUBSTITUTE_1];
  const mockSubstitutePositions7 = [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2];
  const mockSubstitutePositions8 = [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.SUBSTITUTE_3];
  const mockSubstitutePositions9 = [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.SUBSTITUTE_3, 'substitute_4'];
  const mockSubstitutePositions10 = [POSITION_KEYS.SUBSTITUTE_1, POSITION_KEYS.SUBSTITUTE_2, POSITION_KEYS.SUBSTITUTE_3, 'substitute_4', 'substitute_5'];
  const mockSubstitutePositionsPairs = [POSITION_KEYS.SUB_PAIR];

  describe('getPositionIcon', () => {
    test('should return RotateCcw icon for substitute positions', () => {
      const result1 = getPositionIcon('substitute_1', mockSubstitutePositions6);
      const result2 = getPositionIcon('substitute_1', mockSubstitutePositions7);
      const result3 = getPositionIcon('substitute_2', mockSubstitutePositions7);
      
      expect(result1.type.name).toBe('RotateCcw');
      expect(result2.type.name).toBe('RotateCcw');
      expect(result3.type.name).toBe('RotateCcw');
    });
  });

  describe('getPositionDisplayName', () => {

    test('should return proper display names for individual 7 positions', () => {
      expect(getPositionDisplayName('leftDefender', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Left Defender');
      expect(getPositionDisplayName('rightDefender', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Right Defender');
      expect(getPositionDisplayName('leftAttacker', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Left Attacker');
      expect(getPositionDisplayName('rightAttacker', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Right Attacker');
      expect(getPositionDisplayName('substitute_1', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_2', null, TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7)).toBe('Substitute');
    });

    test('should return proper display names for individual 9 positions', () => {
      expect(getPositionDisplayName('leftDefender', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Left Defender');
      expect(getPositionDisplayName('rightDefender', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Right Defender');
      expect(getPositionDisplayName('leftAttacker', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Left Attacker');
      expect(getPositionDisplayName('rightAttacker', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Right Attacker');
      expect(getPositionDisplayName('substitute_1', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_2', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_3', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_4', null, TEAM_CONFIGS.INDIVIDUAL_9, mockSubstitutePositions9)).toBe('Substitute');
    });

    test('should return proper display names for individual 10 positions', () => {
      expect(getPositionDisplayName('leftDefender', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Left Defender');
      expect(getPositionDisplayName('rightDefender', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Right Defender');
      expect(getPositionDisplayName('leftAttacker', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Left Attacker');
      expect(getPositionDisplayName('rightAttacker', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Right Attacker');
      expect(getPositionDisplayName('substitute_1', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_2', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_3', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_4', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Substitute');
      expect(getPositionDisplayName('substitute_5', null, TEAM_CONFIGS.INDIVIDUAL_10, mockSubstitutePositions10)).toBe('Substitute');
    });

    test('should return proper display names for pair positions', () => {
      expect(getPositionDisplayName('leftPair', null, TEAM_CONFIGS.PAIRS_7, mockSubstitutePositionsPairs)).toBe('leftPair');
      expect(getPositionDisplayName('rightPair', null, TEAM_CONFIGS.PAIRS_7, mockSubstitutePositionsPairs)).toBe('rightPair');
      expect(getPositionDisplayName('subPair', null, TEAM_CONFIGS.PAIRS_7, mockSubstitutePositionsPairs)).toBe('subPair');
    });

    test('should handle inactive player status', () => {
      const mockPlayers = createMockPlayers(7, TEAM_CONFIGS.INDIVIDUAL_7);
      // Make player inactive
      mockPlayers[4].stats.isInactive = true;
      
      const displayName = getPositionDisplayName('substitute_1', mockPlayers[4], TEAM_CONFIGS.INDIVIDUAL_7, mockSubstitutePositions7);
      expect(displayName).toBe('Inactive');
    });

    test('should return position key for unknown positions', () => {
      expect(getPositionDisplayName('unknownPosition', null, TEAM_CONFIGS.INDIVIDUAL_6, mockSubstitutePositions6)).toBe('unknownPosition');
      expect(getPositionDisplayName('', null, TEAM_CONFIGS.INDIVIDUAL_6, mockSubstitutePositions6)).toBe('');
    });

    test('should handle null/undefined inputs', () => {
      expect(getPositionDisplayName(null, null, TEAM_CONFIGS.INDIVIDUAL_6, mockSubstitutePositions6)).toBe(null);
      expect(getPositionDisplayName(undefined, null, TEAM_CONFIGS.INDIVIDUAL_6, mockSubstitutePositions6)).toBe(undefined);
    });

    test('should show inactive for both individual modes that support it', () => {
      const mockPlayer = { stats: { isInactive: true } };
      
      const displayName = getPositionDisplayName('substitute_1', mockPlayer, TEAM_CONFIGS.INDIVIDUAL_6, mockSubstitutePositions6);
      expect(displayName).toBe('Inactive'); // Both INDIVIDUAL_6 and INDIVIDUAL_7 modes support inactive players
    });
  });

  describe('getIndicatorProps', () => {
    test('should return next off indicator props for field player', () => {
      const mockPlayer = { id: '1' };
      const props = getIndicatorProps(mockPlayer, 'leftDefender', TEAM_CONFIGS.INDIVIDUAL_6, '1', '2', mockSubstitutePositions6);
      
      expect(props.isNextOff).toBe(true);
      expect(props.isNextOn).toBe(false);
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(false);
    });

    test('should return next on indicator props for first substitute', () => {
      const mockPlayer = { id: '5' };
      const props = getIndicatorProps(mockPlayer, 'substitute_1', TEAM_CONFIGS.INDIVIDUAL_6, '1', '2', mockSubstitutePositions6);
      
      expect(props.isNextOff).toBe(false);
      expect(props.isNextOn).toBe(true); // First substitute position
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(false);
    });

    test('should return next-next indicators for INDIVIDUAL_7', () => {
      const mockPlayer = { id: '2' };
      const props = getIndicatorProps(mockPlayer, 'rightDefender', TEAM_CONFIGS.INDIVIDUAL_7, '1', '2', mockSubstitutePositions7);
      
      expect(props.isNextOff).toBe(false);
      expect(props.isNextOn).toBe(false);
      expect(props.isNextNextOff).toBe(true); // nextNextPlayerIdToSubOut matches
      expect(props.isNextNextOn).toBe(false);
    });

    test('should return next-next on for second substitute in INDIVIDUAL_7', () => {
      const mockPlayer = { id: '6' };
      const props = getIndicatorProps(mockPlayer, 'substitute_2', TEAM_CONFIGS.INDIVIDUAL_7, '1', '2', mockSubstitutePositions7);
      
      expect(props.isNextOff).toBe(false);
      expect(props.isNextOn).toBe(false);
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(true); // Second substitute position
    });

    test('should handle no indicators when player is not next', () => {
      const mockPlayer = { id: '3' };
      const props = getIndicatorProps(mockPlayer, 'leftAttacker', TEAM_CONFIGS.INDIVIDUAL_6, '1', '2', mockSubstitutePositions6);
      
      expect(props.isNextOff).toBe(false);
      expect(props.isNextOn).toBe(false);
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(false);
    });

    test('should handle null/undefined inputs', () => {
      const props = getIndicatorProps(null, 'leftDefender', TEAM_CONFIGS.INDIVIDUAL_6, '1', '2', mockSubstitutePositions6);
      
      expect(props.isNextOff).toBe(false);
      expect(props.isNextOn).toBe(false);
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(false);
    });

    test('should disable next-next indicators for non-INDIVIDUAL_7 formations', () => {
      const mockPlayer = { id: '2' };
      const props = getIndicatorProps(mockPlayer, 'rightDefender', TEAM_CONFIGS.INDIVIDUAL_6, '1', '2', mockSubstitutePositions6);
      
      expect(props.isNextNextOff).toBe(false);
      expect(props.isNextNextOn).toBe(false);
    });
  });

  describe('getPositionEvents', () => {
    test('should extract events for valid position', () => {
      const mockHandlers = {
        leftDefenderEvents: { onMouseDown: jest.fn(), onTouchStart: jest.fn() }
      };
      
      const events = getPositionEvents(mockHandlers, 'leftDefender');
      
      expect(events.onMouseDown).toBe(mockHandlers.leftDefenderEvents.onMouseDown);
      expect(events.onTouchStart).toBe(mockHandlers.leftDefenderEvents.onTouchStart);
    });

    test('should return empty object for missing handlers', () => {
      const mockHandlers = {};
      
      const events = getPositionEvents(mockHandlers, 'leftDefender');
      
      expect(events).toEqual({});
    });

    test('should handle null/undefined inputs', () => {
      expect(getPositionEvents({}, null)).toEqual({});
      // Note: getPositionEvents(null, 'leftDefender') will throw because it tries to access null[property]
      // This is the actual behavior - testing that it behaves as expected
      expect(() => getPositionEvents(null, 'leftDefender')).toThrow();
      expect(() => getPositionEvents(null, null)).toThrow();
    });

    test('should handle position with no events', () => {
      const mockHandlers = {
        rightDefenderEvents: { onMouseDown: jest.fn() }
      };
      
      const events = getPositionEvents(mockHandlers, 'leftDefender');
      
      expect(events).toEqual({});
    });

    test('should construct correct event key', () => {
      const mockHandlers = {
        substitute_1Events: { onLongPress: jest.fn() }
      };
      
      const events = getPositionEvents(mockHandlers, 'substitute_1');
      
      expect(events.onLongPress).toBe(mockHandlers.substitute_1Events.onLongPress);
    });
  });

  describe('formation support checks', () => {
    describe('supportsInactiveUsers', () => {
      test('should return true for both individual modes (6-player and 7-player)', () => {
        expect(supportsInactiveUsers(TEAM_CONFIGS.INDIVIDUAL_7)).toBe(true);
        expect(supportsInactiveUsers(TEAM_CONFIGS.INDIVIDUAL_6)).toBe(true);
        expect(supportsInactiveUsers(TEAM_CONFIGS.PAIRS_7)).toBe(false);
      });
    });

    describe('supportsNextNextIndicators', () => {
      test('should return true only for INDIVIDUAL_7', () => {
        expect(supportsNextNextIndicators(TEAM_CONFIGS.INDIVIDUAL_7)).toBe(true);
        expect(supportsNextNextIndicators(TEAM_CONFIGS.INDIVIDUAL_6)).toBe(false);
        expect(supportsNextNextIndicators(TEAM_CONFIGS.PAIRS_7)).toBe(false);
      });

    });
  });

  describe('integration with team configs', () => {
    test('should provide consistent behavior across team configs', () => {
      const teamConfigs = [
        TEAM_CONFIGS.INDIVIDUAL_6,
        TEAM_CONFIGS.INDIVIDUAL_7,
        TEAM_CONFIGS.PAIRS_7
      ];
      
      teamConfigs.forEach(teamConfig => {
        // Team mode support checks should be consistent
        const supportsInactive = supportsInactiveUsers(teamConfig);
        const supportsNextNext = supportsNextNextIndicators(teamConfig);
        
        expect(typeof supportsInactive).toBe('boolean');
        expect(typeof supportsNextNext).toBe('boolean');
        
        // Check expected values for each mode
        if (teamConfig === TEAM_CONFIGS.INDIVIDUAL_7) {
          expect(supportsInactive).toBe(true); // 7-player individual mode supports inactive players
          expect(supportsNextNext).toBe(true);
        } else if (teamConfig === TEAM_CONFIGS.INDIVIDUAL_6) {
          expect(supportsInactive).toBe(true); // 6-player individual mode also supports inactive players
          expect(supportsNextNext).toBe(false);
        } else {
          expect(supportsInactive).toBe(false); // Only pairs mode doesn't support inactive players
          expect(supportsNextNext).toBe(false);
        }
      });
    });

    test('should handle indicator props consistently for each team mode', () => {
      const teamConfigs = [
        { type: TEAM_CONFIGS.INDIVIDUAL_6, subs: mockSubstitutePositions6 },
        { type: TEAM_CONFIGS.INDIVIDUAL_7, subs: mockSubstitutePositions7 },
        { type: TEAM_CONFIGS.PAIRS_7, subs: mockSubstitutePositionsPairs }
      ];
      
      teamConfigs.forEach(({ type: teamConfig, subs: substitutePositions }) => {
        const mockPlayer = { id: '1' };
        // Test basic indicator logic - player ID '1' is nextPlayerIdToSubOut, player ID '2' is nextNextPlayerIdToSubOut
        const props = getIndicatorProps(mockPlayer, 'leftDefender', teamConfig, '1', '2', substitutePositions);
        
        expect(typeof props.isNextOff).toBe('boolean');
        expect(typeof props.isNextOn).toBe('boolean');
        expect(typeof props.isNextNextOff).toBe('boolean');
        expect(typeof props.isNextNextOn).toBe('boolean');
        
        // Should always show nextOff when nextPlayerIdToSubOut matches
        expect(props.isNextOff).toBe(true);
        
        // Next-next indicators should only appear for INDIVIDUAL_7
        if (teamConfig === TEAM_CONFIGS.INDIVIDUAL_7) {
          // Player '1' is nextPlayerIdToSubOut, not nextNextPlayerIdToSubOut ('2'), so isNextNextOff should be false
          expect(props.isNextNextOff).toBe(false);
        } else {
          expect(props.isNextNextOff).toBe(false);
          expect(props.isNextNextOn).toBe(false);
        }
      });
    });

    test('should show next-next indicators correctly for INDIVIDUAL_7', () => {
      const mockPlayer = { id: '2' }; // This player is nextNextPlayerIdToSubOut
      const props = getIndicatorProps(mockPlayer, 'rightDefender', TEAM_CONFIGS.INDIVIDUAL_7, '1', '2', mockSubstitutePositions7);
      
      expect(props.isNextOff).toBe(false); // Not the next player to sub out
      expect(props.isNextNextOff).toBe(true); // This is the next-next player to sub out
    });
  });
});