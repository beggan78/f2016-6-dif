import { sanitizeNameInput, isValidNameInput } from '../inputSanitization';

describe('sanitizeNameInput', () => {
  describe('basic functionality', () => {
    it('should return valid names unchanged', () => {
      expect(sanitizeNameInput('John Doe')).toBe('John Doe');
      expect(sanitizeNameInput('Anna-Maria')).toBe('Anna-Maria');
      expect(sanitizeNameInput("O'Connor")).toBe("O'Connor");
      expect(sanitizeNameInput('FC Barcelona & Real Madrid')).toBe('FC Barcelona & Real Madrid');
      expect(sanitizeNameInput('Team U.S.A.')).toBe('Team U.S.A.');
    });

    it('should handle empty and whitespace inputs', () => {
      expect(sanitizeNameInput('')).toBe('');
      expect(sanitizeNameInput('   ')).toBe('   ');
      expect(sanitizeNameInput('\t\n')).toBe('\t\n');
    });

    it('should preserve numbers in names', () => {
      expect(sanitizeNameInput('Team 123')).toBe('Team 123');
      expect(sanitizeNameInput('Player1')).toBe('Player1');
      expect(sanitizeNameInput('FC 2023')).toBe('FC 2023');
    });
  });

  describe('type handling', () => {
    it('should handle non-string inputs', () => {
      expect(sanitizeNameInput(null)).toBe('');
      expect(sanitizeNameInput(undefined)).toBe('');
      expect(sanitizeNameInput(123)).toBe('');
      expect(sanitizeNameInput({})).toBe('');
      expect(sanitizeNameInput([])).toBe('');
      expect(sanitizeNameInput(true)).toBe('');
    });
  });

  describe('length restrictions', () => {
    it('should truncate names longer than 50 characters', () => {
      const longName = 'A'.repeat(60);
      const result = sanitizeNameInput(longName);
      expect(result).toHaveLength(50);
      expect(result).toBe('A'.repeat(50));
    });

    it('should preserve names exactly 50 characters', () => {
      const exactName = 'A'.repeat(50);
      const result = sanitizeNameInput(exactName);
      expect(result).toBe(exactName);
      expect(result).toHaveLength(50);
    });

    it('should preserve names under 50 characters', () => {
      const shortName = 'Short Name';
      const result = sanitizeNameInput(shortName);
      expect(result).toBe(shortName);
    });
  });

  describe('character filtering', () => {
    it('should remove special characters not in allowed pattern', () => {
      expect(sanitizeNameInput('John@Doe')).toBe('JohnDoe');
      expect(sanitizeNameInput('Team#1')).toBe('Team1');
      expect(sanitizeNameInput('Player$%^')).toBe('Player');
      expect(sanitizeNameInput('Name(with)parentheses')).toBe('Namewithparentheses');
    });

    it('should preserve allowed special characters', () => {
      expect(sanitizeNameInput("Player's-Name")).toBe("Player's-Name");
      expect(sanitizeNameInput('Team & Co.')).toBe('Team & Co.');
      expect(sanitizeNameInput('FC-Real')).toBe('FC-Real');
    });

    it('should handle Unicode characters correctly', () => {
      expect(sanitizeNameInput('José')).toBe('José');
      expect(sanitizeNameInput('François')).toBe('François');
      expect(sanitizeNameInput('Müller')).toBe('Müller');
      expect(sanitizeNameInput('Ñoño')).toBe('Ñoño');
      expect(sanitizeNameInput('Björk')).toBe('Björk');
    });

    it('should remove emojis and symbols', () => {
      expect(sanitizeNameInput('Player 😊')).toBe('Player ');
      expect(sanitizeNameInput('Team ⚽')).toBe('Team ');
      expect(sanitizeNameInput('Name™')).toBe('Name');
      expect(sanitizeNameInput('Player©')).toBe('Player');
    });

    it('should handle mixed valid and invalid characters', () => {
      expect(sanitizeNameInput('John@Doe-Smith')).toBe('JohnDoe-Smith');
      expect(sanitizeNameInput("Player's#Team")).toBe("Player'sTeam");
      expect(sanitizeNameInput('FC&Real*Madrid')).toBe('FC&RealMadrid');
    });
  });

  describe('edge cases', () => {
    it('should handle strings with only invalid characters', () => {
      expect(sanitizeNameInput('@#$%^&*()')).toBe('&');
      expect(sanitizeNameInput('!@#$%^*()')).toBe('');
      expect(sanitizeNameInput('🏈⚽🏀')).toBe('');
    });

    it('should handle very long strings with invalid characters', () => {
      const longInvalidName = '@'.repeat(100);
      const result = sanitizeNameInput(longInvalidName);
      expect(result).toBe('');
    });

    it('should handle strings with newlines and tabs', () => {
      expect(sanitizeNameInput('Name\nWith\nNewlines')).toBe('Name\nWith\nNewlines');
      expect(sanitizeNameInput('Name\tWith\tTabs')).toBe('Name\tWith\tTabs');
    });

    it('should handle strings with multiple spaces', () => {
      expect(sanitizeNameInput('John    Doe')).toBe('John    Doe');
      expect(sanitizeNameInput('  Leading  and  trailing  ')).toBe('  Leading  and  trailing  ');
    });
  });

  describe('combined length and character restrictions', () => {
    it('should truncate then filter invalid characters', () => {
      const longNameWithSpecialChars = 'A'.repeat(30) + '@#$%^&*()' + 'B'.repeat(30);
      const result = sanitizeNameInput(longNameWithSpecialChars);
      expect(result).toHaveLength(42); // 30 A's + 1 & + 11 B's (truncated after filtering)
      expect(result).toBe('A'.repeat(30) + '&' + 'B'.repeat(11)); // & is allowed, others filtered
    });

    it('should handle edge case where filtering reduces length below limit', () => {
      const longNameMostlyInvalid = 'Valid'.repeat(2) + '@#$%'.repeat(20);
      const result = sanitizeNameInput(longNameMostlyInvalid);
      expect(result).toBe('ValidValid');
      expect(result.length).toBeLessThan(50);
    });
  });
});

