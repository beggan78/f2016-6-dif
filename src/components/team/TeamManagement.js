import React, { useState } from 'react';
import { Users } from 'lucide-react';
import { TeamSelector } from './TeamSelector';
import { TeamCreationWizard } from './TeamCreationWizard';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';

const VIEWS = {
  SELECTOR: 'selector',
  WIZARD: 'wizard'
};

export function TeamManagement() {
  const { user } = useAuth();
  const { hasTeams, loading: teamLoading } = useTeam();
  const [currentView, setCurrentView] = useState(VIEWS.SELECTOR);

  // Only show loading while initial team fetch is happening and we don't have any result yet
  // Once we know if user has teams or not, show appropriate UI
  if (teamLoading) {
    return (
      <div className="p-6 bg-slate-700 rounded-lg border border-slate-600">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin h-5 w-5 border-2 border-sky-400 border-t-transparent rounded-full"></div>
          <span className="text-slate-300">Loading team information...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, don't show team management
  if (!user) {
    return null;
  }

  const handleCreateTeam = () => {
    setCurrentView(VIEWS.WIZARD);
  };

  const handleWizardComplete = () => {
    setCurrentView(VIEWS.SELECTOR);
  };

  const handleWizardCancel = () => {
    setCurrentView(VIEWS.SELECTOR);
  };

  // Show wizard if user has no teams or if explicitly requested
  if (!hasTeams || currentView === VIEWS.WIZARD) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-sky-300 flex items-center">
          <Users className="mr-2 h-6 w-6" />
          Team Setup
        </h2>
        
        <TeamCreationWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </div>
    );
  }

  // Show team selector if user has teams
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-300 flex items-center">
        <Users className="mr-2 h-6 w-6" />
        Team Management
      </h2>
      
      <TeamSelector onCreateNew={handleCreateTeam} />
    </div>
  );
}