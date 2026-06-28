
import React, { useState, useEffect, memo } from 'react';
import { BookingDetails } from '../types';
import { useTranslation } from 'react-i18next';
import { BACKEND_URL } from '../constants'; 
import LoadingSpinner from './LoadingSpinner';

const HISTORY_CACHE_KEY = 'bookingHistoryCache';

const isUpcoming = (dateString: string): boolean => {
  if (!dateString) return false;
  const bookingDate = new Date(dateString.split(',').slice(1).join(' ').trim());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookingDate >= today;
};

interface HistoryItemProps {
  booking: BookingDetails;
  tokenLabel: string;
  isUpcoming: boolean;
  onCancel: () => void;
}

const HistoryItem = memo(({ booking, tokenLabel, isUpcoming, onCancel }: HistoryItemProps) => {
    const { t } = useTranslation();
    return (
        <div className="glow-card card rounded-3xl p-6 w-full text-left space-y-5 animate-fade-scale-in relative group overflow-hidden bg-bg-secondary">
            {/* Status Indicator Stripe */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isUpcoming ? 'bg-brand-success' : 'bg-text-tertiary'}`}></div>
            
            <div className="flex justify-between items-start gap-4 pl-2">
                <div>
                    <h3 className="font-bold text-text-primary text-xl leading-tight mb-1">{booking.hospital.split(',')[0]}</h3>
                    <p className="text-sm text-text-secondary font-medium flex items-center gap-1">
                        <i className="fas fa-map-marker-alt text-brand-blue-light"></i> 
                        {booking.hospital.split(',').slice(1).join(',').trim()}
                    </p>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-2 ${isUpcoming ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                        {isUpcoming ? 'Upcoming' : 'Completed'}
                    </span>
                    <div className="text-center bg-bg-tertiary px-3 py-2 rounded-xl border border-border-primary">
                        <p className="text-[10px] text-text-tertiary font-bold tracking-wider uppercase mb-0.5">{tokenLabel}</p>
                        <p className="text-lg font-mono font-bold text-text-primary">{booking.token}</p>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-primary border border-border-primary">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue-light"><i className="fas fa-calendar-alt"></i></div>
                    <div>
                        <p className="text-xs text-text-secondary font-semibold">Date & Time</p>
                        <p className="text-sm font-bold text-text-primary">{booking.date}</p>
                        <p className="text-xs text-text-primary">{booking.time}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-primary border border-border-primary">
                    <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue-light"><i className="fas fa-user"></i></div>
                    <div>
                        <p className="text-xs text-text-secondary font-semibold">Patient</p>
                        <p className="text-sm font-bold text-text-primary truncate">{booking.patientName}</p>
                        {booking.doctorName && <p className="text-xs text-text-secondary truncate">Dr. {booking.doctorName}</p>}
                    </div>
                </div>
            </div>

            {isUpcoming && (
                <div className="pl-2 pt-2">
                    <button 
                        onClick={onCancel}
                        className="w-full py-3 rounded-xl border border-red-500/30 text-red-500 bg-red-500/5 font-semibold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <i className="fas fa-times-circle"></i>
                        {t('cancel_appointment')}
                    </button>
                </div>
            )}
        </div>
    );
});


const BookingHistory = ({ onBack }: { onBack: () => void; }) => {
  const [bookings, setBookings] = useState<BookingDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState<BookingDetails | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchHistory = async () => {
        const cachedData = localStorage.getItem(HISTORY_CACHE_KEY);
        if (cachedData) {
            try {
                setBookings(JSON.parse(cachedData));
            } catch(e) {
                console.error("Failed to parse cached booking history", e);
            }
        }
        
        setIsLoading(true);
        setError(null);
        setIsOffline(false);

        try {
            const token = localStorage.getItem('healthAppToken');
            const response = await fetch(`${BACKEND_URL}/api/bookings`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'ngrok-skip-browser-warning': 'true' 
                }
            });
            if (!response.ok) {
                let errorData = { message: `Failed to fetch booking history.` };
                 try {
                    const jsonData = await response.json();
                    errorData.message = jsonData.message || errorData.message;
                } catch (e) {}
                throw new Error(errorData.message);
            }
            const data = await response.json();
            setBookings(data);
            localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(data));
        } catch (err) {
            const isNetworkError = err instanceof TypeError;
            if (!navigator.onLine || isNetworkError) {
                setIsOffline(true);
                if (!cachedData) {
                     setError(t('error_offline_no_cache'));
                } else {
                    setError(null);
                }
            } else if (err instanceof Error) {
                 setError(err.message);
            } else {
                 setError(t('error_server_connect'));
            }
        } finally {
            setIsLoading(false);
        }
    };
    fetchHistory();
  }, [t]);
  
  const handleConfirmCancel = async () => {
      if (!showCancelModal) return;

      setIsCancelling(true);
      setError(null);

      try {
          const authToken = localStorage.getItem('healthAppToken');
          const response = await fetch(`${BACKEND_URL}/api/bookings/${showCancelModal.token}`, {
              method: 'DELETE',
              headers: { 
                  'Authorization': `Bearer ${authToken}`,
                  'ngrok-skip-browser-warning': 'true' 
              }
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to cancel booking.');
          }
          
          const updatedBookings = bookings.map(b =>
              b.token === showCancelModal.token ? { ...b, status: 'CANCELLED' as const } : b
          );
          setBookings(updatedBookings);
          localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(updatedBookings));

      } catch (err: any) {
          setError(err.message || t('error_server_connect'));
      } finally {
          setIsCancelling(false);
          setShowCancelModal(null);
      }
  };


  return (
    <>
      <div className="flex flex-col items-center">
        <h2 className="text-3xl font-bold text-text-primary mb-2">{t('booking_history_title')}</h2>
        <p className="text-text-secondary mb-8 text-center max-w-sm">{t('booking_history_desc')}</p>
        
        {error && <div className="p-3 bg-red-500/10 text-red-400 rounded-xl mb-6 text-sm font-medium"><i className="fas fa-wifi-slash mr-2"></i>{error}</div>}
        {isOffline && bookings.length > 0 && (
              <div className="mb-6 w-full text-center p-3 bg-yellow-500/10 text-yellow-500 rounded-xl text-sm flex items-center justify-center gap-2 border border-yellow-500/20">
                  <i className="fas fa-cloud-download-alt"></i>
                  {t('showing_cached_data')}
              </div>
        )}

        <div className="w-full space-y-6">
          {isLoading && bookings.length === 0 ? (
              <div className="flex flex-col items-center py-12">
                  <div className="w-12 h-12 border-4 border-bg-tertiary border-t-brand-blue rounded-full animate-spin"></div>
                  <p className="text-text-tertiary mt-4 text-sm font-medium">Loading history...</p>
              </div>
          ) : bookings.length > 0 ? (
            bookings.map((booking, index) => (
              <HistoryItem 
                key={`${booking.token}-${index}`} 
                booking={booking} 
                tokenLabel={t('token')} 
                isUpcoming={isUpcoming(booking.date)}
                onCancel={() => setShowCancelModal(booking)}
              />
            ))
          ) : (
            !error && <div className="text-center py-12 card rounded-[2rem] bg-bg-secondary">
              <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar-times text-4xl text-text-tertiary"></i>
              </div>
              <h3 className="text-xl font-bold text-text-primary">{t('no_bookings_found')}</h3>
              <p className="text-text-secondary mt-2 max-w-xs mx-auto">{t('no_bookings_desc')}</p>
            </div>
          )}
        </div>
        <button onClick={onBack} className="btn-secondary w-full max-w-xs mt-10">
          {t('back_to_home')}
      </button>
      </div>
       {showCancelModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="card rounded-[2rem] p-8 max-w-md w-full text-center animate-fade-in-up bg-bg-secondary border border-border-primary shadow-2xl">
                    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-red-500/10 mb-6 animate-pulse-soft">
                        <i className="fas fa-trash-alt text-red-500 text-4xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mb-2">{t('confirm_cancellation_title')}</h3>
                    <p className="text-text-secondary mt-2 mb-8">{t('confirm_cancellation_desc')}</p>
                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={handleConfirmCancel} 
                            disabled={isCancelling}
                            className="w-full inline-flex items-center justify-center py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-orange-600 hover:scale-[1.02] transition-all shadow-lg shadow-red-500/30"
                        >
                            {isCancelling ? <LoadingSpinner /> : t('yes_cancel')}
                        </button>
                        <button onClick={() => setShowCancelModal(null)} disabled={isCancelling} className="btn-secondary py-3.5">
                            {t('no_keep')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default BookingHistory;
