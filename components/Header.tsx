import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { View, User } from '../types';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onHomeClick: () => void;
  showHome: boolean;
  onNavigate: (view: View) => void;
  onToggleTheme: () => void;
  theme: 'dark' | 'light';
  onLogout: () => void;
  user: User | null;
}

const Header = ({ onHomeClick, showHome, onNavigate, onToggleTheme, theme, onLogout, user }: HeaderProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isMenuOpen]);

    const handleMenuNavigate = useCallback((view: View) => {
        onNavigate(view);
        setIsMenuOpen(false);
    }, [onNavigate]);
    
    const handleLogout = useCallback(() => {
        onLogout();
        setIsMenuOpen(false);
    }, [onLogout]);

    const themeToggleText = theme === 'dark' 
        ? t('switch_to_light_mode')
        : t('switch_to_dark_mode');

  return (
    <header className="sticky top-0 z-40 bg-bg-secondary/80 backdrop-blur-lg border-b border-border-primary">
      <div className="container mx-auto max-w-2xl flex justify-between items-center p-3 h-[72px]">
          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-3 bg-gradient-to-br from-brand-blue-dark to-brand-blue-light rounded-full shadow-lg shadow-brand-blue/20">
                    <i className="fas fa-heart-pulse text-white text-xl"></i>
                </div>
                <h1 className="text-xl font-bold text-brand-blue-light">Ad Astra</h1>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {showHome && (
                <button onClick={onHomeClick} className="w-12 h-12 rounded-full hover:bg-bg-tertiary transition-colors flex items-center justify-center" aria-label={t('go_to_home')}>
                <i className="fas fa-home text-xl text-text-secondary"></i>
                </button>
            )}
            <button 
              onClick={onToggleTheme} 
              className="w-12 h-12 rounded-full hover:bg-bg-tertiary transition-colors flex items-center justify-center text-text-secondary" 
              aria-label={themeToggleText}
            >
                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-xl`}></i>
            </button>
            <div ref={menuRef} className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)} 
                  className="w-12 h-12 rounded-full hover:bg-bg-tertiary transition-colors flex items-center justify-center text-text-secondary" 
                  aria-label="Open settings menu" 
                  aria-expanded={isMenuOpen}
                >
                    <i className={`fas fa-cog text-xl transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`}></i>
                </button>
                {isMenuOpen && (
                    <div className="absolute top-16 right-0 card w-64 p-2 shadow-2xl z-50 animate-fade-in-up origin-top-right">
                        <ul className="space-y-1">
                            <li>
                                <button onClick={() => handleMenuNavigate(View.Language)} className="w-full text-left flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-primary">
                                    <i className="fas fa-language w-5 text-center text-text-secondary"></i>
                                    <span>{t('change_language')}</span>
                                </button>
                            </li>
                            {user?.isGuest ? (
                                <li>
                                    <button onClick={handleLogout} className="w-full text-left flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-brand-blue/10 transition-colors text-brand-blue-light">
                                        <i className="fas fa-user-plus w-5 text-center"></i>
                                        <span>{t('register_login')}</span>
                                    </button>
                                </li>
                            ) : (
                                <>
                                    <li>
                                        <button onClick={() => handleMenuNavigate(View.Profile)} className="w-full text-left flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-primary">
                                            <i className="fas fa-user-circle w-5 text-center text-text-secondary"></i>
                                            <span>{t('user_profile')}</span>
                                        </button>
                                    </li>
                                    <li>
                                        <button onClick={() => handleMenuNavigate(View.Feedback)} className="w-full text-left flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-bg-tertiary transition-colors text-text-primary">
                                            <i className="fas fa-comment-alt w-5 text-center text-text-secondary"></i>
                                            <span>{t('feedback')}</span>
                                        </button>
                                    </li>
                                     <li className="border-t border-border-primary my-1 !-mx-2"></li>
                                     <li>
                                        <button onClick={handleLogout} className="w-full text-left flex items-center gap-4 px-4 py-2.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 dark:text-red-400">
                                            <i className="fas fa-sign-out-alt w-5 text-center"></i>
                                            <span>{t('logout')}</span>
                                        </button>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                )}
            </div>
          </div>
      </div>
    </header>
  );
};

export default memo(Header);