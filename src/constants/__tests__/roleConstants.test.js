/**
 * Tests for roleConstants.js - Role value management and conversion
 */

import {
  DB_ROLE_VALUES,
  DISPLAY_ROLE_VALUES,
  GOAL_SCORING_PRIORITY,
  roleToDatabase,
  roleFromDatabase,
  roleToDisplay,
  roleFromDisplay,
  normalizeRole,
  isValidRole,
  getRolePriority,
  validateRoleInDev
} from '../roleConstants';
import { PLAYER_ROLES } from '../playerConstants';

describe('roleConstants', () => {
  describe('Role Mappings', () => {
    it('should have complete database mapping for all PLAYER_ROLES', () => {
      Object.values(PLAYER_ROLES).forEach(role => {
        expect(DB_ROLE_VALUES[role]).toBeDefined();
        expect(typeof DB_ROLE_VALUES[role]).toBe('string');
      });
    });

    it('should have complete display mapping for all PLAYER_ROLES', () => {
      Object.values(PLAYER_ROLES).forEach(role => {
        expect(DISPLAY_ROLE_VALUES[role]).toBeDefined();
        expect(typeof DISPLAY_ROLE_VALUES[role]).toBe('string');
      });
    });

    it('should have goal scoring priorities for all PLAYER_ROLES except FIELD_PLAYER', () => {
      Object.values(PLAYER_ROLES).forEach(role => {
        if (role !== PLAYER_ROLES.FIELD_PLAYER) {
          expect(GOAL_SCORING_PRIORITY[role]).toBeDefined();
          expect(typeof GOAL_SCORING_PRIORITY[role]).toBe('number');
        }
      });
    });
  });

  describe('roleToDatabase', () => {
    it('should convert PLAYER_ROLES to lowercase database format', () => {
      expect(roleToDatabase(PLAYER_ROLES.GOALIE)).toBe('goalie');
      expect(roleToDatabase(PLAYER_ROLES.DEFENDER)).toBe('defender');
      expect(roleToDatabase(PLAYER_ROLES.ATTACKER)).toBe('attacker');
      expect(roleToDatabase(PLAYER_ROLES.MIDFIELDER)).toBe('midfielder');
      expect(roleToDatabase(PLAYER_ROLES.SUBSTITUTE)).toBe('substitute');
      expect(roleToDatabase(PLAYER_ROLES.FIELD_PLAYER)).toBe('defender');
    });

    it('should handle null/undefined gracefully', () => {
      expect(roleToDatabase(null)).toBe('unknown');
      expect(roleToDatabase(undefined)).toBe('unknown');
      expect(roleToDatabase('')).toBe('unknown');
    });

    it('should handle unknown roles gracefully', () => {
      expect(roleToDatabase('UNKNOWN_ROLE')).toBe('unknown');
      expect(roleToDatabase('invalid')).toBe('unknown');
    });
  });

  describe('roleFromDatabase', () => {
    it('should convert database format to PLAYER_ROLES constants', () => {
      expect(roleFromDatabase('goalie')).toBe(PLAYER_ROLES.GOALIE);
      expect(roleFromDatabase('defender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(roleFromDatabase('attacker')).toBe(PLAYER_ROLES.ATTACKER);
      expect(roleFromDatabase('midfielder')).toBe(PLAYER_ROLES.MIDFIELDER);
      expect(roleFromDatabase('substitute')).toBe(PLAYER_ROLES.SUBSTITUTE);
    });

    it('should handle case insensitive input', () => {
      expect(roleFromDatabase('GOALIE')).toBe(PLAYER_ROLES.GOALIE);
      expect(roleFromDatabase('Defender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(roleFromDatabase('ATTACKER')).toBe(PLAYER_ROLES.ATTACKER);
    });

    it('should handle null/undefined gracefully', () => {
      expect(roleFromDatabase(null)).toBe(PLAYER_ROLES.UNKNOWN);
      expect(roleFromDatabase(undefined)).toBe(PLAYER_ROLES.UNKNOWN);
      expect(roleFromDatabase('')).toBe(PLAYER_ROLES.UNKNOWN);
    });
  });

  describe('roleToDisplay', () => {
    it('should convert PLAYER_ROLES to title case display format', () => {
      expect(roleToDisplay(PLAYER_ROLES.GOALIE)).toBe('Goalie');
      expect(roleToDisplay(PLAYER_ROLES.DEFENDER)).toBe('Defender');
      expect(roleToDisplay(PLAYER_ROLES.ATTACKER)).toBe('Attacker');
      expect(roleToDisplay(PLAYER_ROLES.MIDFIELDER)).toBe('Midfielder');
      expect(roleToDisplay(PLAYER_ROLES.SUBSTITUTE)).toBe('Substitute');
      expect(roleToDisplay(PLAYER_ROLES.FIELD_PLAYER)).toBe('Field');
    });

    it('should handle null/undefined gracefully', () => {
      expect(roleToDisplay(null)).toBe('Unknown');
      expect(roleToDisplay(undefined)).toBe('Unknown');
    });
  });

  describe('normalizeRole', () => {
    it('should handle PLAYER_ROLES constants', () => {
      expect(normalizeRole(PLAYER_ROLES.GOALIE)).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole(PLAYER_ROLES.DEFENDER)).toBe(PLAYER_ROLES.DEFENDER);
    });

    it('should handle database format strings', () => {
      expect(normalizeRole('goalie')).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole('defender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(normalizeRole('attacker')).toBe(PLAYER_ROLES.ATTACKER);
    });

    it('should handle display format strings', () => {
      expect(normalizeRole('Goalie')).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole('Defender')).toBe(PLAYER_ROLES.DEFENDER);
      expect(normalizeRole('Attacker')).toBe(PLAYER_ROLES.ATTACKER);
    });

    it('should handle mixed case formats', () => {
      expect(normalizeRole('GOALIE')).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole('goalie')).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole('Goalie')).toBe(PLAYER_ROLES.GOALIE);
      expect(normalizeRole('gOaLiE')).toBe(PLAYER_ROLES.GOALIE);
    });

    it('should handle null/undefined gracefully', () => {
      expect(normalizeRole(null)).toBe(PLAYER_ROLES.UNKNOWN);
      expect(normalizeRole(undefined)).toBe(PLAYER_ROLES.UNKNOWN);
      expect(normalizeRole('')).toBe(PLAYER_ROLES.UNKNOWN);
    });

    it('should handle unknown values gracefully', () => {
      expect(normalizeRole('unknown')).toBe(PLAYER_ROLES.UNKNOWN);
      expect(normalizeRole('invalid_role')).toBe(PLAYER_ROLES.UNKNOWN);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid PLAYER_ROLES constants', () => {
      Object.values(PLAYER_ROLES).forEach(role => {
        expect(isValidRole(role)).toBe(true);
      });
    });

    it('should return false for invalid values', () => {
      expect(isValidRole('invalid')).toBe(false);
      expect(isValidRole('goalie')).toBe(false); // database format, not constant
      expect(isValidRole('Goalie')).toBe(false); // display format, not constant
      expect(isValidRole(null)).toBe(false);
      expect(isValidRole(undefined)).toBe(false);
    });
  });

  describe('getRolePriority', () => {
    it('should return correct priorities for roles', () => {
      expect(getRolePriority(PLAYER_ROLES.ATTACKER)).toBe(1);
      expect(getRolePriority(PLAYER_ROLES.MIDFIELDER)).toBe(2);
      expect(getRolePriority(PLAYER_ROLES.DEFENDER)).toBe(3);
      expect(getRolePriority(PLAYER_ROLES.GOALIE)).toBe(4);
      expect(getRolePriority(PLAYER_ROLES.SUBSTITUTE)).toBe(5);
    });

    it('should handle unknown roles gracefully', () => {
      expect(getRolePriority('UNKNOWN')).toBe(5); // Should default to substitute priority
    });
  });

  describe('validateRoleInDev', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not throw in production mode', () => {
      process.env.NODE_ENV = 'production';
      expect(() => validateRoleInDev('INVALID_ROLE', 'test')).not.toThrow();
    });

    it('should throw in development mode for invalid roles', () => {
      process.env.NODE_ENV = 'development';
      expect(() => validateRoleInDev('INVALID_ROLE', 'test context'))
        .toThrow('Invalid role "INVALID_ROLE" in test context');
    });

    it('should not throw in development mode for valid roles', () => {
      process.env.NODE_ENV = 'development';
      expect(() => validateRoleInDev(PLAYER_ROLES.GOALIE, 'test')).not.toThrow();
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain consistency in round-trip conversions', () => {
      Object.values(PLAYER_ROLES).forEach(role => {
        if (role === PLAYER_ROLES.FIELD_PLAYER) {
          // FIELD_PLAYER is a special case that maps to 'defender' in database
          const toDb = roleToDatabase(role);
          expect(toDb).toBe('defender');
          const backFromDb = roleFromDatabase(toDb);
          expect(backFromDb).toBe(PLAYER_ROLES.DEFENDER); // Expected behavior
        } else {
          // Normal roles should round-trip correctly
          const toDb = roleToDatabase(role);
          const backFromDb = roleFromDatabase(toDb);
          expect(backFromDb).toBe(role);
        }

        // PLAYER_ROLES -> Display -> PLAYER_ROLES (except FIELD_PLAYER)
        if (role !== PLAYER_ROLES.FIELD_PLAYER) {
          const toDisplay = roleToDisplay(role);
          const backFromDisplay = roleFromDisplay(toDisplay);
          expect(backFromDisplay).toBe(role);
        }
      });
    });
  });
});