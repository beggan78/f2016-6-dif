import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProviderLogo } from '../ProviderLogo';

describe('ProviderLogo', () => {
  it('renders the provider image when logo is available', () => {
    render(<ProviderLogo provider={{ name: 'SportAdmin', logo: '/logo.png' }} />);

    const logo = screen.getByAltText('SportAdmin logo');
    expect(logo).toHaveAttribute('src', '/logo.png');
  });

  it('renders fallback with provider name when logo is missing', () => {
    render(<ProviderLogo provider={{ name: 'SportAdmin', logo: null }} />);

    expect(screen.getByLabelText('SportAdmin logo placeholder')).toBeInTheDocument();
    expect(screen.getByText('SportAdmin')).toBeInTheDocument();
  });

  it('renders generic fallback when provider data is missing', () => {
    render(<ProviderLogo provider={null} />);

    expect(screen.getByLabelText('Connector logo placeholder')).toBeInTheDocument();
  });
});
