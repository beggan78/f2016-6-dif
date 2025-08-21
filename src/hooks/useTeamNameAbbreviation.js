import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for managing team name abbreviation based on available space
 * Extracts DOM manipulation logic from components following separation of concerns
 */
export function useTeamNameAbbreviation(ownTeamName, opponentTeam, ownScore, opponentScore) {
  const [shouldAbbreviate, setShouldAbbreviate] = useState(false);
  const scoreRowRef = useRef(null);
  
  // Function to abbreviate team names when they don't fit
  const abbreviateTeamName = (teamName) => {
    if (!teamName) return teamName;
    return teamName.substring(0, 3) + '.';
  };
  
  const displayOwnTeam = shouldAbbreviate ? abbreviateTeamName(ownTeamName) : ownTeamName;
  const displayOpponentTeam = shouldAbbreviate ? abbreviateTeamName(opponentTeam) : opponentTeam;

  // Effect to check if abbreviation is needed based on actual rendered width
  useEffect(() => {
    const checkWidth = () => {
      if (!scoreRowRef.current) return;
      
      const container = scoreRowRef.current;
      const containerWidth = container.offsetWidth;
      
      // Create a temporary invisible element to measure full names
      const testDiv = document.createElement('div');
      testDiv.style.position = 'absolute';
      testDiv.style.visibility = 'hidden';
      testDiv.style.whiteSpace = 'nowrap';
      testDiv.className = container.className;
      
      // Create test content with full names using safe DOM methods to prevent XSS
      const homeButton = document.createElement('button');
      homeButton.className = 'flex-1 px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-md text-white font-semibold transition-colors';
      homeButton.textContent = ownTeamName || ''; // Safe - uses textContent instead of innerHTML
      
      const scoreDiv = document.createElement('div');
      scoreDiv.className = 'text-2xl font-mono font-bold text-sky-200 cursor-pointer select-none px-1.5 py-2 rounded-md hover:bg-slate-600 transition-colors whitespace-nowrap flex-shrink-0';
      scoreDiv.textContent = `${ownScore || 0} - ${opponentScore || 0}`; // Safe - uses textContent
      
      const awayButton = document.createElement('button');
      awayButton.className = 'flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-md text-white font-semibold transition-colors';
      awayButton.textContent = opponentTeam || ''; // Safe - uses textContent instead of innerHTML
      
      // Append elements safely
      testDiv.appendChild(homeButton);
      testDiv.appendChild(scoreDiv);
      testDiv.appendChild(awayButton);
      
      // Temporarily add to DOM to measure
      container.parentElement.appendChild(testDiv);
      const testWidth = testDiv.scrollWidth;
      container.parentElement.removeChild(testDiv);
      
      // Decide whether to abbreviate based on test measurement
      const needsAbbreviation = testWidth > containerWidth;
      setShouldAbbreviate(needsAbbreviation);
    };

    // Initial check
    checkWidth();
    
    // Check on window resize
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, [ownTeamName, opponentTeam, ownScore, opponentScore]);

  return {
    scoreRowRef,
    displayOwnTeam,
    displayOpponentTeam
  };
}