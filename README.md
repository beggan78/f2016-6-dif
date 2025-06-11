# DIF F16-6 Coach

A mobile-first web application designed for coaching youth soccer teams. This app helps manage player rotations, track playing time, and maintain fair substitution patterns during games with 5v5 formations.

## Overview

DIF F16-6 Coach is built specifically for managing a soccer team of 14 players where 6-7 players are selected for each game. The app supports three distinct formation types: 7-player pairs, 6-player individual, and 7-player individual modes, each with intelligent rotation systems to ensure fair playing time distribution.

### Key Features

- **Smart Player Selection**: Choose 6 or 7 players from your 14-player roster for each game
- **Three Formation Types**: Supports pair-based (7 players), 6-player individual, and 7-player individual formations
- **Real-time Game Management**: Dual timers track match time and substitution intervals
- **Automated Substitution Planning**: AI-powered recommendations for optimal player rotations
- **Fair Time Distribution**: Comprehensive time tracking ensures equitable playing opportunities
- **Advanced Visual Indicators**: Dual-layer substitution indicators for complex rotation patterns
- **Mobile-Optimized**: Touch-friendly interface designed for sideline use
- **Persistent State**: Game state is preserved through browser refreshes

## Game Format

### Field Setup
- **5v5 Format**: 1 goalie + 2 defenders + 2 attackers per team
- **Configurable Periods**: 1-3 periods, each 10-30 minutes (default: 3 periods of 15 minutes)
- **Substitution Strategy**: Regular rotations approximately every 2 minutes

### Team Configurations

#### 7-Player Mode (Pairs)
- Players are organized into pairs (defender + attacker)
- Three pairs total: Left, Right, and Substitute
- Substitutions occur at the pair level
- Automatic round-robin rotation between pairs

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

## App Workflow

### 1. Game Configuration
- Select 6 or 7 players from the 14-player roster
- Set number of periods (1-3) and duration (10-30 minutes)
- Assign goalies for each period

### 2. Period Setup
- Configure team formation for the current period
- AI recommendations based on intelligent formation logic (for periods 2-3)
- Manual override available for all positions

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
- Comprehensive playing time tracking
- Points-based role distribution system
- Attacker vs Defender time balance tracking
- Exportable statistics
- Historical game data

## 7-Player Individual Mode (Detailed)

### Formation Structure
The 7-player individual mode provides maximum flexibility for player rotation while maintaining fair playing time:

- **4 Field Players**: Left Defender, Right Defender, Left Attacker, Right Attacker
- **2 Substitutes**: First Substitute and Second Substitute
- **1 Goalie**: Rotates by period

### Dual Substitution System
Unlike traditional single-substitute systems, the 7-player individual mode features a sophisticated dual-substitute rotation:

1. **Primary Substitution Queue**: First substitute is ready to enter immediately
2. **Secondary Substitution Queue**: Second substitute is prepared for the next rotation
3. **Automatic Rotation**: When a substitution occurs:
   - Player coming off → becomes Second Substitute
   - First Substitute → enters the field in the departing player's position
   - Second Substitute → moves up to become First Substitute

### Visual Indicator System
The interface provides clear visual cues for complex rotation planning:

#### Immediate Indicators (Full Opacity)
- **Green Arrow (↑)**: Player ready to enter field immediately
- **Red Arrow (↓)**: Player scheduled to come off next
- **Strong Borders**: Rose-500 (off) / Emerald-500 (on)

#### Next-Next Indicators (40% Opacity)
- **Dimmed Green Arrow**: Second substitute waiting
- **Dimmed Red Arrow**: Player to come off after next substitution
- **Subtle Borders**: Rose-200 (off) / Emerald-200 (on)

### Player Selection Logic
- **For 7-Player Squads**: Formation type defaults to Pairs mode but can be switched to Individual
- **Period Setup**: Shows individual position cards instead of pair assignments
- **Smart Filtering**: Only unassigned players appear in dropdowns until formation is complete
- **Easy Swapping**: Once complete, all players available for position swapping

### Time Tracking Benefits
- **Precise Role Tracking**: Individual positions allow granular attacker vs defender time balance
- **Fair Distribution**: All 6 outfield players rotate through all positions
- **Statistical Analysis**: Detailed breakdown of time spent in each role
- **Intelligent Recommendations**: AI suggests formations based on sophisticated balancing algorithms

## Formation Recommendation System

The app features an intelligent formation recommendation system that automatically suggests optimal player arrangements for periods 2 and 3, ensuring fair role distribution and maintaining team chemistry through strategic management. The system uses different approaches for pair-based and individual formation types.

### Individual Mode Rotation System

Individual modes (6-player and 7-player) use a sophisticated time-based rotation queue system designed to ensure fair playing time distribution.

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
- Inactive player management (7-player mode) maintains queue structure
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

### Pair Mode Recommendations

#### Before 2nd Period
The system prioritizes maintaining existing partnerships while ensuring position balance:

**Pair Integrity Maintenance**
- When the goalie changes, the algorithm identifies the new goalie's original partner from the previous period
- The ex-goalie is paired with this "orphaned" partner
- The orphaned partner changes defender/attacker roles from their previous position
- The former goalie takes the vacant role in the new pair

**Role Swapping for Balance**
- All other existing pairs are preserved but with swapped defender/attacker roles
- This ensures players experience both defensive and attacking positions across periods
- Team chemistry is maintained while promoting positional versatility

