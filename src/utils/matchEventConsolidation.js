export const EVENT_TYPE_MAPPING = {
  match_started: 'match_start',
  match_ended: 'match_end',
  period_started: 'period_start',
  period_ended: 'period_end',
  goal_scored: 'goal_scored',
  goal_conceded: 'goal_conceded',
  substitution_in: 'substitution',
  substitution_out: 'substitution',
  goalie_enters: 'goalie_assignment',
  goalie_exits: 'goalie_switch',
  goalie_switch: 'goalie_switch',
  position_switch: 'position_change',
  position_switch_group: 'position_change',
  player_inactivated: 'player_inactivated',
  player_activated: 'player_activated',
  player_reactivated: 'player_activated',
  fair_play_award: 'fair_play_award'
};

export const parseEventTime = (event) => {
  if (!event?.created_at) return null;
  const parsed = Date.parse(event.created_at);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOrdinal = (event) => typeof event?.ordinal === 'number' ? event.ordinal : null;

const compareEvents = (a, b) => {
  const ordA = getOrdinal(a);
  const ordB = getOrdinal(b);

  if (ordA !== null && ordB !== null && ordA !== ordB) {
    return ordA - ordB;
  }
  if (ordA !== null && ordB === null) return -1;
  if (ordA === null && ordB !== null) return 1;

  const timeA = parseEventTime(a);
  const timeB = parseEventTime(b);
  if (timeA !== null && timeB !== null && timeA !== timeB) {
    return timeA - timeB;
  }
  if (timeA !== null && timeB === null) return -1;
  if (timeA === null && timeB !== null) return 1;

  const occA = typeof a?.occurred_at_seconds === 'number' ? a.occurred_at_seconds : null;
  const occB = typeof b?.occurred_at_seconds === 'number' ? b.occurred_at_seconds : null;
  if (occA !== null && occB !== null && occA !== occB) {
    return occA - occB;
  }
  if (occA !== null && occB === null) return -1;
  if (occA === null && occB !== null) return 1;

  const idxA = typeof a?.__sourceIndex === 'number' ? a.__sourceIndex : Infinity;
  const idxB = typeof b?.__sourceIndex === 'number' ? b.__sourceIndex : Infinity;
  return idxA - idxB;
};

export const sortEventsByOrdinal = (events = []) => [...events].sort(compareEvents);

const getNameFromEvent = (event) => {
  const data = event?.data || {};
  return data.display_name || data.playerName || data.scorerName || data.goalieName || data.previousGoalieName || null;
};

const buildPositionSwitchEvent = (group, playerNameMap) => {
  const changes = [];
  let goalieEnterEvent = null;
  let goalieExitEvent = null;

  group.events.forEach(ev => {
    if (ev.event_type === 'position_switch') {
      changes.push({
        playerId: ev.player_id,
        playerName: getNameFromEvent(ev),
        oldPosition: ev.data?.old_position || ev.data?.oldPosition || null,
        newPosition: ev.data?.new_position || ev.data?.newPosition || null
      });
    } else if (ev.event_type === 'goalie_enters') {
      goalieEnterEvent = ev;
    } else if (ev.event_type === 'goalie_exits') {
      goalieExitEvent = ev;
    }
  });

  const hasGoalieChange = Boolean(goalieExitEvent) ||
    changes.some(change => (change.oldPosition || '').toLowerCase() === 'goalie' || (change.newPosition || '').toLowerCase() === 'goalie');
  const hasAnyGoalieEvent = Boolean(goalieEnterEvent || goalieExitEvent) ||
    changes.some(change => (change.oldPosition || '').toLowerCase() === 'goalie' || (change.newPosition || '').toLowerCase() === 'goalie');

  const newGoalieId = goalieEnterEvent?.player_id ||
    changes.find(change => (change.newPosition || '').toLowerCase() === 'goalie')?.playerId ||
    null;
  const goalieFromOldPosition = changes.find(change => (change.oldPosition || '').toLowerCase() === 'goalie');
  const goalieFromNewPosition = changes.find(change => (change.newPosition || '').toLowerCase() === 'goalie');
  const oldGoalieId = goalieFromOldPosition?.playerId ||
    goalieExitEvent?.player_id ||
    null;

  const newGoalieName = goalieEnterEvent
    ? getNameFromEvent(goalieEnterEvent)
    : (goalieFromNewPosition ? goalieFromNewPosition.playerName : null);
  const oldGoalieName = goalieExitEvent
    ? getNameFromEvent(goalieExitEvent)
    : (goalieFromOldPosition ? goalieFromOldPosition.playerName : null);

  const oldGoalieNewPosition = goalieFromOldPosition?.newPosition || null;
  const newGoaliePreviousPosition = goalieFromNewPosition?.oldPosition || null;

  // If it's only a goalie enters event without any goalie position change info, treat as a simple goalie assignment
  if (!hasGoalieChange && !goalieExitEvent && !goalieFromOldPosition && hasAnyGoalieEvent && !changes.length) {
    return {
      id: group.correlationId ? `pos-${group.correlationId}` : undefined,
      event_type: 'goalie_enters',
      correlation_id: group.correlationId,
      created_at: group.created_at || new Date().toISOString(),
      occurred_at_seconds: typeof group.occurred_at_seconds === 'number' ? group.occurred_at_seconds : 0,
      ordinal: group.ordinal,
      period: group.period,
      data: {
        ...(goalieEnterEvent?.data || {}),
        goalieId: newGoalieId,
        goalieName: newGoalieName || (newGoalieId ? playerNameMap.get(newGoalieId) : null)
      }
    };
  }

  return {
    id: group.correlationId ? `pos-${group.correlationId}` : undefined,
    event_type: hasGoalieChange ? 'goalie_switch' : 'position_switch_group',
    correlation_id: group.correlationId,
    created_at: group.created_at || new Date().toISOString(),
    occurred_at_seconds: typeof group.occurred_at_seconds === 'number' ? group.occurred_at_seconds : 0,
    ordinal: group.ordinal,
    period: group.period,
    data: {
      positionChanges: changes,
      ...(oldGoalieId ? { oldGoalieId } : {}),
      ...(newGoalieId ? { newGoalieId } : {}),
      ...(oldGoalieName ? { oldGoalieName } : {}),
      ...(newGoalieName ? { newGoalieName } : {}),
      ...(oldGoalieNewPosition ? { oldGoalieNewPosition } : {}),
      ...(newGoaliePreviousPosition ? { newGoaliePreviousPosition } : {})
    }
  };
};

export function consolidateMatchEvents(events = [], { playerNameMap = new Map() } = {}) {
  if (!events || events.length === 0) return [];

  const substitutionGroups = new Map();
  const positionSwitchGroups = new Map();
  const mergedEvents = [];

  events.forEach((event, index) => {
    const isSubIn = event.event_type === 'substitution_in';
    const isSubOut = event.event_type === 'substitution_out';
    const correlationId = event.correlation_id;
    const isPositionSwitch = event.event_type === 'position_switch';
    const isGoalieEnter = event.event_type === 'goalie_enters';
    const isGoalieExit = event.event_type === 'goalie_exits';

    if ((isSubIn || isSubOut) && correlationId) {
      let group = substitutionGroups.get(correlationId);
      if (!group) {
        group = {
          correlationId,
          created_at: event.created_at,
          occurred_at_seconds: event.occurred_at_seconds,
          ordinal: event.ordinal,
          period: event.period,
          data: event.data ? { ...event.data } : {},
          playersOn: [],
          playersOff: [],
          playersOnNames: [],
          playersOffNames: [],
          sourceIndices: []
        };
        substitutionGroups.set(correlationId, group);
      }

      group.sourceIndices.push(index);

      const playerId = event.player_id;
      const playerName = getNameFromEvent(event);

      if (isSubIn && playerId && !group.playersOn.includes(playerId)) {
        group.playersOn.push(playerId);
        if (playerName) {
          group.playersOnNames.push(playerName);
        }
      }

      if (isSubOut && playerId && !group.playersOff.includes(playerId)) {
        group.playersOff.push(playerId);
        if (playerName) {
          group.playersOffNames.push(playerName);
        }
      }

      if (event.created_at && (!group.created_at || Date.parse(event.created_at) < Date.parse(group.created_at))) {
        group.created_at = event.created_at;
      }

      if (typeof event.occurred_at_seconds === 'number' &&
        (group.occurred_at_seconds === undefined || event.occurred_at_seconds < group.occurred_at_seconds)) {
        group.occurred_at_seconds = event.occurred_at_seconds;
      }

      if (typeof event.ordinal === 'number') {
        group.ordinal = typeof group.ordinal === 'number' ? Math.min(group.ordinal, event.ordinal) : event.ordinal;
      }

      if (!group.period && event.period) {
        group.period = event.period;
      }

      return;
    }

    if (correlationId && (isPositionSwitch || isGoalieEnter || isGoalieExit)) {
      let group = positionSwitchGroups.get(correlationId);
      if (!group) {
        group = {
          correlationId,
          created_at: event.created_at,
          occurred_at_seconds: event.occurred_at_seconds,
          ordinal: event.ordinal,
          period: event.period,
          events: [],
          sourceIndices: []
        };
        positionSwitchGroups.set(correlationId, group);
      }

      group.sourceIndices.push(index);
      group.events.push(event);

      if (event.created_at && (!group.created_at || Date.parse(event.created_at) < Date.parse(group.created_at))) {
        group.created_at = event.created_at;
      }

      if (typeof event.occurred_at_seconds === 'number' &&
        (group.occurred_at_seconds === undefined || event.occurred_at_seconds < group.occurred_at_seconds)) {
        group.occurred_at_seconds = event.occurred_at_seconds;
      }

      if (typeof event.ordinal === 'number') {
        group.ordinal = typeof group.ordinal === 'number' ? Math.min(group.ordinal, event.ordinal) : event.ordinal;
      }

      if (!group.period && event.period) {
        group.period = event.period;
      }

      return;
    }

    mergedEvents.push({ ...event, __sourceIndex: index });
  });

  substitutionGroups.forEach(group => {
    const sourceIndex = group.sourceIndices.length
      ? Math.min(...group.sourceIndices)
      : undefined;
    mergedEvents.push({
      id: group.correlationId ? `sub-${group.correlationId}` : undefined,
      event_type: 'substitution',
      correlation_id: group.correlationId,
      created_at: group.created_at,
      occurred_at_seconds: group.occurred_at_seconds,
      ordinal: group.ordinal,
      period: group.period,
      data: {
        ...group.data,
        playersOff: group.playersOff,
        playersOn: group.playersOn,
        ...(group.playersOffNames.length ? { playersOffNames: group.playersOffNames } : {}),
        ...(group.playersOnNames.length ? { playersOnNames: group.playersOnNames } : {})
      },
      __sourceIndex: sourceIndex
    });
  });

  positionSwitchGroups.forEach(group => {
    const sourceIndex = group.sourceIndices.length
      ? Math.min(...group.sourceIndices)
      : undefined;
    mergedEvents.push({
      ...buildPositionSwitchEvent(group, playerNameMap),
      __sourceIndex: sourceIndex
    });
  });

  return sortEventsByOrdinal(mergedEvents);
}

export function buildPlayerNameMap(events = []) {
  const map = new Map();
  const addName = (id, name) => {
    if (!id || !name || map.has(id)) return;
    map.set(id, name);
  };

  events.forEach(event => {
    const data = event?.data || {};
    const primaryName = data.display_name || data.playerName || data.scorerName || data.goalieName || data.previousGoalieName;

    if (event.player_id) {
      addName(event.player_id, primaryName);
    }

    if (data.playerNameMap && typeof data.playerNameMap === 'object') {
      Object.entries(data.playerNameMap).forEach(([id, name]) => addName(id, name));
    }

    if (Array.isArray(data.playersOff)) {
      data.playersOff.forEach((id, index) => addName(id, data.playersOffNames?.[index] || primaryName));
    }

    if (Array.isArray(data.playersOn)) {
      data.playersOn.forEach((id, index) => addName(id, data.playersOnNames?.[index] || primaryName));
    }

    if (data.sourcePlayerId) addName(data.sourcePlayerId, data.sourcePlayerName);
    if (data.targetPlayerId) addName(data.targetPlayerId, data.targetPlayerName);
    if (data.swapPlayerId) addName(data.swapPlayerId, data.swapPlayerName);

    if (data.goalieId) addName(data.goalieId, data.goalieName || primaryName);
    if (data.previousGoalieId || data.oldGoalieId) {
      addName(data.previousGoalieId || data.oldGoalieId, data.previousGoalieName || primaryName);
    }
  });

  return map;
}

export const mapDatabaseEventToUIType = dbEventType => EVENT_TYPE_MAPPING[dbEventType] || dbEventType;
