import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SportAdminConnectModal } from '../SportAdminConnectModal';

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  team: { id: 'team-1' },
  onConnected: jest.fn()
};

describe('SportAdminConnectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when closed', () => {
    render(<SportAdminConnectModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/Connect SportAdmin/i)).not.toBeInTheDocument();
  });

  it('validates empty form submission', async () => {
    render(<SportAdminConnectModal {...defaultProps} />);

    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText(/Username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    expect(defaultProps.onConnected).not.toHaveBeenCalled();
  });

  it('submits credentials and resets the form on success', async () => {
    const onConnected = jest.fn().mockResolvedValue(undefined);

    render(<SportAdminConnectModal {...defaultProps} onConnected={onConnected} />);

    const usernameInput = screen.getByLabelText(/Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);

    await userEvent.type(usernameInput, ' coach ');
    await userEvent.type(passwordInput, 'secure');

    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(onConnected).toHaveBeenCalledWith({
      username: 'coach',
      password: 'secure'
    });

    await waitFor(() => {
      expect(usernameInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
    });
  });

  it('displays backend errors from onConnected', async () => {
    const onConnected = jest.fn().mockRejectedValue(new Error('Invalid credentials'));

    render(<SportAdminConnectModal {...defaultProps} onConnected={onConnected} />);

    await userEvent.type(screen.getByLabelText(/Username/i), 'coach');
    await userEvent.type(screen.getByLabelText(/Password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /connect/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });
});
