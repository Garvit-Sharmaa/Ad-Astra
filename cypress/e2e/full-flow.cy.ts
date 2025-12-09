// @ts-nocheck
import '../support/commands';

describe('Ad Astra Full User Flow', () => {
  beforeEach(() => {
    // Intercept all API calls to provide mock data and ensure test stability
    cy.intercept('POST', '**/api/auth/guest', {
      statusCode: 200,
      body: {
        token: 'mock-guest-token',
        user: { name: 'Guest', phone: '', isGuest: true },
      },
    }).as('guestLogin');

    cy.intercept('POST', '**/api/ai/analyze-skin', {
      statusCode: 200,
      fixture: 'analysisResult.json',
    }).as('analyzeSkin');

    cy.intercept('GET', '**/api/hospitals', {
      statusCode: 200,
      fixture: 'hospitals.json',
    }).as('getHospitals');

    cy.intercept('POST', '**/api/bookings', (req) => {
      req.reply({
        statusCode: 201,
        body: {
          ...req.body, // Echo back the booking details
          token: `A-${Math.floor(100 + Math.random() * 900)}`, // Generate a mock token
        },
      });
    }).as('createBooking');
  });

  it('completes the entire user journey from language selection to booking confirmation', () => {
    // 1. Language Selection
    cy.visit('/');
    cy.contains('English').click();

    // 2. Login as Guest
    cy.contains('Continue as Guest').click();
    cy.wait('@guestLogin');
    cy.contains('How can we help you?').should('be.visible');

    // 3. Navigate to Skin Detector and upload image
    cy.contains('Skin Problem').click();
    cy.get('input[type="file"]').selectFile('cypress/fixtures/skin_image.png', { force: true });
    
    // Check if the image preview is displayed
    cy.get('img[alt="Skin condition preview 1"]').should('be.visible');

    // 4. Analyze Image
    cy.contains('Analyze Image').click();
    // Move to MCQ step
    cy.contains('Continue to Analysis').click();
    cy.wait('@analyzeSkin');

    // 5. Triage Result and Navigate to Booking
    cy.contains('Doctor Consultation Recommended').should('be.visible');
    cy.contains('Book OPD Appointment').click();

    // 6. Fill Booking Details
    cy.contains("Patient's Details").should('be.visible');
    cy.get('#yourName').clear().type('Guest User');
    cy.get('#phone').clear().type('9876543210');
    cy.contains('Next').click();

    // 7. Select Hospital
    cy.wait('@getHospitals');
    cy.contains('Select Hospital').should('be.visible');
    cy.contains('District General Hospital, Delhi').click();
    cy.contains('Next').click();

    // 8. Select Date and Time
    cy.contains('Select Date & Time').should('be.visible');
    // Click on a valid day in the calendar (e.g., the 25th)
    cy.get('.grid.grid-cols-7.gap-y-1').contains('button:not(:disabled)', '25').click();
    cy.contains('10:00 AM - 11:00 AM').click();
    cy.contains('Next').click();
    
    // 9. Confirm Booking
    cy.contains('Confirm Your Booking').should('be.visible');
    cy.contains('Confirm Booking').click();
    cy.wait('@createBooking');
    
    // 10. Verify Confirmation Screen
    cy.contains('Booking Confirmed!').should('be.visible');
    cy.contains('Your Booking Token').should('be.visible');
    cy.contains('Done').click();

    // Should return to the home screen
    cy.contains('How can we help you?').should('be.visible');
  });
});