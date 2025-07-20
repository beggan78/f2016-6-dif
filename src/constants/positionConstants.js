/**
 * Basic position key constants - Raw string values only
 * Formation-specific logic moved to constants/gameModes.js
 */
export const POSITION_KEYS = {
  // Pairs formation
  LEFT_PAIR: 'leftPair',
  RIGHT_PAIR: 'rightPair', 
  SUB_PAIR: 'subPair',
  
  // Individual formations (unified naming for 6-player, 7-player, 8-player, 9-player, and 10-player)
  LEFT_DEFENDER: 'leftDefender',
  RIGHT_DEFENDER: 'rightDefender',
  LEFT_ATTACKER: 'leftAttacker', 
  RIGHT_ATTACKER: 'rightAttacker',
  SUBSTITUTE_1: 'substitute_1',
  SUBSTITUTE_2: 'substitute_2',
  SUBSTITUTE_3: 'substitute_3',
  SUBSTITUTE_4: 'substitute_4',
  SUBSTITUTE_5: 'substitute_5',
  
  // Common
  GOALIE: 'goalie'
};