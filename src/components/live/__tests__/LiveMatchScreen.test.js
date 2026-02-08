import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  LiveMatchScreen,
  calculateEffectiveMatchDurationSeconds,
  createEffectiveTimeCalculator,
  formatLiveMatchMinuteDisplay,
  sortEventsByOrdinal
} from '../LiveMatchScreen';
import { STORAGE_KEYS } from '../../../constants/storageKeys';
import { useMatchEvents } from '../../../hooks/useMatchEvents';
import { useTeam } from '../../../contexts/TeamContext';
import { findUpcomingMatchByOpponent } from '../../../services/matchIntegrationService';

const mockTimelineRender = jest.fn();

const baseTime = Date.parse('2024-01-01T10:00:00Z');
const buildEvent = (type, offsetMs) => ({
  event_type: type,
  created_at: new Date(baseTime + offsetMs).toISOString()
});

const buildLiveEvent = (type, offsetMs = 0, overrides = {}) => ({
  id: overrides.id || `${type}-${offsetMs}`,
  event_type: type,
  created_at: overrides.created_at || new Date(baseTime + offsetMs).toISOString(),
  ordinal: overrides.ordinal ?? offsetMs,
  period: overrides.period ?? 1,
  data: overrides.data || {},
  player_id: overrides.player_id,
  correlation_id: overrides.correlation_id,
  occurred_at_seconds: overrides.occurred_at_seconds
});

jest.mock('lucide-react', () => ({
  Printer: () => null,
  Share2: () => null,
  Settings: () => null,
  Radio: () => null,
  Clock: () => null,
  AlertCircle: () => null
}));

jest.mock('../../report/MatchSummaryHeader', () => ({
  MatchSummaryHeader: () => <div data-testid="match-summary-header" />
}));

jest.mock('../../report/GameEventTimeline', () => ({
  GameEventTimeline: (props) => {
    mockTimelineRender(props);
    return <div data-testid="game-event-timeline" />;
  }
}));

jest.mock('../../report/ReportSection', () => ({
  ReportSection: ({ children, headerExtra }) => (
    <div data-testid="report-section">
      {headerExtra}
      <div data-testid="report-content">{children}</div>
    </div>
  )
}));

jest.mock('../../report/EventToggleButton', () => ({
  EventToggleButton: ({ isVisible, onToggle, label }) => (
    <button
      type="button"
      data-testid="toggle-substitutions"
      data-visible={isVisible}
      onClick={onToggle}
    >
      {label}
    </button>
  )
}));

jest.mock('../../../services/matchIntegrationService', () => ({
  findUpcomingMatchByOpponent: jest.fn().mockResolvedValue(null)
}));

jest.mock('../../../contexts/TeamContext', () => ({
  useTeam: jest.fn()
}));

jest.mock('../../../hooks/useMatchEvents', () => ({
  useMatchEvents: jest.fn()
}));

describe('calculateEffectiveMatchDurationSeconds', () => {
  it('sums completed periods and excludes intermissions', () => {
    const events = [
      buildEvent('match_started', 0),
      buildEvent('period_ended', 900000),
      buildEvent('period_started', 1200000),
      buildEvent('match_ended', 2100000)
    ];

    const result = calculateEffectiveMatchDurationSeconds(events, false, baseTime + 2100000);
    expect(result).toBe(1800);
  });

  it('includes ongoing period time for live matches', () => {
    const events = [
      buildEvent('match_started', 0),
      buildEvent('period_ended', 900000),
      buildEvent('period_started', 1200000)
    ];

    const result = calculateEffectiveMatchDurationSeconds(events, true, baseTime + 1500000);
    expect(result).toBe(1200);
  });

  it('returns zero for missing or invalid timestamps', () => {
    expect(calculateEffectiveMatchDurationSeconds([], true, baseTime)).toBe(0);

    expect(
      calculateEffectiveMatchDurationSeconds(
        [{ event_type: 'match_started', created_at: 'invalid-date' }],
        true,
        baseTime + 60000
      )
    ).toBe(0);
  });
});

