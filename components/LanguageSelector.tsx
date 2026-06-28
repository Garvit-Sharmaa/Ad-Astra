
import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { LANGUAGES } from '../constants';
import { useTranslation } from 'react-i18next';

type LanguageCode = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr' | 'gu' | 'kn' | 'ml';

interface LanguageSelectorProps {
  onSelect: (languageCode: LanguageCode) => void;
}

const LanguageSelector = ({ onSelect }: LanguageSelectorProps) => {
  const { t } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const primaryLanguages = LANGUAGES.filter(lang => lang.code === 'en' || lang.code === 'hi');
  const regionalLanguages = LANGUAGES.filter(lang => lang.code !== 'en' && lang.code !== 'hi');

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (isDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);
  
  const handleMouseMove = (e: MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
  };

  const handleRegionalSelect = (languageCode: LanguageCode) => {
    onSelect(languageCode);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] animate-fade-scale-in px-4">
        <div className="text-center mb-10" >
            <div className="p-5 bg-gradient-to-br from-brand-blue-dark to-brand-blue-light rounded-3xl inline-block shadow-2xl shadow-brand-blue/30 animate-pulse-soft">
                <i className="fas fa-heart-pulse text-white text-5xl"></i>
            </div>
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-blue-light to-brand-blue-dark mt-5">Ad Astra</h1>
            <p className="text-text-secondary mt-2 text-lg font-medium">{t('your_health_companion')}</p>
        </div>
      
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center text-text-primary mb-6 opacity-90">{t('choose_your_language')}</h2>

        {primaryLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code as LanguageCode)}
            className="glow-card card group w-full flex items-center p-5 relative overflow-hidden transition-all duration-300 hover:border-brand-blue-light/50 bg-bg-secondary rounded-2xl"
            onMouseMove={handleMouseMove}
          >
            <span className="text-4xl mr-5 group-hover:scale-110 transition-transform duration-300">{lang.icon}</span>
            <span className="text-lg font-bold text-text-primary">{lang.name}</span>
            <div className="ml-auto w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors duration-300">
                <i className="fas fa-chevron-right text-sm"></i>
            </div>
          </button>
        ))}

        {regionalLanguages.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseMove={handleMouseMove}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              className={`glow-card card group w-full flex items-center justify-between p-5 transition-all duration-300 bg-bg-secondary rounded-2xl ${isDropdownOpen ? 'border-brand-blue-light' : ''}`}
            >
              <div className="flex items-center">
                 <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center mr-5 text-text-secondary group-hover:text-brand-blue-light transition-colors">
                    <i className="fas fa-globe-asia text-xl"></i>
                 </div>
                 <span className="text-lg font-bold text-text-primary">Regional Languages</span>
              </div>
              <i className={`fas fa-chevron-down text-text-tertiary transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-brand-blue-light' : ''}`}></i>
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-3 card p-2 shadow-2xl z-50 animate-fade-in-up origin-top bg-bg-secondary border border-border-primary rounded-2xl max-h-72 overflow-y-auto custom-scrollbar">
                <ul className="space-y-1">
                  {regionalLanguages.map(lang => (
                    <li key={lang.code}>
                      <button
                        onClick={() => handleRegionalSelect(lang.code as LanguageCode)}
                        className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-bg-tertiary transition-colors text-text-primary group"
                      >
                        <span className="text-2xl">{lang.icon}</span>
                        <span className="font-medium group-hover:text-brand-blue-light transition-colors">{lang.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LanguageSelector;
