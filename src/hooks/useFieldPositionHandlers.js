import { useLongPressWithScrollDetection } from './useLongPressWithScrollDetection';
import { FORMATION_TYPES } from '../constants/playerConstants';

export const useFieldPositionHandlers = (fieldPositionCallbacks, formationType) => {
  const isPairsMode = formationType === FORMATION_TYPES.PAIRS_7;
  
  // Create all the long press handlers using the hook
  // Note: These hooks must be called consistently on every render
  
  // Pairs mode handlers
  const leftPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftPairCallback || (() => {}), 500
  );
  const rightPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightPairCallback || (() => {}), 500
  );
  const subPairEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.subPairCallback || (() => {}), 500
  );
  
  // Individual mode handlers
  const leftDefenderEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftDefenderCallback || (() => {}), 500
  );
  const rightDefenderEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightDefenderCallback || (() => {}), 500
  );
  const leftAttackerEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftAttackerCallback || (() => {}), 500
  );
  const rightAttackerEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightAttackerCallback || (() => {}), 500
  );
  const substituteEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substituteCallback || (() => {}), 500
  );
  const leftDefender7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftDefender7Callback || (() => {}), 500
  );
  const rightDefender7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightDefender7Callback || (() => {}), 500
  );
  const leftAttacker7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftAttacker7Callback || (() => {}), 500
  );
  const rightAttacker7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightAttacker7Callback || (() => {}), 500
  );
  const substitute7_1Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute7_1Callback || (() => {}), 500
  );
  const substitute7_2Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute7_2Callback || (() => {}), 500
  );
  
  if (isPairsMode) {
    return {
      leftPairEvents,
      rightPairEvents,
      subPairEvents
    };
  } else {
    return {
      leftDefenderEvents,
      rightDefenderEvents,
      leftAttackerEvents,
      rightAttackerEvents,
      substituteEvents,
      leftDefender7Events,
      rightDefender7Events,
      leftAttacker7Events,
      rightAttacker7Events,
      substitute7_1Events,
      substitute7_2Events
    };
  }
};