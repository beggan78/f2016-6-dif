# Sport Wizard

A mobile-first web application designed for coaching youth soccer teams. This app helps manage player rotations, track playing time, and maintain fair substitution patterns during games with 5v5 and 7v7 formations.

## Overview

Sport Wizard is built for managing youth soccer teams with flexible squad sizes (5-15 players) and multiple tactical formations. The app uses a modern composite configuration system combining format (5v5 or 7v7), squad size, formation (2-2, 1-2-1, 2-2-2, or 2-3-1), and individual substitution management to create customized team management experiences with intelligent rotation systems that ensure fair playing time distribution.

### Key Features

#### Core Game Management
- **Smart Player Selection**: Choose players from flexible squad sizes (5-15 players supported)
- **Multiple Formations**: Support for 2-2 (classic), 1-2-1 (tactical), 2-2-2, and 2-3-1 formations with role-aware time tracking
- **Individual Player Rotations**: Intelligent individual substitution management with round-robin rotation
- **Custom Rotation Alerts**: Configure substitution reminders (0-5 minutes) to keep coaching staff on schedule
- **Real-time Game Management**: Dual timers track match time and substitution intervals
- **Automated Substitution Planning**: AI-powered recommendations for optimal player rotations
- **Fair Time Distribution**: Comprehensive time tracking ensures equitable playing opportunities across all roles

#### Advanced Features
- **Authentication System**: Full user accounts with secure login, registration, and profile management
- **Team Management**: Create teams, invite members, manage rosters and club affiliations
- **Match History**: Complete database persistence of matches with detailed player statistics
- **Tactical Board**: Interactive drag-and-drop tactical planning with visual formations
- **Match Reports**: Comprehensive event logging and post-game analysis with exportable statistics
- **Formation Voting**: Collaborative team formation decisions with voting system
- **Goal Tracking**: Real-time goal scoring with player attribution and event logging
- **Match Abandonment Protection**: Database-backed safeguards prevent accidental loss of match data

#### User Experience
- **Advanced Visual Indicators**: Dual-layer substitution indicators with opacity differentiation
- **Mobile-Optimized**: Touch-friendly interface designed for sideline use
- **Browser Navigation**: Seamless back button integration and navigation flow
- **Persistent State**: Game state preserved through browser refreshes and database synchronization
- **Offline Capability**: Local storage ensures functionality without internet connection

## Game Format

### Field Setup
- **5v5 Format**: 1 goalie + 4 field players per team
  - **Formations**: 2-2 (classic) and 1-2-1 (midfield flexibility)
- **7v7 Format**: 1 goalie + 6 field players per team
  - **Formations**: 2-2-2 (balanced lines) and 2-3-1 (midfield triangle with lone striker)
- **Configurable Periods**: 1-3 periods, each 10-30 minutes (default: 3 periods of 15 minutes)
- **Substitution Strategy**: Regular rotations approximately every 2 minutes with formation-aware role tracking

### Team Configurations

#### 6-Player Mode (Individual)
- Players assigned to individual positions
- Positions: Left Defender, Right Defender, Left Attacker, Right Attacker, Substitute
- Individual player substitutions
- Time-based rotation queue management with round-robin during periods

#### 7-Player Mode (Individual)
- Players assigned to individual positions without pairs
- Positions: Left Defender, Right Defender, Left Attacker, Right Attacker, Substitute1, Substitute2
- Dual substitution system with two substitute players
- Advanced visual indicators showing both immediate and upcoming substitutions
- Round-robin rotation through all 6 outfield positions during periods

#### 7v7 Individual Modes
- Players cover six field positions with formation-specific midfield roles
- **2-2-2**: Balanced left/right defenders, midfielders, and attackers
- **2-3-1**: Two backs supporting a midfield trio and a lone striker
- Rotation queue adapts to the larger roster and inactive player handling

## App Workflow

### 1. Game Configuration
- Select a squad (5-15 players) from the team roster
- Pick the match format (5v5 or 7v7) and a compatible tactical formation (2-2, 1-2-1, 2-2-2, 2-3-1)
- Enter the opponent name (optional) and label the fixture as League, Friendly, Cup, Tournament, or Internal
- Choose venue type (home, away, neutral) to capture match context and travel considerations
- Configure substitution alerts (0-5 minutes) to drive timed rotation reminders
- Set number of periods (1-3) and duration (10-30 minutes)
- Assign goalies for each period
- Optionally designate a captain for the match

