import React, { useState, useEffect, useMemo } from 'react';
import { Filter, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { MultiSelect, Button } from '../shared/UI';

const MATCH_TYPES = [
  { value: 'League', label: 'League' },
  { value: 'Cup', label: 'Cup' },
  { value: 'Friendly', label: 'Friendly' }
];

const OUTCOMES = [
  { value: 'W', label: 'Win' },
  { value: 'D', label: 'Draw' },
  { value: 'L', label: 'Loss' }
];

const VENUE_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'away', label: 'Away' },
  { value: 'neutral', label: 'Neutral' }
];

/**
 * Reusable match filters panel with collapsible behavior
 * Used by both MatchHistoryView and TeamStatsView
 */
export function MatchFiltersPanel({
  matches = [],
  typeFilter,
  outcomeFilter,
  venueFilter,
  opponentFilter,
  playerFilter,
  formatFilter,
  onTypeFilterChange,
  onOutcomeFilterChange,
  onVenueFilterChange,
  onOpponentFilterChange,
  onPlayerFilterChange,
  onFormatFilterChange,
  onClearAllFilters
}) {
  // Screen size detection and filter collapse state
  const [needsCollapse, setNeedsCollapse] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024; // lg breakpoint
  });
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth < 1024;
  });

  // Detect screen size that requires filter collapsing
  useEffect(() => {
    const checkScreenSize = () => {
      const shouldCollapse = window.innerWidth < 1024; // lg breakpoint - when filters wrap to multiple rows

      setNeedsCollapse(prevNeedsCollapse => {
        // Only update collapse state if needsCollapse actually changed
        if (prevNeedsCollapse !== shouldCollapse) {
          // Use a callback to ensure we're working with the latest state
          setIsFilterCollapsed(prevIsCollapsed => {
            // Don't auto-collapse if user has manually expanded filters
            // Only auto-collapse when transitioning from wide to narrow screen
            if (shouldCollapse && !prevNeedsCollapse) {
              return true;
            } else if (!shouldCollapse) {
              return false;
            }
            return prevIsCollapsed;
          });
        }
        return shouldCollapse;
      });
    };

    // Initial check
    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []); // Remove needsCollapse dependency to prevent race condition

  // Get unique opponents from matches
  const opponents = useMemo(() => {
    const uniqueOpponents = [...new Set(matches.map(match => match.opponent).filter(Boolean))];
    // Sort opponents alphabetically
    const sortedOpponents = uniqueOpponents.sort((a, b) => a.localeCompare(b));
    return sortedOpponents.map(opponent => ({ value: opponent, label: opponent }));
  }, [matches]);

  // Get unique players from matches
  const players = useMemo(() => {
    const uniquePlayers = [...new Set(matches.flatMap(match => match.players || []).filter(Boolean))];
    return uniquePlayers.sort().map(player => ({ value: player, label: player }));
  }, [matches]);

  // Get unique formats from matches - only show filter if multiple formats exist
  const formats = useMemo(() => {
    const uniqueFormats = [...new Set(matches.map(match => match.format).filter(Boolean))];
    return uniqueFormats.sort().map(format => ({ value: format, label: format }));
  }, [matches]);

  const shouldShowFormatFilter = formats.length > 1;

  return (
    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
        >
          <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </h3>
          {needsCollapse && (
            <button className="text-sky-400 hover:text-sky-300 transition-colors">
              {isFilterCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </button>
          )}
        </div>

        <Button
          onClick={onClearAllFilters}
          Icon={RotateCcw}
          variant="ghost"
          size="sm"
          className="text-sky-400 hover:text-sky-300"
        >
          Clear All
        </Button>
      </div>

      {/* Filter content - collapsible when screen is narrow */}
      <div className={`${
        needsCollapse
          ? (isFilterCollapsed ? 'hidden' : 'block mt-4')
          : 'mt-4'
      }`}>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
          shouldShowFormatFilter ? 'lg:grid-cols-6' : 'lg:grid-cols-5'
        }`}>
          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Type</label>
            <MultiSelect
              value={typeFilter}
              onChange={onTypeFilterChange}
              options={MATCH_TYPES}
              placeholder="All"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Outcome</label>
            <MultiSelect
              value={outcomeFilter}
              onChange={onOutcomeFilterChange}
              options={OUTCOMES}
              placeholder="All"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Venue</label>
            <MultiSelect
              value={venueFilter}
              onChange={onVenueFilterChange}
              options={VENUE_TYPES}
              placeholder="All"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">Opponent</label>
            <MultiSelect
              value={opponentFilter}
              onChange={onOpponentFilterChange}
              options={opponents}
              placeholder="All"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-slate-300 text-sm mb-2">With Player</label>
            <MultiSelect
              value={playerFilter}
              onChange={onPlayerFilterChange}
              options={players}
              placeholder="All"
            />
          </div>

          {shouldShowFormatFilter && (
            <div className="flex flex-col">
              <label className="text-slate-300 text-sm mb-2">Format</label>
              <MultiSelect
                value={formatFilter}
                onChange={onFormatFilterChange}
                options={formats}
                placeholder="All"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
