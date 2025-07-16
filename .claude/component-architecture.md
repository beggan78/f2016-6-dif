# Component Architecture Guide

## Overview

This document outlines the component architecture patterns, relationships, and best practices established in the DIF F16-6 Coach application. Understanding this architecture is crucial for maintaining consistency and making effective changes.

## Component Hierarchy

```
App
├── GameScreen (Main game interface)
│   ├── FormationRenderer (Formation display logic)
│   │   ├── PairsFormation (7-player pairs mode)
│   │   └── IndividualFormation (6/7-player individual modes)
│   └── UI Components (Button, Timer displays, etc.)
├── ConfigurationScreen (Team setup)
│   ├── PlayerList (Player selection)
│   └── AddPlayerModal (Add temporary players)
├── PeriodSetupScreen (Formation configuration)
│   ├── PairSelectionCard (Pairs mode setup)
│   └── IndividualPositionCard (Individual mode setup)
└── StatsScreen (Game results and export)
```

## Configuration-Driven Architecture

### MODE_DEFINITIONS System
**Location**: `/src/constants/gameModes.js`
**Purpose**: Single source of truth for all formation logic and team mode configurations

The application uses a sophisticated configuration-driven approach where all team mode behavior is defined in `MODE_DEFINITIONS`. This eliminates scattered constants and hardcoded logic throughout the codebase.

#### Configuration Structure
Each team mode definition includes:
- **positions**: Object mapping position keys to their properties (role, type)
- **expectedCounts**: Player count requirements (`outfield`, `onField`)
- **positionOrder**: Array defining rendering order of positions
- **fieldPositions**: Positions for players currently on field
- **substitutePositions**: Substitute/bench positions
- **supportsInactiveUsers**: Whether players can be temporarily deactivated
- **supportsNextNextIndicators**: Whether next-next substitution tracking is enabled
- **substituteRotationPattern**: Carousel pattern for substitutions (`simple`, `carousel`, `advanced_carousel`)
- **initialFormationTemplate**: Template for creating new formations
- **validationMessage**: Mode-specific validation text

#### Utility Functions (18 available)
- **Position Queries**: `getFormationPositions()`, `getOutfieldPositions()`, `getAllPositions()`
- **Mode Detection**: `isIndividualMode()`, `isIndividual6Mode()`, `isIndividual7Mode()`, `isIndividual8Mode()`
- **Capability Checks**: `supportsInactiveUsers()`, `supportsNextNextIndicators()`
- **Player Counting**: `getPlayerCountForMode()`, `getMaxInactiveCount()`
- **Formation Helpers**: `getInitialFormationTemplate()`, `getValidationMessage()`
- **Role Mapping**: Table-driven lookups via `POSITION_ROLE_MAP`

### Team Mode Configurations

#### PAIRS_7 (7-Player Pairs Mode)
- **Players**: 7 total (6 outfield + 1 goalie)
- **Structure**: 3 pairs (leftPair, rightPair, subPair) + goalie
- **Field Players**: 4 (2 pairs of defender/attacker)
- **Substitution**: Entire pairs swap in/out
- **Rotation**: Simple pair-based rotation

#### INDIVIDUAL_6 (6-Player Individual Mode)
- **Players**: 6 total (5 outfield + 1 goalie)
- **Positions**: leftDefender, rightDefender, leftAttacker, rightAttacker, substitute_1, goalie
- **Field Players**: 4 individual positions
- **Substitution**: Individual player swaps
- **Rotation Pattern**: `simple` (direct field ↔ substitute swap)
- **Capabilities**: Supports inactive users, no next-next indicators

#### INDIVIDUAL_7 (7-Player Individual Mode)
- **Players**: 7 total (6 outfield + 1 goalie)
- **Positions**: Same as INDIVIDUAL_6 plus substitute_2
- **Field Players**: 4 individual positions
- **Substitution**: Individual player swaps with carousel rotation
- **Rotation Pattern**: `carousel` (3-position rotation: field → substitute_2 → substitute_1 → field)
- **Capabilities**: Supports inactive users and next-next indicators

#### INDIVIDUAL_8 (8-Player Individual Mode)
- **Players**: 8 total (7 outfield + 1 goalie)
- **Positions**: Same as INDIVIDUAL_7 plus substitute_3
- **Field Players**: 4 individual positions
- **Substitution**: Individual player swaps with advanced carousel
- **Rotation Pattern**: `advanced_carousel` (all substitutes shift up when player substituted)
- **Capabilities**: Supports inactive users and next-next indicators

## Component Categories

