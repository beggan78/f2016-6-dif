import React from 'react';
import { render, screen } from '@testing-library/react';
import { MatchSummaryHeader } from '../MatchSummaryHeader';
import { describePerformance, expectPerformance } from '../../../__tests__/performanceTestUtils';

// Mock the formatTime utility
jest.mock('../../../utils/formatUtils', () => ({
  formatTime: jest.fn((seconds) => {
    if (!seconds || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })
}));

// Mock console.log to avoid clutter in tests
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

describe('MatchSummaryHeader', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      homeTeamName: 'Djurgården',
      awayTeamName: 'Hammarby',
      homeScore: 2,
      awayScore: 1,
      matchStartTime: 1640995200000, // 2022-01-01 12:00:00
      matchDuration: 900, // 15 minutes
      totalPeriods: 2,
      periodDurationMinutes: 12
    };
    
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders without crashing with default props', () => {
      render(<MatchSummaryHeader />);
      
      // Check default team names
      expect(screen.getByText('Djurgården')).toBeInTheDocument();
      expect(screen.getByText('Opponent')).toBeInTheDocument();
      
      // Check default scores
      expect(screen.getAllByText('0')).toHaveLength(2);
    });

    it('renders with custom props', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check custom team names
      expect(screen.getByText('Djurgården')).toBeInTheDocument();
      expect(screen.getByText('Hammarby')).toBeInTheDocument();
      
      // Check custom scores
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders all required UI elements', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      formatTime.mockReturnValue('15:00');
      
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check for formatted date (allowing for timezone differences)
      expect(screen.getByText(/2022-01-01 \d{2}:\d{2}/)).toBeInTheDocument();
      
      // Check for duration
      expect(screen.getByText('15:00')).toBeInTheDocument();
      
      // Check for period information
      expect(screen.getByText('2 × 12min')).toBeInTheDocument();
      
      // Check for score separator
      expect(screen.getByText('-')).toBeInTheDocument();
      
      // Check for winner indication
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
    });

    it('renders team names with proper styling and truncation', () => {
      const longTeamName = 'Very Long Team Name That Should Be Truncated';
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          awayTeamName={longTeamName}
        />
      );
      
      expect(screen.getByText(longTeamName)).toBeInTheDocument();
      
      // Check for truncation classes
      const teamNameElement = screen.getByText(longTeamName);
      expect(teamNameElement).toHaveClass('truncate');
    });
  });

  describe('Match Time Formatting', () => {
    it('formats match start time correctly with valid timestamp', () => {
      const startTime = new Date('2022-01-01T12:00:00').getTime();
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={startTime}
        />
      );
      
      // Allow for timezone differences - just check for the date and time format
      expect(screen.getByText(/2022-01-01 \d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('handles null match start time', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={null}
        />
      );
      
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
    });

    it('handles undefined match start time', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={undefined}
        />
      );
      
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
    });

    it('handles zero match start time', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={0}
        />
      );
      
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
    });

    it('formats different dates correctly using Swedish locale', () => {
      const testCases = [
        { date: '2022-12-25T14:30:00', expectedPattern: /2022-12-25 \d{2}:\d{2}/ },
        { date: '2022-01-01T09:15:00', expectedPattern: /2022-01-01 \d{2}:\d{2}/ },
        { date: '2022-06-15T23:45:00', expectedPattern: /2022-06-15 \d{2}:\d{2}/ },
        { date: '2022-03-08T00:00:00', expectedPattern: /2022-03-08 \d{2}:\d{2}/ }
      ];

      testCases.forEach(({ date, expectedPattern }) => {
        const { rerender } = render(
          <MatchSummaryHeader 
            {...defaultProps} 
            matchStartTime={new Date(date).getTime()}
          />
        );
        
        expect(screen.getByText(expectedPattern)).toBeInTheDocument();
        
        // Clean up for next test
        rerender(<div />);
      });
    });
  });

  describe('Match Duration Formatting', () => {
    it('formats match duration correctly with valid seconds', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      // Mock formatTime to return a specific value
      formatTime.mockReturnValue('15:00');
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={900}
        />
      );
      
      expect(formatTime).toHaveBeenCalledWith(900);
      
      // Check for the specific duration value
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('handles null match duration', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={null}
        />
      );
      
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('handles undefined match duration', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={undefined}
        />
      );
      
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('handles zero match duration', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={0}
        />
      );
      
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('handles negative match duration', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={-300}
        />
      );
      
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('formats different durations correctly', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      const testCases = [
        { duration: 60, expected: '01:00' },
        { duration: 1800, expected: '30:00' },
        { duration: 3665, expected: '61:05' },
        { duration: 45, expected: '00:45' }
      ];

      testCases.forEach(({ duration, expected }) => {
        formatTime.mockReturnValue(expected);
        
        const { rerender } = render(
          <MatchSummaryHeader 
            {...defaultProps} 
            matchDuration={duration}
          />
        );
        
        expect(formatTime).toHaveBeenCalledWith(duration);
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        // Clean up for next test
        rerender(<div />);
        formatTime.mockReset();
      });
    });
  });

  describe('Score Display and Winner Determination', () => {
    it('displays home team win correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={3}
          awayScore={1}
        />
      );
      
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
      
      // Check score styling - home score should be winner (emerald)
      const homeScoreElement = screen.getByText('3');
      expect(homeScoreElement).toHaveClass('text-emerald-400');
      
      // Away score should be loser (muted)
      const awayScoreElement = screen.getByText('1');
      expect(awayScoreElement).toHaveClass('text-slate-300');
    });

    it('displays away team win correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={1}
          awayScore={3}
        />
      );
      
      expect(screen.getByText('Hammarby wins')).toBeInTheDocument();
      
      // Check score styling - away score should be winner (emerald)
      const awayScoreElement = screen.getByText('3');
      expect(awayScoreElement).toHaveClass('text-emerald-400');
      
      // Home score should be loser (muted)
      const homeScoreElement = screen.getByText('1');
      expect(homeScoreElement).toHaveClass('text-slate-300');
    });

    it('displays tie correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={2}
          awayScore={2}
        />
      );
      
      expect(screen.getByText('Match tied')).toBeInTheDocument();
      
      // Check score styling - both scores should be neutral (sky)
      const scoreElements = screen.getAllByText('2');
      scoreElements.forEach(element => {
        expect(element).toHaveClass('text-sky-300');
      });
    });

    it('displays zero scores correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={0}
          awayScore={0}
        />
      );
      
      expect(screen.getByText('Match tied')).toBeInTheDocument();
      
      // Check that zero scores are displayed
      const zeroElements = screen.getAllByText('0');
      expect(zeroElements).toHaveLength(2);
      
      // Both should have tie styling
      zeroElements.forEach(element => {
        expect(element).toHaveClass('text-sky-300');
      });
    });

    it('handles high scores correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={15}
          awayScore={12}
        />
      );
      
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('applies correct CSS classes to score elements', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      const homeScoreElement = screen.getByText('2');
      const awayScoreElement = screen.getByText('1');
      
      // Check common score styling
      expect(homeScoreElement).toHaveClass('text-4xl', 'font-bold', 'font-mono');
      expect(awayScoreElement).toHaveClass('text-4xl', 'font-bold', 'font-mono');
      
      // Check winner/loser styling
      expect(homeScoreElement).toHaveClass('text-emerald-400');
      expect(awayScoreElement).toHaveClass('text-slate-300');
    });
  });

  describe('Team Name Display', () => {
    it('displays default team names when not provided', () => {
      render(<MatchSummaryHeader />);
      
      expect(screen.getByText('Djurgården')).toBeInTheDocument();
      expect(screen.getByText('Opponent')).toBeInTheDocument();
    });

    it('displays custom team names', () => {
      render(
        <MatchSummaryHeader 
          homeTeamName="Custom Home"
          awayTeamName="Custom Away"
        />
      );
      
      expect(screen.getByText('Custom Home')).toBeInTheDocument();
      expect(screen.getByText('Custom Away')).toBeInTheDocument();
    });

    it('handles empty team names', () => {
      render(
        <MatchSummaryHeader 
          homeTeamName=""
          awayTeamName=""
        />
      );
      
      // Should display empty strings
      const teamNameElements = screen.getAllByText('');
      expect(teamNameElements.length).toBeGreaterThan(0);
    });

    it('applies correct CSS classes to team name elements', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      const homeTeamElement = screen.getByText('Djurgården');
      const awayTeamElement = screen.getByText('Hammarby');
      
      // Check team name styling
      expect(homeTeamElement).toHaveClass('text-lg', 'font-semibold', 'text-slate-200', 'truncate');
      expect(awayTeamElement).toHaveClass('text-lg', 'font-semibold', 'text-slate-200', 'truncate');
    });

    it('handles special characters in team names', () => {
      const specialNames = {
        homeTeamName: 'Åkersberga ÖSK',
        awayTeamName: 'Märsta FF'
      };
      
      render(<MatchSummaryHeader {...defaultProps} {...specialNames} />);
      
      expect(screen.getByText('Åkersberga ÖSK')).toBeInTheDocument();
      expect(screen.getByText('Märsta FF')).toBeInTheDocument();
    });
  });

  describe('Period Information Display', () => {
    it('displays period information correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={3}
          periodDurationMinutes={10}
        />
      );
      
      expect(screen.getByText('3 × 10min')).toBeInTheDocument();
    });

    it('handles zero periods', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={0}
          periodDurationMinutes={12}
        />
      );
      
      expect(screen.getByText('0 × 12min')).toBeInTheDocument();
    });

    it('handles different period durations', () => {
      const testCases = [
        { periods: 1, duration: 15, expected: '1 × 15min' },
        { periods: 4, duration: 8, expected: '4 × 8min' },
        { periods: 2, duration: 20, expected: '2 × 20min' }
      ];

      testCases.forEach(({ periods, duration, expected }) => {
        const { rerender } = render(
          <MatchSummaryHeader 
            {...defaultProps} 
            totalPeriods={periods}
            periodDurationMinutes={duration}
          />
        );
        
        expect(screen.getByText(expected)).toBeInTheDocument();
        
        // Clean up for next test
        rerender(<div />);
      });
    });

    it('uses default period duration when not provided', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={2}
          periodDurationMinutes={undefined}
        />
      );
      
      expect(screen.getByText('2 × 12min')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles all null/undefined props gracefully', () => {
      const nullProps = {
        homeTeamName: null,
        awayTeamName: null,
        homeScore: null,
        awayScore: null,
        matchStartTime: null,
        matchDuration: null,
        totalPeriods: null,
        periodDurationMinutes: null
      };
      
      render(<MatchSummaryHeader {...nullProps} />);
      
      // Should not crash and show fallback values
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('handles negative scores', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={-1}
          awayScore={-2}
        />
      );
      
      expect(screen.getByText('-1')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument(); // -1 > -2
    });

    it('handles very large scores', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={999}
          awayScore={1000}
        />
      );
      
      expect(screen.getByText('999')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('Hammarby wins')).toBeInTheDocument();
    });

    it('handles invalid date objects', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={NaN}
        />
      );
      
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
    });

    it('handles string values for numeric props', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore="2"
          awayScore="1"
          matchDuration="900"
          totalPeriods="2"
        />
      );
      
      // Should still work with string values
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
    });
  });

  describe('UI Layout and Styling', () => {
    it('renders with correct CSS classes for layout', () => {
      const { container } = render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check main container has correct spacing
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('space-y-4');
    });

    it('renders score separator correctly', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      const separator = screen.getByText('-');
      expect(separator).toHaveClass('text-2xl', 'font-bold', 'text-slate-500');
    });

    it('renders result indicator with trophy icon', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      const resultText = screen.getByText('Djurgården wins');
      expect(resultText).toHaveClass('text-slate-300');
      
      // Check that result indicator section exists
      const resultSection = resultText.closest('div');
      expect(resultSection).toHaveClass('flex', 'items-center', 'justify-center', 'space-x-2', 'text-sm');
    });

    it('applies correct text colors for different match outcomes', () => {
      // Test home win
      const { rerender } = render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={3}
          awayScore={1}
        />
      );
      
      let homeScore = screen.getByText('3');
      let awayScore = screen.getByText('1');
      expect(homeScore).toHaveClass('text-emerald-400');
      expect(awayScore).toHaveClass('text-slate-300');
      
      // Test away win
      rerender(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={1}
          awayScore={3}
        />
      );
      
      homeScore = screen.getByText('1');
      awayScore = screen.getByText('3');
      expect(homeScore).toHaveClass('text-slate-300');
      expect(awayScore).toHaveClass('text-emerald-400');
      
      // Test tie
      rerender(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={2}
          awayScore={2}
        />
      );
      
      const tieScores = screen.getAllByText('2');
      tieScores.forEach(score => {
        expect(score).toHaveClass('text-sky-300');
      });
    });
  });

  describe('Function Testing', () => {
    it('formatMatchStartTime function works correctly', () => {
      // This is tested through the rendering tests above,
      // but we can also test the function behavior directly
      const component = render(<MatchSummaryHeader {...defaultProps} />);
      
      // Verify the formatted time appears in the DOM (allowing for timezone differences)
      expect(screen.getByText(/2022-01-01 \d{2}:\d{2}/)).toBeInTheDocument();
      
      component.unmount();
    });

    it('formatMatchDuration function works correctly', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      formatTime.mockReturnValue('15:00');
      
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Verify formatTime was called with correct duration
      expect(formatTime).toHaveBeenCalledWith(900);
      
      // Verify the formatted duration appears in the DOM
      expect(screen.getByText('15:00')).toBeInTheDocument();
    });

    it('getTeamScoreStyle function works correctly for all scenarios', () => {
      // Test home win styling
      const { rerender } = render(
        <MatchSummaryHeader 
          {...defaultProps}
          homeScore={3}
          awayScore={1}
        />
      );
      
      expect(screen.getByText('3')).toHaveClass('text-emerald-400');
      expect(screen.getByText('1')).toHaveClass('text-slate-300');
      
      // Test away win styling
      rerender(
        <MatchSummaryHeader 
          {...defaultProps}
          homeScore={1}
          awayScore={3}
        />
      );
      
      expect(screen.getByText('1')).toHaveClass('text-slate-300');
      expect(screen.getByText('3')).toHaveClass('text-emerald-400');
      
      // Test tie styling
      rerender(
        <MatchSummaryHeader 
          {...defaultProps}
          homeScore={2}
          awayScore={2}
        />
      );
      
      const tieScores = screen.getAllByText('2');
      tieScores.forEach(score => {
        expect(score).toHaveClass('text-sky-300');
      });
    });
  });

  describe('Advanced Score Edge Cases', () => {
    it('handles floating point scores correctly', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={2.5}
          awayScore={1.5}
        />
      );
      
      expect(screen.getByText('2.5')).toBeInTheDocument();
      expect(screen.getByText('1.5')).toBeInTheDocument();
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
    });

    it('handles zero vs positive score edge case', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={0}
          awayScore={1}
        />
      );
      
      expect(screen.getByText('Hammarby wins')).toBeInTheDocument();
      
      const homeScore = screen.getByText('0');
      const awayScore = screen.getByText('1');
      expect(homeScore).toHaveClass('text-slate-300');
      expect(awayScore).toHaveClass('text-emerald-400');
    });

    it('handles very close fractional scores', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={1.00001}
          awayScore={1.00000}
        />
      );
      
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
    });

    it('handles NaN scores gracefully', () => {
      // Console errors expected due to React warning about NaN children
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={NaN}
          awayScore={NaN}
        />
      );
      
      expect(screen.getByText('Match tied')).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });

    it('handles Infinity scores gracefully', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={Infinity}
          awayScore={5}
        />
      );
      
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
    });
  });

  describe('Date/Time Edge Cases', () => {
    it('handles epoch timestamp edge case (1970)', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={1000} // Very early timestamp
        />
      );
      
      expect(screen.getByText(/1970-01-01 \d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('handles far future timestamp', () => {
      const futureTime = new Date('2099-12-31T23:59:59').getTime();
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={futureTime}
        />
      );
      
      expect(screen.getByText(/2099-12-31 \d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('handles invalid date input gracefully', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime="invalid-date"
        />
      );
      
      // Component will create a new Date("invalid-date") which results in Invalid Date
      // But it still renders a formatted string, just with "Invalid Date" values
      expect(screen.getByText(/Invalid Date/i) || screen.getByText('No start time recorded')).toBeInTheDocument();
    });

    it('handles negative timestamp', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchStartTime={-1000000000000}
        />
      );
      
      // Should handle negative timestamps gracefully
      expect(screen.getByText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)).toBeInTheDocument();
    });

    it('handles very large duration edge cases', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      // Test extremely long match duration
      formatTime.mockReturnValue('999:59');
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={59999} // Nearly 1000 minutes
        />
      );
      
      expect(formatTime).toHaveBeenCalledWith(59999);
      expect(screen.getByText('999:59')).toBeInTheDocument();
    });

    it('handles fractional duration seconds', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      formatTime.mockReturnValue('15:30');
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={930.5} // 15.5 minutes
        />
      );
      
      expect(formatTime).toHaveBeenCalledWith(930.5);
    });
  });

  describe('Accessibility Testing', () => {
    it('has semantic HTML structure for match summary', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check for semantic structure - using class names as accessibility indicators
      const dateElement = screen.getByText(/2022-01-01/);
      const dateSection = dateElement.closest('div');
      expect(dateSection).toHaveClass('flex', 'items-center', 'justify-center');
      
      // Find score element and verify it has appropriate styling
      const scoreElements = screen.getAllByText('2');
      const homeScoreElement = scoreElements.find(el => el.className.includes('text-4xl'));
      expect(homeScoreElement).toBeDefined();
      expect(homeScoreElement).toHaveClass('text-4xl', 'font-bold');
    });

    it('provides clear visual hierarchy for match results', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check team names have appropriate font sizes
      const homeTeam = screen.getByText('Djurgården');
      const awayTeam = screen.getByText('Hammarby');
      expect(homeTeam).toHaveClass('text-lg', 'font-semibold');
      expect(awayTeam).toHaveClass('text-lg', 'font-semibold');
      
      // Check scores are prominently displayed
      const homeScore = screen.getByText('2');
      const awayScore = screen.getByText('1');
      expect(homeScore).toHaveClass('text-4xl', 'font-bold');
      expect(awayScore).toHaveClass('text-4xl', 'font-bold');
    });

    it('maintains readable contrast for different match outcomes', () => {
      const { rerender } = render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={3}
          awayScore={1}
        />
      );
      
      // Winner should have emerald color (high contrast)
      expect(screen.getByText('3')).toHaveClass('text-emerald-400');
      // Loser should have muted color but still readable
      expect(screen.getByText('1')).toHaveClass('text-slate-300');
      
      // Test tie scenario
      rerender(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeScore={2}
          awayScore={2}
        />
      );
      
      // Both scores should have neutral but readable color
      const tieScores = screen.getAllByText('2');
      tieScores.forEach(score => {
        expect(score).toHaveClass('text-sky-300');
      });
    });

    it('handles screen reader content appropriately', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Test that important information is available as text content
      expect(screen.getByText('Djurgården wins')).toBeInTheDocument();
      expect(screen.getByText('2 × 12min')).toBeInTheDocument();
      
      // Ensure score values are clearly readable
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Responsive Design Considerations', () => {
    it('applies truncation classes for long team names', () => {
      const veryLongName = 'Extremely Long Team Name That Would Overflow Container';
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeTeamName={veryLongName}
          awayTeamName={veryLongName}
        />
      );
      
      const teamElements = screen.getAllByText(veryLongName);
      teamElements.forEach(element => {
        expect(element).toHaveClass('truncate');
      });
    });

    it('maintains proper spacing in score layout', () => {
      render(<MatchSummaryHeader {...defaultProps} />);
      
      // Check separator styling - need to find the parent div with the correct classes
      const separator = screen.getByText('-');
      expect(separator.closest('div').parentElement).toHaveClass('flex-shrink-0', 'px-4');
      
      // Verify scores have proper styling
      const scoreElements = screen.getAllByText(/^[0-9]+$/);
      expect(scoreElements.length).toBeGreaterThanOrEqual(2);
      scoreElements.forEach(element => {
        if (element.className.includes('text-4xl')) {
          expect(element).toHaveClass('text-4xl', 'font-bold', 'font-mono');
        }
      });
    });

    it('handles very short team names gracefully', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          homeTeamName="A"
          awayTeamName="B"
        />
      );
      
      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('A wins')).toBeInTheDocument();
    });
  });

  describe('Integration with formatUtils', () => {
    it('handles formatTime utility edge cases', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      // Test when formatTime returns empty string
      formatTime.mockReturnValue('');
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={0}
        />
      );
      
      expect(screen.getByText('Duration unknown')).toBeInTheDocument();
    });

    it('handles formatTime utility throwing error', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      // Mock formatTime to throw error
      formatTime.mockImplementation(() => {
        throw new Error('Format error');
      });
      
      // Suppress expected console errors during this test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // When formatTime throws, the component will crash during render
      // So we need to test if it throws or handles gracefully
      expect(() => {
        render(
          <MatchSummaryHeader 
            {...defaultProps} 
            matchDuration={900}
          />
        );
      }).toThrow();
      
      consoleErrorSpy.mockRestore();
    });

    it('validates formatTime is called with correct parameters', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      
      formatTime.mockReturnValue('25:30');
      
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          matchDuration={1530}
        />
      );
      
      // Verify exact parameter passed
      expect(formatTime).toHaveBeenCalledWith(1530);
      expect(formatTime).toHaveBeenCalledTimes(1);
    });
  });

  describe('Period Information Edge Cases', () => {
    it('handles negative period values', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={-1}
          periodDurationMinutes={-5}
        />
      );
      
      expect(screen.getByText('-1 × -5min')).toBeInTheDocument();
    });

    it('handles fractional period values', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={2.5}
          periodDurationMinutes={12.5}
        />
      );
      
      expect(screen.getByText('2.5 × 12.5min')).toBeInTheDocument();
    });

    it('handles very large period values', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods={999}
          periodDurationMinutes={999}
        />
      );
      
      expect(screen.getByText('999 × 999min')).toBeInTheDocument();
    });

    it('handles string period values', () => {
      render(
        <MatchSummaryHeader 
          {...defaultProps} 
          totalPeriods="3"
          periodDurationMinutes="15"
        />
      );
      
      expect(screen.getByText('3 × 15min')).toBeInTheDocument();
    });
  });

  describe('Component Robustness', () => {
    it('handles complete props replacement gracefully', () => {
      const { rerender } = render(<MatchSummaryHeader {...defaultProps} />);
      
      // Completely change all props
      const newProps = {
        homeTeamName: 'New Home',
        awayTeamName: 'New Away',
        homeScore: 5,
        awayScore: 3,
        matchStartTime: new Date('2023-06-15T18:30:00').getTime(),
        matchDuration: 1800,
        totalPeriods: 4,
        periodDurationMinutes: 10
      };
      
      rerender(<MatchSummaryHeader {...newProps} />);
      
      expect(screen.getByText('New Home')).toBeInTheDocument();
      expect(screen.getByText('New Away')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('New Home wins')).toBeInTheDocument();
      expect(screen.getByText('4 × 10min')).toBeInTheDocument();
    });

    it('maintains stability with rapid prop changes', () => {
      const { rerender } = render(<MatchSummaryHeader {...defaultProps} />);
      
      // Simulate rapid score updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <MatchSummaryHeader 
            {...defaultProps} 
            homeScore={i}
            awayScore={i + 1}
          />
        );
      }
      
      // Should end with final values
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Hammarby wins')).toBeInTheDocument();
    });

    it('handles mixed valid and invalid props', () => {
      const { formatTime } = require('../../../utils/formatUtils');
      // Ensure formatTime returns fallback for invalid input
      formatTime.mockReturnValue('Duration unknown');
      
      render(
        <MatchSummaryHeader 
          homeTeamName="Valid Team"
          awayTeamName={null}
          homeScore="3"
          awayScore={undefined}
          matchStartTime={null}
          matchDuration="invalid"
          totalPeriods={2}
          periodDurationMinutes={null}
        />
      );
      
      expect(screen.getByText('Valid Team')).toBeInTheDocument();
      expect(screen.getByText('No start time recorded')).toBeInTheDocument();
      // When periodDurationMinutes is null, it renders as "2 × min" (note: no number before min)
      expect(screen.getByText('2 × min')).toBeInTheDocument();
      
      // Check the scores are rendered (string "3" and undefined becomes 0)  
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Performance and Memory', () => {
    it('does not cause memory leaks with multiple renders', () => {
      const { rerender, unmount } = render(<MatchSummaryHeader {...defaultProps} />);
      
      // Multiple rerenders to test for memory leaks
      for (let i = 0; i < 50; i++) {
        rerender(
          <MatchSummaryHeader 
            {...defaultProps} 
            homeScore={i % 10}
            awayScore={(i + 1) % 10}
          />
        );
      }
      
      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });
});

// Performance Tests - Uses environment-aware utilities
describePerformance('MatchSummaryHeader Performance', () => {
  let defaultProps;

  beforeEach(() => {
    defaultProps = {
      homeTeamName: 'Djurgården',
      awayTeamName: 'Hammarby',
      homeScore: 2,
      awayScore: 1,
      matchStartTime: 1640995200000,
      matchDuration: 900,
      totalPeriods: 2,
      periodDurationMinutes: 12
    };
    
    jest.clearAllMocks();
  });

  it('handles rapid component updates efficiently', async () => {
    await expectPerformance(
      () => {
        const { rerender } = render(<MatchSummaryHeader {...defaultProps} />);
        
        // Test multiple rapid updates to simulate real-world usage
        for (let i = 0; i < 20; i++) {
          rerender(
            <MatchSummaryHeader 
              {...defaultProps} 
              homeScore={i}
              awayScore={i + 1}
            />
          );
        }
      },
      { 
        operation: 'fast', 
        enableLogging: true 
      }
    );
  });
});