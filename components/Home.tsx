
import { useState, useEffect, memo } from 'react';
import { View, User } from '../types';
import { useTranslation } from 'react-i18next';

interface HomeProps {
  onNavigate: (view: View) => void;
  onViewOfflineResult: () => void;
}

const Home = ({ onNavigate, onViewOfflineResult }: HomeProps) => {
    const [tip, setTip] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const { t } = useTranslation();

    useEffect(() => {
        const savedUser = localStorage.getItem('healthAppUser');
        if (savedUser) setUser(JSON.parse(savedUser));
        
        const tips = t('health_tips', { returnObjects: true }) as string[];
        if (tips && Array.isArray(tips) && tips.length > 0) {
            setTip(tips[Math.floor(Math.random() * tips.length)]);
        }
    }, [t]);

    const isPatient = user?.role === 'PATIENT';
    const isDoctor = user?.role === 'DOCTOR';

    return (
        <div className="flex flex-col gap-8">
            <div className="text-center mb-2">
                <h2 className="text-4xl font-extrabold text-text-primary mb-4 tracking-tight leading-tight">
                    {isPatient ? t('how_can_we_help') : 
                     isDoctor ? `Welcome, ${user?.name}` : `Facility Management`}
                </h2>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/5 border border-brand-blue/10 text-brand-blue-light text-sm font-bold uppercase tracking-wider">
                    <i className={`fas ${isPatient ? 'fa-user' : isDoctor ? 'fa-user-md' : 'fa-hospital'}`}></i>
                    {user?.role} Portal
                </div>
                <p className="text-text-secondary text-lg mt-5 max-w-md mx-auto">
                    {isPatient ? t('select_option_prompt') : 
                     isDoctor ? `Review your queue and AI-triaged patient summaries.` : `Monitor traffic, department loads, and facility efficiency.`}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {isPatient ? (
                    <>
                        <HomeButton
                            icon="fa-camera"
                            iconBg="bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/30"
                            title={t('skin_problem')}
                            description={t('skin_problem_desc')}
                            onClick={() => onNavigate(View.Skin)}
                        />
                        <HomeButton
                            icon="fa-comment-medical"
                            iconBg="bg-gradient-to-br from-blue-500 to-cyan-500 shadow-cyan-500/30"
                            title={t('other_symptoms')}
                            description={t('other_symptoms_desc')}
                            onClick={() => onNavigate(View.Symptoms)}
                        />
                    </>
                ) : (
                    <div className="md:col-span-2">
                        <button 
                            onClick={() => onNavigate(View.Dashboard)}
                            className="w-full card p-10 bg-gradient-to-br from-brand-blue-dark/10 to-transparent border-brand-blue-light/30 flex flex-col items-center text-center gap-6 hover:scale-[1.01] transition-all group rounded-[3rem]"
                        >
                            <div className="w-24 h-24 rounded-[2rem] bg-brand-blue flex items-center justify-center text-white text-4xl shadow-2xl shadow-brand-blue/30 group-hover:rotate-6 transition-transform">
                                <i className={`fas ${isDoctor ? 'fa-notes-medical' : 'fa-chart-area'}`}></i>
                            </div>
                            <div>
                                <h3 className="text-3xl font-extrabold text-text-primary">Launch Pro Console</h3>
                                <p className="text-text-secondary mt-3 text-lg max-w-sm">Access real-time clinical tools and data visualization.</p>
                            </div>
                            <div className="mt-2 btn-primary px-8 py-4 rounded-2xl text-xl">
                                Enter Portal <i className="fas fa-arrow-right ml-3"></i>
                            </div>
                        </button>
                    </div>
                )}

                <div className="md:col-span-2">
                    <button 
                        onClick={() => onNavigate(View.Dashboard)}
                        className="w-full card rounded-3xl p-6 border-brand-blue-light/10 bg-gradient-to-r from-bg-secondary to-bg-secondary hover:border-brand-blue-light/30 transition-all group flex items-center gap-6"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center text-brand-blue-light text-2xl shadow-inner group-hover:scale-105 transition-transform">
                            <i className="fas fa-chart-pie"></i>
                        </div>
                        <div className="text-left flex-grow">
                            <h3 className="text-xl font-bold text-text-primary">Personal Analytics</h3>
                            <p className="text-text-secondary text-sm">View performance history and personal metrics.</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <i className="fas fa-chevron-right text-brand-blue-light"></i>
                        </div>
                    </button>
                </div>

                {tip && isPatient && (
                    <div className="md:col-span-2 relative overflow-hidden rounded-[2.5rem] p-8 animate-fade-scale-in group">
                        <div className="absolute inset-0 bg-gradient-to-br from-bg-secondary to-bg-tertiary border border-border-primary"></div>
                        <div className="relative flex items-start gap-6 z-10">
                            <div className="flex-shrink-0">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                    <i className="fas fa-lightbulb text-white text-2xl"></i>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-text-primary mb-2 text-xl">Health Byte</h3>
                                <p className="text-text-secondary text-lg leading-relaxed font-medium">{tip}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface HomeButtonProps {
    icon: string;
    iconBg: string;
    title: string;
    description: string;
    onClick: () => void;
}

const HomeButton = memo(({ icon, iconBg, title, description, onClick }: HomeButtonProps) => (
    <button onClick={onClick} className="glow-card card group w-full text-left p-7 sm:p-8 relative overflow-hidden transition-all duration-300 hover:border-brand-blue-light/30 active:scale-[0.99] flex flex-col h-full bg-bg-secondary rounded-[2.5rem]">
        <div className={`w-16 h-16 rounded-[1.25rem] ${iconBg} flex items-center justify-center shadow-lg mb-6 group-hover:scale-110 transition-transform duration-300`}>
            <i className={`fas ${icon} text-white text-3xl`}></i>
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-3 group-hover:text-brand-blue-light transition-colors">{title}</h3>
        <p className="text-text-secondary text-base leading-relaxed mb-6">{description}</p>
        <div className="mt-auto flex justify-end opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center">
                <i className="fas fa-arrow-right text-brand-blue-light text-xl"></i>
            </div>
        </div>
    </button>
));

export default Home;