describe('createEffectiveTimeCalculator', () => {
  it('returns effective seconds that ignore intermissions', () => {
    const events = [
      buildEvent('match_started', 0),
      buildEvent('period_ended', 600000), // 10 minutes
      buildEvent('period_started', 900000), // 5-minute intermission
      buildEvent('goal_scored', 920000)
    ];

    const calculator = createEffectiveTimeCalculator(events, true, baseTime + 920000);

    // Start of period 2 should pick up where period 1 ended
    expect(calculator(baseTime + 900000)).toBe(600);
    // Events during intermission should not advance time
    expect(calculator(baseTime + 750000)).toBe(600);
    // Events inside the next period accumulate from the prior periods
    expect(calculator(baseTime + 920000)).toBe(620);
  });
});

describe('formatLiveMatchMinuteDisplay', () => {
  it('rounds up to the current minute', () => {
    expect(formatLiveMatchMinuteDisplay(221)).toBe("4'");
  });

  it('defaults to first minute for invalid or early values', () => {
    expect(formatLiveMatchMinuteDisplay(0)).toBe("1'");
    expect(formatLiveMatchMinuteDisplay(-5)).toBe("1'");
    expect(formatLiveMatchMinuteDisplay(NaN)).toBe("1'");
  });
});

describe('sortEventsByOrdinal', () => {
  it('orders by ordinal first', () => {
    const unordered = [
      { id: 'b', ordinal: 2 },
      { id: 'a', ordinal: 1 }
    ];

    const sorted = sortEventsByOrdinal(unordered);
    expect(sorted.map(e => e.id)).toEqual(['a', 'b']);
  });

  it('falls back to created_at when ordinal missing', () => {
    const unordered = [
      { id: 'later', created_at: new Date(baseTime + 2000).toISOString() },
      { id: 'earlier', created_at: new Date(baseTime + 1000).toISOString() }
    ];

    const sorted = sortEventsByOrdinal(unordered);
    expect(sorted.map(e => e.id)).toEqual(['earlier', 'later']);
  });
});

describe('LiveMatchScreen polling configuration', () => {
  const mockUseMatchEvents = useMatchEvents;
  const mockUseTeam = useTeam;

  let pollingCalls;
  let currentEvents;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    pollingCalls = [];
    currentEvents = [];

    mockUseTeam.mockReturnValue({ currentTeam: { id: 'team-123' } });
    mockUseMatchEvents.mockImplementation((_matchId, options) => {
      pollingCalls.push(options);
      return {
        events: currentEvents,
        isLoading: false,
        error: null,
        lastUpdateTime: new Date(baseTime)
      };
    });
  });

  it('enables 30s polling when match transitions from not started to live', async () => {
    const { rerender } = render(<LiveMatchScreen matchId="match-123" />);

    expect(pollingCalls[pollingCalls.length - 1]).toEqual({
      pollingEnabled: false,
      refreshIntervalMs: 60000
    });

    currentEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1 })
    ];
    rerender(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const latest = pollingCalls[pollingCalls.length - 1];
      expect(latest).toEqual({
        pollingEnabled: true,
        refreshIntervalMs: 30000
      });
    });
  });

  it('switches to 5-minute polling when match transitions from live to ended', async () => {
    currentEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1 })
    ];

    const { rerender } = render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const latest = pollingCalls[pollingCalls.length - 1];
      expect(latest).toEqual({
        pollingEnabled: true,
        refreshIntervalMs: 30000
      });
    });

    currentEvents = [
      ...currentEvents,
      buildLiveEvent('match_ended', 1000, { ordinal: 2 })
    ];
    rerender(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const latest = pollingCalls[pollingCalls.length - 1];
      expect(latest).toEqual({
        pollingEnabled: true,
        refreshIntervalMs: 300000
      });
    });
  });

  it('does not change polling config when already correct for not-started matches', async () => {
    render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      expect(pollingCalls).toHaveLength(1);
      expect(pollingCalls[0]).toEqual({
        pollingEnabled: false,
        refreshIntervalMs: 60000
      });
    });
  });
});

