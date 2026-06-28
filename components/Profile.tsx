import React, { useState } from 'react';
import { User } from '../types';
import { useTranslation } from 'react-i18next';
import { updateUserProfile } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface ProfileProps {
    user: User;
    onBack: () => void;
    onUpdateUser: (updatedUser: User, token?: string) => void;
}

const DetailItem = ({ icon, label, value }: { icon: string; label: string; value?: string }) => (
    <div className="flex items-center space-x-4 p-5 rounded-2xl bg-bg-primary border border-border-primary shadow-sm group hover:border-brand-blue-light/30 transition-colors">
        <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue-light">
            <i className={`fas ${icon} text-xl`}></i>
        </div>
        <div>
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wider mb-0.5">{label}</p>
            <p className="font-bold text-text-primary text-lg">{value || 'Not Available'}</p>
        </div>
    </div>
);

const Profile = ({ user, onBack, onUpdateUser }: ProfileProps) => {
    const { t } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editedName, setEditedName] = useState(user.name);
    const [editedPhone, setEditedPhone] = useState(user.phone);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const getInitials = (name: string) => {
        if (!name) return '?';
        const nameParts = name.trim().split(' ').filter(Boolean);
        if (nameParts.length === 0) return '?';
        if (nameParts.length > 1) {
            return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
        }
        return nameParts[0][0].toUpperCase();
    };
    
    const handleSave = async () => {
        if (!editedName.trim()) {
            setError(t('error_name_empty'));
            return;
        }
        if (!/^\d{10}$/.test(editedPhone)) {
            setError(t('error_invalid_phone_profile'));
            return;
        }
        setError('');
        setIsLoading(true);

        try {
            const result = await updateUserProfile({ name: editedName, phone: editedPhone });
            onUpdateUser(result.user, result.token);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message || t('error_server_connect'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditedName(user.name);
        setEditedPhone(user.phone);
        setIsEditing(false);
        setError('');
    };

    return (
        <div className="card rounded-[2.5rem] p-8 sm:p-10 flex flex-col items-center animate-fade-scale-in relative overflow-hidden bg-bg-secondary shadow-2xl">
            {/* Background decoration */}
            <div className="absolute top-0 w-full h-40 bg-gradient-to-br from-brand-blue-dark to-brand-blue opacity-[0.07] -z-10"></div>
            
            <div className="w-full flex items-center justify-between mb-8 z-10">
                <h2 className="text-2xl font-bold text-text-primary">{t('profile_title')}</h2>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="px-4 py-2 rounded-xl bg-brand-blue/10 text-brand-blue-light font-bold text-sm hover:bg-brand-blue-light hover:text-white transition-all flex items-center gap-2"
                    >
                        <i className="fas fa-edit"></i> {t('edit_profile')}
                    </button>
                )}
            </div>
            
            <div className="relative mb-8 z-10">
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-gradient-to-br from-brand-blue-dark to-brand-blue-light flex items-center justify-center shadow-xl shadow-brand-blue/20 border-4 border-bg-secondary transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <span className="text-5xl sm:text-6xl font-extrabold text-white drop-shadow-md">
                        {getInitials(isEditing ? editedName : user.name)}
                    </span>
                </div>
            </div>
            
            <div className="w-full max-w-md space-y-5 z-10">
                {isEditing ? (
                    <div className="animate-fade-in space-y-5">
                        <div className="space-y-2">
                             <label className="text-xs font-bold text-text-secondary uppercase ml-1">{t('profile_name')}</label>
                             <div className="relative">
                                 <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                                 <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    className="input-base pl-10"
                                    placeholder="Enter your full name"
                                />
                             </div>
                        </div>

                        <div className="space-y-2">
                             <label className="text-xs font-bold text-text-secondary uppercase ml-1">{t('profile_phone')}</label>
                             <div className="relative">
                                 <i className="fas fa-phone absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"></i>
                                 <input
                                    type="tel"
                                    value={editedPhone}
                                    onChange={(e) => setEditedPhone(e.target.value)}
                                    className="input-base pl-10"
                                    maxLength={10}
                                    placeholder="Enter mobile number"
                                />
                             </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DetailItem
                            icon="fa-user-tag"
                            label={t('profile_name')}
                            value={user.name}
                        />
                        <DetailItem
                            icon="fa-phone"
                            label={t('profile_phone')}
                            value={user.phone}
                        />
                        <div className="p-4 rounded-2xl bg-bg-tertiary/50 border border-border-primary/50 text-center">
                            <p className="text-[10px] font-bold text-text-tertiary uppercase mb-1">Account Role</p>
                            <span className="px-3 py-1 rounded-lg bg-brand-blue/10 text-brand-blue-light font-bold text-xs uppercase tracking-widest">{user.role}</span>
                        </div>
                    </div>
                )}
            </div>

            {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium flex items-center gap-3 animate-fade-in"><i className="fas fa-exclamation-circle"></i>{error}</div>}
            
            <div className="w-full max-w-md mt-10 flex flex-col gap-3 z-10">
                 {isEditing ? (
                    <>
                        <button onClick={handleSave} className="btn-primary w-full py-4 text-lg shadow-lg shadow-brand-blue/20" disabled={isLoading}>
                           {isLoading ? <LoadingSpinner /> : <><i className="fas fa-save mr-2"></i> {t('save_changes')}</>}
                        </button>
                        <button onClick={handleCancel} className="btn-secondary w-full py-4" disabled={isLoading}>
                            {t('cancel')}
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onBack}
                        className="btn-primary w-full py-4 text-lg bg-gradient-to-r from-bg-tertiary to-bg-tertiary text-text-primary hover:from-border-primary hover:to-border-primary border border-border-primary shadow-none"
                    >
                        {t('back_to_home')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default Profile;