import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '../shared/UI';
import { Edit3, X } from 'lucide-react';

export function EditPlayerModal({ player, team, onClose, onPlayerUpdated, getAvailableJerseyNumbers }) {
  const [playerData, setPlayerData] = useState({
    first_name: player?.first_name || '',
    last_name: player?.last_name || '',
    display_name: player?.display_name || '',
    jersey_number: player?.jersey_number?.toString() || '',
    on_roster: player?.on_roster ?? true
  });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load available jersey numbers
  useEffect(() => {
    const loadAvailableNumbers = async () => {
      if (team?.id && getAvailableJerseyNumbers && player?.id) {
        const numbers = await getAvailableJerseyNumbers(team.id, player.id);
        setAvailableNumbers(numbers);
      }
    };
    loadAvailableNumbers();
  }, [team?.id, player?.id, getAvailableJerseyNumbers]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!playerData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (playerData.first_name.trim().length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    } else if (playerData.first_name.trim().length > 50) {
      newErrors.first_name = 'First name must be at most 50 characters';
    }

    if (playerData.last_name && playerData.last_name.trim().length > 50) {
      newErrors.last_name = 'Last name must be at most 50 characters';
    }

    if (!playerData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (playerData.display_name.trim().length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    } else if (playerData.display_name.trim().length > 50) {
      newErrors.display_name = 'Display name must be at most 50 characters';
    }

    if (playerData.jersey_number) {
      const jerseyNum = parseInt(playerData.jersey_number);
      if (jerseyNum < 1 || jerseyNum > 99) {
        newErrors.jersey_number = 'Jersey number must be between 1 and 99';
      } else if (jerseyNum !== player.jersey_number && !availableNumbers.includes(jerseyNum)) {
        newErrors.jersey_number = 'This jersey number is already taken';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const updates = {
        first_name: playerData.first_name.trim(),
        last_name: playerData.last_name ? playerData.last_name.trim() : null,
        display_name: playerData.display_name.trim(),
        jersey_number: playerData.jersey_number ? parseInt(playerData.jersey_number) : null,
        on_roster: playerData.on_roster
      };

      await onPlayerUpdated(player.id, updates);
    } catch (error) {
      console.error('Error updating player:', error);
      setErrors({ general: error.message || 'Failed to update player' });
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setPlayerData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Auto-fill display name from first name when user leaves the first name field
  const handleFirstNameBlur = () => {
    if (playerData.first_name.trim() && !playerData.display_name.trim()) {
      setPlayerData(prev => ({ ...prev, display_name: prev.first_name.trim() }));
    }
  };

  // Jersey number options
  const currentJersey = player.jersey_number;
  const jerseyOptions = [
    { value: '', label: 'No jersey number' },
    // Include current jersey number even if it would normally be unavailable
    ...(currentJersey ? [{ value: currentJersey.toString(), label: `#${currentJersey} (current)` }] : []),
    ...availableNumbers
      .filter(num => num !== currentJersey) // Don't duplicate current jersey
      .map(num => ({
        value: num.toString(),
        label: `#${num}`
      }))
  ];

  if (!player) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
              <Edit3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Edit Player</h2>
              <p className="text-sm text-slate-400">Update {player.display_name}'s information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
              <p className="text-rose-200 text-sm">{errors.general}</p>
            </div>
          )}
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              First Name *
            </label>
            <Input
              name="first_name"
              value={playerData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              onBlur={handleFirstNameBlur}
              placeholder="Enter first name"
              disabled={loading}
              className={errors.first_name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.first_name && (
              <p className="mt-1 text-sm text-rose-400">{errors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Last Name
            </label>
            <Input
              name="last_name"
              value={playerData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              placeholder="Enter last name (optional)"
              disabled={loading}
              className={errors.last_name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.last_name && (
              <p className="mt-1 text-sm text-rose-400">{errors.last_name}</p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Display Name *
            </label>
            <Input
              name="display_name"
              value={playerData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="Enter display name"
              disabled={loading}
              className={errors.display_name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.display_name && (
              <p className="mt-1 text-sm text-rose-400">{errors.display_name}</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              This is the name displayed in the app
            </p>
          </div>

          {/* Jersey Number */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Jersey Number
            </label>
            <Select
              value={playerData.jersey_number}
              onChange={(value) => handleInputChange('jersey_number', value)}
              options={jerseyOptions}
              disabled={loading}
              className={errors.jersey_number ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.jersey_number && (
              <p className="mt-1 text-sm text-rose-400">{errors.jersey_number}</p>
            )}
            {availableNumbers.length === 0 && !currentJersey && (
              <p className="mt-1 text-sm text-amber-400">
                All jersey numbers (1-99) are taken
              </p>
            )}
          </div>

          {/* Roster Status */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="on_roster"
              checked={playerData.on_roster}
              onChange={(e) => handleInputChange('on_roster', e.target.checked)}
              disabled={loading}
              className="sr-only"
            />
            <div 
              onClick={() => !loading && handleInputChange('on_roster', !playerData.on_roster)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer transition-colors ${
                playerData.on_roster 
                  ? 'bg-emerald-600 border-emerald-600' 
                  : 'border-slate-400 hover:border-slate-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {playerData.on_roster && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <label 
              htmlFor="on_roster" 
              className={`text-sm text-slate-300 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Active on roster
            </label>
          </div>

          {/* Player Info */}
          <div className="bg-slate-700 rounded-lg p-3 border border-slate-600">
            <div className="text-xs text-slate-400 mb-1">Player Information</div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Created:</span>
                <span className="text-slate-100">
                  {player.created_at ? new Date(player.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              {player.updated_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Last Updated:</span>
                  <span className="text-slate-100">
                    {new Date(player.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Updating...' : 'Update Player'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}