import React from 'react';
import { BookingDetails } from '../types';
import { useTranslation } from 'react-i18next';

const DetailItem = ({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) => (
    <div>
        <p className="text-sm text-text-secondary flex items-center gap-2"><i className={`fas ${icon} w-4 text-center`} aria-hidden="true"></i>{label}</p>
        <p className="font-semibold text-text-primary text-lg ml-6">{value}</p>
    </div>
);

interface ConfirmationProps {
  onDone: () => void;
  details: BookingDetails | null;
}

const Confirmation = ({ onDone, details }: ConfirmationProps) => {
  const { t } = useTranslation();

  if (!details) {
      return (
         <div className="p-8 text-center card">
            <h2 className="text-2xl font-bold mt-4 text-red-400">{t('booking_details_missing')}</h2>
            <p className="text-text-secondary mt-2">{t('booking_details_missing_desc')}</p>
             <div className="mt-8">
                <button onClick={onDone} className="w-full bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors">
                    {t('go_home')}
                </button>
            </div>
         </div>
      );
  }
  
  const confirmationDesc = details.relationship 
    ? t('booking_confirmed_desc_other', { patientName: details.patientName })
    : t('booking_confirmed_desc_self');
    
  const getDirectionsLink = () => {
      const query = encodeURIComponent(details.hospital);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="p-6 card text-center animate-fade-scale-in">
      <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-brand-success to-green-600 shadow-xl shadow-green-500/30">
        <i className="fas fa-check-circle text-white text-5xl"></i>
      </div>
      <h2 className="text-3xl font-extrabold mt-5 text-brand-success">{t('booking_confirmed')}</h2>
      <p className="text-text-secondary mt-2 max-w-sm mx-auto">{confirmationDesc}</p>
      <p className="text-text-secondary mt-1 text-sm">{t('sms_notification')}</p>

      <div className="mt-8 bg-bg-primary rounded-2xl p-6 text-left border border-border-primary">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-4 border-b-2 border-dashed border-border-primary">
              <div>
                  <p className="text-xs text-brand-blue-light font-bold tracking-widest uppercase">{t('booking_token')}</p>
                  <p className="text-5xl font-mono font-bold tracking-wider text-brand-blue-light">{details.token}</p>
              </div>
              <div className="p-2 bg-white rounded-lg self-center sm:self-auto">
                  {/* Placeholder for QR Code */}
                  <div className="w-24 h-24 bg-slate-800 flex items-center justify-center">
                      <i className="fas fa-qrcode text-5xl text-white"></i>
                  </div>
              </div>
          </div>
          <div className="pt-5 space-y-4">
               <DetailItem icon="fa-hospital" label={t('hospital_label')} value={details.hospital} />
               <DetailItem icon="fa-user-circle" label={t('patient_name_label')} value={details.patientName} />
               <DetailItem icon="fa-calendar-alt" label={t('date_time_label')} value={`${details.date}, ${details.time}`} />
               {details.doctorName && <DetailItem icon="fa-stethoscope" label={t('preferred_doctor_label')} value={details.doctorName} />}
          </div>
      </div>
      
       <p className="text-xs text-text-tertiary mt-6">{t('token_usage_instruction')}</p>


      <div className="mt-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <a href={getDirectionsLink()} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full sm:w-1/2 flex items-center justify-center">
          <i className="fas fa-map-marker-alt mr-2"></i> {t('get_directions')}
        </a>
        <button
          onClick={onDone}
          className="btn-primary w-full sm:w-1/2"
        >
          {t('done')}
        </button>
      </div>
    </div>
  );
};

export default Confirmation;