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

  // Individual mode handlers
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
  const substituteEvents = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substituteCallback || (() => {})
  );
  const leftDefender7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftDefender7Callback || (() => {})
  );
  const rightDefender7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightDefender7Callback || (() => {})
  );
  const leftAttacker7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.leftAttacker7Callback || (() => {})
  );
  const rightAttacker7Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.rightAttacker7Callback || (() => {})
  );
  const substitute7_1Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute7_1Callback || (() => {})
  );
  const substitute7_2Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute7_2Callback || (() => {})
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