### 1. Screen Components (Top-level views)
**Location**: `/src/components/{category}/`
**Purpose**: Main application views that handle complete user workflows

#### ConfigurationScreen
- **File**: `src/components/setup/ConfigurationScreen.js`
- **Purpose**: Initial team and game setup
- **Key Features**: Squad selection, team mode auto-selection, game settings
- **State Management**: Heavy form state, validation logic
- **Testing**: Tests covering all user interactions, squad selection, and team mode auto-selection

#### PeriodSetupScreen  
- **File**: `src/components/setup/PeriodSetupScreen.js`
- **Purpose**: Formation assignment for game periods
- **Key Features**: Player-to-position assignment, drag-and-drop, validation
- **State Management**: Complex formation state with position tracking
- **Testing**: Tests covering all team modes (PAIRS_7, INDIVIDUAL_6, INDIVIDUAL_7, INDIVIDUAL_8)

#### GameScreen
- **File**: `src/components/game/GameScreen.js`
- **Purpose**: Main game interface during active play
- **Key Features**: Timer controls, substitutions, formation display, score tracking
- **State Management**: Real-time game state via useGameState hook
- **Testing**: 30 tests covering game controls and interactions

#### StatsScreen
- **File**: `src/components/stats/StatsScreen.js`
- **Purpose**: Post-game statistics and data export
- **Key Features**: Statistics display, clipboard export, game reset
- **State Management**: Read-only display of final game data
- **Testing**: 28 tests (3 passing, mocking issues with rolePointUtils)

### 2. Formation Components (Game display)
**Location**: `/src/components/game/formations/`
**Purpose**: Visual representation of player formations

#### FormationRenderer
- **File**: `src/components/game/formations/FormationRenderer.js`
- **Purpose**: Route to appropriate formation component based on team mode
- **Pattern**: Component factory/router pattern
- **Testing**: Tests covering component routing, props passing, and error scenarios

#### PairsFormation
- **File**: `src/components/game/formations/PairsFormation.js`
- **Purpose**: Display 7-player pairs formation (3 pairs + goalie)
- **Key Features**: Pair-based positioning, drag-and-drop support
- **Testing**: 32 tests covering all pair positions and interactions

#### IndividualFormation
- **File**: `src/components/game/formations/IndividualFormation.js`
- **Purpose**: Display individual formations (6, 7, and 8-player modes)
- **Key Features**: Individual positioning, flexible player counts, carousel rotation patterns
- **Testing**: Tests covering all individual modes

### 3. Modal Components (Overlays)
**Location**: `/src/components/shared/`
**Purpose**: Overlay interfaces for specific tasks

#### AddPlayerModal
- **File**: `src/components/shared/AddPlayerModal.js`
- **Purpose**: Add temporary players to roster
- **Key Features**: Form validation, input sanitization, accessibility
- **Pattern**: Controlled modal with form state
- **Testing**: 34 tests (16 passing, mocking issues with input sanitization)

### 4. Utility Components (Reusable UI)
**Location**: `/src/components/shared/`
**Purpose**: Reusable UI elements across the application

#### UI Components
- **Button**: Consistent button styling and behavior
- **Input**: Form input with validation support
- **Select**: Dropdown selection component
- **Timer displays**: Time formatting and display

## Component Patterns

### 1. Screen Component Pattern
```javascript
// Standard screen component structure
export function ScreenName({ 
  // State from useGameState or parent
  gameState,
  setGameState,
  
  // Navigation and flow control
  setView,
  
  // Specific functionality props
  onSpecificAction
}) {
  // Local state for screen-specific UI
  const [localState, setLocalState] = useState();
  
  // Event handlers
  const handleAction = () => {
    // Business logic
    // State updates
    // Navigation if needed
  };

  return (
    <div className="screen-container">
      {/* Screen content */}
    </div>
  );
}
```

### 2. Configuration-Driven Component Pattern
```javascript
// Modern components use utility functions instead of hardcoded logic
import { 
  isIndividualMode, 
  getOutfieldPositions, 
  supportsInactiveUsers 
} from '../constants/gameModes';

export function ModernComponent({ teamMode, formation, ...props }) {
  // Use utility functions for conditional logic
  const positions = getOutfieldPositions(teamMode);
  const supportsInactive = supportsInactiveUsers(teamMode);
  
  // Event handlers work across all modes via configuration
  const handlePlayerAssignment = (position, playerId) => {
    // Logic uses getOutfieldPositions(teamMode) dynamically
    // Works for all individual modes (6, 7, 8) automatically
  };
  
  return (
    <div>
      {/* Conditional rendering based on mode capabilities */}
      {isIndividualMode(teamMode) && (
        <IndividualModeUI positions={positions} />
      )}
      {supportsInactive && <InactivePlayerControls />}
    </div>
  );
}
```

