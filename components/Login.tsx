import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { API_BASE_URL } from '../constants';

interface LoginProps {
  onLoginSuccess: (data: { user: User, token: string }) => void;
  onBack: () => void;
}

const Login = ({ onLoginSuccess, onBack }: LoginProps) => {
    const [step, setStep] = useState<'details' | 'otp'>('details');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [isResending, setIsResending] = useState(false);

    const { t } = useTranslation();
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const isSubmitting = useRef(false);
    
    useEffect(() => {
        let interval: number | undefined;
        if (step === 'otp' && resendTimer > 0) {
            interval = window.setInterval(() => {
                setResendTimer(prev => prev - 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step, resendTimer]);

    const apiPost = async (endpoint: string, body: object, defaultError: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                let errorMessage = defaultError;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (jsonError) {
                    errorMessage = `Server error (${response.status}). Please check if the backend is running correctly.`;
                }
                throw new Error(errorMessage);
            }
            return await response.json();

        } catch (err) {
            if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
                throw new Error('Network Error: Could not connect to the server. Please ensure the backend is running.');
            }
            throw err; // Re-throw other errors (like the one from !response.ok)
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting.current) return;
        setError(null);

        if (!name.trim()) {
            setError(t('error_invalid_name'));
            return;
        }
        if (!/^\d{10}$/.test(phone)) {
            setError(t('error_invalid_phone'));
            return;
        }
        
        isSubmitting.current = true;
        setIsLoading(true);
        try {
            const data = await apiPost('/api/auth/send-otp', { name, phone }, 'Failed to send OTP');
            if (data.otp) {
                console.log(`%c[DEV ONLY] OTP for ${phone} is: ${data.otp}`, 'background: #3b82f6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
            }
            setStep('otp');
            setResendTimer(30);
        } catch (err: any) {
            setError(err.message || t('error_server_connect'));
        } finally {
            setIsLoading(false);
            isSubmitting.current = false;
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0 || isResending) return;
        setIsResending(true);
        setError(null);
        try {
            const data = await apiPost('/api/auth/send-otp', { name, phone }, 'Failed to resend OTP');
            if (data.otp) {
                console.log(`%c[DEV ONLY] OTP for ${phone} is: ${data.otp}`, 'background: #3b82f6; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
            }
            setResendTimer(30); // Restart timer
        } catch (err: any) {
            setError(err.message || 'Failed to resend OTP');
        } finally {
            setIsResending(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting.current) return;
        setError(null);
        
        const finalOtp = otp.join('');
        if (finalOtp.length !== 6) {
            setError(t('error_incomplete_otp'));
            return;
        }
        
        isSubmitting.current = true;
        setIsLoading(true);
        try {
            const data = await apiPost(
                '/api/auth/verify-otp',
                { name, phone, otp: finalOtp },
                'OTP verification failed'
            );
            onLoginSuccess(data);
        } catch (err: any) {
             setError(err.message || t('error_server_connect'));
        } finally {
            setIsLoading(false);
            isSubmitting.current = false;
        }
    };
    
    const handleGuestLogin = async () => {
        if (isSubmitting.current) return;
        setError(null);
        isSubmitting.current = true;
        setIsLoading(true);
        try {
            const data = await apiPost(
                '/api/auth/guest',
                {},
                'Failed to start guest session'
            );
            onLoginSuccess(data);
        } catch (err: any) {
            setError(err.message || t('error_server_connect'));
        } finally {
            setIsLoading(false);
            isSubmitting.current = false;
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5) {
            otpInputsRef.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpInputsRef.current[index - 1]?.focus();
        }
    };
    
    const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedData = e.clipboardData.getData('text');
        if (pastedData && /^\d{6}$/.test(pastedData)) {
            e.preventDefault();
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            otpInputsRef.current[5]?.focus();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-sm card p-6 sm:p-8">
                {step === 'details' ? (
                    <div className="animate-fade-scale-in">
                        <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{t('login_title')}</h2>
                        <p className="text-text-secondary mb-8 text-center">{t('login_desc')}</p>
                        <form onSubmit={handleSendOtp} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">{t('login_name_label')}</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="input-base"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">{t('login_phone_label')}</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    maxLength={10}
                                    className="input-base"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-400 text-center text-sm">{error}</p>}
                            <div className="pt-2 flex flex-col space-y-3">
                                <button type="submit" className="btn-primary" disabled={isLoading}>
                                    {isLoading ? <LoadingSpinner /> : t('login_send_otp')}
                                </button>
                                <button type="button" onClick={onBack} className="btn-secondary">{t('back')}</button>
                            </div>
                        </form>
                         <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-border-primary"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-bg-secondary px-3 text-sm text-text-secondary">OR</span>
                            </div>
                        </div>
                        <button type="button" onClick={handleGuestLogin} className="w-full text-brand-blue-light font-bold py-3 px-4 rounded-xl hover:bg-bg-tertiary transition-colors disabled:opacity-50 flex items-center justify-center" disabled={isLoading}>
                           {t('continue_as_guest')}
                        </button>
                    </div>
                ) : (
                    <div className="animate-fade-scale-in">
                        <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{t('login_otp_title')}</h2>
                        <p className="text-text-secondary mb-6 text-center">{t('login_otp_desc')}</p>
                        <form onSubmit={handleVerifyOtp} className="space-y-6">
                            <div className="flex justify-center gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={el => { otpInputsRef.current[index] = el as HTMLInputElement; }}
                                        type="text"
                                        maxLength={1}
                                        value={digit}
                                        onChange={e => handleOtpChange(index, e.target.value)}
                                        onKeyDown={e => handleOtpKeyDown(index, e)}
                                        onPaste={index === 0 ? handleOtpPaste : undefined}
                                        className="w-12 h-14 text-center text-2xl font-bold bg-bg-tertiary border-2 border-border-primary rounded-lg focus:ring-2 focus:ring-brand-blue-light focus:outline-none focus:border-brand-blue-light transition-all"
                                    />
                                ))}
                            </div>
                            <div className="text-center text-sm text-text-secondary pt-2">
                                {resendTimer > 0 ? (
                                    <p>{t('resend_otp_in', { seconds: resendTimer })}</p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleResendOtp}
                                        disabled={isResending || isLoading}
                                        className="font-semibold text-brand-blue-light hover:underline disabled:text-text-tertiary disabled:no-underline flex items-center justify-center w-full"
                                    >
                                        {isResending ? <LoadingSpinner /> : t('resend_otp')}
                                    </button>
                                )}
                            </div>
                            {error && <p className="text-red-400 text-center text-sm">{error}</p>}
                             <div className="pt-2 flex flex-col space-y-3">
                                <button type="submit" className="btn-primary" disabled={isLoading || isResending}>
                                    {isLoading ? <LoadingSpinner /> : t('login_verify_otp')}
                                </button>
                                <button type="button" onClick={() => {setError(null); setStep('details');}} className="btn-secondary">{t('back')}</button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;