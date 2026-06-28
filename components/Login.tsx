
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, UserRole } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { BACKEND_URL } from '../constants';

interface LoginProps {
  onLoginSuccess: (data: { user: User, token: string }) => void;
  onBack: () => void;
  onToggleTheme: () => void;
}

type LoginStep = 'role_select' | 'credentials' | 'otp_verify';

const Login = ({ onLoginSuccess, onBack, onToggleTheme }: LoginProps) => {
    const [step, setStep] = useState<LoginStep>('role_select');
    const [role, setRole] = useState<UserRole>('PATIENT');
    const [name, setName] = useState(''); // New state for Patient Name
    const [identifier, setIdentifier] = useState(''); // Email or Phone
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { t } = useTranslation();

    const resetState = () => {
        setStep('role_select');
        setError(null);
        setIdentifier('');
        setName('');
        setPassword('');
        setOtp('');
    };

    const handleRoleSelect = (selectedRole: UserRole) => {
        setRole(selectedRole);
        setStep('credentials');
    };

    const handleGuestLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (response.ok) {
                onLoginSuccess(data);
            } else {
                setError(data.message || "Guest login failed.");
            }
        } catch (err) {
            setError("Network error.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStaffLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login-staff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: identifier, password, role })
            });
            const data = await response.json();
            if (response.ok) {
                onLoginSuccess(data);
            } else {
                setError(data.message || "Invalid credentials. Please check your ID and Password.");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (identifier.length !== 10) {
            setError("Please enter a valid 10-digit mobile number.");
            return;
        }
        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: identifier })
            });
            
            if (response.ok) {
                setStep('otp_verify');
            } else {
                const data = await response.json();
                setError(data.message || "Failed to send OTP.");
            }
        } catch (err) {
            setError("Failed to reach server.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError("Please enter the 6-digit code.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/auth/login-patient`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: identifier, otp, name })
            });
            const data = await response.json();
            if (response.ok) {
                onLoginSuccess(data);
            } else {
                setError(data.message || "Invalid OTP code.");
            }
        } catch (err) {
            setError("Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-[85vh] justify-center items-center px-4 animate-fade-scale-in">
             <div className="w-full max-w-md pro-card p-8 sm:p-10 space-y-8">
                
                {/* Header Section */}
                <div className="text-center space-y-2">
                    <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-brand-blue/20">
                        <i className={`fas ${step === 'role_select' ? 'fa-shield-halved' : role === 'PATIENT' ? 'fa-user-circle' : role === 'DOCTOR' ? 'fa-user-md' : 'fa-hospital'} text-brand-blue text-2xl`}></i>
                    </div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-white">
                        {step === 'role_select' ? t('login_title') : 
                         step === 'otp_verify' ? 'Verify Identity' : 
                         `${role.charAt(0) + role.slice(1).toLowerCase()} Login`}
                    </h2>
                    <p className="text-text-secondary text-sm font-medium">
                        {step === 'role_select' ? "Select your access level to proceed" : 
                         step === 'otp_verify' ? `Enter the code sent to ${identifier}` :
                         role === 'PATIENT' ? "Register with your name and mobile" : "Enter your professional credentials"}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-xl flex items-center gap-2 animate-shake">
                        <i className="fas fa-circle-exclamation"></i>
                        <span>{error}</span>
                    </div>
                )}

                {/* Step 1: Role Selection */}
                {step === 'role_select' && (
                    <div className="grid grid-cols-1 gap-4">
                        <RoleButton 
                            icon="fa-user-md" 
                            title="As a Doctor" 
                            desc="Access your patient queue" 
                            color="text-emerald-400" 
                            bg="bg-emerald-500/10" 
                            onClick={() => handleRoleSelect('DOCTOR')} 
                        />
                        <RoleButton 
                            icon="fa-hospital" 
                            title="As Admin / Hospital" 
                            desc="Manage facility OPD load" 
                            color="text-indigo-400" 
                            bg="bg-indigo-500/10" 
                            onClick={() => handleRoleSelect('HOSPITAL')} 
                        />
                        <RoleButton 
                            icon="fa-user-injured" 
                            title="As a Patient" 
                            desc="Triage symptoms & book" 
                            color="text-brand-blue" 
                            bg="bg-brand-blue/10" 
                            onClick={() => handleRoleSelect('PATIENT')} 
                        />
                        
                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-[10px] uppercase font-black text-text-tertiary tracking-[0.2em]"><span className="bg-surface-dark px-4">OR</span></div>
                        </div>

                        <button 
                            onClick={handleGuestLogin}
                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-3"
                        >
                            <i className="fas fa-user-secret opacity-60"></i>
                            Continue as Guest
                        </button>
                    </div>
                )}

                {/* Step 2: Credentials */}
                {step === 'credentials' && (
                    <form onSubmit={role === 'PATIENT' ? handleRequestOTP : handleStaffLogin} className="space-y-6">
                        <div className="space-y-4">
                            {role === 'PATIENT' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input-pro w-full"
                                        placeholder="John Doe"
                                        required 
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">
                                    {role === 'PATIENT' ? "Mobile Number" : "User ID / Email"}
                                </label>
                                <input 
                                    type={role === 'PATIENT' ? "tel" : "text"}
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                    className="input-pro w-full"
                                    placeholder={role === 'PATIENT' ? "9876543210" : "name@hospital.gh"}
                                    required 
                                />
                            </div>
                            
                            {role !== 'PATIENT' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest ml-1">Password</label>
                                    <input 
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="input-pro w-full"
                                        placeholder="••••••••"
                                        required 
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <button type="submit" className="btn-primary w-full h-14 flex items-center justify-center gap-3" disabled={isLoading}>
                                {isLoading ? <LoadingSpinner /> : (
                                    <>
                                        <i className={`fas ${role === 'PATIENT' ? 'fa-paper-plane' : 'fa-sign-in-alt'}`}></i>
                                        {role === 'PATIENT' ? "Get OTP Code" : "Sign In to Portal"}
                                    </>
                                )}
                            </button>
                            <button type="button" onClick={resetState} className="btn-secondary w-full h-14">
                                {t('back')}
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: OTP Verification */}
                {step === 'otp_verify' && (
                    <form onSubmit={handleVerifyOTP} className="space-y-6 animate-fade-scale-in">
                        <div className="space-y-4">
                            <div className="flex justify-between gap-2">
                                <input 
                                    type="text" 
                                    maxLength={6}
                                    value={otp}
                                    onChange={e => setOtp(e.target.value)}
                                    className="input-pro w-full text-center text-2xl font-mono tracking-[0.5em] h-16"
                                    placeholder="000000"
                                    autoFocus
                                    required 
                                />
                            </div>
                            <p className="text-center text-xs text-text-secondary">
                                Didn't receive it? <button type="button" className="text-brand-blue font-bold hover:underline">Resend</button>
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-3 pt-2">
                            <button type="submit" className="btn-primary w-full h-14" disabled={isLoading}>
                                {isLoading ? <LoadingSpinner /> : "Verify & Start Triage"}
                            </button>
                            <button type="button" onClick={() => setStep('credentials')} className="btn-secondary w-full h-14">
                                Change Details
                            </button>
                        </div>

                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                            <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest">Login Security</p>
                            <p className="text-xs text-brand-blue-light font-medium mt-1">If this is not your verified number, use code: <span className="font-bold">123456</span></p>
                        </div>
                    </form>
                )}
             </div>
             
             <button onClick={onBack} className="mt-8 text-text-secondary hover:text-white font-bold text-sm transition-colors">
                <i className="fas fa-globe mr-2"></i> Change Language
             </button>
        </div>
    );
};

interface RoleBtnProps {
    icon: string;
    title: string;
    desc: string;
    color: string;
    bg: string;
    onClick: () => void;
}

const RoleButton = ({ icon, title, desc, color, bg, onClick }: RoleBtnProps) => (
    <button 
        onClick={onClick}
        className="group flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left active:scale-[0.98]"
    >
        <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
            <i className={`fas ${icon} text-xl`}></i>
        </div>
        <div className="flex-grow">
            <p className="font-bold text-white text-base">{title}</p>
            <p className="text-xs text-text-secondary font-medium">{desc}</p>
        </div>
        <i className="fas fa-chevron-right text-[10px] text-text-tertiary group-hover:translate-x-1 transition-transform"></i>
    </button>
);

export default Login;