### 3. Formation Component Pattern
```javascript
// Formation components receive standardized props
export function FormationComponent({
  allPlayers,           // Complete player roster
  formation,      // Current period formation
  longPressHandlers,    // Interaction handlers
  onPlayerMove,         // Movement callback
  teamMode             // Team mode
}) {
  // Render formation-specific layout
  // Handle user interactions
  // Apply animations and transitions
}
```

### 4. Modal Component Pattern
```javascript
// Modal components follow controlled pattern
export function ModalComponent({ 
  isOpen,              // Visibility control
  onClose,             // Close handler
  onAction,            // Primary action handler
  ...data              // Modal-specific data
}) {
  const [formState, setFormState] = useState();
  
  // Handle form submission
  // Validate input
  // Call onAction with results
  // Close modal on success
  
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Modal UI */}
      </div>
    </div>
  );
}
```

## Carousel Pattern System

### Overview
**Location**: `/src/game/logic/carouselPatterns.js`
**Purpose**: Configurable rotation patterns for individual mode substitutions

The carousel system provides flexible, configurable substitution patterns that determine how players rotate through field and substitute positions during individual mode games.

### Rotation Patterns

#### Simple Pattern (6-Player Mode)
```javascript
// Direct field ↔ substitute swap
const simplePattern = {
  fieldPlayer: 'substitute_1',    // Field player goes to substitute_1
  substitute_1: 'fieldPosition'  // substitute_1 takes field position
};
```
**Used by**: INDIVIDUAL_6 mode
**Behavior**: Direct swap between field player and single substitute

#### Carousel Pattern (7-Player Mode)  
```javascript
// 3-position rotation: field → substitute_2 → substitute_1 → field
const carouselPattern = {
  fieldPlayer: 'substitute_2',    // Field player goes to substitute_2
  substitute_2: 'substitute_1',   // substitute_2 moves to substitute_1
  substitute_1: 'fieldPosition'  // substitute_1 takes field position
};
```
**Used by**: INDIVIDUAL_7 mode
**Behavior**: Ensures fair rotation through all substitute positions

#### Advanced Carousel Pattern (8-Player Mode)
```javascript
// All substitutes shift up when field player substituted
const advancedCarouselPattern = {
  fieldPlayer: 'substitute_3',    // Field player goes to substitute_3
  substitute_3: 'substitute_2',   // substitute_3 moves to substitute_2
  substitute_2: 'substitute_1',   // substitute_2 moves to substitute_1
  substitute_1: 'fieldPosition'  // substitute_1 takes field position
};
```
**Used by**: INDIVIDUAL_8 mode
**Behavior**: Maintains ordered rotation through three substitute positions

### Integration with MODE_DEFINITIONS
Each individual mode's configuration includes a `substituteRotationPattern` property that links to the appropriate carousel pattern:

```javascript
[TEAM_MODES.INDIVIDUAL_6]: {
  substituteRotationPattern: 'simple',
  // ... other configuration
},
[TEAM_MODES.INDIVIDUAL_7]: {
  substituteRotationPattern: 'carousel',
  // ... other configuration
},
[TEAM_MODES.INDIVIDUAL_8]: {
  substituteRotationPattern: 'advanced_carousel',
  // ... other configuration
}
```

### Pattern Functions
- **getCarouselMapping()**: Returns position mapping for given pattern
- **getPlayerFieldPosition()**: Finds current field position for player
- **applyCarouselMapping()**: Applies pattern mapping to formation
- **validateCarouselPattern()**: Validates pattern can be applied safely

## State Management Patterns

### 1. Global State (useGameState)
**Used by**: GameScreen, StatsScreen
**Purpose**: Core game state that persists across screens
**Pattern**: Custom hook with localStorage persistence

```javascript
const {
  allPlayers,
  setAllPlayers,
  formation,
  setFormation,
  // ... other game state
} = useGameState(initialRoster);
```

### 2. Local Form State
**Used by**: ConfigurationScreen, PeriodSetupScreen, AddPlayerModal
**Purpose**: Screen-specific form data and validation
**Pattern**: useState with validation logic

```javascript
const [formData, setFormData] = useState(initialData);
const [errors, setErrors] = useState({});
const [isValid, setIsValid] = useState(false);
```

### 3. UI State
**Used by**: All interactive components
**Purpose**: Loading states, visibility toggles, animations
**Pattern**: useState for component-specific UI concerns

