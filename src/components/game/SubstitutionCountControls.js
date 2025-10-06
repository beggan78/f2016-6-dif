import React from 'react';
import PropTypes from 'prop-types';
import { Minus, Plus } from 'lucide-react';

const clampValue = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
};

function StepperButton({ onClick, disabled, children, ariaLabel, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex items-center justify-center rounded-md border border-slate-600 bg-slate-700 text-slate-100 transition-colors hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

StepperButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  className: PropTypes.string
};

export function SubstitutionCountStepper({
  value,
  onChange,
  min = 1,
  max = 4,
  disabled = false,
  variant = 'default',
  className = ''
}) {
  const sizeConfig = React.useMemo(() => {
    if (variant === 'compact') {
      return {
        container: 'px-0.5 py-1.5 gap-0.5',
        label: 'text-[10px]',
        valueText: 'text-base',
        button: 'h-8 w-5'
      };
    }
    return {
      container: 'px-3 py-2 gap-2',
      label: 'text-xs',
      valueText: 'text-2xl',
      button: 'h-9 w-9'
    };
  }, [variant]);

  const handleAdjust = React.useCallback((delta) => {
    if (disabled) {
      return;
    }
    const nextValue = clampValue(value + delta, min, max);
    if (nextValue !== value) {
      onChange(nextValue);
    }
  }, [disabled, value, min, max, onChange]);

  return (
    <div
      className={`flex items-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-100 ${sizeConfig.container} ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <StepperButton
        onClick={() => handleAdjust(-1)}
        disabled={disabled || value <= min}
        ariaLabel="Decrease number of players to substitute"
        className={sizeConfig.button}
      >
        <Minus className="h-4 w-4" />
      </StepperButton>
      <span className={`px-1.5 font-semibold leading-none ${sizeConfig.valueText}`}>{value}</span>
      <StepperButton
        onClick={() => handleAdjust(1)}
        disabled={disabled || value >= max}
        ariaLabel="Increase number of players to substitute"
        className={sizeConfig.button}
      >
        <Plus className="h-4 w-4" />
      </StepperButton>
    </div>
  );
}

SubstitutionCountStepper.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  disabled: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact']),
  className: PropTypes.string
};

export function SubstitutionCountInlineControl({
  value,
  min = 1,
  max = 4,
  onChange,
  disabled = false,
  className = ''
}) {
  return (
    <SubstitutionCountStepper
      value={value}
      min={min}
      max={max}
      onChange={onChange}
      disabled={disabled}
      variant="compact"
      className={`min-w-[64px] flex-shrink-0 self-stretch ${className}`}
    />
  );
}

SubstitutionCountInlineControl.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string
};
