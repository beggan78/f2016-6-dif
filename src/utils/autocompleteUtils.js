/**
 * Utility helpers for autocomplete/typeahead experiences.
 */

/**
 * Filters a list of string suggestions by query using case-insensitive matching.
 * Results that start with the query are ranked before those that merely include it.
 * Duplicate suggestions (case-insensitive) are removed while preserving original casing.
 *
 * @param {string[]} suggestions - Source suggestions to search through
 * @param {string} query - Input query string
 * @param {Object} [options]
 * @param {number} [options.limit=8] - Maximum number of suggestions to return
 * @returns {string[]} Filtered, de-duplicated, and ranked suggestions
 */
export function filterNameSuggestions(suggestions = [], query = '', options = {}) {
  const limit = typeof options.limit === 'number' && options.limit > 0 ? options.limit : 8;
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return [];
  }

  const seen = new Set();
  const prioritized = [];
  const secondary = [];

  suggestions.forEach((suggestion) => {
    if (!suggestion) return;

    const trimmed = String(suggestion).trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) return;

    if (normalized.startsWith(normalizedQuery)) {
      prioritized.push(trimmed);
      seen.add(normalized);
      return;
    }

    if (normalized.includes(normalizedQuery)) {
      secondary.push(trimmed);
      seen.add(normalized);
    }
  });

  return [...prioritized, ...secondary].slice(0, limit);
}
