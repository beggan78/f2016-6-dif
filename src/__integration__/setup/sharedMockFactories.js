/**
 * Shared Mock Factories for Integration Tests
 *
 * Centralizes jest.mock() factory implementations that are duplicated across
 * multiple integration test files. Each export returns a mock module object
 * suitable for use as a jest.mock() factory return value.
 *
 * Usage in test files:
 *   jest.mock('../services/audioAlertService', () =>
 *     require('./setup/sharedMockFactories').audioAlertService
 *   );
 *
 * For mocks that spread jest.requireActual(), the test file must pass the
 * actual module:
 *   jest.mock('../utils/playerUtils', () =>
 *     require('./setup/sharedMockFactories').createPlayerUtilsMock(
 *       jest.requireActual('../utils/playerUtils')
 *     )
 *   );
 */

const React = require('react');

// ===================================================================
// GAMESCREEN MOCK FACTORIES
// ===================================================================

/**
 * FormationRenderer — renders a simple div with a data-testid based on renderSection.
 * Used by: GameScreenNavigationFlows, gameScreenMatchActions, formationVariations, multiPeriodLifecycle
 */
exports.formationRenderer = {
  FormationRenderer: ({ renderSection = 'all', ...props }) => {
    const testId = renderSection === 'all'
      ? 'formation-renderer'
      : `formation-renderer-${renderSection}`;
    return React.createElement('div', { 'data-testid': testId, ...props }, 'Mock Formation');
  }
};

/**
 * audioAlertService — stubs playSound and preloadSounds.
 * Used by: GameScreenNavigationFlows, gameScreenMatchActions, formationVariations, multiPeriodLifecycle
 */
exports.audioAlertService = {
  playSound: jest.fn(),
  preloadSounds: jest.fn()
};

/**
 * gameEventLogger — spreads the actual module and overrides key functions.
 * Requires the actual module to be passed in since jest.requireActual
 * path resolution is relative to the calling test file.
 *
 * Used by: GameScreenNavigationFlows, gameScreenMatchActions, formationVariations, multiPeriodLifecycle
 */
exports.createGameEventLoggerMock = (actualModule) => ({
  ...actualModule,
  initializeEventLogger: jest.fn(),
  logEvent: jest.fn(),
  getGameEvents: jest.fn(() => []),
  calculateMatchTime: jest.fn(() => '00:00')
});

/**
 * matchStateManager — superset of all methods used across test files.
 * Used by: GameScreenNavigationFlows, gameScreenMatchActions, formationVariations,
 *          multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.matchStateManager = {
  createMatch: jest.fn(),
  formatMatchDataFromGameState: jest.fn(() => ({})),
  updateMatch: jest.fn(),
  getMatch: jest.fn(),
  clearStoredState: jest.fn(),
  getPlayerStats: jest.fn()
};

/**
 * playerUtils — spreads the actual module and overrides hasActiveSubstitutes.
 * Requires the actual module to be passed in.
 *
 * Used by: GameScreenNavigationFlows, gameScreenMatchActions, formationVariations, multiPeriodLifecycle
 */
exports.createPlayerUtilsMock = (actualModule) => ({
  ...actualModule,
  hasActiveSubstitutes: jest.fn()
});

/**
 * GoalScorerModal — renders null.
 * Used by: formationVariations, multiPeriodLifecycle
 */
exports.goalScorerModal = {
  __esModule: true,
  default: () => null
};

/**
 * SubstitutionCountControls — renders null.
 * Used by: formationVariations, multiPeriodLifecycle
 */
exports.substitutionCountControls = {
  SubstitutionCountInlineControl: () => null
};

/**
 * playerSortingUtils — pass-through sort.
 * Used by: formationVariations, multiPeriodLifecycle
 */
exports.playerSortingUtils = {
  sortPlayersByGoalScoringRelevance: jest.fn((players) => players)
};

// ===================================================================
// PERIOD SETUP MOCK FACTORIES
// ===================================================================

/**
 * lucide-react icons — superset of all icons used across PeriodSetup and GameScreen tests.
 * Uses spread props to forward className and any other attributes.
 *
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment, configToPeriodSetupFlows
 */
