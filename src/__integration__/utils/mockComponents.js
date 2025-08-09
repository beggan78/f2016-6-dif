/**
 * Mock Components for Integration Testing
 * 
 * Simplified component mocks for integration testing that isolate
 * specific functionality while maintaining realistic behavior patterns.
 */

import React from 'react';
import { jest } from '@jest/globals';

// ===================================================================
// BASIC COMPONENT MOCKS
// ===================================================================

/**
 * Creates a simple mock component that renders children and props
 */
export const createSimpleMockComponent = (componentName, additionalProps = {}) => {
  const MockComponent = ({ children, ...props }) => (
    <div 
      data-testid={`mock-${componentName.toLowerCase()}`}
      data-component={componentName}
      {...additionalProps}
    >
      {children}
      {/* Render key props for testing visibility */}
      {Object.entries(props).map(([key, value]) => (
        <div key={key} data-prop={key} data-value={String(value)} />
      ))}
    </div>
  );
  
  MockComponent.displayName = `Mock${componentName}`;
  return MockComponent;
};

/**
 * Creates a mock component with event handlers
 */
export const createInteractiveMockComponent = (componentName, eventHandlers = {}) => {
  const MockComponent = ({ children, ...props }) => {
    const handleEvent = (eventType) => (event) => {
      if (eventHandlers[eventType]) {
        eventHandlers[eventType](event, props);
      }
      if (props[eventType]) {
        props[eventType](event);
      }
    };
    
    return (
      <div 
        data-testid={`mock-${componentName.toLowerCase()}`}
        data-component={componentName}
        onClick={handleEvent('onClick')}
        onSubmit={handleEvent('onSubmit')}
        onChange={handleEvent('onChange')}
      >
        {children}
        <div data-props={JSON.stringify(props)} />
      </div>
    );
  };
  
  MockComponent.displayName = `Mock${componentName}`;
  return MockComponent;
};

// ===================================================================
// FORMATION COMPONENT MOCKS
// ===================================================================

/**
 * Mock IndividualFormation component
 */
