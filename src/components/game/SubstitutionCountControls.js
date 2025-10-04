import React from 'react';
import PropTypes from 'prop-types';
import { Minus, Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { Select } from '../shared/UI';

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

export function SubstitutionCountPillGroup({
  value,
  max,
  min = 1,
  onChange,
  disabled = false,
  previewLimit = 6
}) {
  const pillValues = React.useMemo(() => {
    const safeMin = Math.max(1, min);
    const safeMax = Math.max(safeMin, max);
    const total = Math.min(safeMax - safeMin + 1, previewLimit);
    return Array.from({ length: total }, (_, index) => safeMin + index);
  }, [min, max, previewLimit]);

  const handleSelect = React.useCallback((next) => {
    if (disabled) {
      return;
    }
    onChange(next);
  }, [disabled, onChange]);

  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {pillValues.map((option) => {
        const isSelected = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => handleSelect(option)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              isSelected
                ? 'border-sky-500 bg-sky-600/20 text-sky-200'
                : 'border-slate-600 bg-slate-800/60 text-slate-300 hover:border-sky-500 hover:text-sky-200'
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

SubstitutionCountPillGroup.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  min: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  previewLimit: PropTypes.number
};

const DIAL_ITEM_HEIGHT = 40;

export function SubstitutionCountDial({
  value,
  min = 1,
  max = 4,
  onChange,
  disabled = false,
  className = ''
}) {
  const clamp = React.useCallback((next) => {
    const safeMin = Math.max(1, min);
    const safeMax = Math.max(safeMin, max);
    return Math.max(safeMin, Math.min(safeMax, next));
  }, [min, max]);

  const numbers = React.useMemo(() => {
    const safeMin = Math.max(1, min);
    const safeMax = Math.max(safeMin, max);
    return Array.from({ length: safeMax - safeMin + 1 }, (_, index) => safeMin + index);
  }, [min, max]);

  const adjustedValue = clamp(value);

  const adjustValue = React.useCallback((delta) => {
    if (disabled || delta === 0) {
      return false;
    }
    const next = clamp(adjustedValue + delta);
    if (next === adjustedValue) {
      return false;
    }
    onChange(next);
    return true;
  }, [adjustedValue, clamp, disabled, onChange]);

  const dragState = React.useRef({
    isActive: false,
    pointerId: null,
    lastY: 0,
    accumulator: 0
  });

  const [visualOffset, setVisualOffset] = React.useState(0);

  const resetDrag = React.useCallback(() => {
    dragState.current = {
      isActive: false,
      pointerId: null,
      lastY: 0,
      accumulator: 0
    };
    setVisualOffset(0);
  }, []);

  const handlePointerDown = React.useCallback((event) => {
    if (disabled) {
      return;
    }
    event.currentTarget.focus({ preventScroll: true });
    dragState.current = {
      isActive: true,
      pointerId: event.pointerId,
      lastY: event.clientY,
      accumulator: 0
    };
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }, [disabled]);

  const handlePointerMove = React.useCallback((event) => {
    if (!dragState.current.isActive || disabled) {
      return;
    }

    const deltaY = event.clientY - dragState.current.lastY;
    dragState.current.lastY = event.clientY;
    dragState.current.accumulator += deltaY;

    while (dragState.current.accumulator <= -DIAL_ITEM_HEIGHT) {
      const changed = adjustValue(1);
      dragState.current.accumulator += DIAL_ITEM_HEIGHT;
      if (!changed) {
        dragState.current.accumulator = -DIAL_ITEM_HEIGHT + 0.0001;
        break;
      }
    }

    while (dragState.current.accumulator >= DIAL_ITEM_HEIGHT) {
      const changed = adjustValue(-1);
      dragState.current.accumulator -= DIAL_ITEM_HEIGHT;
      if (!changed) {
        dragState.current.accumulator = DIAL_ITEM_HEIGHT - 0.0001;
        break;
      }
    }

    const cappedOffset = Math.max(
      -DIAL_ITEM_HEIGHT + 4,
      Math.min(DIAL_ITEM_HEIGHT - 4, dragState.current.accumulator)
    );
    setVisualOffset(cappedOffset);
  }, [adjustValue, disabled]);

  const handlePointerEnd = React.useCallback((event) => {
    if (!dragState.current.isActive) {
      return;
    }
    if (event.currentTarget.releasePointerCapture && dragState.current.pointerId !== null) {
      try {
        event.currentTarget.releasePointerCapture(dragState.current.pointerId);
      } catch (releaseError) {
        // Ignore pointer release errors (browser quirks)
      }
    }
    resetDrag();
  }, [resetDrag]);

  const handleWheel = React.useCallback((event) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : -1;
    adjustValue(direction);
  }, [adjustValue, disabled]);

  const handleKeyDown = React.useCallback((event) => {
    if (disabled) {
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      adjustValue(1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      adjustValue(-1);
    }
  }, [adjustValue, disabled]);

  React.useEffect(() => {
    if (!dragState.current.isActive) {
      setVisualOffset(0);
    }
  }, [adjustedValue]);

  const baseTranslate = (numbers[0] - adjustedValue) * DIAL_ITEM_HEIGHT;
  const reelStyle = {
    transform: `translateY(${baseTranslate + visualOffset}px)`,
    transition: dragState.current.isActive ? 'none' : 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
  };

  return (
    <div
      className={`flex flex-col items-center ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      <span className="text-[10px] uppercase tracking-wide text-slate-400">Players</span>
      <div
        role="spinbutton"
        aria-valuemin={Math.max(1, min)}
        aria-valuemax={Math.max(Math.max(1, min), max)}
        aria-valuenow={adjustedValue}
        aria-label="Number of players to substitute"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        className={`relative mt-1 h-[120px] w-20 select-none overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/70 shadow-inner ${disabled ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/70 via-transparent to-slate-900/70" />
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-10 -translate-y-1/2 rounded-md border border-sky-500/40 bg-slate-800/70 shadow-[0_0_12px_rgba(56,189,248,0.25)]" />
        <div className="relative flex flex-col items-center" style={reelStyle}>
          {numbers.map((num) => (
            <div
              key={num}
              className={`flex w-full items-center justify-center text-lg font-semibold transition-colors ${
                num === adjustedValue ? 'text-sky-200' : 'text-slate-500'
              }`}
              style={{ height: DIAL_ITEM_HEIGHT }}
            >
              {num}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => adjustValue(1)}
          disabled={disabled || adjustedValue >= clamp(max)}
          aria-label="Increase number of players"
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 ${
            disabled || adjustedValue >= clamp(max) ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => adjustValue(-1)}
          disabled={disabled || adjustedValue <= clamp(min)}
          aria-label="Decrease number of players"
          className={`flex h-7 w-7 items-center justify-center rounded-full border border-slate-600 bg-slate-800 text-slate-200 transition-colors hover:bg-slate-700 ${
            disabled || adjustedValue <= clamp(min) ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

SubstitutionCountDial.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  className: PropTypes.string
};

export function SubstitutionCountDropdown({
  value,
  min = 1,
  max = 4,
  onChange,
  disabled = false
}) {
  const options = React.useMemo(() => {
    const safeMin = Math.max(1, min);
    const safeMax = Math.max(safeMin, max);
    return Array.from({ length: safeMax - safeMin + 1 }, (_, index) => {
      const count = safeMin + index;
      return {
        value: String(count),
        label: `${count} player${count === 1 ? '' : 's'}`
      };
    });
  }, [min, max]);

  const handleChange = React.useCallback((nextValue) => {
    const numericValue = Number(nextValue);
    if (Number.isNaN(numericValue)) {
      return;
    }
    onChange(numericValue);
  }, [onChange]);

  return (
    <Select
      value={String(value)}
      onChange={handleChange}
      options={options}
      disabled={disabled}
    />
  );
}

SubstitutionCountDropdown.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

function OptionCard({ title, badge, description, children, disabled }) {
  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-3 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">{title}</span>
        {badge && (
          <span className="text-[11px] uppercase tracking-wide text-sky-300/80">{badge}</span>
        )}
      </div>
      {children}
      {description && <p className="text-xs text-slate-400">{description}</p>}
    </div>
  );
}

OptionCard.propTypes = {
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node.isRequired,
  disabled: PropTypes.bool
};

export function SubstitutionCountOptionsShowcase({
  value,
  max,
  min = 1,
  onChange,
  disabled = false,
  disabledReason,
  className = ''
}) {
  const handleChange = React.useCallback((next) => {
    const numericValue = Number(next);
    if (Number.isNaN(numericValue)) {
      return;
    }
    const safeMin = Math.max(1, min);
    const safeMax = Math.max(safeMin, max);
    const clamped = clampValue(numericValue, safeMin, safeMax);
    onChange(clamped);
  }, [min, max, onChange]);

  const safeMin = Math.max(1, min);
  const safeMax = Math.max(safeMin, max);

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-900/60 p-4 ${className}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Substitution count experiments</h3>
          <p className="text-xs text-slate-400">Try out different control styles — everything stays in sync.</p>
        </div>
        <span className="text-[11px] uppercase tracking-wide text-sky-300/80">Temporary row</span>
      </div>
      <div className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${disabled ? 'pointer-events-none opacity-70' : ''}`}>
        <OptionCard
          title="Stepper"
          badge="Option A"
          description="Compact +/- control with instant feedback"
          disabled={disabled}
        >
          <SubstitutionCountStepper
            value={value}
            min={safeMin}
            max={safeMax}
            onChange={handleChange}
            disabled={disabled}
          />
        </OptionCard>
        <OptionCard
          title="Quick picks"
          badge="Option B"
          description="Tap a preset number for rapid batch swaps"
          disabled={disabled}
        >
          <SubstitutionCountPillGroup
            value={value}
            min={safeMin}
            max={safeMax}
            onChange={handleChange}
            disabled={disabled}
          />
        </OptionCard>
        <OptionCard
          title="Dropdown"
          badge="Option C"
          description="Great when you need higher counts"
          disabled={disabled}
        >
          <SubstitutionCountDropdown
            value={value}
            min={safeMin}
            max={safeMax}
            onChange={handleChange}
            disabled={disabled}
          />
        </OptionCard>
        <OptionCard
          title="Dial"
          badge="Option D"
          description="Spin the cylinder — swipe up or down to adjust"
          disabled={disabled}
        >
          <SubstitutionCountDial
            value={value}
            min={safeMin}
            max={safeMax}
            onChange={handleChange}
            disabled={disabled}
            className="mx-auto"
          />
        </OptionCard>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>Range {safeMin} – {safeMax}</span>
        {disabled && disabledReason && <span className="text-rose-300/80">{disabledReason}</span>}
      </div>
    </div>
  );
}

SubstitutionCountOptionsShowcase.propTypes = {
  value: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  min: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  disabledReason: PropTypes.string,
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

export default SubstitutionCountOptionsShowcase;
