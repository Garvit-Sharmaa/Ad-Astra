import React, { useState, useEffect, memo } from 'react';
import { BookingDetails } from '../types';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../constants';
import LoadingSpinner from './LoadingSpinner';

const HISTORY_CACHE_KEY = 'bookingHistoryCache';

const isUpcoming = (dateString: string): boolean => {
  // The date format from the server is like "Sunday, July 21, 2024" which is parsable by new Date()
  if (!dateString) return false;
  const bookingDate = new Date(dateString.split(',').slice(1).join(' ').trim()); // Handle weekday
  const today = new Date();
  // Set hours to 0 to compare dates only, not times
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
        <div className="card p-5 w-full text-left space-y-4 animate-fade-scale-in">
            <div className="flex justify-between items-start gap-4">
                <div>
                    <p className="font-bold text-text-primary text-lg">{booking.hospital.split(',')[0]}</p>
                    <p className="text-sm text-text-secondary">{booking.hospital.split(',').slice(1).join(',').trim()}</p>
                </div>
                <div className="text-center font-bold text-brand-blue-light text-lg bg-brand-blue/10 px-4 py-2 rounded-xl border border-brand-blue/20 flex-shrink-0">
                    <p className="text-xs text-brand-blue-light font-medium tracking-wider">{tokenLabel}</p>
                    {booking.token}
                </div>
            </div>
            <div className="border-t border-border-primary pt-4 space-y-3">
                <div className="flex items-center space-x-3 text-text-primary">
                    <i className="fas fa-user text-text-secondary w-4 text-center"></i>
                    <span className="font-medium">{booking.patientName}</span>
                </div>
                <div className="flex items-center space-x-3 text-text-primary">
                    <i className="fas fa-calendar-alt text-text-secondary w-4 text-center"></i>
                    <span>{`${booking.date}, ${booking.time}`}</span>
                </div>
                {booking.doctorName && (
                    <div className="flex items-center space-x-3 text-text-primary">
                        <i className="fas fa-stethoscope text-text-secondary w-4 text-center"></i>
                        <span>{booking.doctorName}</span>
                    </div>
                )}
            </div>
            {isUpcoming && (
                <div className="border-t border-border-primary pt-4">
                    <button 
                        onClick={onCancel}
                        className="w-full text-center py-2 px-4 rounded-lg bg-red-500/10 text-red-400 font-semibold hover:bg-red-500/20 transition-colors border border-red-500/20"
                    >
                        <i className="fas fa-times-circle mr-2"></i>
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
            const response = await fetch(`${API_BASE_URL}/api/bookings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                let errorData = { message: `Failed to fetch booking history. Server responded with status ${response.status}` };
                 try {
                    const jsonData = await response.json();
                    errorData.message = jsonData.message || errorData.message;
                } catch (e) {
                    // Ignore if response body is not JSON
                }
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
          const response = await fetch(`${API_BASE_URL}/api/bookings/${showCancelModal.token}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` }
          });

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || 'Failed to cancel booking.');
          }
          
          const updatedBookings = bookings.filter(b => b.token !== showCancelModal.token);
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
        <p className="text-text-secondary mb-8 text-center">{t('booking_history_desc')}</p>
        
        {error && <p className="text-red-400 text-center mb-4">{error}</p>}
        {isOffline && bookings.length > 0 && (
              <div className="mb-4 w-full text-center p-3 bg-yellow-500/10 text-yellow-400 rounded-lg text-sm flex items-center justify-center gap-2">
                  <i className="fas fa-wifi-slash"></i>
                  {t('showing_cached_data')}
              </div>
        )}

        <div className="w-full space-y-5">
          {isLoading && bookings.length === 0 ? (
              <div className="flex justify-center p-10">
                  <div className="w-12 h-12 border-4 border-t-brand-blue border-slate-300 dark:border-slate-700 rounded-full animate-spin"></div>
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
            !error && <div className="text-center p-10 card">
              <i className="fas fa-file-invoice text-5xl text-text-tertiary mb-4"></i>
              <h3 className="text-xl font-semibold text-text-primary">{t('no_bookings_found')}</h3>
              <p className="text-text-secondary mt-1">{t('no_bookings_desc')}</p>
            </div>
          )}
        </div>
        <button
          onClick={onBack}
          className="btn-secondary w-full max-w-xs mt-8"
          >
          {t('back_to_home')}
      </button>
      </div>
       {showCancelModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="card p-6 sm:p-8 max-w-md w-full text-center animate-fade-in-up">
                    <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-red-500/20 mb-6">
                        <i className="fas fa-exclamation-triangle text-red-400 text-4xl"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-text-primary mb-2">{t('confirm_cancellation_title')}</h3>
                    <p className="text-text-secondary mt-2 mb-8 max-w-sm mx-auto">{t('confirm_cancellation_desc')}</p>
                    <div className="flex flex-col space-y-3">
                        <button 
                            onClick={handleConfirmCancel} 
                            disabled={isCancelling}
                            className="w-full inline-flex items-center justify-center py-3 px-4 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-all disabled:bg-red-400"
                        >
                            {isCancelling ? <LoadingSpinner /> : (
                                <>
                                    <i className="fas fa-trash-alt mr-2"></i> {t('yes_cancel')}
                                </>
                            )}
                        </button>
                        <button 
                            onClick={() => setShowCancelModal(null)} 
                            disabled={isCancelling}
                            className="btn-secondary"
                        >
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