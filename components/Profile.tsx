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
    <div className="flex items-center space-x-4 p-4 rounded-xl bg-bg-tertiary">
        <i className={`fas ${icon} text-brand-blue-light text-xl w-6 text-center`} aria-hidden="true"></i>
        <div>
            <p className="text-sm text-text-secondary">{label}</p>
            <p className="font-semibold text-text-primary text-lg">{value || 'Not Available'}</p>
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
            const { user: updatedUser, token: newToken } = await updateUserProfile({ name: editedName, phone: editedPhone });
            onUpdateUser(updatedUser, newToken);
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
        <div className="card p-6 flex flex-col items-center animate-fade-scale-in">
            <h2 className="text-3xl font-bold text-text-primary mb-4 text-center">{t('profile_title')}</h2>
            
            <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-blue-dark to-brand-blue-light flex items-center justify-center shadow-lg shadow-brand-blue/30">
                    <span className="text-5xl font-bold text-white">{getInitials(isEditing ? editedName : user.name)}</span>
                </div>
            </div>
            
            <div className="w-full max-w-sm text-center">
                {isEditing ? (
                    <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="text-2xl font-bold text-text-primary bg-transparent text-center focus:outline-none w-full mb-2 border-b-2 border-border-primary focus:border-brand-blue transition-colors"
                        aria-label="Edit user name"
                    />
                ) : (
                     <p className="text-2xl font-bold text-text-primary">{user.name}</p>
                )}
                <p className="text-text-secondary mb-8">{t('profile_desc')}</p>
            </div>
            
            <div className="space-y-4 w-full max-w-sm">
                {isEditing ? (
                    <div>
                         <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">{t('profile_phone')}</label>
                         <input
                            id="phone"
                            type="tel"
                            value={editedPhone}
                            onChange={(e) => setEditedPhone(e.target.value)}
                            className="input-base"
                            maxLength={10}
                            aria-label="Edit phone number"
                        />
                    </div>
                ) : (
                    <DetailItem
                        icon="fa-phone"
                        label={t('profile_phone')}
                        value={user.phone}
                    />
                )}
            </div>

            {error && <p className="text-red-400 mt-4 text-center animate-fade-in">{error}</p>}
            
            <div className="w-full max-w-sm mt-8 space-y-3">
                 {isEditing ? (
                    <>
                        <button onClick={handleSave} className="btn-primary w-full" disabled={isLoading}>
                           {isLoading ? <LoadingSpinner /> : <><i className="fas fa-save mr-2"></i> {t('save_changes')}</>}
                        </button>
                        <button onClick={handleCancel} className="btn-secondary w-full" disabled={isLoading}>
                            {t('cancel')}
                        </button>
                    </>
                ) : (
                    <>
                         <button onClick={() => setIsEditing(true)} className="btn-primary w-full">
                           <i className="fas fa-edit mr-2"></i> {t('edit_profile')}
                        </button>
                        <button
                            onClick={onBack}
                            className="btn-secondary w-full"
                        >
                            {t('back_to_home')}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default Profile;