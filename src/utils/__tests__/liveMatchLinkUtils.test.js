/**
 * Tests for Live Match Link Utilities
 * URL generation and clipboard operations for live match sharing
 */

import { generateLiveMatchUrl, copyLiveMatchUrlToClipboard } from '../liveMatchLinkUtils';

describe('liveMatchLinkUtils', () => {
  const sampleMatchId = '550e8400-e29b-41d4-a716-446655440000';
  const mockOrigin = 'https://example.com';

  beforeEach(() => {
    // Mock window.location.origin
    delete window.location;
    window.location = { origin: mockOrigin };

    // Suppress console errors in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateLiveMatchUrl', () => {
    it('generates correct URL format with valid matchId', () => {
      const url = generateLiveMatchUrl(sampleMatchId);
      expect(url).toBe(`${mockOrigin}/live/${sampleMatchId}`);
    });

    it('uses window.location.origin', () => {
      window.location.origin = 'https://different-domain.com';
      const url = generateLiveMatchUrl(sampleMatchId);
      expect(url).toBe(`https://different-domain.com/live/${sampleMatchId}`);
    });

    it('handles localhost origin', () => {
      window.location.origin = 'http://localhost:3000';
      const url = generateLiveMatchUrl(sampleMatchId);
      expect(url).toBe(`http://localhost:3000/live/${sampleMatchId}`);
    });

    it('handles matchId with special characters', () => {
      const specialMatchId = '123e4567-e89b-12d3-a456-426614174000';
      const url = generateLiveMatchUrl(specialMatchId);
      expect(url).toBe(`${mockOrigin}/live/${specialMatchId}`);
    });

    it('throws error when matchId is null', () => {
      expect(() => generateLiveMatchUrl(null)).toThrow('Match ID is required to generate live match URL');
    });

    it('throws error when matchId is undefined', () => {
      expect(() => generateLiveMatchUrl(undefined)).toThrow('Match ID is required to generate live match URL');
    });

    it('throws error when matchId is empty string', () => {
      expect(() => generateLiveMatchUrl('')).toThrow('Match ID is required to generate live match URL');
    });

    it('does not validate UUID format (accepts any non-empty string)', () => {
      const invalidUUID = 'not-a-uuid';
      const url = generateLiveMatchUrl(invalidUUID);
      expect(url).toBe(`${mockOrigin}/live/not-a-uuid`);
    });
  });

  describe('copyLiveMatchUrlToClipboard', () => {
    let mockClipboard;

    beforeEach(() => {
      // Create mock clipboard
      mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined)
      };

      // Setup navigator.clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        writable: true,
        configurable: true
      });
    });

    describe('Clipboard API available', () => {
      it('copies URL to clipboard successfully', async () => {
        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          `${mockOrigin}/live/${sampleMatchId}`
        );
        expect(result).toEqual({
          success: true,
          url: `${mockOrigin}/live/${sampleMatchId}`
        });
      });

      it('returns correct URL in result', async () => {
        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.url).toBe(`${mockOrigin}/live/${sampleMatchId}`);
      });

      it('handles clipboard write success', async () => {
        mockClipboard.writeText.mockResolvedValue(undefined);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('handles clipboard write failure', async () => {
        const error = new Error('Permission denied');
        mockClipboard.writeText.mockRejectedValue(error);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.url).toBe(`${mockOrigin}/live/${sampleMatchId}`);
        expect(result.error).toBe('Permission denied');
        expect(console.error).toHaveBeenCalledWith(
          'Failed to copy live match URL:',
          error
        );
      });

      it('handles DOMException from clipboard API', async () => {
        const domException = new DOMException('Document is not focused', 'NotAllowedError');
        mockClipboard.writeText.mockRejectedValue(domException);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Document is not focused');
      });
    });

    describe('Clipboard API unavailable', () => {
      it('returns fallback when navigator.clipboard is undefined', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result).toEqual({
          success: false,
          url: `${mockOrigin}/live/${sampleMatchId}`,
          error: 'Clipboard API not available'
        });
      });

      it('returns fallback when navigator.clipboard.writeText is undefined', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: {},
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result).toEqual({
          success: false,
          url: `${mockOrigin}/live/${sampleMatchId}`,
          error: 'Clipboard API not available'
        });
      });

      it('provides URL for manual copy in fallback', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.url).toBeTruthy();
        expect(result.url).toBe(`${mockOrigin}/live/${sampleMatchId}`);
      });
    });

    describe('Error handling', () => {
      it('throws when matchId is invalid (passes through from generateLiveMatchUrl)', async () => {
        await expect(copyLiveMatchUrlToClipboard(null)).rejects.toThrow(
          'Match ID is required to generate live match URL'
        );
      });

      it('throws when matchId is empty string', async () => {
        await expect(copyLiveMatchUrlToClipboard('')).rejects.toThrow(
          'Match ID is required to generate live match URL'
        );
      });

      it('handles unexpected errors gracefully', async () => {
        const unexpectedError = new Error('Unexpected error');
        mockClipboard.writeText.mockRejectedValue(unexpectedError);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Unexpected error');
        expect(result.url).toBeTruthy();
      });

      it('logs errors to console', async () => {
        const error = new Error('Test error');
        mockClipboard.writeText.mockRejectedValue(error);

        await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(console.error).toHaveBeenCalledWith(
          'Failed to copy live match URL:',
          error
        );
      });

      it('handles non-Error exceptions', async () => {
        mockClipboard.writeText.mockRejectedValue('String error');

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.url).toBeTruthy();
      });
    });

    describe('Integration scenarios', () => {
      it('successful copy workflow', async () => {
        mockClipboard.writeText.mockResolvedValue(undefined);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        // User clicks "Get Live Match Link"
        expect(result.success).toBe(true);
        expect(result.url).toContain('/live/');
        expect(mockClipboard.writeText).toHaveBeenCalled();
      });

      it('fallback display workflow', async () => {
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        // Browser doesn't support Clipboard API
        // UI should display the URL for manual copy
        expect(result.success).toBe(false);
        expect(result.url).toBeTruthy();
        expect(result.error).toBe('Clipboard API not available');
      });

      it('permission denied workflow', async () => {
        mockClipboard.writeText.mockRejectedValue(
          new DOMException('Clipboard write permission denied', 'NotAllowedError')
        );

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        // User denied clipboard permission
        // UI should show error and display URL
        expect(result.success).toBe(false);
        expect(result.url).toBeTruthy();
        expect(result.error).toContain('permission denied');
      });
    });

    describe('Browser compatibility', () => {
      it('works in modern browsers with Clipboard API', async () => {
        // Chrome, Firefox, Safari (recent versions)
        mockClipboard.writeText.mockResolvedValue(undefined);

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(true);
      });

      it('provides fallback for older browsers', async () => {
        // IE11, older Safari, etc.
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.url).toBeTruthy();
      });

      it('handles insecure context (HTTP)', async () => {
        window.location.origin = 'http://example.com'; // HTTP, not HTTPS
        // Clipboard API may not be available in insecure contexts
        Object.defineProperty(navigator, 'clipboard', {
          value: undefined,
          writable: true,
          configurable: true
        });

        const result = await copyLiveMatchUrlToClipboard(sampleMatchId);

        expect(result.success).toBe(false);
        expect(result.url).toContain('http://example.com/live/');
      });
    });

    describe('Edge cases', () => {
      it('handles very long matchId', async () => {
        const longMatchId = 'a'.repeat(100);
        const result = await copyLiveMatchUrlToClipboard(longMatchId);

        expect(result.url).toContain(longMatchId);
      });

      it('handles matchId with URL-unsafe characters', async () => {
        const unsafeMatchId = 'match#123?test=value';
        const result = await copyLiveMatchUrlToClipboard(unsafeMatchId);

        expect(result.url).toContain(unsafeMatchId);
        // Note: This doesn't URL-encode, which may be intentional
      });

      it('handles concurrent clipboard operations', async () => {
        mockClipboard.writeText.mockResolvedValue(undefined);

        const results = await Promise.all([
          copyLiveMatchUrlToClipboard('match-1'),
          copyLiveMatchUrlToClipboard('match-2'),
          copyLiveMatchUrlToClipboard('match-3')
        ]);

        expect(results).toHaveLength(3);
        expect(results.every(r => r.success)).toBe(true);
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(3);
      });
    });
  });
});
