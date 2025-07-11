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
  const substitute_1Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_1Callback || (() => {})
  );
  const substitute_2Events = useLongPressWithScrollDetection(
    fieldPositionCallbacks.substitute_2Callback || (() => {})
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
      substitute_1Events,
      substitute_2Events
    };
  }
};