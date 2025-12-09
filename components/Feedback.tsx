import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../constants';

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
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
            <div className="card p-8 text-center animate-fade-scale-in">
                <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-success to-green-600 shadow-xl shadow-green-500/30">
                    <i className="fas fa-check text-white text-4xl"></i>
                </div>
                <h2 className="text-2xl font-bold mt-5 text-brand-success">{t('feedback_thanks_title')}</h2>
                <p className="text-text-secondary mt-2">{t('feedback_thanks_desc')}</p>
                <button
                    onClick={onBack}
                    className="btn-primary w-full mt-8"
                >
                    {t('back_to_home')}
                </button>
            </div>
        );
    }

    return (
        <div className="card p-6 animate-fade-scale-in">
            <h2 className="text-3xl font-bold text-text-primary mb-2 text-center">{t('feedback_title')}</h2>
            <p className="text-text-secondary mb-8 text-center">{t('feedback_desc')}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="feedback" className="block text-sm font-medium text-text-secondary mb-2">
                        {t('feedback_label')}
                    </label>
                    <textarea
                        id="feedback"
                        rows={6}
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        className="input-base"
                        placeholder={t('feedback_placeholder')}
                    />
                </div>
                
                {error && <p className="text-red-400 text-center">{error}</p>}

                <div className="flex flex-col space-y-3">
                    <button 
                        type="submit" 
                        disabled={!feedback.trim() || isLoading}
                        className="btn-primary"
                    >
                        {isLoading ? t('submitting') : t('submit_feedback')}
                    </button>
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isLoading}
                        className="btn-secondary"
                    >
                        {t('back_to_home')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Feedback;