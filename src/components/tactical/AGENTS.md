# Tactical Board Component

## Overview

Interactive drag-and-drop interface for coaches to visualize formations and demonstrate plays on a digital soccer pitch. Supports player and ball chip placement with persistent state and browser back integration.

## Component Architecture

**TacticalBoardScreen.js** - Main container component
- Manages pitch mode state (full/half)
- Handles chip placement, movement, and deletion callbacks
- Persists state via `PersistenceManager` (pitch mode + chips per mode)
- Integrates with `useBrowserBackIntercept` for browser back button handling
- Tracks `fromView` for persistent back navigation after reloads

**TacticalBoard.js** - Board rendering component
- Renders pitch background (full: 16/23 ratio, half: 5/4 ratio)
- Uses `useDragAndDrop` hook for all drag interactions
- Tracks chip numbers by color for auto-incrementing
- Renders placed chips with conditional opacity (hidden during drag)
- Displays ghost chip preview during drag operations

**BaseChip.js** - Generic chip component
- Handles positioning (percentage-based: 0-100%)
- Manages drag events via pointer events
- Uses `useDoubleClick` hook for deletion (double-tap/double-click)
- Supports both palette and board positioning modes

**ChipPalette.js** - Chip selection palette
- Displays available player colors and ball variations
- Initiates drag operations with `isNewChip: true` flag

**useDragAndDrop.js** - Drag-and-drop logic hook
- Distinguishes between new chips (from palette) and existing chips (on board)
- Creates ghost chip for visual feedback during drag
- Uses pointer events for cross-platform support (mouse + touch)
- Clamps positions to board boundaries (3%-97%)
- Calculates drag offset for smooth existing chip movement

**useDoubleClick.js** - Double-tap detection hook
- Provides consistent double-click behavior across touch and mouse
- Default timeout: 300ms between clicks

## Key Features

**Dual Pitch Modes**
- Full pitch and half pitch views with different aspect ratios
- Separate chip storage per mode (persisted independently)
- Toggle between modes without losing chip placements

**State Persistence**
- Uses `PersistenceManager` with `STORAGE_KEYS.TACTICAL_PREFERENCES`
- Persists: pitch mode, chips per mode, fromView navigation
- Loads saved state on mount, saves on every change

**Browser Back Integration**
- Registers handler via `pushNavigationState` on mount
- Cleanup via `removeFromNavigationStack` on unmount
- `handleBackPress` retrieves `fromView` from saved state and calls `onNavigateBack`
- Browser back button behaves identically to on-screen Back button

**Drag-and-Drop Behavior**
- Pointer events (not mouse events) for cross-platform support
- Ghost chip follows cursor during drag
- Original chip hidden during drag (opacity: 0)
- New chips: ghost appears at cursor position
- Existing chips: ghost uses drag offset for smooth movement
- Position bounds: 3%-97% (prevents chips from touching edges)

**Chip Management**
- Player chips: auto-increment numbers per color
- Multiple ball variations available
- Double-click/double-tap to delete chips
- Clear board button removes all chips from current mode

## Important Implementation Details

**Coordinate System**
- Positions stored as percentages (0-100% of board dimensions)
- Conversion: `((clientX - rect.left) / rect.width) * 100`
- Transform: `translate(-50%, -50%)` centers chips on coordinates

**Chip Identification**
- IDs: `chip-${Date.now()}-${randomString}` for uniqueness
- `isNewChip` flag distinguishes palette vs. board chips
- Ghost chip uses ID `ghost-chip`

**State Updates**
- All chip updates use `updateAndPersistChips` helper
- Immutable state updates (spread syntax for arrays/objects)
- Persistence occurs on every state change

**Props Required by TacticalBoardScreen**
- `onNavigateBack(fromView)` - navigation callback
- `pushNavigationState(handler)` - browser back registration
- `removeFromNavigationStack()` - browser back cleanup
- `fromView` - optional, persisted for reload recovery
