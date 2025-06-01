# DIF F16-6 Coach

A mobile-first web application designed for coaching youth soccer teams. This app helps manage player rotations, track playing time, and maintain fair substitution patterns during games with 5v5 formations.

## Overview

DIF F16-6 Coach is built specifically for managing a soccer team of 14 players where 6-7 players are selected for each game. The app supports both 6-player and 7-player squad configurations, with intelligent rotation systems to ensure fair playing time distribution.

### Key Features

- **Smart Player Selection**: Choose 6 or 7 players from your 14-player roster for each game
- **Flexible Team Formation**: Supports both pair-based (7 players) and individual position-based (6 players) formations
- **Real-time Game Management**: Dual timers track match time and substitution intervals
- **Automated Substitution Planning**: AI-powered recommendations for optimal player rotations
- **Fair Time Distribution**: Comprehensive time tracking ensures equitable playing opportunities
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
- Intelligent rotation queue management

## App Workflow

### 1. Game Configuration
- Select 6 or 7 players from the 14-player roster
- Set number of periods (1-3) and duration (10-30 minutes)
- Assign goalies for each period

### 2. Period Setup
- Configure team formation for the current period
- AI recommendations based on previous playing time (for periods 2-3)
- Manual override available for all positions

### 3. Live Game Management
- **Match Timer**: Counts down from period duration
- **Substitution Timer**: Tracks time since last substitution
- **Visual Indicators**: 
  - Blue boxes show players currently on field
  - Green arrows indicate players ready to enter
  - Red arrows show players scheduled to exit
- **Quick Substitution**: One-tap substitution with visual feedback

### 4. Statistics & Analysis
- Comprehensive playing time tracking
- Points-based role distribution system
- Exportable statistics
- Historical game data

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
