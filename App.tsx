import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { View, TriageResultData, BookingDetails, User } from './types';
import { useTranslation } from 'react-i18next';
<<<<<<< HEAD
import { BACKEND_URL, LANGUAGES } from './constants';
import { processAnalysisQueue } from './services/geminiService';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
=======
import { API_BASE_URL, LANGUAGES } from './constants';
import { processAnalysisQueue } from './services/AIService';
>>>>>>> 390da379d01e60efa48708bd34a20a94f94adcab

const LanguageSelector = lazy(() => import('./components/LanguageSelector'));
const Login = lazy(() => import('./components/Login'));
const Home = lazy(() => import('./components/Home'));
const SkinDetector = lazy(() => import('./components/SkinDetector'));
const SymptomChecker = lazy(() => import('./components/SymptomChecker'));
const TriageResult = lazy(() => import('./components/TriageResult'));
const Booking = lazy(() => import('./components/Booking'));
const Confirmation = lazy(() => import('./components/Confirmation'));
const Header = lazy(() => import('./components/Header'));
const BookingHistory = lazy(() => import('./components/BookingHistory'));
const Profile = lazy(() => import('./components/Profile'));
const Feedback = lazy(() => import('./components/Feedback'));
const Dashboard = lazy(() => import('./components/Dashboard'));

const LoadingComponent = () => (
    <div className="flex justify-center items-center h-screen w-full bg-bg-primary">
        <div className="w-12 h-12 border-4 border-t-brand-blue border-bg-tertiary rounded-full animate-spin"></div>
    </div>
);

const App = () => {
  const [currentView, setCurrentView] = useState<View>(View.Language); // STRICTURE: Default to Language
  const { t, i18n } = useTranslation();
  const [result, setResult] = useState<TriageResultData | null>(null);
  const [suggestedSpecialty, setSuggestedSpecialty] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('healthAppTheme') as 'dark' | 'light') || 'dark'
  );
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
        CapacitorUpdater.notifyAppReady();
    } catch (e) {
        console.warn('Capacitor Updater not available');
    }
  }, []);

  // Strict Navigation Flow: Language Page is Initial Entry
  useEffect(() => {
    const initializeApp = () => {
        const savedToken = localStorage.getItem('healthAppToken');
        const savedUser = localStorage.getItem('healthAppUser');
        const savedLang = localStorage.getItem('healthAppLang');

        // Force language selection if not already chosen
        if (!savedLang) {
            setCurrentView(View.Language);
        } else if (savedToken && savedUser) {
            try {
              setToken(savedToken);
              setUser(JSON.parse(savedUser));
              setCurrentView(View.Home);
            } catch(e) {
              setCurrentView(View.Login);
            }
        } else {
            setCurrentView(View.Login);
        }
        setIsInitialized(true);
    };
    initializeApp();
  }, []); 

  useEffect(() => {
    // Theme switching logic synced with CSS variables in index.html
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('healthAppTheme', theme);
  }, [theme]);
  
  const handleToggleTheme = useCallback(() => {
      setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  }, []);

  const navigateTo = useCallback((view: View) => {
    setCurrentView(view);
  }, []);

  const handleLanguageSelect = useCallback((lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('healthAppLang', lang);
    // Proceed to next step: Login or Home
    if (user) {
        navigateTo(View.Home);
    } else {
        navigateTo(View.Login);
    }
  }, [i18n, user, navigateTo]);
  
  const handleLoginSuccess = useCallback(({ user, token }: { user: User, token: string }) => {
      setUser(user);
      setToken(token);
      localStorage.setItem('healthAppUser', JSON.stringify(user));
      localStorage.setItem('healthAppToken', token);
      navigateTo(View.Home);
  }, [navigateTo]);

  const handleLogout = useCallback(() => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('healthAppUser');
      localStorage.removeItem('healthAppToken');
      navigateTo(View.Login);
  }, [navigateTo]);

  const renderView = () => {
    if (!isInitialized) return <LoadingComponent />;

    switch (currentView) {
      case View.Language:
        return <LanguageSelector onSelect={handleLanguageSelect} />;
      case View.Login:
        return <Login onLoginSuccess={handleLoginSuccess} onBack={() => navigateTo(View.Language)} onToggleTheme={handleToggleTheme} />;
      case View.Home:
        return <Home onNavigate={navigateTo} onViewOfflineResult={() => {}} />;
      case View.Skin:
        return <SkinDetector onBack={() => navigateTo(View.Home)} onAnalysisComplete={(res) => { setResult(res); navigateTo(View.Result); }} />;
      case View.Symptoms:
        return <SymptomChecker onBack={() => navigateTo(View.Home)} onAnalysisComplete={(res) => { setResult(res); navigateTo(View.Result); }} onNavigate={navigateTo} />;
      case View.Result:
        return result && <TriageResult result={result} onNavigate={navigateTo} onReset={() => navigateTo(View.Home)} />;
      case View.Booking:
        return user && <Booking user={user} onBack={() => navigateTo(View.Home)} onBookingComplete={async (d) => {
            const authToken = localStorage.getItem('healthAppToken');
            const response = await fetch(`${BACKEND_URL}/api/bookings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(d),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to confirm booking. Please try again.');
            }
            const confirmed = await response.json();
            // Increment local AI check counter for dashboard stats
            const prev = parseInt(localStorage.getItem('totalAiChecks') || '0', 10);
            localStorage.setItem('totalAiChecks', String(prev + 1));
            setBookingDetails(confirmed);
            navigateTo(View.Confirmation);
        }} theme={theme} suggestedSpecialty={suggestedSpecialty} />;
      case View.Confirmation:
        return <Confirmation details={bookingDetails} onDone={() => navigateTo(View.Home)} />;
      case View.History:
        return <BookingHistory onBack={() => navigateTo(View.Home)} />;
      case View.Profile:
        return user && <Profile user={user} onBack={() => navigateTo(View.Home)} onUpdateUser={(u, newToken) => {
            setUser(u);
            localStorage.setItem('healthAppUser', JSON.stringify(u));
            if (newToken) {
                setToken(newToken);
                localStorage.setItem('healthAppToken', newToken);
            }
        }} />;
      case View.Dashboard:
        return user && <Dashboard user={user} onBack={() => navigateTo(View.Home)} onNavigate={navigateTo} />;
      default:
        return <LanguageSelector onSelect={handleLanguageSelect} />;
    }
  };

  const showHeader = user && currentView !== View.Language && currentView !== View.Login;

  return (
    <div className={`min-h-screen font-sans bg-bg-primary text-text-primary transition-colors duration-400`}>
      <Suspense fallback={null}>
        {showHeader && <Header onHomeClick={() => navigateTo(View.Home)} showHome={currentView !== View.Home} onNavigate={navigateTo} onToggleTheme={handleToggleTheme} theme={theme} onLogout={handleLogout} user={user} />}
      </Suspense>
      <main>
        <div className="container mx-auto max-w-2xl px-4 py-8">
           <div key={currentView} className="animate-fade-scale-in">
            <Suspense fallback={<LoadingComponent />}>
              {renderView()}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
