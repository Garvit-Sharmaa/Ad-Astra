
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
  
  return (
    <div className="pro-card overflow-hidden animate-fade-scale-in border-0 shadow-2xl">
      {/* Dynamic Header based on Severity */}
      <div className={`p-10 text-center relative overflow-hidden ${isSerious ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 blur-[100px] opacity-25 ${isSerious ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
         
        <div className={`relative mx-auto w-24 h-24 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl ${isSerious ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-emerald-500 text-white shadow-emerald-500/30'}`}>
          <i className={`fas ${isSerious ? 'fa-triangle-exclamation' : 'fa-clipboard-check'} text-4xl`}></i>
        </div>
        
        <div className="space-y-2 relative">
            <span className={`px-5 py-1.5 rounded-full text-[12px] font-black uppercase tracking-[0.2em] border-2 ${isSerious ? 'border-red-500/40 text-red-500 bg-red-500/5' : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/5'}`}>
                {isSerious ? 'Priority: Urgent' : 'Priority: Routine'}
            </span>
            <h2 className="text-4xl font-black tracking-tight text-text-primary mt-4">
                {isSerious ? t('doctor_recommended') : t('mild_concern')}
            </h2>
        </div>
      </div>
      
      <div className="p-8 sm:p-10 space-y-8 bg-bg-secondary">
          
          {/* DISEASE NAME: Authoritative Card Style */}
          <div className="p-8 rounded-[2rem] bg-bg-primary border-2 border-brand-blue/15 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-brand-blue/10 transition-all"></div>
              <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-lg shadow-brand-blue/5">
                      <i className="fas fa-stethoscope text-xl"></i>
                  </div>
                  <div>
                      <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.25em]">Clinical Assessment</h4>
                      <p className="text-xs font-bold text-brand-blue/80">Likely Condition Identified</p>
                  </div>
              </div>
              <p className="text-3xl font-black text-text-primary tracking-tight leading-tight">
                  {result.likelyCondition || 'Dermatological Issue'}
              </p>
          </div>

          {/* AI Clinical Breakdown */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 text-text-primary">
                <i className="fas fa-dna text-xl text-brand-blue animate-pulse"></i>
                <h3 className="font-extrabold text-xl">Detailed Clinical Analysis</h3>
            </div>
            <div className="p-7 rounded-[2rem] bg-bg-tertiary/40 border border-border-pro leading-relaxed shadow-sm">
                <p className="text-text-secondary text-[17px] font-medium whitespace-pre-wrap selection:bg-brand-blue/20">
                    {result.explanation}
                </p>
            </div>
          </div>

        {result.selfCareTips && result.selfCareTips.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
                <i className="fas fa-heart-pulse text-xl text-emerald-500"></i>
                <h3 className="font-extrabold text-xl text-text-primary">{t('self_care_tips')}</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {result.selfCareTips.map((tip, index) => (
                <div key={index} className="flex items-center gap-4 p-5 rounded-2xl bg-bg-primary border border-border-pro hover:border-emerald-500/30 transition-colors shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                        <i className="fas fa-check text-sm text-emerald-600"></i>
                    </div>
                    <span className="text-text-primary text-base font-semibold">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 flex flex-col gap-4">
            <button
                onClick={() => onNavigate(View.Booking)}
                className="btn-primary flex items-center justify-center gap-4 py-6 text-xl shadow-2xl shadow-brand-blue/20 group"
            >
                <i className="fas fa-calendar-plus group-hover:scale-125 transition-transform"></i> 
                {t('book_appointment')}
            </button>
            
            <button onClick={onReset} className="btn-secondary py-5 font-bold tracking-wide">
                {t('done')}
            </button>
        </div>
         <p className="text-[10px] text-text-tertiary text-center font-bold uppercase tracking-[0.15em] px-8 mt-8 opacity-60">
             <i className="fas fa-shield-halved mr-1.5"></i> {t('disclaimer')}
         </p>
      </div>
    </div>
  );
};

export default TriageResult;