describe('LiveMatchScreen timeline sort order defaults', () => {
  const mockUseMatchEvents = useMatchEvents;
  const mockUseTeam = useTeam;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockTimelineRender.mockClear();

    mockUseTeam.mockReturnValue({ currentTeam: { id: 'team-123' } });
  });

  it('defaults to desc (newest first) for a live match', async () => {
    const liveEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } }),
      buildLiveEvent('goal_scored', 2000, { ordinal: 2, player_id: 'p1' })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: liveEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.initialSortOrder).toBe('desc');
    });
  });

  it('defaults to asc (oldest first) for a finished match', async () => {
    const finishedEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } }),
      buildLiveEvent('match_ended', 2000, { ordinal: 2 })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: finishedEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.initialSortOrder).toBe('asc');
    });
  });

  it('defaults to desc for a pending (not yet started) match', async () => {
    findUpcomingMatchByOpponent.mockResolvedValue(null);

    // No match_started event means match hasn't started yet
    mockUseMatchEvents.mockReturnValue({
      events: [buildLiveEvent('match_created', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } })],
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    // Pending match: matchHasStarted=false, isLive=false -> not finished -> uses live prefs (desc)
    await waitFor(() => {
      const calls = mockTimelineRender.mock.calls;
      if (calls.length > 0) {
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.initialSortOrder).toBe('desc');
      }
    });
  });

  it('does not change sort order when match transitions from live to finished', async () => {
    const liveEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } }),
      buildLiveEvent('goal_scored', 2000, { ordinal: 2, player_id: 'p1' })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: liveEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    const { rerender } = render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.initialSortOrder).toBe('desc');
    });

    // Match ends
    const finishedEvents = [
      ...liveEvents,
      buildLiveEvent('match_ended', 4000, { ordinal: 3 })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: finishedEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    rerender(<LiveMatchScreen matchId="match-123" />);

    // Sort order should still be desc (locked to live status at first load)
    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.initialSortOrder).toBe('desc');
    });
  });

  it('persists sort order to the live preference key for live matches', async () => {
    const liveEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } }),
      buildLiveEvent('goal_scored', 2000, { ordinal: 2, player_id: 'p1' })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: liveEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.onSortOrderChange).toBeDefined();
    });

    // Simulate sort order change via callback
    const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
    act(() => {
      lastCall.onSortOrderChange('asc');
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE_PREFERENCES_LIVE));
      expect(stored.sortOrder).toBe('asc');
    });
  });

  it('persists sort order to the finished preference key for finished matches', async () => {
    const finishedEvents = [
      buildLiveEvent('match_started', 0, { ordinal: 1, data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' } }),
      buildLiveEvent('match_ended', 2000, { ordinal: 2 })
    ];

    mockUseMatchEvents.mockReturnValue({
      events: finishedEvents,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    await waitFor(() => {
      const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(lastCall.onSortOrderChange).toBeDefined();
    });

    // Simulate sort order change via callback
    const lastCall = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
    act(() => {
      lastCall.onSortOrderChange('desc');
    });

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE_PREFERENCES));
      expect(stored.sortOrder).toBe('desc');
    });
  });
});

