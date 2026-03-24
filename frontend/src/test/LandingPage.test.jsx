import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../pages/LandingPage';

describe('LandingPage', () => {
  it('renders the main heading', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    
    expect(screen.getByText(/AI-Powered Viva/i)).toBeInTheDocument();
  });

  it('renders the login and signup buttons', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );
    
    expect(screen.getByTestId('login-btn')).toBeInTheDocument();
    expect(screen.getByTestId('signup-btn')).toBeInTheDocument();
  });
});
