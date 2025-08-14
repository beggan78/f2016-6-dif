import React, { useState, useEffect } from 'react';
import { Button, Input, Select } from '../shared/UI';
import { UserPlus, X } from 'lucide-react';

export function AddRosterPlayerModal({ team, onClose, onPlayerAdded, getAvailableJerseyNumbers }) {
  const [playerData, setPlayerData] = useState({
    name: '',
    jersey_number: '',
    on_roster: true
  });
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load available jersey numbers
  useEffect(() => {
    const loadAvailableNumbers = async () => {
      if (team?.id && getAvailableJerseyNumbers) {
        const numbers = await getAvailableJerseyNumbers(team.id);
        setAvailableNumbers(numbers);
      }
    };
    loadAvailableNumbers();
  }, [team?.id, getAvailableJerseyNumbers]);

  // Validation
  const validateForm = () => {
    const newErrors = {};
    
    if (!playerData.name.trim()) {
      newErrors.name = 'Player name is required';
    } else if (playerData.name.trim().length < 2) {
      newErrors.name = 'Player name must be at least 2 characters';
    }

    if (playerData.jersey_number && (
      playerData.jersey_number < 1 || 
      playerData.jersey_number > 100 ||
      !availableNumbers.includes(parseInt(playerData.jersey_number))
    )) {
      newErrors.jersey_number = 'Please select a valid jersey number';
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
      await onPlayerAdded({
        name: playerData.name.trim(),
        jersey_number: playerData.jersey_number ? parseInt(playerData.jersey_number) : null,
        on_roster: playerData.on_roster
      });
      
      // Reset form for next player
      setPlayerData({
        name: '',
        jersey_number: '',
        on_roster: true
      });
      setErrors({});
      
      // Show success message briefly
      setSuccessMessage(`${playerData.name.trim()} added successfully!`);
      setTimeout(() => setSuccessMessage(''), 2000);
      
      // Refresh available jersey numbers
      if (team?.id && getAvailableJerseyNumbers) {
        const numbers = await getAvailableJerseyNumbers(team.id);
        setAvailableNumbers(numbers);
      }
      
      // Focus back to name input
      setTimeout(() => {
        const nameInput = document.querySelector('input[placeholder="Enter player name"]');
        if (nameInput) nameInput.focus();
      }, 100);
      
    } catch (error) {
      console.error('Error adding player:', error);
      setErrors({ general: error.message || 'Failed to add player' });
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

  // Jersey number options
  const jerseyOptions = [
    { value: '', label: 'No jersey number' },
    ...availableNumbers.map(num => ({
      value: num.toString(),
      label: `#${num}`
    }))
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-lg border border-slate-600 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Add Player</h2>
              <p className="text-sm text-slate-400">Add a new player to {team.name}</p>
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
          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-900/50 border border-emerald-600 rounded-lg p-3">
              <p className="text-emerald-200 text-sm">{successMessage}</p>
            </div>
          )}
          
          {/* General Error */}
          {errors.general && (
            <div className="bg-rose-900/50 border border-rose-600 rounded-lg p-3">
              <p className="text-rose-200 text-sm">{errors.general}</p>
            </div>
          )}
          {/* Player Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Player Name *
            </label>
            <Input
              value={playerData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter player name"
              disabled={loading}
              className={errors.name ? 'border-rose-500 focus:ring-rose-400 focus:border-rose-500' : ''}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-rose-400">{errors.name}</p>
            )}
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
            {availableNumbers.length === 0 && (
              <p className="mt-1 text-sm text-amber-400">
                All jersey numbers (1-100) are taken
              </p>
            )}
          </div>


          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Adding...' : 'Add Player'}
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