## Data Flow Patterns

### 1. Configuration-Driven Data Flow
```
MODE_DEFINITIONS → Utility Functions → Component Props → Component Behavior
```
Configuration drives component behavior through utility functions rather than hardcoded logic.

### 2. Top-Down Data Flow
```
App → useGameState → GameScreen → FormationRenderer → Formation Components
```
Game state flows down through props, actions bubble up through callbacks.

### 3. Form Data Flow
```
User Input → Local State → Validation → Parent Callback → Global State
```
Forms manage local state, validate, then update global state on submission.

### 4. Modal Data Flow
```
Trigger → Modal Open → User Action → Callback → Modal Close → State Update
```
Modals are controlled by parent components and communicate via callbacks.

## Component Communication

### 1. Parent-Child Communication
- **Props**: Data flows down via props
- **Callbacks**: Events bubble up via function props
- **Refs**: Direct access when needed (minimal use)

### 2. Sibling Communication
- **Common Parent**: Lift state to common ancestor
- **Global State**: Use useGameState for game-related data
- **Context**: Use for cross-cutting concerns (themes, etc.)

### 3. Event Communication
- **Browser Events**: popstate for navigation, storage events
- **Custom Events**: Minimal use, prefer props/callbacks

## Performance Patterns

### 1. Component Optimization
```javascript
// Memoize expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  // Component logic
});

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(props);
}, [dependencies]);
```

### 2. Event Handler Optimization
```javascript
// Memoize event handlers to prevent re-renders
const handleClick = useCallback((id) => {
  // Handler logic
}, [dependencies]);
```

### 3. State Update Optimization
```javascript
// Batch state updates when possible
const handleMultipleUpdates = () => {
  startTransition(() => {
    setStateA(newValueA);
    setStateB(newValueB);
  });
};
```

## Error Handling Patterns

### 1. Component Error Boundaries
```javascript
// Use error boundaries for component isolation
<ErrorBoundary fallback={<ErrorFallback />}>
  <RiskyComponent />
</ErrorBoundary>
```

### 2. Async Error Handling
```javascript
// Handle async operations gracefully
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);

const handleAsyncAction = async () => {
  try {
    setLoading(true);
    setError(null);
    await asyncOperation();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### 3. Form Validation
```javascript
// Consistent validation patterns
const validateForm = (data) => {
  const errors = {};
  
  if (!data.required) {
    errors.required = 'This field is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

## Testing Integration

### 1. Component Testing Strategy
- **Render testing**: Verify component structure and content
- **Interaction testing**: Test user events and callbacks
- **State testing**: Verify state changes and side effects
- **Integration testing**: Test component communication

### 2. Mock Strategies for Components
- **Child components**: Mock complex children with simple divs
- **Hooks**: Mock custom hooks to control state
- **External dependencies**: Mock utilities and libraries
- **Event handlers**: Use jest.fn() to verify calls

### 3. Test Data Patterns
- **Consistent mock data**: Use shared utilities for realistic data
- **Edge cases**: Test with empty, null, and invalid data
- **User scenarios**: Test complete user workflows

## Common Anti-Patterns to Avoid

### 1. State Management Anti-Patterns
- ❌ Prop drilling through many layers
- ❌ Lifting state too high unnecessarily
- ❌ Mixing UI state with business logic
- ❌ Direct state mutation

### 2. Component Structure Anti-Patterns
- ❌ Overly complex components with multiple responsibilities
- ❌ Deep component nesting without clear purpose
- ❌ Mixing presentation and business logic
- ❌ Tightly coupled components

### 3. Performance Anti-Patterns
- ❌ Creating functions/objects in render
- ❌ Unnecessary re-renders due to reference changes
- ❌ Not memoizing expensive calculations
- ❌ Over-optimizing with unnecessary memoization

## Architecture Evolution Guidelines

### 1. Adding New Components
1. Determine component category and location
2. Follow established patterns for similar components
3. Write tests first using existing patterns
4. Implement with consistent styling and behavior
5. Document any new patterns or deviations

### 2. Refactoring Existing Components
1. Understand current component relationships
2. Maintain backward compatibility with parent components
3. Update tests to reflect changes
4. Consider impact on dependent components
5. Update documentation if patterns change

### 3. Performance Improvements
1. Profile before optimizing
2. Focus on user-perceived performance
3. Use React DevTools to identify bottlenecks
4. Test performance improvements with realistic data
5. Document performance considerations for future developers

---

This architecture guide should be updated as new patterns emerge and components evolve. Refer to the testing guidelines for specific testing approaches for each component type.