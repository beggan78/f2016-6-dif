import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportControls } from '../ReportControls';

jest.mock('lucide-react', () => ({
  Printer: ({ className }) => <div data-testid="printer-icon" className={className} />,
  Share2: ({ className }) => <div data-testid="share-icon" className={className} />,
  Settings: ({ className }) => <div data-testid="settings-icon" className={className} />
}));

jest.mock('../../shared/UI', () => ({
  Button: ({ children, onClick, variant, size, Icon, ...props }) => (
    <button
      onClick={onClick}
      data-testid={`button-${children.toLowerCase()}`}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {Icon && <Icon />}
      <span>{children}</span>
    </button>
  )
}));

describe('ReportControls', () => {
  const createNavigator = () => ({
    share: jest.fn().mockResolvedValue(undefined),
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined)
    }
  });

  const createProps = (overrides = {}) => ({
    onPrint: jest.fn(),
    onShare: jest.fn(),
    showSubstitutions: false,
    onToggleSubstitutions: jest.fn(),
    sortOrder: 'desc',
    onSortOrderChange: jest.fn(),
    eventFilter: 'all',
    onEventFilterChange: jest.fn(),
    ...overrides
  });

  let originalNavigator;
  let originalPrint;
  let originalAlert;
  let originalLocation;

  beforeEach(() => {
    originalNavigator = global.navigator;
    originalPrint = window.print;
    originalAlert = global.alert;
    originalLocation = window.location;

    Object.defineProperty(global, 'navigator', {
      value: createNavigator(),
      configurable: true
    });

    Object.defineProperty(window, 'location', {
      value: { href: 'https://example.com/report' },
      configurable: true
    });

    window.print = jest.fn();
    global.alert = jest.fn();
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true
    });

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true
    });

    window.print = originalPrint;
    global.alert = originalAlert;
  });

  it('renders export buttons and options section', () => {
    render(<ReportControls {...createProps()} />);

    expect(screen.getByTestId('button-print')).toBeInTheDocument();
    expect(screen.getByTestId('button-share')).toBeInTheDocument();
    expect(screen.getByTestId('printer-icon')).toBeInTheDocument();
    expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    expect(screen.getByText('Report Options')).toBeInTheDocument();
  });

  it('uses provided onPrint handler when available', () => {
    const props = createProps();
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByTestId('button-print'));
    expect(props.onPrint).toHaveBeenCalledTimes(1);
    expect(window.print).not.toHaveBeenCalled();
  });

  it('falls back to window.print when onPrint is missing', () => {
    const props = createProps({ onPrint: undefined });
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByTestId('button-print'));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('uses provided onShare handler when available', () => {
    const props = createProps();
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByTestId('button-share'));
    expect(props.onShare).toHaveBeenCalledTimes(1);
    expect(navigator.share).not.toHaveBeenCalled();
  });

  it('falls back to navigator.share when onShare is missing', async () => {
    const navigatorMock = createNavigator();
    Object.defineProperty(global, 'navigator', {
      value: navigatorMock,
      configurable: true
    });

    const props = createProps({ onShare: undefined });
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByTestId('button-share'));

    await waitFor(() => {
      expect(navigatorMock.share).toHaveBeenCalledTimes(1);
    });
  });

  it('falls back to clipboard copy when Web Share API is unavailable', async () => {
    const navigatorMock = createNavigator();
    navigatorMock.share = undefined;
    Object.defineProperty(global, 'navigator', {
      value: navigatorMock,
      configurable: true
    });

    const props = createProps({ onShare: undefined });
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByTestId('button-share'));

    await waitFor(() => {
      expect(navigatorMock.clipboard.writeText).toHaveBeenCalledTimes(1);
    });
  });

  it('toggles substitution visibility', () => {
    const props = createProps();
    render(<ReportControls {...props} />);

    fireEvent.click(screen.getByRole('checkbox'));
    expect(props.onToggleSubstitutions).toHaveBeenCalledWith(true);
  });

  it('updates sort order when dropdown changes', () => {
    const props = createProps();
    render(<ReportControls {...props} />);

    fireEvent.change(screen.getByDisplayValue('Newest First'), { target: { value: 'asc' } });
    expect(props.onSortOrderChange).toHaveBeenCalledWith('asc');
  });

  it('updates event filter when dropdown changes', () => {
    const props = createProps();
    render(<ReportControls {...props} />);

    fireEvent.change(screen.getByDisplayValue('All Events'), { target: { value: 'goals' } });
    expect(props.onEventFilterChange).toHaveBeenCalledWith('goals');
  });
});