describe('isValidNameInput', () => {
  describe('basic validation', () => {
    it('should validate correct names', () => {
      expect(isValidNameInput('John Doe')).toBe(true);
      expect(isValidNameInput('Anna-Maria')).toBe(true);
      expect(isValidNameInput("O'Connor")).toBe(true);
      expect(isValidNameInput('Team & Co.')).toBe(true);
      expect(isValidNameInput('Player123')).toBe(true);
    });

    it('should invalidate incorrect names', () => {
      expect(isValidNameInput('John@Doe')).toBe(false);
      expect(isValidNameInput('Player#1')).toBe(false);
      expect(isValidNameInput('Name$%^')).toBe(false);
      expect(isValidNameInput('Player 😊')).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should return false for non-string inputs', () => {
      expect(isValidNameInput(null)).toBe(false);
      expect(isValidNameInput(undefined)).toBe(false);
      expect(isValidNameInput(123)).toBe(false);
      expect(isValidNameInput({})).toBe(false);
      expect(isValidNameInput([])).toBe(false);
      expect(isValidNameInput(true)).toBe(false);
    });
  });

  describe('length validation', () => {
    it('should validate names within length limit', () => {
      expect(isValidNameInput('Short')).toBe(true);
      expect(isValidNameInput('A'.repeat(50))).toBe(true);
      expect(isValidNameInput('A'.repeat(49))).toBe(true);
    });

    it('should invalidate names exceeding length limit', () => {
      expect(isValidNameInput('A'.repeat(51))).toBe(false);
      expect(isValidNameInput('A'.repeat(100))).toBe(false);
    });
  });

  describe('whitespace handling', () => {
    it('should trim input before validation', () => {
      expect(isValidNameInput('  John Doe  ')).toBe(true);
      expect(isValidNameInput('\tJohn Doe\t')).toBe(true);
      expect(isValidNameInput('\nJohn Doe\n')).toBe(true);
    });

    it('should validate empty string after trimming', () => {
      expect(isValidNameInput('')).toBe(true);
      expect(isValidNameInput('   ')).toBe(true);
      expect(isValidNameInput('\t\n')).toBe(true);
    });

    it('should handle long input that becomes valid after trimming', () => {
      const name = '  ' + 'A'.repeat(50) + '  '; // 54 chars total, 50 after trim
      expect(isValidNameInput(name)).toBe(true);
    });

    it('should handle long input that remains invalid after trimming', () => {
      const name = '  ' + 'A'.repeat(51) + '  '; // 55 chars total, 51 after trim
      expect(isValidNameInput(name)).toBe(false);
    });
  });

  describe('character validation', () => {
    it('should validate Unicode characters', () => {
      expect(isValidNameInput('José')).toBe(true);
      expect(isValidNameInput('François')).toBe(true);
      expect(isValidNameInput('Müller')).toBe(true);
      expect(isValidNameInput('Ñoño')).toBe(true);
    });

    it('should invalidate special symbols', () => {
      expect(isValidNameInput('Player™')).toBe(false);
      expect(isValidNameInput('Name©')).toBe(false);
      expect(isValidNameInput('Team®')).toBe(false);
    });

    it('should validate allowed punctuation', () => {
      expect(isValidNameInput("Player's Name")).toBe(true);
      expect(isValidNameInput('Multi-Word Name')).toBe(true);
      expect(isValidNameInput('Team & Co.')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle extreme cases', () => {
      expect(isValidNameInput('')).toBe(true);
      expect(isValidNameInput('1')).toBe(true);
      expect(isValidNameInput('A')).toBe(true);
      expect(isValidNameInput("'")).toBe(true);
      expect(isValidNameInput('-')).toBe(true);
      expect(isValidNameInput('&')).toBe(true);
      expect(isValidNameInput('.')).toBe(true);
    });

    it('should handle complex valid names', () => {
      expect(isValidNameInput("Mary-Jane O'Connor-Smith Jr.")).toBe(true);
      expect(isValidNameInput('FC Real Madrid & Barcelona 2023')).toBe(true);
      expect(isValidNameInput('Jean-François André-Pierre')).toBe(true);
    });
  });
});

describe('input sanitization integration', () => {
  it('should make invalid names valid through sanitization', () => {
    const invalidName = 'John@Doe#123';
    expect(isValidNameInput(invalidName)).toBe(false);
    
    const sanitizedName = sanitizeNameInput(invalidName);
    expect(isValidNameInput(sanitizedName)).toBe(true);
    expect(sanitizedName).toBe('JohnDoe123');
  });

  it('should handle edge case where sanitization results in valid name', () => {
    const nameWithInvalidChars = 'Valid@Name#With$Invalid%Chars';
    expect(isValidNameInput(nameWithInvalidChars)).toBe(false);
    
    const sanitized = sanitizeNameInput(nameWithInvalidChars);
    expect(sanitized).toBe('ValidNameWithInvalidChars');
    expect(isValidNameInput(sanitized)).toBe(true);
  });

  it('should handle long invalid names', () => {
    const longInvalidName = 'A'.repeat(30) + '@#$%^' + 'B'.repeat(30);
    expect(isValidNameInput(longInvalidName)).toBe(false);
    
    const sanitized = sanitizeNameInput(longInvalidName);
    expect(sanitized.length).toBeLessThanOrEqual(50);
    expect(isValidNameInput(sanitized)).toBe(true);
  });

  it('should maintain consistency between validation and sanitization', () => {
    const testCases = [
      'John Doe',
      'Anna-Maria',
      "O'Connor",
      'Team & Co.',
      'Player123',
      'José François',
      'Müller-Smith',
      'FC Real Madrid'
    ];

    testCases.forEach(name => {
      expect(isValidNameInput(name)).toBe(true);
      expect(sanitizeNameInput(name)).toBe(name);
    });
  });

  it('should ensure sanitized names always pass validation', () => {
    const testInputs = [
      'Valid Name',
      'Invalid@Name',
      'Too#Many$Special%Chars',
      'A'.repeat(100), // Too long
      '   Trimmed   ',
      'Unicode: José François Müller',
      'Mixed: Valid@Invalid#Characters',
      ''
    ];

    testInputs.forEach(input => {
      const sanitized = sanitizeNameInput(input);
      expect(isValidNameInput(sanitized)).toBe(true);
    });
  });
});