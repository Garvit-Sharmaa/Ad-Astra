
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../constants'; // Updated Import

interface FeedbackProps {
    onBack: () => void;
}

const Feedback = ({ onBack }: FeedbackProps) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;
        
        setIsLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('healthAppToken');
            const response = await fetch(`${BACKEND_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true' 
                },
                body: JSON.stringify({ feedback })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }
            setIsSubmitted(true);
        } catch (err) {
            setError(t('error_server_connect'));
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="card rounded-[2rem] p-10 text-center animate-fade-scale-in flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 shadow-xl shadow-green-500/30 mb-6 animate-pulse-soft">
                    <i className="fas fa-check text-white text-5xl"></i>
                </div>
                <h2 className="text-3xl font-extrabold text-text-primary mb-3">{t('feedback_thanks_title')}</h2>
                <p className="text-text-secondary text-lg mb-8 max-w-xs mx-auto">{t('feedback_thanks_desc')}</p>
                <button
                    onClick={onBack}
                    className="btn-primary w-full max-w-sm py-4 text-lg"
                >
                    {t('back_to_home')}
                </button>
            </div>
        );
    }

    return (
        <div className="card rounded-[2rem] p-6 sm:p-8 animate-fade-scale-in">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-bg-tertiary rounded-2xl flex items-center justify-center mx-auto mb-4 text-brand-blue-light shadow-inner">
                    <i className="fas fa-comment-dots text-3xl"></i>
                </div>
                <h2 className="text-3xl font-bold text-text-primary mb-2">{t('feedback_title')}</h2>
                <p className="text-text-secondary">{t('feedback_desc')}</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="feedback" className="block text-sm font-bold text-text-secondary uppercase mb-2 ml-1">
                        {t('feedback_label')}
                    </label>
                    <textarea
                        id="feedback"
                        rows={6}
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        className="input-base resize-none text-lg"
                        placeholder={t('feedback_placeholder')}
                    />
                </div>
                
                {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-xl text-center text-sm font-medium"><i className="fas fa-exclamation-circle mr-2"></i>{error}</div>}

                <div className="flex flex-col space-y-3 pt-2">
                    <button 
                        type="submit" 
                        disabled={!feedback.trim() || isLoading}
                        className="btn-primary w-full py-4 text-lg shadow-lg shadow-brand-blue/20"
                    >
                        {isLoading ? t('submitting') : t('submit_feedback')}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isLoading}
                        className="btn-secondary w-full py-4"
                    >
                        {t('back_to_home')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Feedback;
