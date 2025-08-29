import {
  shouldShowRolePreview,
  getRolePreview,
  getCurrentRole,
  formatRoleDisplay,
  getCompleteRoleInfo,
  getRoleIcon
} from '../rolePreviewUtils';

import { PAIR_ROLE_ROTATION_TYPES } from '../../../constants/teamConfiguration';

describe('Role Preview Utils', () => {
  // Test data
  const mockPairData = {
    defender: 'player1',
    attacker: 'player2'
  };

  const swapEveryRotationConfig = {
    substitutionType: 'pairs',
    pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.SWAP_EVERY_ROTATION
  };

  const keepThroughoutPeriodConfig = {
    substitutionType: 'pairs',
    pairRoleRotation: PAIR_ROLE_ROTATION_TYPES.KEEP_THROUGHOUT_PERIOD
  };

  const individualConfig = {
    substitutionType: 'individual'
  };

  describe('shouldShowRolePreview', () => {
    test('should return true for subPair with swap every rotation', () => {
      expect(shouldShowRolePreview('subPair', swapEveryRotationConfig)).toBe(true);
    });

    test('should return false for subPair with keep throughout period', () => {
      expect(shouldShowRolePreview('subPair', keepThroughoutPeriodConfig)).toBe(false);
    });

    test('should return false for field pairs even with swap rotation', () => {
      expect(shouldShowRolePreview('leftPair', swapEveryRotationConfig)).toBe(false);
      expect(shouldShowRolePreview('rightPair', swapEveryRotationConfig)).toBe(false);
    });

    test('should return false for individual mode', () => {
      expect(shouldShowRolePreview('subPair', individualConfig)).toBe(false);
    });

    test('should return false with null config', () => {
      expect(shouldShowRolePreview('subPair', null)).toBe(false);
    });

    test('should return false with undefined config', () => {
      expect(shouldShowRolePreview('subPair', undefined)).toBe(false);
    });
  });

  describe('getRolePreview', () => {
    test('should return swapped role for defender in swap mode', () => {
      const result = getRolePreview('player1', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toBe('attacker');
    });

    test('should return swapped role for attacker in swap mode', () => {
      const result = getRolePreview('player2', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toBe('defender');
    });

    test('should return null for field pairs', () => {
      const result = getRolePreview('player1', mockPairData, 'leftPair', swapEveryRotationConfig);
      expect(result).toBe(null);
    });

    test('should return null for keep throughout period mode', () => {
      const result = getRolePreview('player1', mockPairData, 'subPair', keepThroughoutPeriodConfig);
      expect(result).toBe(null);
    });

    test('should return null for player not in pair', () => {
      const result = getRolePreview('player3', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toBe(null);
    });

    test('should handle invalid pair data gracefully', () => {
      expect(getRolePreview('player1', null, 'subPair', swapEveryRotationConfig)).toBe(null);
      expect(getRolePreview('player1', {}, 'subPair', swapEveryRotationConfig)).toBe(null);
      expect(getRolePreview('player1', { defender: null }, 'subPair', swapEveryRotationConfig)).toBe(null);
    });

    test('should handle null config gracefully', () => {
      const result = getRolePreview('player1', mockPairData, 'subPair', null);
      expect(result).toBe(null);
    });
  });

  describe('getCurrentRole', () => {
    test('should return defender for defender player', () => {
      expect(getCurrentRole('player1', mockPairData)).toBe('defender');
    });

    test('should return attacker for attacker player', () => {
      expect(getCurrentRole('player2', mockPairData)).toBe('attacker');
    });

    test('should return null for player not in pair', () => {
      expect(getCurrentRole('player3', mockPairData)).toBe(null);
    });

    test('should handle null pair data', () => {
      expect(getCurrentRole('player1', null)).toBe(null);
    });

    test('should handle null player ID', () => {
      expect(getCurrentRole(null, mockPairData)).toBe(null);
    });

    test('should handle empty pair data', () => {
      expect(getCurrentRole('player1', {})).toBe(null);
    });
  });

  describe('formatRoleDisplay', () => {
    test('should format role without preview', () => {
      const result = formatRoleDisplay('defender', null, false);
      expect(result).toEqual({
        currentText: 'D',
        previewText: null,
        hasPreview: false
      });
    });

    test('should format role with preview', () => {
      const result = formatRoleDisplay('defender', 'attacker', true);
      expect(result).toEqual({
        currentText: 'D',
        previewText: 'Next: A',
        hasPreview: true
      });
    });

    test('should format attacker role with preview', () => {
      const result = formatRoleDisplay('attacker', 'defender', true);
      expect(result).toEqual({
        currentText: 'A',
        previewText: 'Next: D',
        hasPreview: true
      });
    });

    test('should handle showPreview false even with preview role', () => {
      const result = formatRoleDisplay('defender', 'attacker', false);
      expect(result).toEqual({
        currentText: 'D',
        previewText: null,
        hasPreview: false
      });
    });

    test('should handle invalid role gracefully', () => {
      const result = formatRoleDisplay('invalid_role', null, false);
      expect(result).toEqual({
        currentText: 'invalid_role',
        previewText: null,
        hasPreview: false
      });
    });
  });

  describe('getCompleteRoleInfo', () => {
    test('should return complete info for defender with preview', () => {
      const result = getCompleteRoleInfo('player1', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toEqual({
        currentRole: 'defender',
        previewRole: 'attacker',
        showPreview: true,
        currentText: 'D',
        previewText: 'Next: A',
        hasPreview: true
      });
    });

    test('should return complete info for attacker with preview', () => {
      const result = getCompleteRoleInfo('player2', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toEqual({
        currentRole: 'attacker',
        previewRole: 'defender',
        showPreview: true,
        currentText: 'A',
        previewText: 'Next: D',
        hasPreview: true
      });
    });

    test('should return complete info without preview for keep mode', () => {
      const result = getCompleteRoleInfo('player1', mockPairData, 'subPair', keepThroughoutPeriodConfig);
      expect(result).toEqual({
        currentRole: 'defender',
        previewRole: null,
        showPreview: false,
        currentText: 'D',
        previewText: null,
        hasPreview: false
      });
    });

    test('should return complete info for field pair (no preview)', () => {
      const result = getCompleteRoleInfo('player1', mockPairData, 'leftPair', swapEveryRotationConfig);
      expect(result).toEqual({
        currentRole: 'defender',
        previewRole: null,
        showPreview: false,
        currentText: 'D',
        previewText: null,
        hasPreview: false
      });
    });

    test('should handle player not in pair', () => {
      const result = getCompleteRoleInfo('player3', mockPairData, 'subPair', swapEveryRotationConfig);
      expect(result).toEqual({
        currentRole: null,
        previewRole: null,
        showPreview: true,
        currentText: null,
        previewText: null,
        hasPreview: false
      });
    });
  });

  describe('getRoleIcon', () => {
    test('should return Shield for defender', () => {
      expect(getRoleIcon('defender')).toBe('Shield');
    });

    test('should return Sword for attacker', () => {
      expect(getRoleIcon('attacker')).toBe('Sword');
    });

    test('should return default Shield for unknown role', () => {
      expect(getRoleIcon('unknown')).toBe('Shield');
    });

    test('should return default Shield for null', () => {
      expect(getRoleIcon(null)).toBe('Shield');
    });

    test('should return default Shield for undefined', () => {
      expect(getRoleIcon(undefined)).toBe('Shield');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete workflow for swap every rotation', () => {
      const playerId = 'player1';
      const pairKey = 'subPair';
      
      // Step 1: Check if preview should be shown
      const shouldShow = shouldShowRolePreview(pairKey, swapEveryRotationConfig);
      expect(shouldShow).toBe(true);
      
      // Step 2: Get current and preview roles
      const currentRole = getCurrentRole(playerId, mockPairData);
      expect(currentRole).toBe('defender');
      
      const previewRole = getRolePreview(playerId, mockPairData, pairKey, swapEveryRotationConfig);
      expect(previewRole).toBe('attacker');
      
      // Step 3: Format for display
      const displayInfo = formatRoleDisplay(currentRole, previewRole, shouldShow);
      expect(displayInfo).toEqual({
        currentText: 'D',
        previewText: 'Next: A',
        hasPreview: true
      });
      
      // Step 4: Get complete info (should match above)
      const completeInfo = getCompleteRoleInfo(playerId, mockPairData, pairKey, swapEveryRotationConfig);
      expect(completeInfo.currentRole).toBe('defender');
      expect(completeInfo.previewRole).toBe('attacker');
      expect(completeInfo.hasPreview).toBe(true);
    });

    test('should handle complete workflow for keep throughout period', () => {
      const playerId = 'player2';
      const pairKey = 'subPair';
      
      const completeInfo = getCompleteRoleInfo(playerId, mockPairData, pairKey, keepThroughoutPeriodConfig);
      expect(completeInfo).toEqual({
        currentRole: 'attacker',
        previewRole: null,
        showPreview: false,
        currentText: 'A',
        previewText: null,
        hasPreview: false
      });
    });
  });
});