/**
 * Basic position key constants - Raw string values only
 * Formation-specific logic moved to constants/formations.js
 */
export const POSITION_KEYS = {
  // Pairs formation
  LEFT_PAIR: 'leftPair',
  RIGHT_PAIR: 'rightPair', 
  SUB_PAIR: 'subPair',
  
  // Individual formations
  LEFT_DEFENDER: 'leftDefender',
  RIGHT_DEFENDER: 'rightDefender',
  LEFT_ATTACKER: 'leftAttacker', 
  RIGHT_ATTACKER: 'rightAttacker',
  SUBSTITUTE: 'substitute',
  
  // 7-player individual
  LEFT_DEFENDER_7: 'leftDefender7',
  RIGHT_DEFENDER_7: 'rightDefender7',  
  LEFT_ATTACKER_7: 'leftAttacker7',
  RIGHT_ATTACKER_7: 'rightAttacker7',
  SUBSTITUTE_7_1: 'substitute7_1',
  SUBSTITUTE_7_2: 'substitute7_2',
  
  // Common
  GOALIE: 'goalie'
};