**Playing Time Considerations**
- **Substitute Recommendation**: The pair containing the player with the most total outfield time becomes the recommended substitute pair
- **First Substitution Target**: Among non-substitute pairs, the pair with the player having the most outfield time is recommended as "first to rotate off"

#### Before 3rd Period
Period 3 introduces sophisticated role balance enforcement based on accumulated playing time:

**Role Balance Enforcement (Time-Based)**
The system analyzes each player's defender vs attacker time ratio to determine role requirements:
- **Balanced Players**: Those with `0.8 ≤ defenderTime/attackerTime ≤ 1.25` have no specific role restrictions
- **Must Play Defender**: Players with `defenderTime/attackerTime < 0.8` (predominantly played attacker) are assigned defender roles
- **Must Play Attacker**: Players with `defenderTime/attackerTime > 1.25` (predominantly played defender) are assigned attacker roles
- The system adds 1 second to each time category to prevent division-by-zero errors

**Adaptive Pair Management**
The algorithm attempts to maintain pair integrity while respecting role balance requirements:

1. **Pair Preservation Priority**: When possible, existing pairs are maintained with appropriate role adjustments
2. **Strategic Pair Breaking**: If role balance cannot be achieved while keeping pairs intact, the system intelligently breaks pairs to ensure fair role distribution
3. **Goalie Change Handling**: Similar to period 2, but with additional role balance constraints applied

**Flexible Player Assignment**
For players not restricted by balancing rules:
- They receive the opposite role from what they played in period 2
- This promotes continued positional variety and skill development

**Example Scenarios**

*Scenario 1: Balanced Distribution*
- Player A: 150s defender, 160s attacker (ratio = 0.94) → Flexible
- Player B: 180s defender, 140s attacker (ratio = 1.29) → Must play attacker
- Result: Pair maintained with Player B as attacker, Player A takes defender role

*Scenario 2: Pair Breaking Required*
- Player C: 50s defender, 200s attacker (ratio = 0.25) → Must play defender  
- Player D: 60s defender, 180s attacker (ratio = 0.33) → Must play defender
- Result: Original C-D pair broken, each paired with players who need attacker roles

### Substitute Recommendations (All Periods)

**Primary Recommendation Logic**
- The pair containing the player with the highest total outfield time is recommended as the substitute pair
- This ensures players with more accumulated playing time get appropriate rest periods

**First Rotation Target**
- Among the two non-substitute pairs, the one containing the player with the most outfield time is marked as "first to rotate off"
- This balances playing time by prioritizing substitutions for players who have been on field longer

### Algorithm Benefits

**Fair Play Assurance (All Modes)**
- Time-based calculations ensure truly equitable role distribution
- Prevents players from being "stuck" in single positions across multiple periods
- Maintains competitive balance while developing all players

**Individual Mode Advantages**
- Round-robin rotation provides predictable, fair substitution patterns
- Role balance through intelligent position assignment
- Simplified coaching decisions with clear rotation order
- Granular time tracking for precise fairness

**Pair Mode Advantages**
- Prioritizes keeping successful partnerships together when possible
- Only breaks pairs when necessary for fairness, minimizing disruption
- Smooth transitions maintain team coordination and player confidence

**Coaching Support**
- Recommendations are clearly presented but never mandatory
- Coaches can override any suggestion while maintaining the underlying tracking
- Visual indicators help coaches understand the reasoning behind recommendations
- Manual selections preserve queue integrity while updating player tracking

## Technology Stack

- **Frontend**: React 19 with Hooks
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React for consistent iconography
- **State Management**: Custom hooks with localStorage persistence
- **Build Tool**: Create React App

## Installation & Development

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

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

3. **Start development server**
   ```bash
   npm start
   ```
   The app will be available at `http://localhost:3000`

4. **Build for production**
   ```bash
   npm run build
   ```

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production

## Team Roster

The default roster includes 14 players:
Alma, Ebba, Elise, Filippa, Fiona, Ines, Isabelle, Julie, Leonie, Nicole, Rebecka, Sigrid, Sophie, Tyra

Additional players can be added temporarily during game configuration.

## Statistics System

The app uses a sophisticated points-based system to ensure fair role distribution:

- **Total Points**: Each player receives exactly 3 points per game
- **Goalie Points**: 1 point per period as goalie
- **Outfield Points**: Remaining points split between defender and attacker roles based on time played
- **Granularity**: Points awarded in 0.5 increments for precise tracking

## Mobile Optimization

The interface is specifically designed for mobile use during games:

- **Touch-Friendly**: Large buttons and touch targets
- **Responsive Design**: Adapts to various screen sizes
- **Dark Theme**: Easy viewing in outdoor conditions
- **Offline Capable**: Local storage ensures functionality without internet
- **Quick Actions**: Critical functions accessible with minimal taps

## Browser Compatibility

Optimized for modern mobile browsers including:
- Safari (iOS)
- Chrome (Android)
- Chrome (Desktop)
- Firefox
- Edge

## Contributing

This project is tailored for the specific needs of DIF F16-6 team. For modifications or feature requests, please consider the existing game format and coaching requirements.

## License

Private project for DIF F16-6 team coaching purposes.

---

*Built with ⚽ for fair play and team development* 
