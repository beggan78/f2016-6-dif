import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * EventToggleButton - Toggle button for showing/hiding substitution events
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isVisible - Whether substitutions are currently visible
 * @param {Function} props.onToggle - Callback function when toggle is clicked
 * @param {string} props.label - Label text for the toggle (default: "Substitutions")
 * @param {string} props.className - Optional additional CSS classes
 */
export function EventToggleButton({
  isVisible = false,
  onToggle,
  label = "Substitutions",
  className = ""
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center space-x-1 text-xs px-2 py-1 rounded transition-colors ${
        isVisible 
          ? 'bg-sky-600 text-white' 
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      } ${className}`.trim()}
    >
      {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      <span>{label}</span>
    </button>
  );
}