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

  // Test Case 1: Initial Render
  it('renders the initial login form correctly', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} />
      </I18nextProvider>
    );

    // Check for the main title using the translation key
    expect(screen.getByText('Login / Register')).toBeInTheDocument();

    // Check for form fields by their labels
    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('10-Digit Mobile Number')).toBeInTheDocument();

    // Check for all primary action buttons
    expect(screen.getByRole('button', { name: 'Send OTP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeInTheDocument();
  });

  // Test Case 2: User Interaction with Invalid Input
  it('shows an error if the phone number is invalid on submission', async () => {
    const user = userEvent.setup();
    render(
        <I18nextProvider i18n={i18n}>
            <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} />
        </I18nextProvider>
    );

    // Simulate user typing a name and an invalid phone number
    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('10-Digit Mobile Number'), '12345');

    // Simulate clicking the "Send OTP" button
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));

    // Check that the error message appears
    const errorMessage = await screen.findByText('Please enter a valid 10-digit mobile number.');
    expect(errorMessage).toBeInTheDocument();

    // Ensure the success callback was NOT called
    expect(handleLoginSuccess).not.toHaveBeenCalled();
  });

  // Test Case 3: User Interaction with Valid Input
  it('proceeds to OTP step when valid details are provided', async () => {
    const user = userEvent.setup();
    // Mock a successful API response for sending OTP
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "OTP sent successfully", otp: "123456" }),
    });

    render(
        <I18nextProvider i18n={i18n}>
            <Login onLoginSuccess={handleLoginSuccess} onBack={handleBack} />
        </I18nextProvider>
    );

    // Simulate user typing valid details
    await user.type(screen.getByLabelText('Full Name'), 'Test User');
    await user.type(screen.getByLabelText('10-Digit Mobile Number'), '1234567890');
    await user.click(screen.getByRole('button', { name: 'Send OTP' }));
    
    // Check that the view changes to the OTP verification screen
    expect(await screen.findByText('Verify OTP')).toBeInTheDocument();
    expect(screen.getByLabelText('Enter OTP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify & Login' })).toBeInTheDocument();
  });
});