exports.lucideReact = {
  Users: (props) => React.createElement('div', { 'data-testid': 'users-icon', ...props }),
  Play: (props) => React.createElement('div', { 'data-testid': 'play-icon', ...props }),
  ArrowLeft: (props) => React.createElement('div', { 'data-testid': 'arrow-left-icon', ...props }),
  Shuffle: (props) => React.createElement('div', { 'data-testid': 'shuffle-icon', ...props }),
  Save: (props) => React.createElement('div', { 'data-testid': 'save-icon', ...props }),
  Square: (props) => React.createElement('div', { 'data-testid': 'square-icon', ...props }),
  Pause: (props) => React.createElement('div', { 'data-testid': 'pause-icon', ...props }),
  SquarePlay: (props) => React.createElement('div', { 'data-testid': 'square-play-icon', ...props }),
  Undo2: (props) => React.createElement('div', { 'data-testid': 'undo2-icon', ...props }),
  RefreshCcw: (props) => React.createElement('div', { 'data-testid': 'refresh-icon', ...props }),
  Settings: (props) => React.createElement('svg', { 'data-testid': 'icon-settings', ...props }),
  Cloud: (props) => React.createElement('svg', { 'data-testid': 'icon-cloud', ...props })
};

/**
 * Shared UI components mock — Select, Button, ConfirmationModal, and GameScreen modal stubs.
 * The ConfirmationModal includes onConfirm/onCancel/title/message for tests that need them.
 *
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.sharedUI = {
  Select: ({ value, onChange, options, placeholder, id, ...props }) =>
    React.createElement(
      'select',
      {
        'data-testid': id || 'select',
        value: value || '',
        onChange: (e) => onChange && onChange(e.target.value),
        ...props
      },
      placeholder && React.createElement('option', { key: '__placeholder', value: '' }, placeholder),
      Array.isArray(options)
        ? options.map((option) => {
            if (typeof option === 'object') {
              return React.createElement('option', { key: option.value, value: option.value }, option.label);
            }
            return React.createElement('option', { key: option, value: option }, option);
          })
        : null
    ),
  Button: ({ onClick, disabled, children, Icon, ...props }) =>
    React.createElement(
      'button',
      { 'data-testid': 'button', onClick, disabled, ...props },
      Icon && React.createElement(Icon, { 'data-testid': 'button-icon' }),
      children
    ),
  ConfirmationModal: ({ isOpen, onConfirm, onCancel, title, message }) =>
    isOpen
      ? React.createElement(
          'div',
          { 'data-testid': 'confirmation-modal', role: 'dialog' },
          title && React.createElement('h2', null, title),
          message && React.createElement('p', null, message),
          onConfirm && React.createElement('button', { 'data-testid': 'modal-confirm', onClick: onConfirm }, 'Confirm'),
          onCancel && React.createElement('button', { 'data-testid': 'modal-cancel', onClick: onCancel }, 'Cancel')
        )
      : null,
  FieldPlayerModal: ({ isOpen }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'field-player-modal' }) : null,
  SubstitutePlayerModal: ({ isOpen }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'substitute-player-modal' }) : null,
  GoalieModal: ({ isOpen }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'goalie-modal' }) : null,
  ScoreManagerModal: ({ isOpen }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'score-manager-modal' }) : null,
  SubstituteSelectionModal: ({ isOpen }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'substitute-selection-modal' }) : null
};

/**
 * formatUtils — stubs for getPlayerLabel and formatPlayerName.
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.formatUtils = {
  getPlayerLabel: jest.fn((player, periodNumber) => `${player.displayName} (P${periodNumber})`),
  formatPlayerName: jest.fn((player) => player?.displayName || '')
};

/**
 * debugUtils — stubs randomizeFormationPositions.
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.debugUtils = {
  randomizeFormationPositions: jest.fn(() => ({}))
};

/**
 * TeamContext — simple useTeam mock.
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.teamContext = {
  useTeam: jest.fn()
};

/**
 * usePlayerRecommendationData — simple stub.
 * Used by: formationVariations, multiPeriodLifecycle, periodSetupFormationAssignment
 */
exports.playerRecommendationData = {
  usePlayerRecommendationData: jest.fn()
};
