/**
 * FeatureVoteModal Component Tests
 * 
 * Basic testing suite for the FeatureVoteModal component - a modal
 * that allows users to vote for unimplemented features/formations.
 * 
 * Test Coverage: Basic functionality tests covering:
 * - Modal rendering and visibility states
 * - Authentication state handling (signed in/out)
 * - Success and error state display
 * - Loading states and button interactions
 * - Modal close/cancel functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FeatureVoteModal from '../FeatureVoteModal';

describe('FeatureVoteModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    featureName: '1-2-1 Formation',
    loading: false,
    error: null,
    successMessage: null,
    infoMessage: null,
    isAuthenticated: true,
    authModal: null,
    children: 'Help us prioritize this feature by voting for it!'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<FeatureVoteModal {...defaultProps} />);
      
      expect(screen.getByText('Feature Coming Soon!')).toBeInTheDocument();
      expect(screen.getByText('Vote for 1-2-1 Formation')).toBeInTheDocument();
      expect(screen.getByText('Help us prioritize this feature by voting for it!')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      render(<FeatureVoteModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Feature Coming Soon!')).not.toBeInTheDocument();
    });
  });

  describe('Authentication States', () => {
    it('should show vote button when user is authenticated', () => {
      render(<FeatureVoteModal {...defaultProps} isAuthenticated={true} />);
      
      expect(screen.getByText('Vote for 1-2-1 Formation')).toBeInTheDocument();
    });

    it('should show sign in button when user is not authenticated', () => {
      render(<FeatureVoteModal {...defaultProps} isAuthenticated={false} />);
      
      expect(screen.getByText('Sign In to Vote')).toBeInTheDocument();
      expect(screen.queryByText('Vote for 1-2-1 Formation')).not.toBeInTheDocument();
    });
  });

  describe('Success and Error States', () => {
    it('should display success message when vote is successful', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        successMessage="Your vote has been recorded successfully!"
      />);
      
      expect(screen.getByText('Vote Recorded!')).toBeInTheDocument();
      expect(screen.getByText('Your vote has been recorded successfully!')).toBeInTheDocument();
    });

    it('should display info message when vote already exists', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        infoMessage="You have already voted for the 1-2-1 formation in 5v5 format."
      />);
      
      expect(screen.getByText('Vote Already Recorded')).toBeInTheDocument();
      expect(screen.getByText('You have already voted for the 1-2-1 formation in 5v5 format.')).toBeInTheDocument();
    });

    it('should display error message when vote fails', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        error="You have already voted for this formation."
      />);
      
      expect(screen.getByText('Vote Failed')).toBeInTheDocument();
      expect(screen.getByText('You have already voted for this formation.')).toBeInTheDocument();
    });

    it('should change cancel button to close when success message is shown', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        successMessage="Vote successful!"
      />);
      
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should change cancel button to close when info message is shown', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        infoMessage="You already voted for this formation."
      />);
      
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should hide vote button when info message is shown', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        infoMessage="You already voted for this formation."
      />);
      
      expect(screen.queryByText('Vote for 1-2-1 Formation')).not.toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });

    it('should use friendly styling for info message (blue theme with check icon)', () => {
      render(<FeatureVoteModal 
        {...defaultProps} 
        infoMessage="You already voted for this formation."
      />);
      
      // Check for sky-colored text (blue theme)
      expect(screen.getByText('Vote Already Recorded')).toHaveClass('text-sky-200');
      expect(screen.getByText('You already voted for this formation.')).toHaveClass('text-sky-100');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when submission is in progress', () => {
      render(<FeatureVoteModal {...defaultProps} loading={true} />);
      
      expect(screen.getByText('Submitting...')).toBeInTheDocument();
      
      // The button containing the "Submitting..." text should be disabled
      const submitButton = screen.getByText('Submitting...').closest('button');
      expect(submitButton).toBeDisabled();
    });

    it('should not show loading state when not loading', () => {
      render(<FeatureVoteModal {...defaultProps} loading={false} />);
      
      expect(screen.queryByText('Submitting...')).not.toBeInTheDocument();
      const voteButton = screen.getByText('Vote for 1-2-1 Formation');
      expect(voteButton).not.toBeDisabled();
    });
  });

  describe('Modal Interaction', () => {
    it('should call onClose when cancel button is clicked', () => {
      const mockOnClose = jest.fn();
      
      render(<FeatureVoteModal {...defaultProps} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onConfirm when vote button is clicked', () => {
      const mockOnConfirm = jest.fn();
      
      render(<FeatureVoteModal {...defaultProps} onConfirm={mockOnConfirm} />);
      
      const voteButton = screen.getByText('Vote for 1-2-1 Formation');
      fireEvent.click(voteButton);
      
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty feature name', () => {
      render(<FeatureVoteModal {...defaultProps} featureName="" />);
      
      // When featureName is empty, button shows "Vote for " with trailing space
      expect(screen.getByText(/^Vote for\s*$/)).toBeInTheDocument();
    });

    it('should handle missing children gracefully', () => {
      render(<FeatureVoteModal {...defaultProps} children={null} />);
      
      // Should render without crashing
      expect(screen.getByText('Feature Coming Soon!')).toBeInTheDocument();
    });
  });
});