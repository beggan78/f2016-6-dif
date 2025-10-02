import { useQuickTapWithScrollDetection } from './useQuickTapWithScrollDetection';

export const useFieldPositionHandlers = (fieldPositionCallbacks, teamConfig) => {
  const isPairsMode = teamConfig?.substitutionType === 'pairs';

  // Create all the quick tap handlers using the hook
  // Note: These hooks must be called consistently on every render

  // Pairs mode handlers
  const leftPairEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.leftPairCallback || (() => {})
  );
  const rightPairEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.rightPairCallback || (() => {})
  );
  const subPairEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.subPairCallback || (() => {})
  );

  // Individual mode handlers - all possible positions
  // 2-2 Formation positions
  const leftDefenderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.leftDefenderCallback || (() => {})
  );
  const rightDefenderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.rightDefenderCallback || (() => {})
  );
  const leftAttackerEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.leftAttackerCallback || (() => {})
  );
  const rightAttackerEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.rightAttackerCallback || (() => {})
  );

  // 7v7 formation positions
  const leftMidfielderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.leftMidfielderCallback || (() => {})
  );
  const centerMidfielderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.centerMidfielderCallback || (() => {})
  );
  const rightMidfielderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.rightMidfielderCallback || (() => {})
  );
  
  // 1-2-1 Formation positions (MISSING - this was the bug!)
  const defenderEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.defenderCallback || (() => {})
  );
  const leftEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.leftCallback || (() => {})
  );
  const rightEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.rightCallback || (() => {})
  );
  const attackerEvents = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.attackerCallback || (() => {})
  );
  
  // Substitute positions (used by both formations)
  const substitute_1Events = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.substitute_1Callback || (() => {})
  );
  const substitute_2Events = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.substitute_2Callback || (() => {})
  );
  const substitute_3Events = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.substitute_3Callback || (() => {})
  );
  const substitute_4Events = useQuickTapWithScrollDetection(
    fieldPositionCallbacks.substitute_4Callback || (() => {})
  );
  const substitute_5Events = useQuickTapWithScrollDetection(
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

      // 7v7 formation events
      leftMidfielderEvents,
      centerMidfielderEvents,
      rightMidfielderEvents,
      
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
