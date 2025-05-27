export const PLAYER_ROLES = {
  GOALIE: 'Goalie',
  DEFENDER: 'Defender',
  ATTACKER: 'Attacker',
  SUBSTITUTE: 'Substitute', // Used for initial status
  ON_FIELD: 'On Field' // Used for initial status
};

export const PERIOD_OPTIONS = [1, 2, 3];
export const DURATION_OPTIONS = [10, 15, 20, 25, 30];

export const initialRoster = [
  "Alma", "Ebba", "Elise", "Filippa", "Fiona", "Ines", "Isabelle",
  "Julie", "Leonie", "Nicole", "Rebecka", "Sigrid", "Sophie", "Tyra"
];

// Helper to initialize player objects
export const initializePlayers = (roster) => roster.map((name, index) => ({
  id: `p${index + 1}`,
  name,
  stats: {
    startedMatchAs: null, // 'Goalie', 'On Field', 'Substitute'
    periodsAsGoalie: 0,
    periodsAsDefender: 0,
    periodsAsAttacker: 0,
    timeOnFieldSeconds: 0, // Total outfield play time
    timeAsSubSeconds: 0,   // Total time as substitute
    timeAsGoalieSeconds: 0, // Total time as goalie
    // Temporary per-period tracking
    currentPeriodRole: null, // 'Goalie', 'Defender', 'Attacker'
    currentPeriodStatus: null, // 'on_field', 'substitute', 'goalie'
    lastStintStartTimeEpoch: 0, // For calculating duration of current stint
    currentPairKey: null, // 'leftPair', 'rightPair', 'subPair'
  }
}));