describe('LiveMatchScreen event filtering', () => {
  const mockUseMatchEvents = useMatchEvents;
  const mockUseTeam = useTeam;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();

    mockUseTeam.mockReturnValue({ currentTeam: { id: 'team-123' } });
    mockUseMatchEvents.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });
  });

  const createBaseEvents = () => ([
    buildLiveEvent('match_started', 0, {
      ordinal: 1,
      data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' }
    }),
    buildLiveEvent('goal_scored', 2000, { ordinal: 2, player_id: 'p1' }),
    buildLiveEvent('substitution', 3000, {
      ordinal: 3,
      data: { playersOff: ['p2'], playersOn: ['p3'] }
    }),
    buildLiveEvent('match_ended', 4000, { ordinal: 4 })
  ]);

  it('hides substitution events when toggle is off', async () => {
    const events = createBaseEvents();
    mockUseMatchEvents.mockReturnValue({
      events,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(<LiveMatchScreen matchId="match-123" />);

    const initialProps = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
    expect(initialProps.events.some(event => event.type === 'substitution')).toBe(true);

    fireEvent.click(screen.getByTestId('toggle-substitutions'));

    await waitFor(() => {
      const updatedProps = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
      expect(updatedProps.events.some(event => event.type === 'substitution')).toBe(false);
      expect(updatedProps.events.some(event => event.type === 'goal_scored')).toBe(true);
    });
  });

  it('persists toggle preference to localStorage', async () => {
    const events = createBaseEvents();
    mockUseMatchEvents.mockReturnValue({
      events,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    const { unmount } = render(<LiveMatchScreen matchId="match-123" />);

    fireEvent.click(screen.getByTestId('toggle-substitutions'));

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE_PREFERENCES));
      expect(stored.showSubstitutions).toBe(false);
    });

    unmount();
    mockTimelineRender.mockClear();

    render(<LiveMatchScreen matchId="match-123" />);

    const remountProps = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
    expect(screen.getByTestId('toggle-substitutions').dataset.visible).toBe('false');
    expect(remountProps.events.some(event => event.type === 'substitution')).toBe(false);
  });

  it('filters all substitution-related event types when hidden', () => {
    const events = [
      buildLiveEvent('match_started', 0, {
        ordinal: 1,
        data: { ownTeamName: 'Team A', opponentTeamName: 'Team B' }
      }),
      buildLiveEvent('substitution', 1000, { ordinal: 2 }),
      buildLiveEvent('goalie_enters', 2000, { ordinal: 3 }),
      buildLiveEvent('goalie_switch', 3000, { ordinal: 4 }),
      buildLiveEvent('position_switch', 4000, { ordinal: 5, player_id: 'player-3' }),
      buildLiveEvent('player_inactivated', 5000, { ordinal: 6, player_id: 'player-4' }),
      buildLiveEvent('player_activated', 6000, { ordinal: 7, player_id: 'player-5' }),
      buildLiveEvent('goal_scored', 7000, { ordinal: 8, player_id: 'scorer-1' }),
      buildLiveEvent('match_ended', 8000, { ordinal: 9 })
    ];

    mockUseMatchEvents.mockReturnValue({
      events,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    localStorage.setItem(
      STORAGE_KEYS.TIMELINE_PREFERENCES,
      JSON.stringify({ sortOrder: 'asc', showSubstitutions: false })
    );

    render(<LiveMatchScreen matchId="match-123" />);

    const timelineProps = mockTimelineRender.mock.calls[mockTimelineRender.mock.calls.length - 1][0];
    const eventTypes = timelineProps.events.map(event => event.type);

    expect(eventTypes).toEqual(['match_start', 'goal_scored', 'match_end']);
  });

  it('shows back navigation when enabled', () => {
    const events = createBaseEvents();
    const onNavigateBack = jest.fn();

    mockUseMatchEvents.mockReturnValue({
      events,
      isLoading: false,
      error: null,
      lastUpdateTime: new Date(baseTime)
    });

    render(
      <LiveMatchScreen
        matchId="match-123"
        showBackButton
        onNavigateBack={onNavigateBack}
      />
    );

    const backButton = screen.getByTestId('button-back');
    expect(backButton).toBeInTheDocument();

    fireEvent.click(backButton);
    expect(onNavigateBack).toHaveBeenCalled();
  });
});
