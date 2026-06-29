
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, BookingDetails, User } from '../types';
import { BACKEND_URL } from '../constants';
import LoadingSpinner from './LoadingSpinner';

interface DoctorLog {
    _id: string;
    name: string;
    lastLogin?: string;
    lastLogout?: string;
    isOnline: boolean;
}

interface FeedbackLog {
    _id: string;
    userPhone: string;
    feedback: string;
    createdAt: string;
}

interface DashboardProps {
    user: User;
    onBack: () => void;
    onNavigate: (view: View) => void;
}

const StatCard = ({ icon, label, value, colorClass }: { icon: string, label: string, value: string | number, colorClass: string }) => (
    <div className="bg-bg-secondary border border-border-primary rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center text-white shadow-lg`}>
            <i className={`fas ${icon} text-xl`}></i>
        </div>
        <div>
            <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest">{label}</p>
            <p className="text-xl font-black text-text-primary tracking-tight">{value}</p>
        </div>
    </div>
);

const Dashboard = ({ user, onBack, onNavigate }: DashboardProps) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [bookings, setBookings] = useState<BookingDetails[]>([]);
    const [feedbacks, setFeedbacks] = useState<FeedbackLog[]>([]);
    const [doctors, setDoctors] = useState<DoctorLog[]>([]);
    const [aiChecks, setAiChecks] = useState(0);
    const [activePatient, setActivePatient] = useState<BookingDetails | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [notesValue, setNotesValue] = useState('');
    const [hospitalTab, setHospitalTab] = useState<'operations' | 'analytics'>('operations');

    // Sync the notes textarea whenever the selected patient changes
    useEffect(() => {
        setNotesValue(activePatient?.notes || '');
    }, [activePatient?.token]);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('healthAppToken');
                const headers = { 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' };
                setAiChecks(parseInt(localStorage.getItem('totalAiChecks') || '0'));

                const bookRes = await fetch(`${BACKEND_URL}/api/bookings`, { headers });
                if (bookRes.ok) {
                    const data = await bookRes.json();
                    setBookings(data);
                }

                if (user.role === 'HOSPITAL' || user.role === 'DOCTOR') {
                    const feedRes = await fetch(`${BACKEND_URL}/api/feedback`, { headers });
                    if (feedRes.ok) setFeedbacks(await feedRes.json());

                    const docRes = await fetch(`${BACKEND_URL}/api/hospital/doctors`, { headers });
                    if (docRes.ok) setDoctors(await docRes.json());
                }
            } catch (error) {
                console.error("Dashboard sync error:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.role, user.name]);

    const handleUpdateStatus = async (token: string, status: string, notes?: string) => {
        setIsUpdatingStatus(true);
        try {
            const authToken = localStorage.getItem('healthAppToken');
            const body: Record<string, string> = { status };
            // Only include notes in the payload when explicitly provided
            if (notes !== undefined) body.notes = notes;
            const res = await fetch(`${BACKEND_URL}/api/bookings/${token}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                    'ngrok-skip-browser-warning': 'true' 
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const updated = await res.json();
                setBookings(prev => prev.map(b => b.token === token ? updated : b));
                if (activePatient?.token === token) setActivePatient(updated);
            }
        } catch (err) {
            console.error("Status update error:", err);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const activeQueue = bookings.filter(b => b.status !== 'CANCELLED' && b.status !== 'COMPLETED');
    const completedQueue = bookings.filter(b => b.status === 'COMPLETED');

    const renderPatientDashboard = () => (
        <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <StatCard icon="fa-stethoscope" label={t('dash_total_triages')} value={aiChecks} colorClass="bg-blue-600" />
                <StatCard icon="fa-calendar-check" label={t('dash_my_bookings')} value={bookings.filter(b => b.status !== 'CANCELLED').length} colorClass="bg-emerald-600" />
            </div>
            {activeQueue.length > 0 && (
                 <div className="card p-6 bg-gradient-to-br from-bg-secondary to-bg-tertiary border-brand-blue/10">
                    <h3 className="font-bold text-text-primary mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                        {t('dash_next_appointment')}
                    </h3>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-bg-primary border border-border-pro">
                        <div>
                            <p className="text-[10px] font-black text-text-tertiary uppercase mb-1">{t('dash_token_number')}</p>
                            <p className="text-3xl font-mono font-black text-brand-blue-light">{activeQueue[0].token}</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-text-primary">{activeQueue[0].hospital}</p>
                            <p className="text-xs text-text-secondary">{activeQueue[0].time} • <span className="text-brand-blue-light font-bold uppercase">{activeQueue[0].status || 'PENDING'}</span></p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderDoctorDashboard = () => (
        <div className="animate-fade-in space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="fa-user-clock" label={t('dash_awaiting')} value={activeQueue.length} colorClass="bg-brand-blue" />
                <StatCard icon="fa-check-circle" label={t('dash_served_today')} value={completedQueue.length} colorClass="bg-emerald-600" />
                <StatCard icon="fa-bolt" label={t('dash_urgent_cases')} value={activeQueue.filter(b => b.triageSummary?.includes('SERIOUS')).length} colorClass="bg-red-500" />
                <StatCard icon="fa-stethoscope" label={t('dash_in_consultation')} value={activeQueue.filter(b => b.status === 'IN_PROGRESS').length} colorClass="bg-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side: Queue */}
                <div className="lg:col-span-5 card bg-bg-secondary border-t-4 border-t-brand-blue overflow-hidden flex flex-col max-h-[650px]">
                    <div className="p-4 border-b border-border-pro flex justify-between items-center bg-bg-tertiary/20">
                        <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">{t('dash_clinical_queue')}</h3>
                        <span className="text-[10px] bg-brand-blue/20 text-brand-blue-light px-2 py-0.5 rounded-md font-bold">LIVE SYNC</span>
                    </div>
                    <div className="divide-y divide-border-pro overflow-y-auto custom-scrollbar flex-grow">
                        {activeQueue.length > 0 ? activeQueue.map(b => (
                            <button 
                                key={b.token} 
                                onClick={() => setActivePatient(b)}
                                className={`w-full p-4 transition-all flex items-center justify-between group text-left ${activePatient?.token === b.token ? 'bg-brand-blue/10 border-l-4 border-l-brand-blue' : 'hover:bg-bg-tertiary/30'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full border border-border-pro flex items-center justify-center font-mono text-xs font-bold ${activePatient?.token === b.token ? 'bg-brand-blue text-white' : 'bg-bg-primary text-brand-blue-light'}`}>
                                        {b.token}
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-primary text-sm">{b.patientName}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[9px] font-black uppercase ${b.status === 'IN_PROGRESS' ? 'text-orange-500' : 'text-text-tertiary'}`}>
                                                {b.status === 'IN_PROGRESS' ? `• ${t('dash_in_consultation')}` : b.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {b.triageSummary?.includes('SERIOUS') && (
                                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[8px] font-black rounded border border-red-500/20 uppercase">{t('dash_critical')}</span>
                                    )}
                                    <i className={`fas fa-chevron-right text-xs transition-transform ${activePatient?.token === b.token ? 'translate-x-1 text-brand-blue' : 'text-text-tertiary opacity-0 group-hover:opacity-100'}`}></i>
                                </div>
                            </button>
                        )) : (
                            <div className="p-20 text-center text-text-tertiary text-sm italic">{t('dash_no_patients')}</div>
                        )}
                    </div>
                </div>

                {/* Right Side: Workbench */}
                <div className="lg:col-span-7 card bg-bg-secondary border-t-4 border-t-emerald-500 overflow-hidden flex flex-col min-h-[500px]">
                    {activePatient ? (
                        <div className="flex flex-col h-full animate-fade-in">
                            <div className="p-6 border-b border-border-pro bg-bg-tertiary/10">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-black text-text-primary tracking-tight">{activePatient.patientName}</h3>
                                        <p className="text-xs text-text-tertiary font-bold uppercase tracking-widest mt-1">Patient ID: {activePatient.token} • Age: --</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <select 
                                            value={activePatient.status || 'PENDING'} 
                                            onChange={(e) => handleUpdateStatus(activePatient.token, e.target.value)}
                                            disabled={isUpdatingStatus}
                                            className="bg-bg-primary border border-border-pro text-xs font-bold text-text-primary rounded-lg px-3 py-2 outline-none focus:border-brand-blue transition-colors"
                                        >
                                            <option value="PENDING">{t('dash_status_awaiting')}</option>
                                            <option value="IN_PROGRESS">{t('dash_status_in_progress')}</option>
                                            <option value="COMPLETED">{t('dash_status_completed')}</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-bg-primary rounded-xl border border-border-pro">
                                        <p className="text-[10px] font-black text-text-tertiary uppercase mb-1">{t('dash_appointment')}</p>
                                        <p className="text-xs font-bold text-text-primary">{activePatient.date}</p>
                                        <p className="text-[10px] text-text-secondary">{activePatient.time}</p>
                                    </div>
                                    <div className="p-3 bg-bg-primary rounded-xl border border-border-pro">
                                        <p className="text-[10px] font-black text-text-tertiary uppercase mb-1">{t('dash_contact')}</p>
                                        <p className="text-xs font-bold text-text-primary">+91 {activePatient.phone}</p>
                                        <p className="text-[10px] text-text-secondary">{t('dash_verified_mobile')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <i className="fas fa-robot text-brand-blue-light"></i> {t('dash_ai_summary')}
                                    </h4>
                                    <div className="p-4 rounded-2xl bg-bg-primary border border-border-pro border-l-4 border-l-brand-blue text-sm leading-relaxed text-text-secondary italic">
                                        {activePatient.triageSummary || t('dash_no_ai_summary')}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                        <i className="fas fa-history text-orange-500"></i> {t('dash_patient_notes')}
                                    </h4>
                                    <textarea 
                                        placeholder={t('dash_notes_placeholder')}
                                        value={notesValue}
                                        onChange={(e) => setNotesValue(e.target.value)}
                                        onBlur={() => handleUpdateStatus(
                                            activePatient.token,
                                            activePatient.status || 'PENDING',
                                            notesValue
                                        )}
                                        className="w-full bg-bg-primary border border-border-pro rounded-2xl p-4 text-sm text-text-primary outline-none focus:border-brand-blue min-h-[150px] resize-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-border-pro bg-bg-tertiary/20 flex gap-3">
                                <button 
                                    onClick={() => handleUpdateStatus(activePatient.token, 'COMPLETED')}
                                    className="flex-grow btn-primary py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 !bg-emerald-600 border-none"
                                >
                                    <i className="fas fa-check-double"></i> {t('dash_finalize')}
                                </button>
                                <button className="w-12 h-12 rounded-xl bg-bg-primary border border-border-pro flex items-center justify-center text-text-tertiary hover:text-brand-blue transition-colors">
                                    <i className="fas fa-print"></i>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-10 opacity-40">
                            <div className="w-20 h-20 rounded-full bg-bg-tertiary flex items-center justify-center mb-4 text-3xl">
                                <i className="fas fa-stethoscope"></i>
                            </div>
                            <h3 className="font-bold text-text-primary text-lg">{t('dash_workbench_title')}</h3>
                            <p className="text-sm max-w-xs mt-1">{t('dash_workbench_desc')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderHospitalDashboard = () => {
        // ── Analytics computations (pure derived data, no extra fetch) ──
        const activeQueue = bookings.filter(b => b.status === 'PENDING' || b.status === 'IN_PROGRESS');
        const totalBookings = bookings.length;
        const statusCounts = {
            PENDING:     bookings.filter(b => (b.status || 'PENDING') === 'PENDING').length,
            IN_PROGRESS: bookings.filter(b => b.status === 'IN_PROGRESS').length,
            COMPLETED:   bookings.filter(b => b.status === 'COMPLETED').length,
            CANCELLED:   bookings.filter(b => b.status === 'CANCELLED').length,
        };
        const seriousCount = bookings.filter(b => b.triageSummary?.includes('SERIOUS')).length;
        const mildCount    = bookings.filter(b => b.triageSummary && !b.triageSummary.includes('SERIOUS')).length;
        const triageTotal  = seriousCount + mildCount || 1;
        const doctorLoad   = doctors.map(d => ({
            name: d.name.replace('Dr. ', ''),
            count: bookings.filter(b => b.doctorName === d.name).length,
        })).sort((a, b) => b.count - a.count);
        const maxLoad = Math.max(...doctorLoad.map(d => d.count), 1);

        const BarSegment = ({ pct, color, label, count }: { pct: number; color: string; label: string; count: number }) => (
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-text-tertiary uppercase">
                    <span>{label}</span><span>{count}</span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${color}`}
                        style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                </div>
            </div>
        );

        return (
        <div className="animate-fade-in space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="fa-user-md" label={t('dash_on_duty')} value={doctors.filter(d => d.isOnline).length} colorClass="bg-emerald-600" />
                <StatCard icon="fa-users" label={t('dash_live_load')} value={activeQueue.length} colorClass="bg-brand-blue" />
                <StatCard icon="fa-heart" label={t('dash_feedback_count')} value={feedbacks.length} colorClass="bg-pink-500" />
                <StatCard icon="fa-clock" label={t('dash_efficiency')} value="98%" colorClass="bg-indigo-600" />
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 bg-bg-tertiary/30 rounded-xl border border-border-pro w-fit">
                {(['operations', 'analytics'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setHospitalTab(tab)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                            hospitalTab === tab
                                ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                                : 'text-text-tertiary hover:text-text-primary'
                        }`}
                    >
                        {tab === 'operations' ? '⚡ Operations' : '📊 Analytics'}
                    </button>
                ))}
            </div>

            {hospitalTab === 'operations' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Staff Control Panel */}
                <div className="card bg-bg-secondary border-t-4 border-t-emerald-500">
                    <div className="p-4 border-b border-border-pro bg-bg-tertiary/20">
                         <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">{t('dash_staff_roster')}</h3>
                    </div>
                    <div className="divide-y divide-border-pro max-h-[400px] overflow-y-auto custom-scrollbar">
                        {doctors.map(doc => (
                            <div key={doc._id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-text-tertiary/10 text-text-tertiary'}`}>
                                        <i className="fas fa-doctor text-sm"></i>
                                    </div>
                                    <div>
                                        <p className="font-bold text-text-primary text-xs">{doc.name}</p>
                                        <p className="text-[9px] text-text-tertiary uppercase">{doc.isOnline ? t('dash_status_in_progress').split(' ')[0] : 'Offline'}</p>
                                    </div>
                                </div>
                                <span className={`w-2 h-2 rounded-full ${doc.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-text-tertiary'}`}></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Facility Queue Flow */}
                <div className="card bg-bg-secondary border-t-4 border-t-brand-blue lg:col-span-2">
                    <div className="p-4 border-b border-border-pro bg-bg-tertiary/20 flex justify-between items-center">
                         <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">{t('dash_facility_queue')}</h3>
                         <button className="text-[10px] font-bold text-brand-blue-light hover:underline">EXPORT LOGS</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-bg-tertiary/30 text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">{t('dash_col_token')}</th>
                                    <th className="px-4 py-3">{t('dash_col_patient')}</th>
                                    <th className="px-4 py-3">{t('dash_col_provider')}</th>
                                    <th className="px-4 py-3">{t('dash_col_status')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-pro">
                                {bookings.filter(b => b.status !== 'CANCELLED').map(b => (
                                    <tr key={b.token} className="hover:bg-bg-tertiary/20 transition-colors">
                                        <td className="px-4 py-3 font-mono text-xs text-brand-blue-light">{b.token}</td>
                                        <td className="px-4 py-3 text-xs font-bold text-text-primary">{b.patientName}</td>
                                        <td className="px-4 py-3 text-xs text-text-secondary">{b.doctorName || t('dash_general_triage')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                                b.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' :
                                                b.status === 'IN_PROGRESS' ? 'bg-orange-500/10 text-orange-500' :
                                                'bg-text-tertiary/10 text-text-tertiary'
                                            }`}>
                                                {b.status || 'PENDING'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {bookings.length === 0 && <div className="p-10 text-center text-xs text-text-tertiary italic">{t('dash_no_facility_load')}</div>}
                    </div>
                </div>

                {/* Patient Voice Stream */}
                <div className="card bg-bg-secondary border-t-4 border-t-pink-500 lg:col-span-3">
                    <div className="p-4 border-b border-border-pro bg-bg-tertiary/20">
                         <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">{t('dash_experience_stream')}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {feedbacks.map(f => (
                            <div key={f._id} className="p-3 rounded-xl bg-bg-primary border border-border-pro relative">
                                <p className="text-[11px] text-text-secondary italic">"{f.feedback}"</p>
                                <div className="flex justify-between mt-2 pt-2 border-t border-border-pro/50">
                                    <span className="text-[9px] font-black text-brand-blue-light uppercase">PATIENT_ID: {f.userPhone.slice(-4)}</span>
                                    <span className="text-[9px] text-text-tertiary">{new Date(f.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            ) : (
            // ── ANALYTICS TAB ────────────────────────────────────────────────────────
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Appointment Status Breakdown */}
                <div className="card bg-bg-secondary p-6 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-xs uppercase tracking-widest text-text-primary">Appointment Status</h3>
                        <span className="text-[10px] bg-bg-tertiary px-2 py-1 rounded-md font-bold text-text-tertiary">{totalBookings} TOTAL</span>
                    </div>
                    <BarSegment pct={(statusCounts.PENDING / totalBookings) * 100}     color="bg-brand-blue"    label="Pending"     count={statusCounts.PENDING} />
                    <BarSegment pct={(statusCounts.IN_PROGRESS / totalBookings) * 100} color="bg-orange-500"  label="In Progress" count={statusCounts.IN_PROGRESS} />
                    <BarSegment pct={(statusCounts.COMPLETED / totalBookings) * 100}   color="bg-emerald-500" label="Completed"   count={statusCounts.COMPLETED} />
                    <BarSegment pct={(statusCounts.CANCELLED / totalBookings) * 100}   color="bg-red-400"     label="Cancelled"  count={statusCounts.CANCELLED} />
                </div>

                {/* Triage Severity Ratio */}
                <div className="card bg-bg-secondary p-6 space-y-4">
                    <h3 className="font-black text-xs uppercase tracking-widest text-text-primary mb-2">Triage Severity</h3>
                    <div className="flex items-center gap-4">
                        <div className="text-center flex-1">
                            <p className="text-4xl font-black text-red-400">{seriousCount}</p>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase mt-1">Serious / Urgent</p>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-4xl font-black text-emerald-400">{mildCount}</p>
                            <p className="text-[10px] font-bold text-text-tertiary uppercase mt-1">Mild / Routine</p>
                        </div>
                    </div>
                    <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden flex">
                        <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${(seriousCount / triageTotal) * 100}%` }} />
                        <div className="bg-emerald-400 h-full transition-all duration-700 flex-1" />
                    </div>
                    <p className="text-[10px] text-text-tertiary text-center">
                        {triageTotal} AI-triaged cases • {seriousCount > 0 ? Math.round((seriousCount / triageTotal) * 100) : 0}% flagged urgent
                    </p>
                </div>

                {/* Doctor Workload */}
                <div className="card bg-bg-secondary p-6 space-y-4 md:col-span-2">
                    <h3 className="font-black text-xs uppercase tracking-widest text-text-primary mb-2">Doctor Workload Distribution</h3>
                    {doctorLoad.length === 0 ? (
                        <p className="text-text-tertiary text-xs italic text-center py-4">No doctor assignment data yet.</p>
                    ) : (
                        doctorLoad.map(d => (
                            <div key={d.name} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-text-secondary">
                                    <span>{d.name}</span>
                                    <span className="font-mono text-brand-blue-light">{d.count} appts</span>
                                </div>
                                <div className="h-2.5 bg-bg-tertiary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-brand-blue to-cyan-500 rounded-full transition-all duration-700"
                                        style={{ width: `${(d.count / maxLoad) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Feedback Volume */}
                <div className="card bg-bg-secondary p-6 md:col-span-2">
                    <h3 className="font-black text-xs uppercase tracking-widest text-text-primary mb-4">Patient Experience Stream</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar">
                        {feedbacks.length === 0 ? (
                            <p className="text-text-tertiary text-xs italic">No feedback collected yet.</p>
                        ) : feedbacks.map(f => (
                            <div key={f._id} className="p-3 rounded-xl bg-bg-primary border border-border-pro">
                                <p className="text-[11px] text-text-secondary italic line-clamp-3">"{f.feedback}"</p>
                                <p className="text-[9px] font-black text-brand-blue-light uppercase mt-2">ID: {f.userPhone.slice(-4)} • {new Date(f.createdAt).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            )}
        </div>
    );};

    if (isLoading) return <div className="flex flex-col items-center justify-center py-32 gap-6"><LoadingSpinner /><p className="text-text-tertiary font-black text-[10px] uppercase tracking-[0.3em] animate-pulse">{t('dash_syncing')}</p></div>;

    return (
        <div className="max-w-6xl mx-auto pb-10">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className={`w-2 h-2 rounded-full ${user.role === 'PATIENT' ? 'bg-blue-500' : user.role === 'DOCTOR' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                        <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em]">
                            {user.role === 'PATIENT' ? t('dash_member_access') : t('dash_professional_portal')}
                        </p>
                    </div>
                    <h2 className="text-3xl font-black text-text-primary tracking-tight">
                        {user.role === 'PATIENT' ? t('dash_patient_portal') : user.role === 'DOCTOR' ? t('dash_clinical_console') : t('dash_facility_admin')}
                    </h2>
                    <p className="text-brand-blue-light font-bold text-xs mt-0.5">{user.hospitalName || 'National Health Sync'}</p>
                </div>
                <div className="flex gap-3">
                     <button onClick={() => onNavigate(View.Home)} className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center text-text-secondary hover:text-brand-blue transition-colors shadow-sm">
                        <i className="fas fa-home"></i>
                    </button>
                    <button onClick={onBack} className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-primary flex items-center justify-center text-text-secondary hover:text-red-500 transition-colors shadow-sm">
                        <i className="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>

            {user.role === 'PATIENT' && renderPatientDashboard()}
            {user.role === 'DOCTOR' && renderDoctorDashboard()}
            {user.role === 'HOSPITAL' && renderHospitalDashboard()}
        </div>
    );
};

export default Dashboard;
