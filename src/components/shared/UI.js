import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import { formatPlayerName } from '../../utils/formatUtils';

export const Input = React.forwardRef(({ value, onChange, placeholder, id, disabled, type = 'text', className = '', onFocus, onBlur, onKeyDown, ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      id={id}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-md text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-500 transition-colors ${className}`}
      {...props}
    />
  );
});

Input.displayName = 'Input';

export function Select({ value, onChange, options, placeholder, id, disabled }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full appearance-none bg-slate-600 border border-slate-500 text-slate-100 py-1.5 px-2.5 pr-7 rounded-md leading-tight focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          typeof opt === 'object' ?
            <option key={opt.value} value={opt.value}>{opt.label}</option> :
            <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
        <ChevronDown size={18} />
      </div>
    </div>
  );
}

export function Button({ onClick, children, Icon, variant = 'primary', size = 'md', disabled = false, className = '', type = 'button' }) {
  const baseStyle = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-150 ease-in-out flex items-center justify-center space-x-2";

  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  const variantStyles = {
    primary: `bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-600 hover:bg-slate-500 text-sky-100 focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    accent: `bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${size === 'lg' ? 'h-5 w-5' : ''}`} />}
      <span>{children}</span>
    </button>
  );
}

export function ConfirmationModal({ isOpen, onConfirm, onCancel, title, message, confirmText = "Confirm", cancelText = "Cancel", variant = "danger" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">{title}</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-200 mb-6">{message}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
            <Button onClick={onCancel} variant="secondary" className="sm:order-1">
              {cancelText}
            </Button>
            <Button onClick={onConfirm} variant={variant} className="sm:order-2">
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThreeOptionModal({ 
  isOpen, 
  onPrimary, 
  onSecondary, 
  onTertiary, 
  title, 
  message, 
  primaryText = "Confirm", 
  secondaryText = "Cancel", 
  tertiaryText = "Option 3",
  primaryVariant = "danger",
  secondaryVariant = "secondary",
  tertiaryVariant = "secondary"
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">{title}</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-200 mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <Button onClick={onPrimary} variant={primaryVariant}>
              {primaryText}
            </Button>
            <Button onClick={onSecondary} variant={secondaryVariant}>
              {secondaryText}
            </Button>
            <Button onClick={onTertiary} variant={tertiaryVariant}>
              {tertiaryText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FieldPlayerModal({ 
  isOpen, 
  onSetNext, 
  onSubNow, 
  onCancel, 
  onChangePosition, 
  playerName, 
  availablePlayers = [],
  showPositionChange = false,
  showPositionOptions = false,
  showSwapPositions = false,
  showSubstitutionOptions = true,
  canSubstitute = true
}) {
  if (!isOpen) return null;

  const handleBack = () => {
    // Call onChangePosition with null to go back to main options
    onChangePosition && onChangePosition(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">
            {showPositionOptions ? 'Change Position' : 'Field Player Options'}
          </h3>
        </div>
        <div className="p-4">
          {showPositionOptions ? (
            <>
              <p className="text-slate-200 mb-6">
                Select which player to switch positions with {playerName}:
              </p>
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                <Button onClick={handleBack} variant="secondary">
                  Back
                </Button>
                {availablePlayers.map((player) => (
                  <Button
                    key={player.id}
                    onClick={() => onChangePosition && onChangePosition(player.id)}
                    variant="primary"
                    className="text-left"
                  >
                    {formatPlayerName(player)}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-200 mb-6">What would you like to do with {playerName}?</p>
              <div className="flex flex-col gap-3">
                <Button onClick={onCancel} variant="secondary">
                  Cancel
                </Button>
                {showSubstitutionOptions && (
                  <>
                    <Button 
                      onClick={onSetNext} 
                      variant="primary"
                      disabled={!canSubstitute}
                      title={canSubstitute ? "Set as next to substitute" : "All substitutes are inactive - cannot set as next"}
                    >
                      Set as next sub
                    </Button>
                    <Button 
                      onClick={onSubNow} 
                      variant="danger" 
                      disabled={!canSubstitute}
                      title={canSubstitute ? "Substitute this player now" : "All substitutes are inactive - cannot substitute"}
                    >
                      Substitute now
                    </Button>
                  </>
                )}
                {showPositionChange && (
                  <Button onClick={() => onChangePosition && onChangePosition('show-options')} variant="accent">
                    Change position
                  </Button>
                )}
                {showSwapPositions && (
                  <Button onClick={() => onChangePosition && onChangePosition('swap-pair-positions')} variant="accent">
                    Swap positions
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export function SubstitutePlayerModal({ 
  isOpen, 
  onInactivate, 
  onActivate, 
  onCancel, 
  onSetAsNextToGoIn,
  playerName, 
  isCurrentlyInactive,
  canSetAsNextToGoIn = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">Substitute Options</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-200 mb-6">What would you like to do with {playerName}?</p>
          <div className="flex flex-col gap-3">
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
            {canSetAsNextToGoIn && !isCurrentlyInactive && (
              <Button onClick={onSetAsNextToGoIn} variant="accent">
                Set as next to go in
              </Button>
            )}
            {isCurrentlyInactive ? (
              <Button onClick={onActivate} variant="primary">
                Put {playerName} back into rotation
              </Button>
            ) : (
              <Button onClick={onInactivate} variant="danger">
                Take {playerName} out of rotation
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GoalieModal({ 
  isOpen, 
  onCancel, 
  onSelectGoalie, 
  currentGoalieName, 
  availablePlayers = [] 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">Replace Goalie</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-200 mb-6">
            Select a new goalie to replace {currentGoalieName}:
          </p>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
            {availablePlayers.map((player) => (
              <Button
                key={player.id}
                onClick={() => onSelectGoalie(player.id)}
                variant={player.isInactive ? "secondary" : "primary"}
                disabled={player.isInactive}
                className={`text-left ${player.isInactive ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {formatPlayerName(player)} {player.isInactive ? '(Inactive)' : ''}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoreEditModal({ 
  isOpen, 
  onCancel, 
  onSave, 
  homeScore, 
  awayScore, 
  homeTeamName = "Djurgården",
  awayTeamName = "Opponent" 
}) {
  const [editHomeScore, setEditHomeScore] = React.useState(homeScore);
  const [editAwayScore, setEditAwayScore] = React.useState(awayScore);

  React.useEffect(() => {
    if (isOpen) {
      setEditHomeScore(homeScore);
      setEditAwayScore(awayScore);
    }
  }, [isOpen, homeScore, awayScore]);

  const handleSave = () => {
    onSave(editHomeScore, editAwayScore);
  };

  const handleCancel = () => {
    setEditHomeScore(homeScore);
    setEditAwayScore(awayScore);
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">Edit Score</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">{homeTeamName}</label>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setEditHomeScore(Math.max(0, editHomeScore - 1))}
                  variant="secondary"
                  size="sm"
                  disabled={editHomeScore <= 0}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={editHomeScore}
                  onChange={(e) => setEditHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center w-16"
                />
                <Button 
                  onClick={() => setEditHomeScore(editHomeScore + 1)}
                  variant="secondary"
                  size="sm"
                >
                  +
                </Button>
              </div>
            </div>
            
            <div className="text-2xl font-mono font-bold text-slate-400">-</div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-300 mb-2">{awayTeamName}</label>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={() => setEditAwayScore(Math.max(0, editAwayScore - 1))}
                  variant="secondary"
                  size="sm"
                  disabled={editAwayScore <= 0}
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={editAwayScore}
                  onChange={(e) => setEditAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                  className="text-center w-16"
                />
                <Button 
                  onClick={() => setEditAwayScore(editAwayScore + 1)}
                  variant="secondary"
                  size="sm"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-end pt-4">
            <Button onClick={handleCancel} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              Save Score
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScoreManagerModal({ 
  isOpen, 
  onCancel, 
  homeScore, 
  awayScore, 
  homeTeamName = "Djurgården",
  awayTeamName = "Opponent",
  matchEvents = [],
  goalScorers = {},
  allPlayers = [],
  onAddHomeGoal,
  onAddAwayGoal,
  onEditGoalScorer,
  onDeleteGoal,
  calculateMatchTime,
  formatTime,
  getPlayerName
}) {
  // Filter and process goal events (using same pattern as MatchReportScreen)
  const goalEvents = React.useMemo(() => {
    const goals = matchEvents
      .filter(event => ['goal_home', 'goal_away'].includes(event.type))
      .filter(event => !event.undone)
      .map(event => {
        // Use event.matchTime first, then calculate if missing (same as MatchReportScreen)
        const matchTime = event.matchTime || (calculateMatchTime ? calculateMatchTime(event.timestamp) : '0:00');
        
        // Use same scorer resolution pattern as GameEventTimeline (with fallback to eventData.scorerId)
        const scorerId = goalScorers[event.id] || event.data?.scorerId;
        const scorerName = scorerId && getPlayerName ? getPlayerName(scorerId) : null;
        
        return {
          ...event,
          matchTime,
          scorerName,
          isHomeGoal: event.type === 'goal_home'
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return goals;
  }, [matchEvents, goalScorers, getPlayerName, calculateMatchTime]);

  const handleClose = () => {
    onCancel();
  };

  const handleEditScorer = (eventId) => {
    if (onEditGoalScorer) {
      onEditGoalScorer(eventId);
    }
  };

  const handleDeleteGoalEvent = (eventId) => {
    if (onDeleteGoal) {
      onDeleteGoal(eventId);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-sky-300">Manage Score</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-800 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          {/* Current Score Display */}
          <div className="flex items-center justify-between space-x-4 bg-slate-700 p-3 rounded-lg">
            <div className="text-center">
              <div className="text-sm text-slate-300">{homeTeamName}</div>
              <div className="text-2xl font-bold text-sky-400">{homeScore}</div>
            </div>
            <div className="text-2xl font-mono font-bold text-slate-400">-</div>
            <div className="text-center">
              <div className="text-sm text-slate-300">{awayTeamName}</div>
              <div className="text-2xl font-bold text-sky-400">{awayScore}</div>
            </div>
          </div>

          {/* Goal History */}
          <div>
            <h4 className="text-sm font-medium text-slate-300 mb-2">Goals Scored</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {goalEvents.length === 0 ? (
                <div className="text-slate-400 text-sm italic text-center py-4">
                  No goals recorded yet
                </div>
              ) : (
                goalEvents.map((goal) => {
                  const eventId = goal.id; // Use event.id consistently (same as MatchReportScreen)
                  return (
                  <div 
                    key={eventId} 
                    className={`p-3 rounded-lg border ${
                      goal.isHomeGoal 
                        ? 'bg-sky-900/30 border-sky-600/50' 
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-mono text-slate-300">
                            {goal.matchTime}
                          </span>
                          <span className="text-sm text-slate-400">|</span>
                          <span className="text-sm font-semibold text-slate-200">
                            {goal.data?.homeScore || 0}-{goal.data?.awayScore || 0}
                          </span>
                          {goal.isHomeGoal && (
                            <>
                              <span className="text-sm text-slate-400">|</span>
                              <span className="text-sm text-sky-300">
                                {goal.scorerName || 'Unknown scorer'}
                              </span>
                            </>
                          )}
                          {!goal.isHomeGoal && (
                            <>
                              <span className="text-sm text-slate-400">|</span>
                              <span className="text-sm text-slate-300">Opponent</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {goal.isHomeGoal && (
                          <Button
                            onClick={() => handleEditScorer(eventId)}
                            variant="secondary"
                            size="sm"
                          >
                            Edit
                          </Button>
                        )}
                        <Button
                          onClick={() => handleDeleteGoalEvent(eventId)}
                          variant="danger"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Add Goals */}
          <div className="border-t border-slate-600 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Add Goal</h4>
            <div className="flex gap-2">
              <Button 
                onClick={onAddHomeGoal}
                variant="primary"
                className="flex-1"
              >
                + {homeTeamName}
              </Button>
              <Button 
                onClick={onAddAwayGoal}
                variant="secondary"
                className="flex-1"
              >
                + {awayTeamName}
              </Button>
            </div>
          </div>

          
          <div className="flex justify-center pt-4">
            <Button onClick={handleClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}