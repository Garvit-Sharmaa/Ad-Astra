import React from 'react';
import { TriageResultData, View } from '../types';
import { useTranslation } from 'react-i18next';

interface TriageResultProps {
  result: TriageResultData;
  onNavigate: (view: View) => void;
  onReset: () => void;
}

const TriageResult = ({ result, onNavigate, onReset }: TriageResultProps) => {
  const { t } = useTranslation();
  const isSerious = result.conclusion === 'SERIOUS';
  
  const themeClasses = {
      serious: {
          iconBg: 'bg-brand-warning/10',
          iconText: 'text-brand-warning',
          titleText: 'text-brand-warning',
          buttonClass: 'btn-warning w-full'
      },
      mild: {
          iconBg: 'bg-brand-success/10',
          iconText: 'text-brand-success',
          titleText: 'text-brand-success',
          buttonClass: 'btn-primary w-full'
      }
  };

  const currentTheme = isSerious ? themeClasses.serious : themeClasses.mild;

  return (
    <div className="p-6 card animate-fade-scale-in">
      <div className="text-center">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${currentTheme.iconBg} animate-pulse-soft`}>
          <i className={`fas ${isSerious ? 'fa-exclamation-triangle' : 'fa-check-circle'} ${currentTheme.iconText} text-5xl`}></i>
        </div>
        <h2 className={`text-3xl font-extrabold mt-5 ${currentTheme.titleText}`}>
          {isSerious ? t('doctor_recommended') : t('mild_concern')}
        </h2>
      </div>
      
      <div className="mt-6 p-5 bg-bg-primary rounded-xl border border-border-primary">
         <h3 className="font-bold text-text-primary mb-3 text-lg flex items-center">
            <i className="fas fa-comment-medical mr-3 text-brand-blue-light"></i>AI Analysis
        </h3>
        <p className="text-text-secondary">{result.explanation}</p>
      </div>

      <div className="mt-4 space-y-4">
        {result.selfCareTips && result.selfCareTips.length > 0 && (
          <div className="p-5 bg-bg-primary rounded-xl border border-border-primary">
            <h3 className="font-bold text-text-primary mb-4 text-lg flex items-center">
                <i className="fas fa-notes-medical mr-3 text-brand-blue-light"></i>{t('self_care_tips')}
            </h3>
            <ul className="space-y-3">
              {result.selfCareTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-3 text-text-secondary">
                    <i className="fas fa-check-circle text-brand-success mt-1"></i>
                    <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {result.doctorSuggestion && (
          <div className="p-5 bg-bg-primary rounded-xl border border-border-primary">
            <h3 className="font-bold text-text-primary mb-2 text-lg flex items-center">
                <i className="fas fa-user-doctor mr-3 text-brand-blue-light"></i>{t('suggested_doctor')}
            </h3>
            <p className="text-text-secondary pl-8">{result.doctorSuggestion}</p>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col space-y-3">
        {isSerious ? (
            <>
                <button
                    onClick={() => onNavigate(View.Booking)}
                    className={currentTheme.buttonClass}
                >
                    <i className="fas fa-calendar-check mr-2"></i>{t('book_appointment')}
                </button>
                <button
                    onClick={onReset}
                    className="btn-secondary w-full"
                >
                    {t('done')}
                </button>
            </>
        ) : (
            <>
                <button
                    onClick={onReset}
                    className="btn-primary w-full"
                >
                    {t('done')}
                </button>
                <button
                    onClick={() => onNavigate(View.Booking)}
                    className="btn-secondary w-full"
                >
                    <i className="fas fa-calendar-check mr-2"></i>{t('book_appointment')}
                </button>
            </>
        )}
      </div>
       <p className="text-xs text-text-tertiary mt-6 text-center">{t('disclaimer')}</p>
    </div>
  );
};

export default TriageResult;