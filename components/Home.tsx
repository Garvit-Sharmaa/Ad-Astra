import React, { useState, useEffect, memo, useRef, MouseEvent } from 'react';
import { View, TriageResultData } from '../types';
import { useTranslation } from 'react-i18next';

interface HomeProps {
  onNavigate: (view: View) => void;
  onViewOfflineResult: (result: TriageResultData) => void;
}

const Home = ({ onNavigate, onViewOfflineResult }: HomeProps) => {
    const [tip, setTip] = useState('');
    const [offlineResults, setOfflineResults] = useState<TriageResultData[]>([]);
    const [queuedCount, setQueuedCount] = useState<number>(0);
    const { t } = useTranslation();

    useEffect(() => {
        const tips = t('health_tips', { returnObjects: true }) as string[];
        if (tips && Array.isArray(tips) && tips.length > 0) {
            setTip(tips[Math.floor(Math.random() * tips.length)]);
        }
    }, [t]);
    
    const checkOfflineStatus = () => {
        // Check for completed results from the queue
        const storedResults = localStorage.getItem('analysisResults');
        if (storedResults) {
            try {
                const results = JSON.parse(storedResults);
                if (Array.isArray(results)) {
                    setOfflineResults(results);
                }
            } catch (e) {
                console.error("Failed to parse offline results", e);
            }
        }
        
        // Check for items still waiting in the queue
        const storedQueue = localStorage.getItem('analysisQueue');
        if (storedQueue) {
            try {
                const queue = JSON.parse(storedQueue);
                if (Array.isArray(queue)) {
                    setQueuedCount(queue.length);
                }
            } catch (e) {
                console.error("Failed to parse analysis queue", e);
            }
        }
    };
    
    useEffect(() => {
        checkOfflineStatus();
        window.addEventListener('queueProcessed', checkOfflineStatus);
        return () => {
            window.removeEventListener('queueProcessed', checkOfflineStatus);
        };
    }, []);

    const handleViewResultClick = () => {
        if (offlineResults.length > 0) {
            const resultToView = offlineResults[0];
            const remainingResults = offlineResults.slice(1);
            setOfflineResults(remainingResults);
            localStorage.setItem('analysisResults', JSON.stringify(remainingResults));
            onViewOfflineResult(resultToView);
        }
    };


  return (
    <div className="text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-2">{t('how_can_we_help')}</h2>
      <p className="text-text-secondary mb-10">{t('select_option_prompt')}</p>

      {offlineResults.length > 0 && (
         <div className="mb-8 p-5 card text-left flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-success/10 text-brand-success flex items-center justify-center">
                <i className="fas fa-check-circle text-xl"></i>
            </div>
            <div>
                <h3 className="font-bold text-text-primary mb-1 text-lg">{t('offline_analysis_complete')}</h3>
                <p className="text-text-secondary mb-4">{t('offline_analysis_desc')}</p>
                <button
                    onClick={handleViewResultClick}
                    className="btn-primary">
                    {t('view_result')} ({offlineResults.length} {t('remaining')})
                </button>
            </div>
        </div>
      )}
      
      {queuedCount > 0 && offlineResults.length === 0 && (
         <div className="mb-8 p-5 card text-left flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-warning/10 text-brand-warning flex items-center justify-center">
                <i className="fas fa-hourglass-half text-xl"></i>
            </div>
            <div>
                <h3 className="font-bold text-text-primary mb-1 text-lg">{t('offline_request_in_queue')}</h3>
                <p className="text-text-secondary">{t('offline_request_in_queue_desc', { count: queuedCount })}</p>
            </div>
        </div>
      )}

      {tip && (
          <div className="mb-8 p-5 card text-left flex items-start gap-4">
               <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue-light flex items-center justify-center">
                    <i className="fas fa-lightbulb text-xl"></i>
                </div>
                <div>
                    <h3 className="font-bold text-text-primary mb-1 text-lg">{t('health_tip_of_the_day')}</h3>
                    <p className="text-text-secondary">{tip}</p>
                </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <HomeButton
          icon="fa-camera-retro"
          title={t('skin_problem')}
          description={t('skin_problem_desc')}
          onClick={() => onNavigate(View.Skin)}
        />
        <HomeButton
          icon="fa-comment-medical"
          title={t('other_symptoms')}
          description={t('other_symptoms_desc')}
          onClick={() => onNavigate(View.Symptoms)}
        />
        <div className="md:col-span-2">
            <HomeButton
            icon="fa-calendar-days"
            title={t('booking_history')}
            description={t('booking_history_desc')}
            onClick={() => onNavigate(View.History)}
            />
        </div>
      </div>
    </div>
  );
};

interface HomeButtonProps {
    icon: string;
    title: string;
    description: string;
    onClick: () => void;
}

const HomeButton = memo(({ icon, title, description, onClick }: HomeButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            buttonRef.current?.style.setProperty('--x', `${x}px`);
            buttonRef.current?.style.setProperty('--y', `${y}px`);
        }
    };
    
    return (
        <button
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            onClick={onClick}
            className="glow-card card group w-full h-full text-left p-6 flex flex-col transition-all duration-300 active:scale-[0.99]"
        >
          <div className="flex-grow">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-bg-tertiary to-bg-secondary shadow-inner inline-block mb-4">
                <i className={`fas ${icon} text-brand-blue-light text-2xl transition-transform duration-300 ease-in-out group-hover:scale-110`}></i>
            </div>
            <h3 className="text-xl font-bold text-text-primary">{title}</h3>
            <p className="text-text-secondary mt-1 group-hover:text-text-primary transition-colors">{description}</p>
          </div>
          <div className="mt-6 flex justify-end">
            <i className="fas fa-arrow-right text-text-tertiary transition-all group-hover:translate-x-1 group-hover:text-brand-blue-light group-hover:scale-110"></i>
          </div>
        </button>
    );
});

export default Home;