# Tactical Board Component

## 1. Overview

The Tactical Board is a highly interactive, drag-and-drop interface that allows coaches to visualize formations, plan strategies, and demonstrate plays. It provides a digital canvas representing a soccer pitch where coaches can place and move player and ball chips.

This component is designed to be flexible and reusable, with a clear separation between the board's state management and its UI representation.

## 2. Core Components & Architecture

The tactical board is composed of several key components that work together:

- **`TacticalBoardScreen.js`**: The main container component that manages the overall state of the tactical board, including the pitch mode (`full` or `half`) and the list of placed chips. It also handles user interactions like switching the pitch mode and navigating back.

- **`TacticalBoard.js`**: This component is the heart of the tactical board. It renders the soccer pitch, the placed chips, and the chip palette. It uses the `useDragAndDrop` hook to manage all drag-and-drop interactions.

- **`ChipPalette.js`**: A component that displays the available player and soccer ball chips that can be dragged onto the board.

- **`PlayerChip.js` & `SoccerBallChip.js`**: These components represent the individual player and ball chips on the board. They are built upon a generic `BaseChip.js` component.

- **`BaseChip.js`**: A foundational component that encapsulates common chip behaviors, such as positioning, styling, and handling double-click events for deletion.

- **`useDragAndDrop.js` hook**: A custom hook that abstracts the complex logic of drag-and-drop functionality. It tracks the state of the dragged chip, calculates its position on the board, and provides handlers for drag start, move, and end events.

## 3. Key Features & Functionality

- **Drag-and-Drop Interface**: Users can drag player and ball chips from the palette and drop them onto the tactical board. Existing chips on the board can also be moved around.

- **Full and Half Pitch Modes**: The board can be toggled between a full-pitch view and a half-pitch view. The background image and aspect ratio of the board adapt to the selected mode.

- **Chip Customization**: Player chips can have different colors and are automatically assigned incremental numbers.

- **Chip Deletion**: Chips can be removed from the board by double-clicking on them.

- **State Persistence**: The selected pitch mode is persisted in `localStorage`, so the user's preference is remembered across sessions.

- **Ghost Chip Preview**: When a chip is being dragged, a semi-transparent "ghost" chip is displayed to provide a visual preview of where the chip will be placed.

## 4. How It Works

1.  **Initialization**: `TacticalBoardScreen.js` initializes the state, loading the persisted pitch mode from `localStorage`.

2.  **Rendering**: `TacticalBoard.js` renders the pitch image, the `ChipPalette`, and any chips that are in the `placedChips` array.

3.  **Dragging from Palette**:
    - The user clicks and starts dragging a chip from the `ChipPalette`.
    - `ChipPalette.js` calls the `handlePointerStart` function provided by the `useDragAndDrop` hook, passing the chip's data.
    - The hook creates a "ghost" chip that follows the user's cursor.

4.  **Dragging on the Board**:
    - As the user moves a chip on the board, the `useDragAndDrop` hook continuously updates the chip's position.
    - The `onChipMove` callback is triggered, and `TacticalBoardScreen.js` updates the state with the new coordinates.

5.  **Dropping a Chip**:
    - When the user releases the chip, the `useDragAndDrop` hook determines if it's a new chip from the palette or an existing one being moved.
    - If it's a new chip, the `onChipPlace` callback is called. If it's an existing chip, `onChipMove` is called with the final position.
    - `TacticalBoardScreen.js` updates the `placedChips` state accordingly.

6.  **Deleting a Chip**:
    - A user double-clicks on a chip.
    - The `onDoubleClick` handler in `BaseChip.js` is triggered.
    - This calls the `onChipDelete` callback, and `TacticalBoardScreen.js` removes the chip from the `placedChips` array.

## 5. Usage

To use the tactical board, you can embed the `TacticalBoardScreen` component in your application. It requires the following props:

- `onNavigateBack`: A function to be called when the user clicks the "Back" button.
- `pushNavigationState`: A function to push a modal onto the navigation stack.
- `removeFromNavigationStack`: A function to remove a modal from the navigation stack.
