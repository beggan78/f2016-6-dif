import { filterNameSuggestions } from '../autocompleteUtils';

describe('filterNameSuggestions', () => {
  it('prioritizes suggestions that start with the query', () => {
    const source = ['Alpha FC', 'City Alpha', 'Beta United', 'Alpine Club'];
    const result = filterNameSuggestions(source, 'Al');
    expect(result).toEqual(['Alpha FC', 'Alpine Club', 'City Alpha']);
  });

  it('removes case-insensitive duplicates and trims values', () => {
    const source = ['  Ajax  ', 'ajax', 'AJAX', 'Spartans'];
    const result = filterNameSuggestions(source, 'Aj');
    expect(result).toEqual(['Ajax']);
  });

  it('returns an empty array when query is blank', () => {
    expect(filterNameSuggestions(['Team A', 'Team B'], '  ')).toEqual([]);
  });

  it('limits the number of results', () => {
    const source = ['Alpha', 'Alberta', 'Alpine', 'Alamo', 'Albion'];
    const result = filterNameSuggestions(source, 'al', { limit: 3 });
    expect(result).toHaveLength(3);
  });
});
