import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamAutocomplete } from '../TeamAutocomplete';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'teamAutocomplete.placeholder': 'Search for a team...',
        'teamAutocomplete.createNewTeam': 'Create new team',
        'teamAutocomplete.noTeamsFound': 'No teams found'
      };
      return translations[key] || key;
    }
  })
}));

const mockTeams = [
  { id: '1', name: 'F16-6' },
  { id: '2', name: 'F16-5' },
  { id: '3', name: 'P16 Boys' },
  { id: '4', name: 'Junior Team' }
];

describe('TeamAutocomplete', () => {
  const defaultProps = {
    teams: mockTeams,
    onSelect: jest.fn(),
    onCreateNew: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders input with default placeholder', () => {
      render(<TeamAutocomplete {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search for a team...')).toBeInTheDocument();
    });

    it('renders input with custom placeholder', () => {
      render(<TeamAutocomplete {...defaultProps} placeholder="Type your team name..." />);
      expect(screen.getByPlaceholderText('Type your team name...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      const { container } = render(<TeamAutocomplete {...defaultProps} />);
      expect(container.querySelector('.lucide-search')).toBeInTheDocument();
    });

    it('renders loading spinner when loading', () => {
      const { container } = render(<TeamAutocomplete {...defaultProps} loading={true} />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
      expect(container.querySelector('.lucide-search')).not.toBeInTheDocument();
    });

    it('renders disabled input when disabled', () => {
      render(<TeamAutocomplete {...defaultProps} disabled={true} />);
      expect(screen.getByPlaceholderText('Search for a team...')).toBeDisabled();
    });
  });

  describe('Dropdown behavior', () => {
    it('shows all teams on focus', () => {
      render(<TeamAutocomplete {...defaultProps} />);
      fireEvent.focus(screen.getByPlaceholderText('Search for a team...'));

      mockTeams.forEach((team) => {
        expect(screen.getByText(team.name)).toBeInTheDocument();
      });
    });

    it('filters teams on typing', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'F16');

      expect(screen.getByText('F16-6')).toBeInTheDocument();
      expect(screen.getByText('F16-5')).toBeInTheDocument();
      expect(screen.queryByText('P16 Boys')).not.toBeInTheDocument();
      expect(screen.queryByText('Junior Team')).not.toBeInTheDocument();
    });

    it('ranks prefix matches before contains matches', async () => {
      const teams = [
        { id: '1', name: 'Junior Team' },
        { id: '2', name: 'F16 Junior' },
        { id: '3', name: 'Junior A' }
      ];
      render(<TeamAutocomplete {...defaultProps} teams={teams} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'Junior');

      const buttons = screen.getAllByRole('button');
      // First two buttons should be prefix matches (Junior Team, Junior A)
      // then contains match (F16 Junior), then create option
      const teamButtons = buttons.filter(b => b.textContent !== 'Create new team"Junior"');
      expect(teamButtons[0]).toHaveTextContent('Junior Team');
      expect(teamButtons[1]).toHaveTextContent('Junior A');
      expect(teamButtons[2]).toHaveTextContent('F16 Junior');
    });

    it('closes dropdown on Escape', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      expect(screen.getByText('F16-6')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByText('F16-6')).not.toBeInTheDocument();
    });

    it('closes dropdown on outside click', () => {
      render(
        <div>
          <TeamAutocomplete {...defaultProps} />
          <div data-testid="outside">Outside</div>
        </div>
      );
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      expect(screen.getByText('F16-6')).toBeInTheDocument();

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(screen.queryByText('F16-6')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onSelect with team object when team is clicked', () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      fireEvent.click(screen.getByText('F16-6'));

      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockTeams[0]);
    });

    it('updates input value after selection', () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      fireEvent.click(screen.getByText('F16-6'));

      expect(input).toHaveValue('F16-6');
    });

    it('calls onCreateNew with query when create option is clicked', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'New Team');

      fireEvent.click(screen.getByText('Create new team'));

      expect(defaultProps.onCreateNew).toHaveBeenCalledWith('New Team');
    });
  });

  describe('Create option logic', () => {
    it('shows create option when query has no exact match', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'F16');

      expect(screen.getByText('Create new team')).toBeInTheDocument();
      expect(screen.getByText('"F16"')).toBeInTheDocument();
    });

    it('hides create option when exact match exists', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'F16-6');

      expect(screen.queryByText('Create new team')).not.toBeInTheDocument();
    });

    it('hides create option when exact match exists (case insensitive)', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'f16-6');

      expect(screen.queryByText('Create new team')).not.toBeInTheDocument();
    });

    it('hides create option when query is empty', () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      // Query is empty, only team buttons should appear, no create option
      expect(screen.queryByText('Create new team')).not.toBeInTheDocument();
    });

    it('hides create option when loading', async () => {
      render(<TeamAutocomplete {...defaultProps} loading={true} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'Something');

      expect(screen.queryByText('Create new team')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty teams array', async () => {
      render(<TeamAutocomplete {...defaultProps} teams={[]} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'New');

      expect(screen.getByText('Create new team')).toBeInTheDocument();
    });

    it('handles special characters in query', async () => {
      render(<TeamAutocomplete {...defaultProps} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      await userEvent.type(input, 'F16 (boys)');

      expect(screen.getByText('Create new team')).toBeInTheDocument();
      expect(screen.getByText('"F16 (boys)"')).toBeInTheDocument();
    });

    it('does not show dropdown when no teams and no query', () => {
      render(<TeamAutocomplete {...defaultProps} teams={[]} />);
      const input = screen.getByPlaceholderText('Search for a team...');
      fireEvent.focus(input);

      // No dropdown items should be visible
      const dropdown = screen.queryByRole('button');
      expect(dropdown).not.toBeInTheDocument();
    });
  });
});
