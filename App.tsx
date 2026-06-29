import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { View, TriageResultData, BookingDetails, User } from './types';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from './constants';
import { processAnalysisQueue } from './services/geminiService';
import { CapacitorUpdater } from '@capgo/capacitor-updater';


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

/**
 * Parses the AI's free-form doctorSuggestion string to find a matching
 * medical specialty keyword for the Booking auto-select feature.
 */
const SPECIALTY_KEYWORD_MAP: Record<string, string> = {
  dermatolog: 'Dermatology',
  cardiolog: 'Cardiology',
  orthoped: 'Orthopedics',
  neurolog: 'Neurology',
  gastroenterolog: 'Gastroenterology',
  psychiatr: 'Psychiatry',
  pulmonolog: 'Pulmonology',
  endocrinolog: 'Endocrinology',
  ophthalmolog: 'Ophthalmology',
  'general physician': 'General Medicine',
  'general medicine': 'General Medicine',
  ent: 'ENT',
  pediatr: 'Pediatrics',
  gynecolog: 'Gynecology',
  oncolog: 'Oncology',
  nephrolog: 'Nephrology',
  urolog: 'Urology',
};

const extractSpecialty = (suggestion?: string): string | null => {
  if (!suggestion) return null;
  const lower = suggestion.toLowerCase();
  for (const [keyword, specialty] of Object.entries(SPECIALTY_KEYWORD_MAP)) {
    if (lower.includes(keyword)) return specialty;
  }
  return null;
};

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
  const [isInitialized, setIsInitialized] = useState(false);
  const [offlineResults, setOfflineResults] = useState<TriageResultData[]>([]);
  const [offlineBannerIndex, setOfflineBannerIndex] = useState(0);

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

  // H1: Wire offline queue auto-processing to the browser's 'online' event.
  // When the device reconnects, any queued AI analyses are automatically flushed.
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Offline Queue] Device came online — processing queued analyses...');
      processAnalysisQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // --- OFFLINE QUEUE RESULT LISTENER ---
  // When processAnalysisQueue() completes (e.g. after reconnecting to internet),
  // it dispatches a 'queueProcessed' event. We pick that up here and surface
  // a dismissible banner so the user can view their pending triage result.
  useEffect(() => {
    const handleQueueProcessed = () => {
      try {
        const raw = localStorage.getItem('analysisResults');
        if (!raw) return;
        const results: TriageResultData[] = JSON.parse(raw);
        if (results.length > 0) {
          setOfflineResults(results);
          setOfflineBannerIndex(0);
          // Clear so the banner doesn't re-appear on the next page load
          localStorage.removeItem('analysisResults');
        }
      } catch (e) {
        console.warn('Failed to parse offline analysis results:', e);
      }
    };

    window.addEventListener('queueProcessed', handleQueueProcessed);
    // Also check on mount in case results exist from a previous session
    handleQueueProcessed();
    return () => window.removeEventListener('queueProcessed', handleQueueProcessed);
  }, []);

  const handleViewOfflineResult = () => {
    const target = offlineResults[offlineBannerIndex];
    if (!target) return;
    setResult(target);
    setSuggestedSpecialty(extractSpecialty(target.doctorSuggestion));
    setOfflineResults(prev => prev.filter((_, i) => i !== offlineBannerIndex));
    setOfflineBannerIndex(0);
    navigateTo(View.Result);
  };

  const dismissOfflineBanner = () => {
    setOfflineResults([]);
  };
  
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
      localStorage.setItem('healthAppUser', JSON.stringify(user));
      localStorage.setItem('healthAppToken', token);
      navigateTo(View.Home);
  }, [navigateTo]);

  const handleLogout = useCallback(() => {
      setUser(null);
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
        return <Home onNavigate={navigateTo} onViewOfflineResult={handleViewOfflineResult} />;
      case View.Skin:
        return <SkinDetector onBack={() => navigateTo(View.Home)} onAnalysisComplete={(res) => { setSuggestedSpecialty(null); setResult(res); navigateTo(View.Result); }} />;
      case View.Symptoms:
        return <SymptomChecker onBack={() => navigateTo(View.Home)} onAnalysisComplete={(res) => { setSuggestedSpecialty(null); setResult(res); navigateTo(View.Result); }} onNavigate={navigateTo} />;
      case View.Result:
        return result && <TriageResult result={result} onNavigate={(view) => {
            // When the user taps "Book Appointment", extract the AI-suggested specialty
            // so Booking.tsx can pre-select the correct doctor filter.
            if (view === View.Booking) {
                setSuggestedSpecialty(extractSpecialty(result.doctorSuggestion));
            }
            navigateTo(view);
        }} onReset={() => navigateTo(View.Home)} />;
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
                localStorage.setItem('healthAppToken', newToken);
            }
        }} />;
      case View.Dashboard:
        return user && <Dashboard user={user} onBack={() => navigateTo(View.Home)} onNavigate={navigateTo} />;
      case View.Feedback:
        return user && <Feedback onBack={() => navigateTo(View.Home)} />;
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

      {/* ── Offline Result Banner ─────────────────────────────────────────────── */}
      {/* Appears over any view when a background queue result becomes available  */}
      {offlineResults.length > 0 && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md"
          style={{ animation: 'slideUpFade 0.4s ease-out' }}
        >
          <div className="bg-bg-secondary border border-brand-blue/40 rounded-2xl shadow-2xl shadow-brand-blue/20 p-4 flex items-center gap-4">
            {/* Pulsing indicator */}
            <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
              <i className="fas fa-cloud-download-alt text-brand-blue-light text-lg"></i>
            </div>

            <div className="flex-grow min-w-0">
              <p className="font-bold text-text-primary text-sm">
                {offlineResults.length === 1
                  ? t('offline_result_ready') || '🔄 Offline analysis ready'
                  : `🔄 ${offlineResults.length} offline results ready`}
              </p>
              <p className="text-text-tertiary text-xs mt-0.5 truncate">
                {t('offline_result_desc') || 'Your triage was completed in the background.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="view-offline-result-btn"
                onClick={handleViewOfflineResult}
                className="px-3 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-lg hover:bg-brand-blue-dark transition-colors"
              >
                {t('view') || 'View'}
              </button>
              <button
                onClick={dismissOfflineBanner}
                className="w-7 h-7 rounded-lg bg-bg-tertiary/50 flex items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
                aria-label="Dismiss"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
