
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, vi, expect } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n'; // Adjust path if i18n.ts is moved
import Login from './Login';

// Mock the global fetch function used by the component
globalThis.fetch = vi.fn();

describe('Login Component', () => {
  const handleLoginSuccess = vi.fn();
  const handleBack = vi.fn();
  const handleToggleTheme = vi.fn();

  // Test Case 1: Initial Render
  it('renders the initial login form correctly', () => {
    // Fix: Added missing onToggleTheme prop (Line 21)
    render(
      <I18nextProvider i18n={i18n}>
        <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} onToggleTheme={handleToggleTheme} />
      </I18nextProvider>
    );

    // Check for the main title using the translation key
    expect(screen.getByText('Login / Register')).toBeInTheDocument();

    // Check for role selection options instead of patient-specific fields that are hidden initially
    expect(screen.getByText('As a Patient')).toBeInTheDocument();
    expect(screen.getByText('As a Doctor')).toBeInTheDocument();
    expect(screen.getByText('As Admin / Hospital')).toBeInTheDocument();

    // Check for back button
    expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
  });

  // Test Case 2: User Interaction with Invalid Input
  it('shows an error if the phone number is invalid on submission', async () => {
    const user = userEvent.setup();
    // Fix: Added missing onToggleTheme prop (Line 43)
    render(
        <I18nextProvider i18n={i18n}>
            <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} onToggleTheme={handleToggleTheme} />
        </I18nextProvider>
    );

    // Navigate to Patient Login role step
    await user.click(screen.getByText('As a Patient'));

    // Simulate user typing an invalid phone number
    await user.type(screen.getByPlaceholderText('9876543210'), '12345');

    // Simulate clicking the "Get OTP Code" button
    await user.click(screen.getByRole('button', { name: /Get OTP Code/i }));

    // Check that the error message appears
    const errorMessage = await screen.findByText('Please enter a valid 10-digit mobile number.');
    expect(errorMessage).toBeInTheDocument();

    // Ensure the success callback was NOT called
    expect(handleLoginSuccess).not.toHaveBeenCalled();
  });

  // Test Case 3: User Interaction with Valid Input
  it('proceeds to OTP step when valid details are provided', async () => {
    const user = userEvent.setup();
    
    // Fix: Added missing onToggleTheme prop (Line 73)
    render(
        <I18nextProvider i18n={i18n}>
            <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} onToggleTheme={handleToggleTheme} />
        </I18nextProvider>
    );

    // Navigate to Patient Login role step
    await user.click(screen.getByText('As a Patient'));

    // Simulate user typing valid details
    await user.type(screen.getByPlaceholderText('9876543210'), '1234567890');
    await user.click(screen.getByRole('button', { name: /Get OTP Code/i }));
    
    // Check that the view changes to the OTP verification screen
    expect(await screen.findByText('Verify Identity')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('000000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify & Start Triage/i })).toBeInTheDocument();
  });
});
