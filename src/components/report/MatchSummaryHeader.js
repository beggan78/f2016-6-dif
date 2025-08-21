import React from 'react';
import { Clock, Trophy, Calendar, Timer } from 'lucide-react';
import { formatTime } from '../../utils/formatUtils';

/**
 * MatchSummaryHeader - Displays match summary information
 * 
 * @param {Object} props - Component props
 * @param {string} props.ownTeamName - Own team name (default: "Djurgården")
 * @param {string} props.opponentTeam - Opponent team name
 * @param {number} props.ownScore - Own team score
 * @param {number} props.opponentScore - Opponent team score
 * @param {number} props.matchStartTime - Match start timestamp or null
 * @param {number} props.matchDuration - Match duration in seconds or null
 * @param {number} props.totalPeriods - Total number of periods played
 * @param {number} props.periodDurationMinutes - Duration of each period in minutes
 */
export function MatchSummaryHeader({
  ownTeamName = "Djurgården",
  opponentTeam = "Opponent",
  ownScore = 0,
  opponentScore = 0,
  matchStartTime = null,
  matchDuration = null,
  totalPeriods = 0,
  periodDurationMinutes = 12
}) {
  
  // Format match start time
  const formatMatchStartTime = () => {
    if (!matchStartTime) return "No start time recorded";
    
    const date = new Date(matchStartTime);
    
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
    
    return formatted;
  };

  // Format match duration
  const formatMatchDuration = () => {
    if (!matchDuration || matchDuration <= 0) return "Duration unknown";
    
    const formatted = formatTime(matchDuration);
    
    return formatted;
  };

  // Determine winning team styling
  const getTeamScoreStyle = (isOwnTeam) => {
    const isWinner = isOwnTeam ? ownScore > opponentScore : opponentScore > ownScore;
    const isTie = ownScore === opponentScore;
    
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
          {/* Own Team */}
          <div className="flex-1 text-right">
            <div className="text-lg font-semibold text-slate-200 truncate">
              {ownTeamName}
            </div>
            <div className={`text-4xl font-bold font-mono ${getTeamScoreStyle(true)}`}>
              {ownScore}
            </div>
          </div>

          {/* VS Separator */}
          <div className="flex-shrink-0 px-4">
            <div className="text-2xl font-bold text-slate-500">-</div>
          </div>

          {/* Own Team */}
          <div className="flex-1 text-left">
            <div className="text-lg font-semibold text-slate-200 truncate">
              {opponentTeam}
            </div>
            <div className={`text-4xl font-bold font-mono ${getTeamScoreStyle(false)}`}>
              {opponentScore}
            </div>
          </div>
        </div>

        {/* Result indicator */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-slate-300">
            {ownScore > opponentScore ? `${ownTeamName} wins` :
             opponentScore > ownScore ? `${opponentTeam} wins` :
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