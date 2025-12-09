# Ad Astra Backend

This is the backend server for the Ad Astra application. It handles user authentication, data persistence, and securely proxies requests to the Google Gemini API.

## Setup

1.  **Install Dependencies:**
    Navigate to this `server` directory in your terminal and run:
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file in the `server` directory. This file is **required** for the application to run.
    Open the `.env` file and add your Google Gemini API key, a JWT secret, your MongoDB connection URI, and your Twilio credentials:
    ```
    # Google Gemini
    API_KEY=YOUR_GEMINI_API_KEY
    
    # Session Security
    JWT_SECRET=YOUR_SUPER_SECRET_KEY_FOR_SESSIONS
    
    # Database
    MONGO_URI=YOUR_MONGODB_CONNECTION_STRING

    # Twilio for SMS OTP
    TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    TWILIO_AUTH_TOKEN=your_twilio_auth_token
    TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```
    - Replace `YOUR_GEMINI_API_KEY` with your actual key.
    - Replace `YOUR_SUPER_SECRET_KEY_FOR_SESSIONS` with a long, random, secret string used for securing user sessions.
    - Replace `YOUR_MONGODB_CONNECTION_STRING` with the full URI you get from your MongoDB Atlas cluster.
    - Replace the Twilio variables with your credentials from the [Twilio Console](https://www.twilio.com/console). You will need to create a "Verify" service to get a Service SID.

## Running the Application (Development)

This project has a separate frontend (in the root directory, likely using Vite) and a backend (in this `server` directory). You need to run both concurrently for the application to work.

### 1. Run the Backend Server (API)

- In your terminal, navigate to this `server` directory.
- Run `npm run dev` to start the backend server.
- The backend will now be running on `http://localhost:3002`. Leave this terminal running.

### 2. Run the Frontend Server (Vite)

- In a **new, separate terminal**, navigate to the **root** directory of the project.
- Run `npm install` to install frontend dependencies (if you haven't already).
- Run `npm run dev` to start the Vite development server.
- The frontend will typically start on `http://localhost:5173` (check your terminal output for the exact URL).

### 3. Access the App

- Open the frontend URL (e.g., `http://localhost:5173`) in your web browser. The application will connect to the backend API automatically.

## Running for Production

To build and run the server for production:
```bash
# From the server directory
npm run build
npm start
```
Note that for a real production deployment, you would first build the frontend into static assets and configure the Express server to serve those files.