import React from 'react';
import { Clock, Trophy, Calendar, Timer } from 'lucide-react';
import { formatTime } from '../../utils/formatUtils';

/**
 * MatchSummaryHeader - Displays match summary information
 * 
 * @param {Object} props - Component props
 * @param {string} props.homeTeamName - Home team name (default: "Djurgården")
 * @param {string} props.awayTeamName - Away team name
 * @param {number} props.homeScore - Home team score
 * @param {number} props.awayScore - Away team score
 * @param {number} props.matchStartTime - Match start timestamp or null
 * @param {number} props.matchDuration - Match duration in seconds or null
 * @param {number} props.totalPeriods - Total number of periods played
 * @param {number} props.periodDurationMinutes - Duration of each period in minutes
 */
export function MatchSummaryHeader({
  homeTeamName = "Djurgården",
  awayTeamName = "Opponent",
  homeScore = 0,
  awayScore = 0,
  matchStartTime = null,
  matchDuration = null,
  totalPeriods = 0,
  periodDurationMinutes = 12
}) {
  
  // Format match start time
  const formatMatchStartTime = () => {
    console.log('[DEBUG] MatchSummaryHeader - Formatting start time:', {
      matchStartTime,
      type: typeof matchStartTime,
      isNull: matchStartTime === null,
      isUndefined: matchStartTime === undefined
    });
    
    if (!matchStartTime) return "No start time recorded";
    
    const date = new Date(matchStartTime);
    console.log('[DEBUG] MatchSummaryHeader - Date object:', {
      date,
      isValidDate: !isNaN(date.getTime()),
      timestamp: date.getTime()
    });
    
    const dateStr = date.toLocaleDateString('sv-SE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const timeStr = date.toLocaleTimeString('sv-SE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const formatted = `${dateStr} ${timeStr}`;
    console.log('[DEBUG] MatchSummaryHeader - Formatted time:', formatted);
    
    return formatted;
  };

  // Format match duration
  const formatMatchDuration = () => {
    console.log('[DEBUG] MatchSummaryHeader - Formatting duration:', {
      matchDuration,
      type: typeof matchDuration,
      isZeroOrNegative: matchDuration <= 0
    });
    
    if (!matchDuration || matchDuration <= 0) return "Duration unknown";
    
    const formatted = formatTime(matchDuration);
    console.log('[DEBUG] MatchSummaryHeader - Formatted duration:', formatted);
    
    return formatted;
  };

  // Determine winning team styling
  const getTeamScoreStyle = (isHome) => {
    const isWinner = isHome ? homeScore > awayScore : awayScore > homeScore;
    const isTie = homeScore === awayScore;
    
    if (isTie) {
      return "text-sky-300"; // Neutral color for ties
    }
    
    return isWinner ? "text-emerald-400" : "text-slate-300"; // Winner in emerald, loser in muted
  };

  return (
    <div className="space-y-4">
      {/* Match Date and Time */}
      <div className="flex items-center justify-center space-x-2 text-slate-400">
        <Calendar className="h-4 w-4" />
        <span className="text-sm">{formatMatchStartTime()}</span>
      </div>

      {/* Teams and Score */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-6">
          {/* Home Team */}
          <div className="flex-1 text-right">
            <div className="text-lg font-semibold text-slate-200 truncate">
              {homeTeamName}
            </div>
            <div className={`text-4xl font-bold font-mono ${getTeamScoreStyle(true)}`}>
              {homeScore}
            </div>
          </div>

          {/* VS Separator */}
          <div className="flex-shrink-0 px-4">
            <div className="text-2xl font-bold text-slate-500">-</div>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left">
            <div className="text-lg font-semibold text-slate-200 truncate">
              {awayTeamName}
            </div>
            <div className={`text-4xl font-bold font-mono ${getTeamScoreStyle(false)}`}>
              {awayScore}
            </div>
          </div>
        </div>

        {/* Result indicator */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-slate-300">
            {homeScore > awayScore ? `${homeTeamName} wins` : 
             awayScore > homeScore ? `${awayTeamName} wins` : 
             'Match tied'}
          </span>
        </div>
      </div>

      {/* Match Statistics */}
      <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
        {/* Duration */}
        <div className="flex items-center space-x-1">
          <Clock className="h-4 w-4" />
          <span>{formatMatchDuration()}</span>
        </div>

        {/* Periods */}
        <div className="flex items-center space-x-1">
          <Timer className="h-4 w-4" />
          <span>{totalPeriods} × {periodDurationMinutes}min</span>
        </div>
      </div>
    </div>
  );
}