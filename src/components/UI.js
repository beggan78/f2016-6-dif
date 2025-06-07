import React from 'react';
import { ChevronDown } from 'lucide-react';

export function Select({ value, onChange, options, placeholder, id, disabled }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={onChange}
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

export function Button({ onClick, children, Icon, variant = 'primary', size = 'md', disabled = false, className = '' }) {
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
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className={`h-4 w-4 ${size === 'lg' ? 'h-5 w-5' : ''}`} />}
      <span>{children}</span>
    </button>
  );
}

export function ConfirmationModal({ isOpen, onConfirm, onCancel, title, message, confirmText = "Confirm", cancelText = "Cancel" }) {
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
            <Button onClick={onConfirm} variant="danger" className="sm:order-2">
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerOptionsModal({ 
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
  showSubstitutionOptions = true  // New prop to control substitution options
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
            {showPositionOptions ? 'Change Position' : 'Player Options'}
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
                    Switch with {player.name}
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
                    <Button onClick={onSetNext} variant="primary">
                      Set as next sub
                    </Button>
                    <Button onClick={onSubNow} variant="danger">
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


export function PlayerInactiveModal({ isOpen, onInactivate, onActivate, onCancel, playerName, isCurrentlyInactive }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg shadow-xl max-w-md w-full border border-slate-600">
        <div className="p-4 border-b border-slate-600">
          <h3 className="text-lg font-semibold text-sky-300">Player Status</h3>
        </div>
        <div className="p-4">
          <p className="text-slate-200 mb-6">What would you like to do with {playerName}?</p>
          <div className="flex flex-col gap-3">
            <Button onClick={onCancel} variant="secondary">
              Cancel
            </Button>
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