import React, { useMemo, useCallback } from 'react';
import { Search, Users, Plus } from 'lucide-react';
import { Input } from '../shared/UI';
import { useTypeaheadDropdown } from '../../hooks/useTypeaheadDropdown';
import { useTranslation } from 'react-i18next';

export function TeamAutocomplete({
  teams = [],
  onSelect,
  onCreateNew,
  placeholder,
  disabled = false,
  loading = false
}) {
  const { t } = useTranslation('team');

  const {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    containerRef,
    inputRef,
    handleFocus,
    handleBlur,
    handleKeyDown
  } = useTypeaheadDropdown();

  const filteredTeams = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return teams;

    const prefixMatches = [];
    const containsMatches = [];

    for (const team of teams) {
      const name = team.name.toLowerCase();
      if (name.startsWith(trimmed)) {
        prefixMatches.push(team);
      } else if (name.includes(trimmed)) {
        containsMatches.push(team);
      }
    }

    return [...prefixMatches, ...containsMatches];
  }, [teams, query]);

  const handleInputChange = useCallback((event) => {
    setQuery(event.target.value);
    setIsOpen(true);
  }, [setQuery, setIsOpen]);

  const handleInputFocus = useCallback((event) => {
    handleFocus(event);
  }, [handleFocus]);

  const handleTeamSelect = useCallback((team) => {
    setQuery(team.name);
    setIsOpen(false);
    onSelect?.(team);
  }, [onSelect, setQuery, setIsOpen]);

  const handleCreateNew = useCallback(() => {
    setIsOpen(false);
    onCreateNew?.(query);
  }, [onCreateNew, query, setIsOpen]);

  const exactMatchExists = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return trimmed && teams.some(team => team.name.toLowerCase() === trimmed);
  }, [teams, query]);

  const showCreateOption = query.trim() && !exactMatchExists && !loading;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('teamAutocomplete.placeholder')}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen && (filteredTeams.length > 0 || showCreateOption) && (
        <div className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-500 rounded-md shadow-lg max-h-64 overflow-auto">
          {filteredTeams.map((team) => (
            <button
              key={team.id}
              onClick={() => handleTeamSelect(team)}
              className="w-full px-3 py-2 text-left hover:bg-slate-600 focus:bg-slate-600 focus:outline-none transition-colors border-b border-slate-600 last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-sky-400 flex-shrink-0" />
                <div className="text-slate-100 font-medium truncate">{team.name}</div>
              </div>
            </button>
          ))}

          {showCreateOption && (
            <button
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left hover:bg-emerald-600/20 focus:bg-emerald-600/20 focus:outline-none transition-colors border-t border-slate-500"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-emerald-300 font-medium">{t('teamAutocomplete.createNewTeam')}</div>
                  <div className="text-emerald-400 text-xs">"{query}"</div>
                </div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