export const MockIndividualFormation = ({ formation, allPlayers, longPressHandlers, ...props }) => {
  return (
    <div 
      data-testid="mock-individual-formation"
      data-goalie={formation?.goalie}
    >
      <div data-testid="field-positions">
        {['leftDefender', 'rightDefender', 'leftAttacker', 'rightAttacker'].map(position => {
          const playerId = formation?.[position];
          const player = allPlayers?.find(p => p.id === playerId);
          return (
            <div 
              key={position}
              data-testid={`field-position-${position}`}
              data-player-id={playerId}
              {...(longPressHandlers?.[position] || {})}
            >
              {player?.name || 'Empty'}
            </div>
          );
        })}
      </div>
      <div data-testid="substitute-positions">
        {['substitute_1', 'substitute_2'].map(position => {
          const playerId = formation?.[position];
          const player = allPlayers?.find(p => p.id === playerId);
          return (
            <div 
              key={position}
              data-testid={`substitute-position-${position}`}
              data-player-id={playerId}
              {...(longPressHandlers?.[position] || {})}
            >
              {player?.name || 'Empty'}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Mock PairsFormation component
 */
export const MockPairsFormation = ({ formation, allPlayers, longPressHandlers, ...props }) => {
  const pairs = ['leftPair', 'rightPair', 'subPair'];
  
  return (
    <div 
      data-testid="mock-pairs-formation"
      data-goalie={formation?.goalie}
    >
      {pairs.map(pairKey => {
        const pair = formation?.[pairKey];
        if (!pair) return null;
        
        const defender = allPlayers?.find(p => p.id === pair.defender);
        const attacker = allPlayers?.find(p => p.id === pair.attacker);
        
        return (
          <div 
            key={pairKey}
            data-testid={`pair-${pairKey}`}
            data-defender-id={pair.defender}
            data-attacker-id={pair.attacker}
            {...(longPressHandlers?.[pairKey] || {})}
          >
            <div data-role="defender">{defender?.name || 'Empty'}</div>
            <div data-role="attacker">{attacker?.name || 'Empty'}</div>
          </div>
        );
      })}
    </div>
  );
};

// ===================================================================
// SCREEN COMPONENT MOCKS
// ===================================================================

/**
 * Mock ConfigurationScreen component
 */
export const MockConfigurationScreen = ({ 
  onPlayerSelectionChange,
  onGameConfigChange, 
  onProceedToSetup,
  selectedSquadIds = [],
  gameConfig = {},
  ...props 
}) => {
  const mockPlayers = [
    'Player 1', 'Player 2', 'Player 3', 'Player 4', 
    'Player 5', 'Player 6', 'Player 7', 'Player 8'
  ];
  
  return (
    <div data-testid="mock-configuration-screen">
      <div data-testid="player-selection">
        {mockPlayers.map((player, index) => (
          <label key={player}>
            <input 
              type="checkbox"
              data-testid={`player-checkbox-${index + 1}`}
              checked={selectedSquadIds.includes(`player-${index + 1}`)}
              onChange={(e) => {
                const playerId = `player-${index + 1}`;
                const newSelection = e.target.checked
                  ? [...selectedSquadIds, playerId]
                  : selectedSquadIds.filter(id => id !== playerId);
                onPlayerSelectionChange?.(newSelection);
              }}
            />
            {player}
          </label>
        ))}
      </div>
      
      <div data-testid="game-config">
        <select 
          data-testid="periods-select"
          value={gameConfig.numPeriods || 3}
          onChange={(e) => onGameConfigChange?.({ ...gameConfig, numPeriods: parseInt(e.target.value) })}
        >
          <option value={1}>1 Period</option>
          <option value={2}>2 Periods</option>
          <option value={3}>3 Periods</option>
        </select>
        
        <select 
          data-testid="duration-select"
          value={gameConfig.periodDurationMinutes || 15}
          onChange={(e) => onGameConfigChange?.({ ...gameConfig, periodDurationMinutes: parseInt(e.target.value) })}
        >
          <option value={10}>10 Minutes</option>
          <option value={15}>15 Minutes</option>
          <option value={20}>20 Minutes</option>
        </select>
        
        <input 
          data-testid="opponent-input"
          value={gameConfig.opponentTeamName || ''}
          onChange={(e) => onGameConfigChange?.({ ...gameConfig, opponentTeamName: e.target.value })}
          placeholder="Opponent Team Name"
        />
      </div>
      
      <button 
        data-testid="proceed-button"
        onClick={onProceedToSetup}
        disabled={selectedSquadIds.length < 6}
      >
        Proceed to Setup
      </button>
    </div>
  );
};

/**
 * Mock StatsScreen component
 */
export const MockStatsScreen = ({ 
  allPlayers = [],
  gameHistory = {},
  onExportStats,
  onBackToGame,
  authModal = { isOpen: false, openLogin: jest.fn(), openSignup: jest.fn() },
  ...props 
}) => {
  const totalGameTime = gameHistory.periods?.reduce((total, period) => {
    return total + (period.endTime - period.startTime);
  }, 0) || 0;
  
  return (
    <div data-testid="mock-stats-screen">
      <div data-testid="game-summary">
        <div data-testid="total-game-time">{Math.floor(totalGameTime / 60000)} minutes</div>
        <div data-testid="total-substitutions">{gameHistory.substitutions?.length || 0}</div>
      </div>
      
      <div data-testid="player-stats">
        {allPlayers.map(player => (
          <div key={player.id} data-testid={`player-stats-${player.id}`}>
            <div data-player-name={player.name}>{player.name}</div>
            <div data-field-time={player.stats.timeOnFieldSeconds}>{player.stats.timeOnFieldSeconds}s on field</div>
            <div data-attacker-time={player.stats.timeAsAttackerSeconds}>{player.stats.timeAsAttackerSeconds}s as attacker</div>
            <div data-defender-time={player.stats.timeAsDefenderSeconds}>{player.stats.timeAsDefenderSeconds}s as defender</div>
          </div>
        ))}
      </div>
      
      <div data-testid="stats-actions">
        <button data-testid="export-button" onClick={onExportStats}>Export Stats</button>
        <button data-testid="back-button" onClick={onBackToGame}>Back to Game</button>
      </div>
    </div>
  );
};

// ===================================================================
// MODAL COMPONENT MOCKS
// ===================================================================

/**
 * Mock AddPlayerModal component
 */
export const MockAddPlayerModal = ({ 
  onAddPlayer,
  onClose,
  isVisible = true,
  ...props 
}) => {
  const [playerName, setPlayerName] = React.useState('');
  
  if (!isVisible) return null;
  
  return (
    <div data-testid="mock-add-player-modal">
      <div data-testid="modal-backdrop" onClick={onClose} />
      <div data-testid="modal-content">
        <h3>Add New Player</h3>
        <input 
          data-testid="player-name-input"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Player Name"
        />
        <div data-testid="modal-actions">
          <button 
            data-testid="add-button"
            onClick={() => {
              onAddPlayer?.(playerName);
              setPlayerName('');
            }}
            disabled={!playerName.trim()}
          >
            Add Player
          </button>
          <button data-testid="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ===================================================================
// UTILITY COMPONENT MOCKS
// ===================================================================

/**
 * Mock UI component
 */
export const MockUI = {
  Button: ({ children, onClick, disabled, ...props }) => (
    <button 
      data-testid="mock-ui-button"
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
  
  Input: ({ value, onChange, placeholder, ...props }) => (
    <input 
      data-testid="mock-ui-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  
  Select: ({ value, onChange, children, ...props }) => (
    <select 
      data-testid="mock-ui-select"
      value={value}
      onChange={onChange}
      {...props}
    >
      {children}
    </select>
  ),
  
  Modal: ({ isOpen, onClose, children, ...props }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-ui-modal">
        <div data-testid="modal-backdrop" onClick={onClose} />
        <div data-testid="modal-content">
          {children}
        </div>
      </div>
    );
  }
};

/**
 * Mock HamburgerMenu component
 */
export const MockHamburgerMenu = ({ 
  isOpen = false,
  onToggle,
  onNavigate,
  currentScreen,
  ...props 
}) => (
  <div data-testid="mock-hamburger-menu" data-is-open={isOpen}>
    <button data-testid="menu-toggle" onClick={onToggle}>
      {isOpen ? 'Close' : 'Menu'}
    </button>
    {isOpen && (
      <div data-testid="menu-items">
        {['config', 'setup', 'game', 'stats'].map(screen => (
          <button 
            key={screen}
            data-testid={`menu-item-${screen}`}
            data-is-current={currentScreen === screen}
            onClick={() => onNavigate?.(screen)}
          >
            {screen.charAt(0).toUpperCase() + screen.slice(1)}
          </button>
        ))}
      </div>
    )}
  </div>
);

// ===================================================================
// COMPONENT MOCK FACTORIES
// ===================================================================

/**
 * Creates a full set of mocked components for integration testing
 */
export const createMockComponentSet = (customMocks = {}) => {
  return {
    // Formation components
    FormationRenderer: MockFormationRenderer,
    IndividualFormation: MockIndividualFormation,
    PairsFormation: MockPairsFormation,
    
    // Screen components
    ConfigurationScreen: MockConfigurationScreen,
    PeriodSetupScreen: MockPeriodSetupScreen,
    StatsScreen: MockStatsScreen,
    
    // Modal components
    AddPlayerModal: MockAddPlayerModal,
    
    // Utility components
    UI: MockUI,
    HamburgerMenu: MockHamburgerMenu,
    
    // Custom overrides
    ...customMocks
  };
};

/**
 * Creates component mocks with specific behavior
 */
export const createBehaviorMockComponents = (behaviors = {}) => {
  const mockSet = createMockComponentSet();
  
  // Apply custom behaviors
  Object.entries(behaviors).forEach(([componentName, behavior]) => {
    if (mockSet[componentName]) {
      const OriginalMock = mockSet[componentName];
      mockSet[componentName] = (props) => {
        // Apply behavior modifications
        const modifiedProps = behavior.modifyProps ? behavior.modifyProps(props) : props;
        
        // Trigger behavior events
        React.useEffect(() => {
          if (behavior.onMount) {
            behavior.onMount(modifiedProps);
          }
        }, []);
        
        return <OriginalMock {...modifiedProps} />;
      };
    }
  });
  
  return mockSet;
};

// ===================================================================
// COMPONENT TESTING UTILITIES
// ===================================================================

/**
 * Utilities for testing component interactions
 */
export const componentTestUtils = {
  /**
   * Finds all mock components in a rendered tree
   */
  findMockComponents: (container) => {
    return container.querySelectorAll('[data-component]');
  },
  
  /**
   * Gets mock component props
   */
  getMockComponentProps: (element) => {
    const propsData = element.getAttribute('data-props');
    return propsData ? JSON.parse(propsData) : {};
  },
  
  /**
   * Simulates component interaction
   */
  simulateComponentInteraction: (element, interactionType, data = {}) => {
    switch (interactionType) {
      case 'click':
        element.click();
        break;
      case 'change':
        const event = new Event('change', { bubbles: true });
        Object.assign(event.target, data);
        element.dispatchEvent(event);
        break;
      case 'submit':
        const submitEvent = new Event('submit', { bubbles: true });
        element.dispatchEvent(submitEvent);
        break;
    }
  },
  
  /**
   * Validates component rendering
   */
  validateComponentRendering: (container, expectedComponents) => {
    expectedComponents.forEach(componentName => {
      const element = container.querySelector(`[data-component="${componentName}"]`);
      expect(element).toBeInTheDocument();
    });
  }
};

export default {
  createSimpleMockComponent,
  createInteractiveMockComponent,
  MockFormationRenderer,
  MockIndividualFormation,
  MockPairsFormation,
  MockConfigurationScreen,
  MockPeriodSetupScreen,
  MockStatsScreen,
  MockAddPlayerModal,
  MockUI,
  MockHamburgerMenu,
  createMockComponentSet,
  createBehaviorMockComponents,
  componentTestUtils
};