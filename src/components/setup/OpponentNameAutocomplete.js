import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Search, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../shared/UI';
import { useTypeaheadDropdown } from '../../hooks/useTypeaheadDropdown';
import { useOpponentNameSuggestions } from '../../hooks/useOpponentNameSuggestions';
import { filterNameSuggestions } from '../../utils/autocompleteUtils';

export function OpponentNameAutocomplete({
  teamId,
  value,
  onChange,
  onSelect,
  placeholder,
  disabled = false,
  inputId
}) {
  const { t } = useTranslation('configuration');
  const { names, loading, error } = useOpponentNameSuggestions(teamId);

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
  } = useTypeaheadDropdown({ initialValue: value || '' });

  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const filteredSuggestions = useMemo(() => {
    return filterNameSuggestions(names, query, { limit: 8 });
  }, [names, query]);

  const showSuggestions = isOpen && filteredSuggestions.length > 0;
  const showEmptyState = isOpen && !loading && query.trim().length > 0 && filteredSuggestions.length === 0;

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!showSuggestions && highlightedIndex !== -1) {
      setHighlightedIndex(-1);
      return;
    }

    if (showSuggestions && highlightedIndex >= filteredSuggestions.length) {
      setHighlightedIndex(filteredSuggestions.length > 0 ? filteredSuggestions.length - 1 : -1);
    }
  }, [filteredSuggestions.length, highlightedIndex, showSuggestions]);

  const handleInputChange = useCallback((event) => {
    const newValue = event.target.value;
    setQuery(newValue);
    onChange?.(newValue);
    setIsOpen(newValue.trim().length > 0);
    setHighlightedIndex(-1);
  }, [onChange, setQuery, setIsOpen]);

  const handleInputFocus = useCallback((event) => {
    handleFocus(event);
    if (!isOpen && query.trim()) {
      setIsOpen(true);
    }
  }, [handleFocus, query, isOpen, setIsOpen]);

  const handleSuggestionSelect = useCallback((name) => {
    setQuery(name);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onSelect) {
      onSelect(name);
    } else {
      onChange?.(name);
    }
  }, [onSelect, onChange, setQuery, setIsOpen]);

  const handleInputKeyDown = useCallback((event) => {
    if (event.key === 'ArrowDown') {
      if (filteredSuggestions.length === 0) {
        handleKeyDown(event);
        return;
      }
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => {
        if (prev < 0 || prev >= filteredSuggestions.length - 1) {
          return 0;
        }
        return prev + 1;
      });
      return;
    }

    if (event.key === 'ArrowUp') {
      if (filteredSuggestions.length === 0) {
        handleKeyDown(event);
        return;
      }
      event.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(prev => {
        if (prev <= 0) {
          return filteredSuggestions.length - 1;
        }
        return prev - 1;
      });
      return;
    }

    if (event.key === 'Enter' && isOpen && highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
      event.preventDefault();
      handleSuggestionSelect(filteredSuggestions[highlightedIndex]);
      return;
    }

    handleKeyDown(event);
  }, [filteredSuggestions, handleSuggestionSelect, handleKeyDown, highlightedIndex, isOpen, setIsOpen]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder || t('matchDetails.opponentPlaceholder')}
          maxLength={50}
          disabled={disabled}
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-activedescendant={highlightedIndex >= 0 ? `${inputId || 'opponentTeam'}-option-${highlightedIndex}` : undefined}
          autoComplete="off"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {error && (
        <p className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      )}

      {showSuggestions && (
        <div
          className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-500 rounded-md shadow-lg max-h-56 overflow-auto"
          role="listbox"
          aria-label={t('matchDetails.opponentSuggestions.ariaLabel')}
        >
          {filteredSuggestions.map((name, index) => {
            const isHighlighted = index === highlightedIndex;
            const optionId = `${inputId || 'opponentTeam'}-option-${index}`;
            return (
              <button
                type="button"
                key={name.toLowerCase()}
                id={optionId}
                className={`w-full px-3 py-2 text-left transition-colors border-b border-slate-600 last:border-b-0 hover:bg-slate-600 focus:bg-slate-600 focus:outline-none ${isHighlighted ? 'bg-sky-600 text-white' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSuggestionSelect(name)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={isHighlighted}
              >
                <div className="flex items-center space-x-2">
                  <History className="h-4 w-4 text-sky-300 flex-shrink-0" />
                  <span className="text-slate-100">{name}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showEmptyState && (
        <div className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-500 rounded-md shadow-lg p-3 text-slate-300 text-sm">
          {t('matchDetails.opponentSuggestions.noMatches', { query })}
        </div>
      )}
    </div>
  );
}
