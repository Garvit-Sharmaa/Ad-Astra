import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BookingDetails, User } from '../types';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from './LoadingSpinner';
import { API_BASE_URL } from '../constants';

// TODO: This component has grown too large. Consider breaking it down into smaller
// hooks or components for each step (e.g., useBookingDetails, HospitalMap, SlotSelector).
// Note: Leaflet types are now imported directly.

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

// Standard Haversine formula to calculate the distance between two lat/lon points.
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
    const [animationClass, setAnimationClass] = useState('animate-fade-in');
    
    const mapRef = useRef<L.Map | null>(null);
    const markersRef = useRef<Record<string, L.Marker>>({});
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    // Use a ref to prevent double-submissions if the user clicks quickly.
    const isSubmitting = useRef(false);
    
    useEffect(() => {
        const fetchHospitals = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/hospitals`);
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

    // Effect to pre-select specialty and doctor based on triage result
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
            // Keep the user on the confirm step so they can retry easily.
            // We use 'backward' animation to imply returning to the form state from loading.
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
          { id: 'details', label: t('booking_step_details', 'Details'), icon: 'fa-user-edit' },
          { id: 'hospital', label: t('booking_step_hospital', 'Hospital'), icon: 'fa-hospital' },
          { id: 'slot', label: t('booking_step_slot', 'Slot'), icon: 'fa-calendar-check' },
          { id: 'confirm', label: t('booking_step_confirm', 'Confirm'), icon: 'fa-check-circle' },
        ];
        const steps: BookingStep[] = stepConfig.map(s => s.id as BookingStep);
        const currentStepIndex = steps.indexOf(step);
    
        return (
            <div className="flex items-start w-full mb-10">
                {stepConfig.map((s, index) => {
                    const isCompleted = index < currentStepIndex;
                    const isActive = index === currentStepIndex;
                    return (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center text-center w-24">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isActive ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/30' : ''}
                                    ${isCompleted ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' : 'bg-bg-tertiary border-border-primary text-text-secondary'}
                                `}>
                                    <i className={`fas ${isCompleted ? 'fa-check' : s.icon}`}></i>
                                </div>
                                <p className={`mt-2 text-xs font-semibold transition-colors duration-300 max-w-[80px] ${isActive || isCompleted ? 'text-text-primary' : 'text-text-tertiary'}`}>
                                    {s.label}
                                </p>
                            </div>
                            {index < stepConfig.length - 1 && (
                                 <div className={`flex-1 h-1 rounded-full mt-6 transition-colors duration-500 ${isCompleted ? 'bg-brand-blue' : 'bg-border-primary'}`}></div>
                            )}
                        </React.Fragment>
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
            
            const dayClasses = `w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 font-semibold text-base ${
                isPast ? 'text-text-tertiary cursor-not-allowed opacity-50' :
                isSelected ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30 transform scale-110' :
                'hover:bg-bg-secondary text-text-primary'
            }`;
            
            calendarDays.push(
                <button type="button" key={i} onClick={() => !isPast && setSelectedDate(currentDate)} disabled={isPast} className={dayClasses}>
                    {i}
                </button>
            );
        }
        
        const dayLabels = [...Array(7)].map((_, i) => {
            const day = new Date(Date.UTC(2023, 0, i + 1)); // Use a static date to get day labels reliably
            return day.toLocaleDateString(i18n.language, { weekday: 'short' });
        });

        const isPrevMonthDisabled = displayDate.getFullYear() === today.getFullYear() && displayDate.getMonth() === today.getMonth();

        return (
            <div className="space-y-4 p-4 bg-bg-tertiary rounded-xl border border-border-primary">
                <div className="flex justify-between items-center px-2">
                    <button type="button" onClick={handlePrevMonth} disabled={isPrevMonthDisabled} className="p-2 rounded-full hover:bg-bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <h3 className="font-bold text-lg text-text-primary">{displayDate.toLocaleString(i18n.language, { month: 'long', year: 'numeric' })}</h3>
                    <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-bg-secondary transition-colors">
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-text-secondary text-sm font-medium">
                    {dayLabels.map(day => <div key={day} className="w-10 h-10 flex items-center justify-center">{day.charAt(0)}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-y-1 place-items-center">
                    {calendarDays}
                </div>
            </div>
        );
    }
    
    const renderStep = () => {
        switch (step) {
            case 'details':
                return ( <form onSubmit={handleGoToHospitalStep} className="space-y-5">
                        <p className="text-xl font-semibold text-center text-text-primary">{t('patient_details')}</p>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">{t('appointment_for_whom')}</label>
                            <div className="flex items-center space-x-2 bg-bg-tertiary p-1 rounded-xl">
                                <button type="button" onClick={() => setBookingFor('self')} className={`w-1/2 p-2 rounded-lg text-sm font-semibold transition-all ${bookingFor === 'self' ? 'bg-bg-secondary shadow text-brand-blue-light' : 'text-text-secondary'}`}><i className="fas fa-user mr-2"></i>{t('myself')}</button>
                                <button type="button" onClick={() => setBookingFor('other')} className={`w-1/2 p-2 rounded-lg text-sm font-semibold transition-all ${bookingFor === 'other' ? 'bg-bg-secondary shadow text-brand-blue-light' : 'text-text-secondary'}`}><i className="fas fa-users mr-2"></i>{t('someone_else')}</button>
                            </div>
                        </div>
                        {bookingFor === 'other' && (
                            <div className="space-y-4 p-4 bg-bg-tertiary rounded-xl border border-border-primary animate-fade-in">
                                <div><label htmlFor="patientName" className="block text-sm font-medium text-text-secondary mb-1">{t('patient_name')}</label><input type="text" id="patientName" value={patientName} onChange={e => setPatientName(e.target.value)} className="input-base" required /></div>
                                <div><label htmlFor="relationship" className="block text-sm font-medium text-text-secondary mb-1">{t('relationship_to_patient')}</label><input type="text" id="relationship" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder={t('relationship_placeholder')} className="input-base" required /></div>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div><label htmlFor="yourName" className="block text-sm font-medium text-text-secondary mb-1">{t('your_name')}</label><input type="text" id="yourName" value={yourName} onChange={e => setYourName(e.target.value)} className="input-base" required /></div>
                            <div><label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-1">{t('your_mobile')}</label><input type="tel" id="phone" value={phone} onChange={e => setPhone(e.target.value)} maxLength={10} className="input-base" required /></div>
                        </div>
                        <div className="pt-4 flex flex-col space-y-3">
                            <button type="submit" className="btn-primary w-full">{t('next')}</button>
                            <button type="button" onClick={onBack} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>);
            case 'hospital':
                return (<div className="space-y-5">
                        <p className="text-xl font-semibold text-center text-text-primary">{t('select_hospital')}</p>
                        
                        <div className="relative">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"></i>
                            <input
                                type="text"
                                placeholder={t('search_hospital_placeholder')}
                                value={hospitalSearchQuery}
                                onChange={(e) => setHospitalSearchQuery(e.target.value)}
                                className="input-base w-full pl-12"
                                aria-label={t('search_hospital_placeholder')}
                            />
                        </div>

                        <button onClick={handleDetectLocation} disabled={isDetectingLocation} className="w-full flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-brand-blue/10 text-brand-blue-light font-semibold hover:bg-brand-blue/20 transition-colors">
                            {isDetectingLocation ? <LoadingSpinner /> : <i className="fas fa-location-arrow"></i>}{isDetectingLocation ? t('detecting') : t('use_my_location')}
                        </button>
                        {locationError && <p className="text-red-400 text-sm text-center">{locationError}</p>}
                        
                        <div className="h-[450px] md:h-96 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div ref={mapContainerRef} className="h-80 md:h-full w-full rounded-lg shadow-lg z-0 bg-bg-tertiary animate-pulse md:col-span-2"></div>
                          <div className="h-full w-full overflow-y-auto p-2 bg-bg-tertiary rounded-lg border border-border-primary">
                            <p className="font-semibold mb-2 text-text-secondary px-1">{t('nearby_hospitals')}</p>
                            <div className="space-y-2">
                                {filteredHospitals.length > 0 ? (
                                    filteredHospitals.map(h => (
                                        <button key={h.name} onClick={() => handleSelectHospital(h.name)} className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${selectedHospital === h.name ? 'bg-brand-blue/20 border-brand-blue' : 'bg-bg-secondary border-transparent hover:border-border-primary'}`}>
                                            <p className="font-semibold text-text-primary">{h.name.split(',')[0]}</p>
                                            <p className="text-sm text-text-secondary">{h.city}</p>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-center text-text-secondary p-4">{t('no_hospitals_found')}</p>
                                )}
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 flex flex-col space-y-3">
                            <button onClick={handleGoToSlotStep} disabled={!selectedHospital} className="btn-primary w-full">{t('next')}</button>
                            <button onClick={() => changeStep('details', 'backward')} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </div>);
            case 'slot':
                return (
                    <form onSubmit={handleGoToConfirmStep} className="space-y-6">
                        <p className="text-xl font-semibold text-center text-text-primary">{t('select_date_time')}</p>

                        {hospitalDetails && hospitalDetails.doctors.length > 0 && (
                            <div className="space-y-4 p-4 bg-bg-tertiary rounded-xl border border-border-primary animate-fade-in">
                                <label className="block text-sm font-medium text-text-secondary">{t('select_doctor_optional')}</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <select
                                            value={selectedSpecialty}
                                            onChange={(e) => {
                                                setSelectedSpecialty(e.target.value);
                                                setSelectedDoctor(''); // Reset doctor when specialty changes
                                            }}
                                            className="input-base"
                                        >
                                            {availableSpecialties.map(spec => <option key={spec} value={spec}>{spec}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder={t('search_doctor_placeholder')}
                                            value={doctorSearchQuery}
                                            onChange={(e) => {
                                                setDoctorSearchQuery(e.target.value);
                                                setSelectedDoctor(''); // Reset doctor when searching
                                            }}
                                            className="input-base"
                                        />
                                    </div>
                                </div>

                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                    {filteredDoctors.length > 0 ? (
                                        filteredDoctors.map(doc => (
                                            <button
                                                type="button"
                                                key={doc.name}
                                                onClick={() => setSelectedDoctor(doc.name)}
                                                className={`w-full text-left p-3 rounded-lg border-2 transition-colors flex justify-between items-center ${selectedDoctor === doc.name ? 'bg-brand-blue/20 border-brand-blue' : 'bg-bg-secondary border-border-primary hover:border-border-secondary'}`}
                                            >
                                                <div>
                                                    <p className="font-semibold text-text-primary">{doc.name}</p>
                                                    <p className="text-sm text-text-secondary">{doc.specialty}</p>
                                                </div>
                                                {selectedDoctor === doc.name && <i className="fas fa-check-circle text-brand-blue-light text-xl"></i>}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="text-center text-text-secondary p-4">{t('no_doctors_found')}</p>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        <div>
                             <label className="block text-sm font-medium text-text-secondary mb-2">{t('select_date')}</label>
                             {renderCalendar()}
                        </div>
                         <div className="space-y-4 p-4 bg-bg-tertiary rounded-xl border border-border-primary">
                             <label className="block text-sm font-medium text-text-secondary">{t('select_time_slot')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {TIME_SLOTS.map(slot => (
                                    <button type="button" key={slot} onClick={() => setSelectedTime(slot)} className={`p-3 rounded-lg border-2 font-semibold transition-colors ${selectedTime === slot ? 'bg-brand-blue/20 border-brand-blue text-brand-blue-light' : 'bg-bg-secondary border-border-primary text-text-primary hover:border-border-secondary'}`}>
                                        {slot}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col space-y-3 pt-4">
                            <button type="submit" className="btn-primary w-full">{t('next')}</button>
                            <button type="button" onClick={() => changeStep('hospital', 'backward')} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>
                );
            case 'confirm':
                return (
                    <form onSubmit={handleConfirmBooking} className="space-y-5">
                        <p className="text-xl font-semibold text-center text-text-primary">{t('confirm_booking_title')}</p>
                        <div className="p-4 bg-bg-tertiary rounded-xl text-left space-y-3 divide-y divide-border-primary">
                            {[
                                { label: t('patient_name'), value: bookingFor === 'self' ? yourName : patientName },
                                { label: t('hospital_label'), value: selectedHospital },
                                { label: t('date_time_label'), value: `${selectedDate?.toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}, ${selectedTime}` },
                                { label: t('preferred_doctor_label'), value: selectedDoctor, hidden: !selectedDoctor },
                            ].map(item => (
                                !item.hidden && <div key={item.label} className="flex justify-between items-center pt-3 first:pt-0">
                                    <span className="text-text-secondary">{item.label}:</span>
                                    <span className="font-semibold text-text-primary text-right">{item.value}</span>
                                </div>
                            ))}
                        </div>
                         <p className="text-text-secondary text-center text-sm">{t('otp_prompt', { phone: phone })}</p>
                        <div className="pt-4 flex flex-col space-y-3">
                            <button type="submit" className="btn-primary w-full">
                                {error ? <><i className="fas fa-redo mr-2"></i>{t('retry_booking')}</> : t('confirm_booking')}
                            </button>
                            <button type="button" onClick={() => { setError(''); changeStep('slot', 'backward'); }} className="btn-secondary w-full">{t('back')}</button>
                        </div>
                    </form>
                );
             case 'loading':
                return (
                    <div className="flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
                        <div className="w-16 h-16 border-4 border-t-brand-blue border-slate-300 dark:border-slate-700 rounded-full animate-spin"></div>
                        <h3 className="text-xl font-bold text-text-primary mt-6">{t('confirming_appointment')}</h3>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="card p-4 sm:p-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4 text-center">{t('book_appointment_title')}</h2>
            {step !== 'loading' && <Stepper />}
            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-center animate-fade-in">{error}</div>}
            <div key={step} className={animationClass}>{renderStep()}</div>
        </div>
    );
};

export default Booking;