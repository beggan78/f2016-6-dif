import { useLongPressWithScrollDetection } from './useLongPressWithScrollDetection';
import { TEAM_MODES } from '../constants/playerConstants';

export const useFieldPositionHandlers = (fieldPositionCallbacks, teamMode) => {
  const isPairsMode = teamMode === TEAM_MODES.PAIRS_7;

  // Create all the long press handlers using the hook
  // Note: These hooks must be called consistently on every render

  // Pairs mode handlers
  const leftPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftPairCallback || (() => {})
  );
  const rightPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightPairCallback || (() => {})
  );
  const subPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.subPairCallback || (() => {})
  );

  // Individual mode handlers - all possible positions
  // 2-2 Formation positions
  const leftDefenderEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftDefenderCallback || (() => {})
  );
  const rightDefenderEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightDefenderCallback || (() => {})
  );
  const leftAttackerEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftAttackerCallback || (() => {})
  );
  const rightAttackerEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightAttackerCallback || (() => {})
  );
  
  // 1-2-1 Formation positions (MISSING - this was the bug!)
  const defenderEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.defenderCallback || (() => {})
  );
  const leftEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftCallback || (() => {})
  );
  const rightEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightCallback || (() => {})
  );
  const attackerEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.attackerCallback || (() => {})
  );
  
  // Substitute positions (used by both formations)
  const substitute_1Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_1Callback || (() => {})
  );
  const substitute_2Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_2Callback || (() => {})
  );
  const substitute_3Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_3Callback || (() => {})
  );
  const substitute_4Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_4Callback || (() => {})
  );
  const substitute_5Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_5Callback || (() => {})
  );

  if (isPairsMode) {
    return {
      leftPairEvents,
      rightPairEvents,
      subPairEvents
    };
  } else {
    return {
      // 2-2 Formation events
      leftDefenderEvents,
      rightDefenderEvents,
      leftAttackerEvents,
      rightAttackerEvents,
      
      // 1-2-1 Formation events (FIXED - now included!)
      defenderEvents,
      leftEvents,
      rightEvents,
      attackerEvents,
      
      // Substitute events (used by both formations)
      substitute_1Events,
      substitute_2Events,
      substitute_3Events,
      substitute_4Events,
      substitute_5Events
    };
  }
};