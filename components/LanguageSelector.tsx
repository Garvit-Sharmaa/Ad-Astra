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
  const buttonRef = useRef<HTMLDivElement>(null);

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
  
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
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
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-scale-in">
        <div className="text-center mb-12" >
            <div className="p-5 bg-gradient-to-br from-brand-blue-dark to-brand-blue-light rounded-full inline-block shadow-2xl shadow-brand-blue/30">
                <i className="fas fa-heart-pulse text-white text-5xl"></i>
            </div>
            <h1 className="text-4xl font-extrabold text-brand-blue-light mt-5">{t('health_assistant')}</h1>
            <p className="text-text-secondary mt-2 text-lg">{t('your_health_companion')}</p>
        </div>
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-text-primary mb-2">{t('choose_your_language')}</h2>
        <p className="text-text-secondary text-center mb-8">{t('select_your_language_prompt')}</p>
      </div>
      
      <div className="w-full max-w-md space-y-4">
        {primaryLanguages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code as LanguageCode)}
            className="group w-full flex items-center p-5 card glow-card"
            onMouseMove={(e) => handleMouseMove(e as any)}
          >
            <span className="text-5xl mr-5 transition-transform group-hover:scale-110">{lang.icon}</span>
            <span className="text-xl font-semibold text-text-primary">{lang.name}</span>
            <i className="fas fa-arrow-right text-text-tertiary ml-auto transition-all group-hover:translate-x-1 group-hover:text-brand-blue-light"></i>
          </button>
        ))}

        {regionalLanguages.length > 0 && (
          <div className="relative" ref={dropdownRef} onMouseMove={handleMouseMove}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
              className="group w-full flex items-center justify-between p-5 card glow-card"
            >
              <div className="flex items-center">
                 <i className="fas fa-globe-asia text-4xl text-text-secondary mr-5 transition-colors group-hover:text-brand-blue-light"></i>
                 <span className="text-xl font-semibold text-text-primary">Regional Languages</span>
              </div>
              <i className={`fas fa-chevron-down text-text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}></i>
            </button>
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 card w-full p-2 shadow-2xl z-50 animate-fade-in-up origin-top">
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {regionalLanguages.map(lang => (
                    <li key={lang.code}>
                      <button
                        onClick={() => handleRegionalSelect(lang.code as LanguageCode)}
                        className="w-full text-left flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-bg-tertiary transition-colors text-text-primary"
                      >
                        <span className="text-3xl">{lang.icon}</span>
                        <span className="font-medium">{lang.name}</span>
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