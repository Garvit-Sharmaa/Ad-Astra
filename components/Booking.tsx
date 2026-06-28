
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BookingDetails, User } from '../types';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import { BACKEND_URL } from '../constants'; // Updated Import

interface BookingProps {
  user: User;
  onBack: () => void;
  onBookingComplete: (details: BookingDetails) => Promise<void>;
  theme: 'dark' | 'light';
  suggestedSpecialty?: string | null;
}

interface Doctor {
    name: string;
    specialty: string;
}

interface Hospital {
    name: string;
    city: string;
    lat: number;
    lon: number;
    doctors: Doctor[];
}

const TIME_SLOTS = [
    "10:00 AM - 11:00 AM",
    "11:00 AM - 12:00 PM",
    "02:00 PM - 03:00 PM"
];

// Standard Haversine formula
const getDistance = (lat1: number, lon1: number, lat2: number, lon2:number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

type BookingStep = 'details' | 'hospital' | 'slot' | 'confirm' | 'loading';

const Booking = ({ user, onBack, onBookingComplete, theme, suggestedSpecialty }: BookingProps) => {
    const { t, i18n } = useTranslation();
    const [step, setStep] = useState<BookingStep>('details');
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [yourName, setYourName] = useState(user.name);
    const [phone, setPhone] = useState(user.phone);
    const [bookingFor, setBookingFor] = useState<'self' | 'other'>('self');
    const [patientName, setPatientName] = useState('');
    const [relationship, setRelationship] = useState('');
    const [selectedHospital, setSelectedHospital] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [displayDate, setDisplayDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState('');
    const [doctorSearchQuery, setDoctorSearchQuery] = useState('');
    const [hospitalSearchQuery, setHospitalSearchQuery] = useState('');
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [error, setError] = useState('');
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [animationClass, setAnimationClass] = useState('animate-slide-in-right');
    
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Record<string, L.Marker>>({});
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const isSubmitting = useRef(false);
    
    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/hospitals`, {
                    headers: { 'ngrok-skip-browser-warning': 'true' } 
                });
                if (!response.ok) throw new Error('Could not fetch hospitals');
                const data = await response.json();
                setHospitals(data);
            } catch (err) {
                setError(t('error_server_connect'));
            }
        };
        fetchHospitals();
    }, [t]);

    const filteredHospitals = useMemo(() => {
        if (!hospitalSearchQuery) {
            return hospitals;
        }
        const query = hospitalSearchQuery.toLowerCase().trim();
        return hospitals.filter(h =>
            h.name.toLowerCase().includes(query) ||
            h.city.toLowerCase().includes(query)
        );
    }, [hospitals, hospitalSearchQuery]);

    useEffect(() => {
        if (!selectedSpecialty) {
            setSelectedSpecialty(t('all_specialties'));
        }
    }, [t, selectedSpecialty]);

    const defaultIcon = useMemo(() => new L.Icon({ iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', shadowSize: [41, 41] }), []);
    const selectedIcon = useMemo(() => new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', shadowSize: [41, 41] }), []);

    const hospitalDetails = hospitals.find(h => h.name === selectedHospital);
    
    const availableSpecialties = useMemo(() => {
        if (!hospitalDetails) return [];
        const specialties = hospitalDetails.doctors.map(d => d.specialty);
        return [t('all_specialties'), ...Array.from(new Set(specialties)).sort()];
    }, [hospitalDetails, t]);

    useEffect(() => {
        if (step === 'slot' && suggestedSpecialty && availableSpecialties.includes(suggestedSpecialty)) {
            if (selectedSpecialty !== suggestedSpecialty) {
                setSelectedSpecialty(suggestedSpecialty);
                if (hospitalDetails) {
                    const firstDoctorInSpecialty = hospitalDetails.doctors.find(doc => doc.specialty === suggestedSpecialty);
                    if (firstDoctorInSpecialty) {
                        setSelectedDoctor(firstDoctorInSpecialty.name);
                    }
                }
            }
        }
    }, [step, suggestedSpecialty, availableSpecialties, selectedSpecialty, hospitalDetails]);


    const filteredDoctors = useMemo(() => {
        if (!hospitalDetails) return [];
        let doctors = hospitalDetails.doctors;
        if (selectedSpecialty && selectedSpecialty !== t('all_specialties')) {
            doctors = doctors.filter(doctor => doctor.specialty === selectedSpecialty);
        }
        return doctors.filter(doctor =>
            doctor.name.toLowerCase().includes(doctorSearchQuery.toLowerCase())
        );
    }, [doctorSearchQuery, hospitalDetails, selectedSpecialty, t]);

    const handleSelectHospital = useCallback((hospitalName: string) => {
        setSelectedHospital(hospitalName);
        setSelectedSpecialty(t('all_specialties')); setSelectedDoctor(''); setDoctorSearchQuery('');
        setSelectedDate(null); setSelectedTime(''); setError('');
    }, [t]);
    
    useEffect(() => {
        if (step === 'hospital' && mapContainerRef.current && !mapRef.current && hospitals.length > 0) {
            const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([20.5937, 78.9629], 5);
            L.control.zoom({ position: 'topright' }).addTo(map);
            mapRef.current = map;
            const markers: Record<string, L.Marker> = {};
            hospitals.forEach(hospital => {
                const marker = L.marker([hospital.lat, hospital.lon], { icon: defaultIcon }).addTo(map).bindPopup(`<b>${hospital.name}</b><br>${hospital.city}`);
                marker.on('click', () => handleSelectHospital(hospital.name));
                markers[hospital.name] = marker;
            });
            markersRef.current = markers;
            return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
        }
    }, [step, defaultIcon, hospitals, handleSelectHospital]);

    useEffect(() => {
        if (mapRef.current && hospitals.length > 0) {
            const map = mapRef.current;
            const filteredNames = new Set(filteredHospitals.map(h => h.name));
            Object.keys(markersRef.current).forEach(name => {
                const marker = markersRef.current[name];
                if (filteredNames.has(name)) {
                    if (!map.hasLayer(marker)) marker.addTo(map);
                } else {
                    if (map.hasLayer(marker)) map.removeLayer(marker);
                }
            });
        }
    }, [filteredHospitals, hospitals]);

    useEffect(() => {
        if (mapRef.current) {
            if (tileLayerRef.current) mapRef.current.removeLayer(tileLayerRef.current);
            const newTileLayer = L.tileLayer(
                theme === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
                { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }
            ).addTo(mapRef.current);
            tileLayerRef.current = newTileLayer;
        }
    }, [theme, step, hospitals]);

    useEffect(() => {
        if (!mapRef.current) return;
        Object.keys(markersRef.current).forEach((hospitalName) => {
            const marker = markersRef.current[hospitalName];
            marker.setIcon(defaultIcon);
        });
        if (selectedHospital && markersRef.current[selectedHospital]) {
            const marker = markersRef.current[selectedHospital];
            marker.setIcon(selectedIcon);
            mapRef.current.flyTo(marker.getLatLng(), 13, { animate: true, duration: 1 });
        }
    }, [selectedHospital, selectedIcon, defaultIcon]);
    
    const changeStep = (newStep: BookingStep, direction: 'forward' | 'backward') => {
        setAnimationClass(direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left');
        setStep(newStep);
    };

    const handleGoToHospitalStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (yourName && phone.length === 10 && /^\d+$/.test(phone)) {
            if (bookingFor === 'other' && (!patientName || !relationship)) {
                 setError(t('error_patient_details')); return;
            }
            setError(''); changeStep('hospital', 'forward');
        } else {
            setError(t('error_name_phone'));
        }
    };

    const handleGoToSlotStep = () => {
        if (selectedHospital) { setError(''); changeStep('slot', 'forward'); } 
        else { setError(t('error_select_hospital')); }
    }

    const handleGoToConfirmStep = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedDate && selectedTime) { setError(''); changeStep('confirm', 'forward'); } 
        else { setError(t('error_hospital_date_time')); }
    }

    const handleConfirmBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting.current) return;

        if (!selectedDate) {
            setError(t('error_hospital_date_time'));
            return;
        }
        setError(''); 
        isSubmitting.current = true;
        setStep('loading');

        const details: BookingDetails = {
            hospital: selectedHospital, 
            date: selectedDate.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 
            time: selectedTime,
            token: `A-${Math.floor(100 + Math.random() * 900)}`,
            patientName: bookingFor === 'self' ? yourName : patientName,
            relationship: bookingFor === 'other' ? relationship : undefined,
            doctorName: selectedDoctor || undefined,
            yourName: yourName, phone: phone,
        };
        
        try {
            await onBookingComplete(details);
        } catch(err) {
            setError(err instanceof Error ? err.message : t('error_server_connect'));
            changeStep('confirm', 'backward'); 
        } finally {
            isSubmitting.current = false;
        }
    }
    
    const findNearestHospital = (lat: number, lon: number) => {
        const closest = hospitals.reduce((prev, curr) => {
            const dist = getDistance(lat, lon, curr.lat, curr.lon);
            return (dist < prev.dist) ? { hospital: curr, dist } : prev;
        }, { hospital: null as Hospital | null, dist: Infinity });

        if (closest.hospital) {
            handleSelectHospital(closest.hospital.name);
            setLocationError(null);
        } else {
            setLocationError(t('location_no_hospital'));
        }
    };

    const handleDetectLocation = () => {
        if (!navigator.geolocation) { setLocationError(t('location_not_supported')); return; }
        setIsDetectingLocation(true); setLocationError(null);
        navigator.geolocation.getCurrentPosition(
            (position) => { findNearestHospital(position.coords.latitude, position.coords.longitude); setIsDetectingLocation(false); },
            (error) => {
                let message = t('error_generic');
                if (error.code === error.PERMISSION_DENIED) message = t('location_denied');
                setLocationError(message); setIsDetectingLocation(false);
            }, { timeout: 10000 }
        );
    };
    
    const Stepper = () => {
        const stepConfig = [
          { id: 'details', label: t('booking_step_details'), icon: 'fa-user-edit' },
          { id: 'hospital', label: t('booking_step_hospital'), icon: 'fa-hospital' },
          { id: 'slot', label: t('booking_step_slot'), icon: 'fa-calendar-check' },
          { id: 'confirm', label: t('booking_step_confirm'), icon: 'fa-check-circle' },
        ];
        const steps: BookingStep[] = stepConfig.map(s => s.id as BookingStep);
        const currentStepIndex = steps.indexOf(step);
    
        return (
            <div className="flex items-start w-full mb-8 relative">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-bg-tertiary -z-10 rounded-full"></div>
                <div className="absolute top-5 left-0 h-0.5 bg-brand-blue -z-10 rounded-full transition-all duration-500" style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}></div>
                
                {stepConfig.map((s, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    return (
                        <div key={s.id} className="flex-1 flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                                ${isActive ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/30 scale-110' : ''}
                                ${isCompleted ? 'bg-brand-blue border-brand-blue text-white' : 'bg-bg-secondary border-bg-tertiary text-text-tertiary'}
                            `}>
                                <i className={`fas ${isCompleted ? 'fa-check' : s.icon} text-sm`}></i>
                            </div>
                            <p className={`mt-2 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive || isCompleted ? 'text-brand-blue-light' : 'text-text-tertiary'}`}>
                                {s.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCalendar = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const handlePrevMonth = () => {
            setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() - 1, 1));
        };
        const handleNextMonth = () => {
            setDisplayDate(new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 1));
        };

        const month = displayDate.getMonth();
        const year = displayDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const calendarDays = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const currentDate = new Date(year, month, i);
            const isPast = currentDate < today;
            const isSelected = selectedDate && currentDate.getTime() === selectedDate.getTime();
            
            const dayClasses = `w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 font-semibold text-sm ${
                isPast ? 'text-text-tertiary cursor-not-allowed opacity-40' :
                isSelected ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30 scale-110' :
                'hover:bg-bg-tertiary text-text-primary'
            }`;
            
            calendarDays.push(
                <button type="button" key={i} onClick={() => !isPast && setSelectedDate(currentDate)} disabled={isPast} className={dayClasses}>
                    {i}
                </button>
            );
        }
        
        const dayLabels = [...Array(7)].map((_, i) => {
            const day = new Date(Date.UTC(2023, 0, i + 1));
            return day.toLocaleDateString(i18n.language, { weekday: 'short' }).charAt(0);
        });

        const isPrevMonthDisabled = displayDate.getFullYear() === today.getFullYear() && displayDate.getMonth() === today.getMonth();

        return (
            <div className="p-4 bg-bg-secondary rounded-2xl border border-border-primary shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <button type="button" onClick={handlePrevMonth} disabled={isPrevMonthDisabled} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                        <i className="fas fa-chevron-left text-sm"></i>
                    </button>
                    <h3 className="font-bold text-text-primary">{displayDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}</h3>
                    <button type="button" onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-tertiary transition-colors">
                        <i className="fas fa-chevron-right text-sm"></i>
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-text-tertiary text-xs font-bold uppercase mb-2">
                    {dayLabels.map((day, idx) => <div key={idx}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-2 place-items-center">
                    {calendarDays}
                </div>
            </div>
        );
    }
    
    const renderStep = () => {
        switch (step) {
            case 'details':
                return ( <form onSubmit={handleGoToHospitalStep} className="space-y-6">
                        <div className="p-1 bg-bg-tertiary rounded-xl flex">
                            <button type="button" onClick={() => setBookingFor('self')} className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${bookingFor === 'self' ? 'bg-bg-secondary shadow text-brand-blue-light' : 'text-text-secondary'}`}><i className="fas fa-user mr-2"></i>{t('myself')}</button>
                            <button type="button" onClick={() => setBookingFor('other')} className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all duration-300 ${bookingFor === 'other' ? 'bg-bg-secondary shadow text-brand-blue-light' : 'text-text-secondary'}`}><i className="fas fa-users mr-2"></i>{t('someone_else')}</button>
                        </div>
                        {bookingFor === 'other' && (
                            <div className="space-y-4 p-5 bg-bg-secondary rounded-2xl border border-border-primary animate-fade-in-up">
                                <div><label className="block text-sm font-bold text-text-primary mb-2 ml-1">{t('patient_name')}</label><input type="text" value={patientName} onChange={e => setPatientName(e.target.value)} className="input-base" required placeholder="Full Name" /></div>
                                <div><label className="block text-sm font-bold text-text-primary mb-2 ml-1">{t('relationship_to_patient')}</label><input type="text" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder={t('relationship_placeholder')} className="input-base" required /></div>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div><label className="block text-sm font-bold text-text-primary mb-2 ml-1">{t('your_name')}</label><input type="text" value={yourName} onChange={e => setYourName(e.target.value)} className="input-base" required /></div>
                            <div><label className="block text-sm font-bold text-text-primary mb-2 ml-1">{t('your_mobile')}</label><input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} className="input-base" required /></div>
                        </div>
                        <div className="pt-2 flex flex-col space-y-3">
                            <button type="submit" className="btn-primary w-full py-4 text-lg">{t('next')}</button>
                            <button type="button" onClick={onBack} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>);
            case 'hospital':
                return (<div className="space-y-5">
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"></i>
                            <input
                                type="text"
                                placeholder={t('search_hospital_placeholder')}
                                value={hospitalSearchQuery}
                                onChange={(e) => setHospitalSearchQuery(e.target.value)}
                                className="input-base pl-12"
                            />
                        </div>

                        <button onClick={handleDetectLocation} disabled={isDetectingLocation} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-blue/10 text-brand-blue-light font-semibold hover:bg-brand-blue/20 transition-colors border border-brand-blue/20">
                            {isDetectingLocation ? <LoadingSpinner /> : <i className="fas fa-location-arrow"></i>}{isDetectingLocation ? t('detecting') : t('use_my_location')}
                        </button>
                        {locationError && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-lg">{locationError}</p>}
                        
                        <div className="h-[450px] md:h-96 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div ref={mapContainerRef} className="h-64 md:h-full w-full rounded-2xl shadow-md z-0 bg-bg-tertiary border border-border-primary overflow-hidden md:col-span-2"></div>
                          <div className="h-full w-full overflow-y-auto bg-bg-secondary rounded-2xl border border-border-primary flex flex-col custom-scrollbar">
                            <div className="p-3 bg-bg-tertiary border-b border-border-primary sticky top-0 z-10">
                                <p className="font-bold text-text-primary text-sm uppercase tracking-wider">{t('nearby_hospitals')}</p>
                            </div>
                            <div className="p-2 space-y-2">
                                {filteredHospitals.length > 0 ? (
                                    filteredHospitals.map(h => (
                                        <button key={h.name} onClick={() => handleSelectHospital(h.name)} className={`w-full text-left p-3 rounded-xl transition-all duration-200 border ${selectedHospital === h.name ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-bg-primary border-transparent hover:bg-bg-tertiary hover:border-border-secondary'}`}>
                                            <p className={`font-bold text-sm ${selectedHospital === h.name ? 'text-white' : 'text-text-primary'}`}>{h.name.split(',')[0]}</p>
                                            <p className={`text-xs mt-1 ${selectedHospital === h.name ? 'text-white/80' : 'text-text-secondary'}`}>{h.city}</p>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <i className="fas fa-hospital-alt text-text-tertiary text-3xl mb-2"></i>
                                        <p className="text-text-secondary text-sm">{t('no_hospitals_found')}</p>
                                    </div>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 flex flex-col space-y-3">
                            <button onClick={handleGoToSlotStep} disabled={!selectedHospital} className="btn-primary w-full py-4 text-lg">{t('next')}</button>
                            <button onClick={() => changeStep('details', 'backward')} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </div>);
            case 'slot':
                return (
                    <form onSubmit={handleGoToConfirmStep} className="space-y-6">
                        {hospitalDetails && hospitalDetails.doctors.length > 0 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2 ml-1">{t('filter_by_specialty')}</label>
                                        <select
                                            value={selectedSpecialty}
                                            onChange={(e) => { setSelectedSpecialty(e.target.value); setSelectedDoctor(''); }}
                                            className="input-base"
                                        >
                                            {availableSpecialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary uppercase mb-2 ml-1">{t('search_doctor_placeholder')}</label>
                                        <input
                                            type="text"
                                            value={doctorSearchQuery}
                                            onChange={(e) => { setDoctorSearchQuery(e.target.value); setSelectedDoctor(''); }}
                                            className="input-base"
                                            placeholder="Dr. Name"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                    {filteredDoctors.length > 0 ? (
                                        filteredDoctors.map(doc => (
                                            <button
                                                type="button"
                                                key={doc.name}
                                                onClick={() => setSelectedDoctor(doc.name)}
                                                className={`flex-shrink-0 w-48 text-left p-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${selectedDoctor === doc.name ? 'bg-brand-blue border-brand-blue shadow-lg shadow-brand-blue/20' : 'bg-bg-secondary border-border-primary hover:border-brand-blue-light/50'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${selectedDoctor === doc.name ? 'bg-white/20 text-white' : 'bg-bg-tertiary text-brand-blue-light'}`}>
                                                    <i className="fas fa-user-md text-lg"></i>
                                                </div>
                                                <p className={`font-bold text-sm truncate ${selectedDoctor === doc.name ? 'text-white' : 'text-text-primary'}`}>{doc.name}</p>
                                                <p className={`text-xs truncate ${selectedDoctor === doc.name ? 'text-white/80' : 'text-text-secondary'}`}>{doc.specialty}</p>
                                                {selectedDoctor === doc.name && <i className="fas fa-check-circle absolute top-3 right-3 text-white"></i>}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-text-secondary text-sm p-2">{t('no_doctors_found')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2 ml-1">{t('select_date')}</label>
                                 {renderCalendar()}
                            </div>
                             <div>
                                 <label className="block text-xs font-bold text-text-secondary uppercase mb-2 ml-1">{t('select_time_slot')}</label>
                                <div className="space-y-3">
                                    {TIME_SLOTS.map(slot => (
                                        <button type="button" key={slot} onClick={() => setSelectedTime(slot)} className={`w-full p-4 rounded-xl border font-semibold transition-all duration-200 flex items-center justify-between ${selectedTime === slot ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20 scale-105' : 'bg-bg-secondary border-border-primary text-text-primary hover:border-brand-blue-light/50'}`}>
                                            <span>{slot}</span>
                                            {selectedTime === slot && <i className="fas fa-check-circle"></i>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col space-y-3">
                            <button type="submit" className="btn-primary w-full py-4 text-lg">{t('next')}</button>
                            <button type="button" onClick={() => changeStep('hospital', 'backward')} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>
                );
            case 'confirm':
                return (
                    <form onSubmit={handleConfirmBooking} className="space-y-6">
                        <div className="bg-bg-secondary rounded-[1.5rem] p-6 border border-border-primary shadow-lg">
                            <h3 className="text-lg font-bold text-text-primary mb-4 pb-4 border-b border-border-primary flex items-center gap-2">
                                <i className="fas fa-clipboard-list text-brand-blue-light"></i> Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-text-secondary text-sm">{t('patient_name')}</span>
                                    <span className="font-bold text-text-primary">{bookingFor === 'self' ? yourName : patientName}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-text-secondary text-sm">{t('hospital_label')}</span>
                                    <span className="font-bold text-text-primary text-right max-w-[60%]">{selectedHospital}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-text-secondary text-sm">{t('date_time_label')}</span>
                                    <span className="font-bold text-text-primary text-right">{selectedDate?.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })}, {selectedTime.split(' - ')[0]}</span>
                                </div>
                                {selectedDoctor && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-text-secondary text-sm">{t('preferred_doctor_label')}</span>
                                        <span className="font-bold text-brand-blue-light">{selectedDoctor}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                         <p className="text-text-tertiary text-center text-xs px-6">{t('otp_prompt', { phone: phone })}</p>
                        
                        <div className="flex flex-col space-y-3">
                            <button type="submit" className="btn-primary w-full py-4 text-lg shadow-lg shadow-brand-blue/30">
                                {error ? <><i className="fas fa-redo mr-2"></i>{t('retry_booking')}</> : t('confirm_booking')}
                            </button>
                            <button type="button" onClick={() => {setError(''); changeStep('slot', 'backward'); }} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>
                );
             case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full border-4 border-bg-tertiary"></div>
                            <div className="absolute inset-0 rounded-full border-4 border-t-brand-blue border-transparent animate-spin"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-text-primary mt-8 animate-pulse">{t('confirming_appointment')}</h3>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="card rounded-[2rem] p-5 sm:p-8 animate-fade-scale-in">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-6 text-center">{t('book_appointment_title')}</h2>
            {step !== 'loading' && <Stepper />}
            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-center font-medium animate-fade-in flex items-center justify-center gap-2"><i className="fas fa-exclamation-circle"></i>{error}</div>}
            <div key={step} className={animationClass}>{renderStep()}</div>
        </div>
    );
};

export default Booking;
