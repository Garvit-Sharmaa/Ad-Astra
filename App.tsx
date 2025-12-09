import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react';
import { View, TriageResultData, BookingDetails, User } from './types';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL, LANGUAGES } from './constants';
import { processAnalysisQueue } from './services/AIService';

// Lazy load components for code-splitting and better initial performance
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

/**
 * A simple spinner for the initial app load and for when lazy-loaded components are fetching.
 */
const LoadingComponent = () => (
    <div className="flex justify-center items-center h-screen w-full">
        <div className="w-12 h-12 border-4 border-t-brand-blue border-slate-300 dark:border-slate-700 rounded-full animate-spin"></div>
    </div>
);

/**
 * The main application component. It manages the current view, user session,
 * and all top-level state, acting as a simple router and state container.
 */
const App = () => {
  const [currentView, setCurrentView] = useState<View>(View.Language);
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
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Check for saved state and user's language on initial load
  useEffect(() => {
    const initializeApp = () => {
        const savedToken = localStorage.getItem('healthAppToken');
        const savedUser = localStorage.getItem('healthAppUser');

        const determineInitialViewForGuest = () => {
            const savedLang = localStorage.getItem('healthAppLang');

            if (savedLang && LANGUAGES.some(l => l.code === savedLang)) {
                setCurrentView(View.Login);
            } else {
                const browserLang = navigator.language.split('-')[0];
                const isSupported = LANGUAGES.some(lang => lang.code === browserLang);
                
                if (isSupported) {
                    i18n.changeLanguage(browserLang);
                    setCurrentView(View.Login);
                } else {
                    setCurrentView(View.Language);
                }
            }
        };

        if (savedToken && savedUser) {
            try {
              setToken(savedToken);
              setUser(JSON.parse(savedUser));
              setCurrentView(View.Home);
            } catch(e) {
              localStorage.removeItem('healthAppUser');
              localStorage.removeItem('healthAppToken');
              determineInitialViewForGuest();
            }
        } else {
            determineInitialViewForGuest();
        }
        setIsInitialized(true);
    };
    
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is back online, processing queue...');
      processAnalysisQueue();
    };
    
    window.addEventListener('online', handleOnline);
    if(navigator.onLine) {
        handleOnline();
    }
    
    return () => {
        window.removeEventListener('online', handleOnline);
    };
  }, []);


  useEffect(() => {
    document.documentElement.classList.remove('light-mode', 'dark-mode');
    document.documentElement.classList.add(`${theme}-mode`);
    localStorage.setItem('healthAppTheme', theme);
    document.documentElement.lang = i18n.language;
  }, [theme, i18n.language]);
  
  const handleToggleTheme = useCallback(() => {
      setTheme(prevTheme => prevTheme === 'dark' ? 'light' : 'dark');
  }, []);

  const navigateTo = useCallback((view: View) => {
    const protectedViews = [View.Booking, View.History, View.Profile, View.Feedback];
    if (user?.isGuest && protectedViews.includes(view)) {
        setShowRegisterModal(true);
        return;
    }
    setCurrentView(view);
  }, [user]);

  const handleLanguageSelect = useCallback((lang: 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('healthAppLang', lang);
    if (user) {
        navigateTo(View.Home);
    } else {
        navigateTo(View.Login);
    }
  }, [i18n, user, navigateTo]);
  
  const handleAnalysisComplete = useCallback((data: TriageResultData) => {
    setResult(data);
    setSuggestedSpecialty(data.doctorSuggestion || null);
    navigateTo(View.Result);
  }, [navigateTo]);
  
  const handleViewOfflineResult = useCallback((data: TriageResultData) => {
    setResult(data);
    setSuggestedSpecialty(data.doctorSuggestion || null);
    navigateTo(View.Result);
  }, [navigateTo]);

  const handleBookingComplete = useCallback(async (details: BookingDetails): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(details)
        });
        if (!response.ok) {
            let errorData = { message: `Booking failed with status: ${response.status}. Please try again.` };
            try {
                const jsonData = await response.json();
                errorData.message = jsonData.message || errorData.message;
            } catch (e) {
                // Ignore if response body is not JSON, use the default message.
            }
            throw new Error(errorData.message);
        }
        const savedBooking = await response.json();
        setBookingDetails(savedBooking);
        navigateTo(View.Confirmation);
    } catch(e) {
        console.error("Failed to save booking to server", e);
        throw e;
    }
  }, [navigateTo, token]);
  
  const handleLoginSuccess = useCallback(({ user, token }: { user: User, token: string }) => {
      setUser(user);
      setToken(token);
      localStorage.setItem('healthAppUser', JSON.stringify(user));
      localStorage.setItem('healthAppToken', token);
      navigateTo(View.Home);
  }, [navigateTo]);

  const handleUpdateUser = useCallback((updatedUser: User, newToken?: string) => {
    setUser(updatedUser);
    localStorage.setItem('healthAppUser', JSON.stringify(updatedUser));
    
    if (newToken) {
        setToken(newToken);
        localStorage.setItem('healthAppToken', newToken);
    }
  }, []);

  const handleLogout = useCallback(() => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('healthAppUser');
      localStorage.removeItem('healthAppToken');
      localStorage.removeItem('bookingHistoryCache');
      localStorage.removeItem('analysisQueue');
      localStorage.removeItem('analysisResults');
      navigateTo(View.Login);
  }, [navigateTo]);

  const handleRegisterRedirect = () => {
    setShowRegisterModal(false);
    handleLogout();
  };

  const reset = useCallback(() => {
      setResult(null);
      setBookingDetails(null);
      setSuggestedSpecialty(null);
      navigateTo(View.Home);
  }, [navigateTo]);
  
  const renderView = () => {
    if (!isInitialized) {
        return <LoadingComponent />;
    }

    switch (currentView) {
      case View.Language:
        return <LanguageSelector onSelect={handleLanguageSelect} />;
      case View.Login:
        return <Login onLoginSuccess={handleLoginSuccess} onBack={() => navigateTo(View.Language)} />;
      case View.Home:
        return <Home onNavigate={navigateTo} onViewOfflineResult={handleViewOfflineResult} />;
      case View.Skin:
        return <SkinDetector onBack={() => navigateTo(View.Home)} onAnalysisComplete={handleAnalysisComplete} />;
      case View.Symptoms:
        return <SymptomChecker onBack={() => navigateTo(View.Home)} onAnalysisComplete={handleAnalysisComplete} />;
      case View.Result:
        return result && <TriageResult result={result} onNavigate={navigateTo} onReset={reset} />;
      case View.Booking:
        return user && <Booking user={user} onBack={() => result ? navigateTo(View.Result) : navigateTo(View.Home)} onBookingComplete={handleBookingComplete} theme={theme} suggestedSpecialty={suggestedSpecialty} />;
      case View.Confirmation:
        return <Confirmation details={bookingDetails} onDone={reset} />;
      case View.History:
        return <BookingHistory onBack={() => navigateTo(View.Home)} />;
      case View.Profile:
        return user && !user.isGuest && <Profile user={user} onBack={() => navigateTo(View.Home)} onUpdateUser={handleUpdateUser} />;
      case View.Feedback:
        return user && !user.isGuest && <Feedback onBack={() => navigateTo(View.Home)} />;
      default:
        return <LanguageSelector onSelect={handleLanguageSelect} />;
    }
  };

  const showHeader = user && currentView !== View.Language && currentView !== View.Login;

  return (
    <div className="min-h-screen font-sans bg-bg-primary text-text-primary">
      <Suspense fallback={<div className="h-[72px]"></div>}>
        {showHeader && <Header onHomeClick={reset} showHome={currentView !== View.Home} onNavigate={navigateTo} onToggleTheme={handleToggleTheme} theme={theme} onLogout={handleLogout} user={user} />}
      </Suspense>
      <main>
        <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
           <div key={currentView} className="animate-fade-scale-in">
            <Suspense fallback={<LoadingComponent />}>
              {renderView()}
            </Suspense>
          </div>
        </div>
      </main>
      {showRegisterModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="card p-6 sm:p-8 rounded-2xl max-w-md w-full text-center animate-fade-in-up">
                    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-blue-dark to-brand-blue-light shadow-lg shadow-brand-blue/30 mb-6">
                        <i className="fas fa-user-plus text-white text-4xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mb-2">{t('register_for_full_access')}</h3>
                    <p className="text-text-secondary mt-2 mb-8 max-w-sm mx-auto">{t('register_prompt_desc')}</p>
                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={handleRegisterRedirect} 
                            className="btn-primary">
                            {t('register_now')}
                        </button>
                        <button 
                            onClick={() => setShowRegisterModal(false)} 
                            className="btn-secondary">
                            {t('cancel')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default App;
