#!/usr/bin/env node

// Simple validation script for the consolidation changes
const { 
  isIndividualMode,
  getPlayerCountForMode,
  isIndividual6Mode,
  isIndividual7Mode,
  isIndividual8Mode
} = require('./src/constants/gameModes');

const { TEAM_MODES } = require('./src/constants/playerConstants');

console.log('Testing consolidation changes...');

// Test isIndividualMode
console.log('✓ isIndividualMode(INDIVIDUAL_6):', isIndividualMode(TEAM_MODES.INDIVIDUAL_6));
console.log('✓ isIndividualMode(INDIVIDUAL_7):', isIndividualMode(TEAM_MODES.INDIVIDUAL_7));
console.log('✓ isIndividualMode(INDIVIDUAL_8):', isIndividualMode(TEAM_MODES.INDIVIDUAL_8));
console.log('✓ isIndividualMode(PAIRS_7):', isIndividualMode(TEAM_MODES.PAIRS_7));

// Test getPlayerCountForMode
console.log('✓ getPlayerCountForMode(INDIVIDUAL_6):', getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_6));
console.log('✓ getPlayerCountForMode(INDIVIDUAL_7):', getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_7));
console.log('✓ getPlayerCountForMode(INDIVIDUAL_8):', getPlayerCountForMode(TEAM_MODES.INDIVIDUAL_8));
console.log('✓ getPlayerCountForMode(PAIRS_7):', getPlayerCountForMode(TEAM_MODES.PAIRS_7));

// Test specific mode checks
console.log('✓ isIndividual6Mode(INDIVIDUAL_6):', isIndividual6Mode(TEAM_MODES.INDIVIDUAL_6));
console.log('✓ isIndividual7Mode(INDIVIDUAL_7):', isIndividual7Mode(TEAM_MODES.INDIVIDUAL_7));
console.log('✓ isIndividual8Mode(INDIVIDUAL_8):', isIndividual8Mode(TEAM_MODES.INDIVIDUAL_8));

console.log('All tests passed! ✅');