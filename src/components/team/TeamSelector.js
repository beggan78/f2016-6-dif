import React from 'react';
import { Users, Plus, Building, ChevronRight } from 'lucide-react';
import { Button } from '../shared/UI';
import { useTeam } from '../../contexts/TeamContext';

export function TeamSelector({ onCreateNew }) {
  const { 
    currentTeam, 
    userTeams, 
    switchCurrentTeam,
    loading,
    error 
  } = useTeam();

  if (loading) {
    return (
      <div className="p-6 bg-slate-700 rounded-lg border border-slate-600">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          <span className="text-slate-300">Loading teams...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-900/20 border border-rose-600 rounded-lg">
        <div className="flex items-center space-x-2 text-rose-300">
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-sky-300 flex items-center">
          <Users className="mr-2 h-5 w-5" />
          Select Your Team
        </h3>
        <Button
          onClick={onCreateNew}
          variant="secondary"
          size="sm"
          Icon={Plus}
        >
          New Team
        </Button>
      </div>

      {/* Current Team Display */}
      {currentTeam && (
        <div className="p-4 bg-sky-600/20 border border-sky-500 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sky-200 font-medium">{currentTeam.name}</div>
              <div className="text-sky-300 text-sm flex items-center mt-1">
                <Building className="h-3 w-3 mr-1" />
                {currentTeam.club?.name}
                {currentTeam.club?.short_name && (
                  <span className="text-sky-400 ml-1">({currentTeam.club.short_name})</span>
                )}
              </div>
            </div>
            <div className="text-sky-300 text-xs px-2 py-1 bg-sky-700/50 rounded">
              Current
            </div>
          </div>
        </div>
      )}

      {/* Available Teams */}
      {userTeams.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-300">Available Teams ({userTeams.length})</h4>
          <div className="space-y-1">
            {userTeams.map((team) => {
              const isCurrentTeam = currentTeam?.id === team.id;
              
              return (
                <button
                  key={team.id}
                  onClick={() => !isCurrentTeam && switchCurrentTeam(team.id)}
                  disabled={isCurrentTeam}
                  className={`w-full p-3 rounded-lg border transition-all text-left ${
                    isCurrentTeam
                      ? 'bg-sky-600/10 border-sky-500/50 cursor-default'
                      : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className={`font-medium ${
                        isCurrentTeam ? 'text-sky-200' : 'text-slate-100'
                      }`}>
                        {team.name}
                      </div>
                      <div className={`text-sm flex items-center mt-1 ${
                        isCurrentTeam ? 'text-sky-300' : 'text-slate-400'
                      }`}>
                        <Building className="h-3 w-3 mr-1" />
                        {team.club?.name}
                        {team.club?.short_name && (
                          <span className="ml-1">({team.club.short_name})</span>
                        )}
                      </div>
                      <div className={`text-xs mt-1 ${
                        isCurrentTeam ? 'text-sky-400' : 'text-slate-500'
                      }`}>
                        Role: {team.userRole}
                      </div>
                    </div>
                    {!isCurrentTeam && (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* No Teams Message */}
      {userTeams.length === 0 && (
        <div className="p-6 bg-slate-700/50 border border-slate-600 rounded-lg text-center">
          <Users className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <div className="text-slate-300 font-medium mb-2">No Teams Found</div>
          <div className="text-slate-400 text-sm mb-4">
            You don't have access to any teams yet. Create your first team to get started.
          </div>
          <Button
            onClick={onCreateNew}
            variant="primary"
            Icon={Plus}
          >
            Create or Join a Team
          </Button>
        </div>
      )}
    </div>
  );
}