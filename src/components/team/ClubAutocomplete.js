import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Building, Plus } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { Input } from '../shared/UI';

export function ClubAutocomplete({ 
  value,
  onChange,
  onSelect,
  onCreateNew,
  placeholder = "Search for your club...",
  disabled = false
}) {
  const { searchClubs } = useTeam();
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState(value || '');
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Debounced search function
  const debouncedSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchClubs(searchQuery);
      setSuggestions(results);
    } catch (error) {
      console.error('Error searching clubs:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchClubs]);

  // Handle input changes with debouncing
  const handleInputChange = useCallback((e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onChange?.(newQuery);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      debouncedSearch(newQuery);
    }, 300); // 300ms debounce
  }, [onChange, debouncedSearch]);

  // Handle focus to show suggestions
  const handleFocus = useCallback(() => {
    setIsOpen(true);
    if (query.trim()) {
      debouncedSearch(query);
    }
  }, [query, debouncedSearch]);

  // Handle blur to hide suggestions (with delay for clicks)
  const handleBlur = useCallback(() => {
    setTimeout(() => setIsOpen(false), 150);
  }, []);

  // Handle club selection
  const handleClubSelect = useCallback((club) => {
    setQuery(club.name);
    setIsOpen(false);
    onSelect?.(club);
  }, [onSelect]);

  // Handle "Create New Club" selection
  const handleCreateNew = useCallback(() => {
    setIsOpen(false);
    onCreateNew?.(query);
  }, [onCreateNew, query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const showCreateOption = query.trim() && suggestions.length === 0 && !isLoading;

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && (suggestions.length > 0 || showCreateOption) && (
        <div className="absolute z-10 mt-1 w-full bg-slate-700 border border-slate-500 rounded-md shadow-lg max-h-64 overflow-auto">
          {/* Club Suggestions */}
          {suggestions.map((club) => (
            <button
              key={club.id}
              onClick={() => handleClubSelect(club)}
              className="w-full px-3 py-2 text-left hover:bg-slate-600 focus:bg-slate-600 focus:outline-none transition-colors border-b border-slate-600 last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-sky-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-slate-100 font-medium truncate">{club.long_name || club.name}</div>
                  {club.short_name && (
                    <div className="text-slate-400 text-xs truncate">({club.name}, {club.short_name})</div>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Create New Option */}
          {showCreateOption && (
            <button
              onClick={handleCreateNew}
              className="w-full px-3 py-2 text-left hover:bg-emerald-600/20 focus:bg-emerald-600/20 focus:outline-none transition-colors border-t border-slate-500"
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-emerald-300 font-medium">Create new club</div>
                  <div className="text-emerald-400 text-xs">"{query}"</div>
                </div>
              </div>
            </button>
          )}

          {/* No Results Message */}
          {!isLoading && suggestions.length === 0 && !showCreateOption && query.trim() && (
            <div className="px-3 py-2 text-slate-400 text-sm">
              No clubs found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}