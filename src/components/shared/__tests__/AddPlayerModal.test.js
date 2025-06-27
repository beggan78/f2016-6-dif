/**
 * AddPlayerModal Component Tests
 * 
 * Comprehensive testing suite for the AddPlayerModal component - a modal component
 * that allows coaches to add temporary players to their roster during configuration.
 * 
 * Test Coverage: 20+ tests covering:
 * - Modal rendering and visibility states
 * - Form input handling and validation
 * - Player name sanitization integration
 * - Submit and cancel functionality
 * - Keyboard and form interaction
 * - Error handling and edge cases
 * - Accessibility and UX patterns
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddPlayerModal } from '../AddPlayerModal';

// Mock the input sanitization utility
jest.mock('../../../utils/inputSanitization', () => ({
  sanitizeNameInput: jest.fn((input) => {
    if (typeof input !== 'string') return '';
    
    let result = input;
    if (result.length > 50) {
      result = result.substring(0, 50);
    }
    
    // Remove any characters not in the allowed pattern
    result = result.replace(/[^a-zA-ZÀ-ÿ0-9\s\-'&.]/g, '');
    
    return result;
  }),
  isValidNameInput: jest.fn((input) => {
    if (typeof input !== 'string') return false;
    const trimmed = input.trim();
    return trimmed.length <= 50 && /^[a-zA-ZÀ-ÿ0-9\s\-'&.]*$/.test(trimmed);
  })
}));

describe('AddPlayerModal', () => {
  let defaultProps;
  let mockOnAddPlayer;
  let mockOnClose;

  beforeEach(() => {
    mockOnAddPlayer = jest.fn();
    mockOnClose = jest.fn();

    defaultProps = {
      isOpen: true,
      onClose: mockOnClose,
      onAddPlayer: mockOnAddPlayer
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Modal Rendering and Visibility', () => {
    it('should render the modal when isOpen is true', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      expect(screen.getByText('Add Temporary Player')).toBeInTheDocument();
      expect(screen.getByLabelText('Player Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter player name')).toBeInTheDocument();
    });

    it('should not render the modal when isOpen is false', () => {
      const props = { ...defaultProps, isOpen: false };
      render(<AddPlayerModal {...props} />);
      
      expect(screen.queryByText('Add Temporary Player')).not.toBeInTheDocument();
    });

    it('should render with correct modal structure and styling', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      // Check for modal overlay
      const modalOverlay = screen.getByText('Add Temporary Player').closest('.fixed');
      expect(modalOverlay).toHaveClass('inset-0', 'bg-black', 'bg-opacity-50');
      
      // Check for modal content container
      const modalContent = screen.getByText('Add Temporary Player').closest('.bg-slate-800');
      expect(modalContent).toHaveClass('rounded-lg', 'p-6');
    });

    it('should render form elements with correct attributes', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveAttribute('id', 'playerName');
      expect(input).toHaveAttribute('maxLength', '50');
      expect(input).toHaveProperty('autoFocus', true);
      
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toHaveAttribute('type', 'button');
      
      const addButton = screen.getByText('Add Player');
      expect(addButton).toHaveAttribute('type', 'submit');
    });
  });

  describe('Form Input Handling', () => {
    it('should update input value when user types', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: 'John Doe' } });
      
      expect(input.value).toBe('John Doe');
    });

    it('should call sanitizeNameInput when input changes', () => {
      const { sanitizeNameInput } = require('../../../utils/inputSanitization');
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: 'John@Doe!' } });
      
      expect(sanitizeNameInput).toHaveBeenCalledWith('John@Doe!');
    });

    it('should handle sanitized input correctly', () => {
      const { sanitizeNameInput } = require('../../../utils/inputSanitization');
      sanitizeNameInput.mockReturnValue('John Doe');
      
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: 'John@Doe!' } });
      
      expect(input.value).toBe('John Doe');
    });

    it('should clear input when modal opens', () => {
      const { rerender } = render(<AddPlayerModal {...defaultProps} isOpen={false} />);
      
      // Modal is closed, no input visible
      expect(screen.queryByLabelText('Player Name')).not.toBeInTheDocument();
      
      // Open modal
      rerender(<AddPlayerModal {...defaultProps} isOpen={true} />);
      
      const input = screen.getByLabelText('Player Name');
      expect(input.value).toBe('');
    });

    it('should enforce maximum length through maxLength attribute', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      expect(input).toHaveAttribute('maxLength', '50');
    });
  });

  describe('Form Submission', () => {
    it('should call onAddPlayer with trimmed name when form is submitted with valid input', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const form = screen.getByRole('form') || input.closest('form');
      
      fireEvent.change(input, { target: { value: '  John Doe  ' } });
      fireEvent.submit(form);
      
      expect(mockOnAddPlayer).toHaveBeenCalledWith('John Doe');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onAddPlayer when Add Player button is clicked with valid input', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: 'Jane Smith' } });
      fireEvent.click(addButton);
      
      expect(mockOnAddPlayer).toHaveBeenCalledWith('Jane Smith');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should clear input field after successful submission', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: 'Test Player' } });
      fireEvent.click(addButton);
      
      // Input should be cleared (though modal might close)
      expect(input.value).toBe('');
    });

    it('should not call onAddPlayer when form is submitted with empty input', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const form = input.closest('form');
      
      // Submit with empty input
      fireEvent.submit(form);
      
      expect(mockOnAddPlayer).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should not call onAddPlayer when form is submitted with whitespace-only input', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const form = input.closest('form');
      
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.submit(form);
      
      expect(mockOnAddPlayer).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should prevent default form submission behavior', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const form = input.closest('form');
      
      const mockPreventDefault = jest.fn();
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
      submitEvent.preventDefault = mockPreventDefault;
      
      fireEvent.change(input, { target: { value: 'Test Player' } });
      
      form.dispatchEvent(submitEvent);
      
      expect(mockPreventDefault).toHaveBeenCalled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onClose when Cancel button is clicked', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnAddPlayer).not.toHaveBeenCalled();
    });

    it('should clear input field when Cancel button is clicked', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const cancelButton = screen.getByText('Cancel');
      
      fireEvent.change(input, { target: { value: 'Test Input' } });
      fireEvent.click(cancelButton);
      
      expect(input.value).toBe('');
    });

    it('should handle cancel even with input value present', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const cancelButton = screen.getByText('Cancel');
      
      fireEvent.change(input, { target: { value: 'Some text' } });
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
      expect(input.value).toBe('');
    });
  });

  describe('Button States and Validation', () => {
    it('should disable Add Player button when input is empty', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const addButton = screen.getByText('Add Player');
      expect(addButton).toBeDisabled();
    });

    it('should disable Add Player button when input contains only whitespace', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: '   ' } });
      expect(addButton).toBeDisabled();
    });

    it('should enable Add Player button when input has valid text', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: 'Valid Name' } });
      expect(addButton).not.toBeDisabled();
    });

    it('should enable Add Player button even with leading/trailing whitespace', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: '  Valid Name  ' } });
      expect(addButton).not.toBeDisabled();
    });

    it('should have correct styling for disabled button', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const addButton = screen.getByText('Add Player');
      expect(addButton).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Keyboard and Accessibility', () => {
    it('should focus input field when modal opens', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      expect(input).toHaveFocus();
    });

    it('should handle Enter key submission when input has valid text', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      
      fireEvent.change(input, { target: { value: 'Test Player' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnAddPlayer).toHaveBeenCalledWith('Test Player');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should not submit when Enter is pressed with empty input', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      expect(mockOnAddPlayer).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should have proper ARIA labels and accessibility attributes', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      expect(input).toHaveAttribute('id', 'playerName');
      
      const label = screen.getByText('Player Name');
      expect(label).toHaveAttribute('for', 'playerName');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing onAddPlayer prop gracefully', () => {
      const props = { ...defaultProps, onAddPlayer: undefined };
      
      expect(() => render(<AddPlayerModal {...props} />)).not.toThrow();
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: 'Test' } });
      expect(() => fireEvent.click(addButton)).not.toThrow();
    });

    it('should handle missing onClose prop gracefully', () => {
      const props = { ...defaultProps, onClose: undefined };
      
      expect(() => render(<AddPlayerModal {...props} />)).not.toThrow();
      
      const cancelButton = screen.getByText('Cancel');
      expect(() => fireEvent.click(cancelButton)).not.toThrow();
    });

    it('should handle very long input gracefully', () => {
      const { sanitizeNameInput } = require('../../../utils/inputSanitization');
      const longInput = 'A'.repeat(100);
      const truncatedInput = 'A'.repeat(50);
      
      sanitizeNameInput.mockReturnValue(truncatedInput);
      
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: longInput } });
      
      expect(sanitizeNameInput).toHaveBeenCalledWith(longInput);
      expect(input.value).toBe(truncatedInput);
    });

    it('should handle special characters in input', () => {
      const { sanitizeNameInput } = require('../../../utils/inputSanitization');
      const specialInput = 'John@#$%Doe!';
      const sanitizedInput = 'JohnDoe';
      
      sanitizeNameInput.mockReturnValue(sanitizedInput);
      
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: specialInput } });
      
      expect(input.value).toBe(sanitizedInput);
    });

    it('should handle rapid consecutive submissions', () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      const addButton = screen.getByText('Add Player');
      
      fireEvent.change(input, { target: { value: 'Test Player' } });
      
      // Rapid clicks
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      
      // Should only be called once due to form submission behavior
      expect(mockOnAddPlayer).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Integration', () => {
    it('should work correctly in a typical usage scenario', async () => {
      render(<AddPlayerModal {...defaultProps} />);
      
      // User focuses input (automatically focused)
      const input = screen.getByLabelText('Player Name');
      expect(input).toHaveFocus();
      
      // User types a name
      fireEvent.change(input, { target: { value: 'Emergency Player' } });
      
      // Button becomes enabled
      const addButton = screen.getByText('Add Player');
      expect(addButton).not.toBeDisabled();
      
      // User submits
      fireEvent.click(addButton);
      
      // Callbacks are called correctly
      expect(mockOnAddPlayer).toHaveBeenCalledWith('Emergency Player');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset properly when reopened after previous use', () => {
      const { rerender } = render(<AddPlayerModal {...defaultProps} />);
      
      const input = screen.getByLabelText('Player Name');
      fireEvent.change(input, { target: { value: 'First Player' } });
      
      // Close modal
      rerender(<AddPlayerModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<AddPlayerModal {...defaultProps} isOpen={true} />);
      
      const newInput = screen.getByLabelText('Player Name');
      expect(newInput.value).toBe('');
      expect(newInput).toHaveFocus();
    });
  });
});