### 2. Period Setup
- Configure team formation for the start of the current period
- AI recommendations based on intelligent formation logic (for periods 2-3)
- Manual override available for all positions
- **Rotation Queue Management**: For periods 2+, manual goalie changes automatically update the rotation queue to maintain fairness (former goalie takes new goalie's position)

### 3. Live Game Management
- **Match Timer**: Counts down from period duration
- **Substitution Timer**: Tracks time since last substitution
- **Visual Indicators**: 
  - Blue boxes show players currently on field
  - Green arrows indicate players ready to enter
  - Red arrows show players scheduled to exit
  - **7-Player Individual Mode**: Dual-layer indicators with opacity differentiation
    - Full opacity arrows for immediate next substitutions
    - Semi-transparent arrows for next-next substitutions
    - Color-coded borders (strong for immediate, subtle for upcoming)
- **Quick Substitution**: One-tap substitution with smooth animations and glow effects

### 4. Statistics & Analysis
- Comprehensive playing time tracking across all roles (including midfielder for 1-2-1 formation)
- Points-based role distribution system with formation-aware calculations
- Role balance tracking (Attacker vs Defender vs Midfielder time)
- Real-time goal tracking with player attribution
- Exportable statistics for clipboard sharing
- **Database-Backed History**: Persistent match records with detailed player statistics
- **Advanced Analytics**: Historical performance trends and role distribution analysis

## User Management & Authentication

### Account System
- **User Registration**: Create account with email verification
- **Secure Login**: JWT-based authentication with session management
- **Profile Management**: Complete user profiles with personal information
- **Password Security**: Secure password reset and change functionality

### Team Management
- **Team Creation**: Set up teams with custom names and configurations
- **Member Invitations**: Invite users via email to join teams
- **Role Management**: Assign coaches, assistants, and player roles
- **Club Integration**: Associate teams with clubs and manage affiliations
- **Roster Management**: Add, edit, and organize player information

### Advanced Features

#### Tactical Board
- **Interactive Planning**: Drag-and-drop tactical board for formation setup
- **Visual Formations**: Real-time visual representation of player positions
- **Formation Templates**: Pre-configured 2-2 and 1-2-1 formation layouts
- **Export Capabilities**: Save and share tactical arrangements

#### Match Reports & Event Logging
- **Real-time Event Tracking**: Comprehensive logging of all match events
- **Goal Attribution**: Track individual player goals with timestamp accuracy
- **Substitution History**: Complete record of all player changes and timings
- **Exportable Reports**: Generate detailed match reports for analysis
- **Event Replay**: Review match progression through event timeline

#### Formation Voting System
- **Collaborative Decisions**: Team-based voting for formation selections
- **Democratic Process**: Weighted voting based on team member roles
- **Formation Recommendations**: AI-suggested formations based on historical data

#### Match Abandonment Protection
- **Database-Backed Safeguards**: Prevents accidental loss of active match data
- **Intelligent Detection**: Automatically detects running or finished matches before allowing new game creation
- **Flexible Recovery Options**:
  - **Running Matches**: Choose to abandon (delete) or cancel and continue
  - **Finished Matches**: Save to history, delete, or cancel with three-option modal
- **Data Integrity**: Uses database as authoritative source rather than UI state for reliable detection
- **Error Handling**: Graceful fallback behavior when database queries fail (defaults to showing protection modal)

#### Resume Pending Match Configuration
- **Smart Session Detection**: Automatically detects new sign-ins vs page refreshes to determine when to show resume modal
- **Configuration Persistence**: Saves complete match setup (team config, squad selection, match settings) to database as 'pending' state
- **Seamless Resume Flow**: One-click resume from configuration screen with all settings pre-populated
- **Multi-Match Support**: Handles multiple pending matches per team with user selection interface
- **Validation System**: Comprehensive validation ensures pending configurations are complete and valid before resuming
- **Intelligent Cleanup**: Automatically manages pending match lifecycle to prevent database clutter

## 7-Player Individual Mode (Detailed)

### Formation Structure
The 7-player individual mode provides maximum flexibility for player rotation while maintaining fair playing time:

- **4 Field Players**: Left Defender, Right Defender, Left Attacker, Right Attacker
- **2 Substitutes**: First Substitute and Second Substitute
- **1 Goalie**: Rotates by period but can also be replaced during a period

### Substitution System
The 7-player individual mode features a dual-substitute rotation:

1. **Rotation Queue**: Controls the substitution order
   - First four positions in the queue are players currently on the field
   - Players in positions 5 (index 4) and up are substitutes
   - Player in the first position of the queue (index 0) is next to rotate off
   - Player in the 5th position of the queue (index 4) is next to enter the field
2. **Automatic Rotation**: When a substitution occurs:
   - Player coming off is removed from the front of the queue and added to the end of the queue
   - First Substitute (index 4 in queue) → enters the field in the departing player's position
   - Second Substitute → moves up to become First Substitute

### Visual Indicator System
The interface provides clear visual cues for rotation planning:

#### Immediate Indicators (Full Opacity)
- **Green Arrow (↑)**: Player ready to enter field immediately
- **Red Arrow (↓)**: Player scheduled to come off next
- **Strong Borders**: Rose-500 (off) / Emerald-500 (on)

#### Next-Next Indicators (40% Opacity)
- **Dimmed Green Arrow**: Second substitute waiting
- **Dimmed Red Arrow**: Player to come off after next substitution
- **Subtle Borders**: Rose-200 (off) / Emerald-200 (on)

### Player Selection Logic
- **Period Setup**: Shows individual position cards for player assignments
- **Smart Filtering**: Only unassigned players appear in dropdowns until formation is complete
- **Easy Swapping**: Once complete, all players available for position swapping

### Time Tracking Benefits
- **Precise Role Tracking**: Individual positions allow granular attacker vs defender time balance
- **Fair Distribution**: All 6 outfield players rotate through all positions
- **Statistical Analysis**: Detailed breakdown of time spent in each role
- **Intelligent Recommendations**: AI suggests formations based on sophisticated balancing algorithms

## Formation Recommendation System

The app features an intelligent formation recommendation system that automatically suggests optimal player arrangements for periods 2 and 3, ensuring fair role distribution and maintaining team chemistry through strategic rotation management.

### Individual Mode Rotation System

Individual modes (6-player and 7-player) use a sophisticated round-robin rotation queue system designed to ensure fair playing time distribution.

#### Rotation Queue Management

**Period 1 Initialization**
- Basic positional rotation queue is created based on formation positions
- Players are ordered by their assigned positions in the formation

**Period 2+ Initialization (Time-Based)**
- Rotation queue is rebuilt based on accumulated playing times from previous periods
- Players are sorted by total field time (ascending - least time first)
- The 4 players with least accumulated time are selected for field positions
- Remaining players become substitutes, ordered by playing time

#### Role Assignment Logic

For field players, roles are assigned based on time balance to promote fair role distribution:

**Role Balance Analysis**
- Each player's surplus attacker time is calculated: `attackerTime - defenderTime`
- Players with most surplus attacker time are assigned defender roles (to balance their experience)
- Players with least surplus attacker time are assigned attacker roles

**Formation Positioning**
- **6-Player Mode**: 4 field positions + 1 substitute
- **7-Player Mode**: 4 field positions + 2 substitutes (with inactive player support)

#### During Period Rotation

**Round-Robin Principle**
- Rotation queue remains fixed during periods - no rebuilding based on playing times
- Players rotate in established order to ensure predictable, fair rotations
- Next player to substitute off is always the first player in the rotation queue
- After substitution, the outgoing player moves to the end of the queue

**Queue Integrity**
- Manual player selection updates tracking but preserves queue order
- Inactive player management (7-player mode) maintains queue structure after inactive player has been removed from queue
- Position switches between players don't affect rotation order

#### Example Rotation Flow (6-Player Mode)

**Period Start Queue**: [Player A, Player B, Player C, Player D, Player E]
- Field: A, B, C, D (positions assigned by role balance)  
- Substitute: E

**After First Substitution**: [Player B, Player C, Player D, Player E, Player A]
- Player A (most time) comes off → becomes substitute
- Player E comes on → takes Player A's position
- Queue rotates: A moves to end, B becomes next to rotate off

**Key Benefits**
- Predictable rotation order throughout period
- Fair time distribution through initial time-based sorting
- Simplified substitution decisions for coaches
- Maintains role balance through intelligent position assignment

### Algorithm Benefits

**Fair Play Assurance**
- Time-based calculations ensure truly equitable role distribution
- Prevents players from being "stuck" in single positions across multiple periods
- Maintains competitive balance while developing all players

**Individual Mode Advantages**
- Round-robin rotation provides predictable, fair substitution patterns
- Role balance through intelligent position assignment
- Simplified coaching decisions with clear rotation order
- Granular time tracking for precise fairness

**Coaching Support**
- Recommendations are clearly presented but never mandatory
- Coaches can override any suggestion while maintaining the underlying tracking
- Visual indicators help coaches understand the reasoning behind recommendations
- Manual selections preserve queue integrity while updating player tracking

## Technology Stack

- **Frontend**: React 18.2 with Hooks
- **Backend**: Supabase (PostgreSQL database, authentication, real-time subscriptions)
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography
- **State Management**: Custom hooks with localStorage persistence and database synchronization
- **Authentication**: Supabase Auth with JWT tokens and RLS (Row Level Security)
- **Database**: PostgreSQL with real-time capabilities via Supabase
- **Build Tool**: Create React App
- **Testing**: Jest with React Testing Library (90%+ test coverage)

## Installation & Development

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm or yarn package manager
- Supabase account (for database and authentication)
- Git (for version control)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd f2016-6-dif
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env.local` file in the root directory with:
   ```bash
   REACT_APP_SUPABASE_URL=your_supabase_project_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup** (Optional - for local development)
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Start local Supabase instance
   supabase start
   ```

5. **Start development server**
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`

6. **Build for production**
   ```bash
   npm run build
   ```

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner in interactive watch mode
- `npm test -- --coverage` - Runs tests with coverage report (target: 90%+)
- `npm test -- --watchAll=false` - Runs tests once without watch mode
- `npm run test:performance` - Explicitly runs performance tests
- `npm run build` - Builds the app for production with optimizations
- `CI=true npm run build` - Production build with ESLint error checking

### Development Guidelines

#### Testing Standards
- **Minimum Coverage**: 90% test coverage required for all new code
- **Test Types**: Unit tests, integration tests, and performance tests
- **Testing Framework**: Jest with React Testing Library
- **Performance Tests**: Environment-aware performance testing (lenient in CI)

#### Code Quality
- **Linting**: ESLint with React hooks rules
- **Code Style**: Prettier for consistent formatting
- **Type Safety**: PropTypes for component validation
- **Architecture**: Pure functions for game logic, hooks for state management

## Player & Team Management

### Roster Management
- **Default Players**: Built-in roster for testing and quick setup
- **Dynamic Addition**: Add players during game configuration or team setup
- **Persistent Rosters**: Database-backed player management for teams
- **Player Profiles**: Detailed player information with statistics history
- **Flexible Squad Sizes**: Support for 5-15 player squads with automatic position generation

### Statistics System

The app features a comprehensive multi-dimensional statistics system:

#### Points-Based Fair Play System
- **Total Points**: Each player receives exactly 3 points per game
- **Goalie Points**: 1 point per period as goalie
- **Outfield Points**: Remaining points split between roles based on actual time played
- **Formation-Aware**: Supports 2-2 (defender/attacker) and 1-2-1 (defender/midfielder/attacker) formations
- **Granularity**: Points awarded in 0.5 increments for precise fairness tracking

#### Database-Backed Analytics
- **Match History**: Complete record of all matches with detailed statistics
- **Player Performance**: Individual goal scoring, role distribution, and playing time analysis
- **Time Tracking**: Comprehensive tracking across all roles:
  - Goalie time (separate tracking)
  - Defender time
  - Midfielder time (1-2-1 formation)
  - Attacker time
  - Substitute time
  - Total field time (outfield only)
- **Goal Attribution**: Real-time goal tracking with player attribution and event timestamps
- **Historical Trends**: Long-term performance analysis and role balance tracking

## Mobile Optimization

The interface is specifically designed for mobile use during games:

- **Touch-Friendly**: Large buttons and touch targets
- **Responsive Design**: Adapts to various screen sizes
- **Dark Theme**: Easy viewing in outdoor conditions
- **Offline Capable**: Local storage ensures functionality without internet
- **Quick Actions**: Critical functions accessible with minimal taps

## Browser Compatibility

Optimized for modern browsers with full PWA capabilities:
- **Mobile**: Safari (iOS 14+), Chrome (Android 8+)
- **Desktop**: Chrome (90+), Firefox (88+), Safari (14+), Edge (90+)
- **Features**: Service workers, local storage, touch events, drag & drop
- **Offline Support**: Core functionality available without internet connection

## Architecture & Performance

### Modern React Architecture
- **Hooks-based**: Custom hooks for state management and side effects
- **Pure Functions**: Game logic implemented as pure functions for predictability
- **Component Isolation**: Clear separation between UI, logic, and data layers
- **Error Boundaries**: Robust error handling and recovery mechanisms

### Performance Optimizations
- **Code Splitting**: Lazy loading of major components
- **Memoization**: React.memo and useMemo for expensive calculations
- **Virtual Scrolling**: Efficient rendering of large player lists
- **Debounced Updates**: Optimized state updates for real-time features

### Security Features
- **JWT Authentication**: Secure token-based authentication with Supabase
- **Row Level Security**: Database-level access control for multi-tenant data
- **Input Sanitization**: Protection against XSS and injection attacks
- **HTTPS Only**: Secure communication for all data transmission

## Contributing

### Development Workflow
This project follows modern React development practices with:
- **Test-Driven Development**: 90%+ test coverage requirement
- **Continuous Integration**: Automated testing and deployment
- **Code Review**: All changes require review and testing
- **Documentation**: Comprehensive documentation for AI-assisted development

### Architecture Guidelines
- Game logic must be pure functions (no side effects)
- UI components should be stateless when possible
- Database operations must respect RLS policies
- Performance tests must pass in CI environment

## License

Private project for youth soccer team coaching purposes with Supabase integration.

---

*Built with ⚽ for fair play and team development* 
