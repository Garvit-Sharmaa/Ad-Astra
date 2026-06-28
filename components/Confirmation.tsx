
import React from 'react';
import { BookingDetails } from '../types';
import { useTranslation } from 'react-i18next';

const DetailItem = ({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) => (
    <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0 text-brand-blue-light">
            <i className={`fas ${icon} text-lg`}></i>
        </div>
        <div>
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-0.5">{label}</p>
            <p className="font-bold text-text-primary text-lg">{value}</p>
        </div>
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
         <div className="p-8 text-center card rounded-[2rem]">
            <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
            </div>
            <h2 className="text-2xl font-bold mt-4 text-text-primary">{t('booking_details_missing')}</h2>
            <p className="text-text-secondary mt-2 mb-8">{t('booking_details_missing_desc')}</p>
             <button onClick={onDone} className="btn-primary w-full">
                {t('go_home')}
            </button>
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
    <div className="card rounded-[2rem] overflow-hidden animate-fade-scale-in text-center p-0">
        <div className="bg-bg-secondary p-8 pb-10 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-brand-success/10 blur-3xl pointer-events-none"></div>
            
            <div className="relative mx-auto w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-emerald-600 shadow-xl shadow-green-500/40 mb-6 animate-pulse-soft">
                <i className="fas fa-check text-white text-5xl"></i>
            </div>
            <h2 className="relative text-3xl font-extrabold text-text-primary">{t('booking_confirmed')}</h2>
            <p className="relative text-text-secondary mt-2 max-w-sm mx-auto font-medium">{confirmationDesc}</p>
        </div>

      <div className="p-6 sm:p-8 -mt-6 rounded-t-[2rem] bg-bg-primary relative z-10 space-y-6">
          <div className="bg-bg-secondary rounded-2xl p-6 border-2 border-dashed border-brand-blue-light/30 text-center relative overflow-hidden group hover:border-brand-blue-light transition-colors">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue-light to-brand-blue"></div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-2">{t('booking_token')}</p>
              <p className="text-5xl font-mono font-bold tracking-wider text-brand-blue-light drop-shadow-sm">{details.token}</p>
              <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-blue/5 rounded-full blur-xl group-hover:bg-brand-blue/10 transition-colors"></div>
          </div>
          
          <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary space-y-6 text-left shadow-sm">
               <DetailItem icon="fa-hospital" label={t('hospital_label')} value={details.hospital} />
               <DetailItem icon="fa-user" label={t('patient_name_label')} value={details.patientName} />
               <DetailItem icon="fa-calendar-alt" label={t('date_time_label')} value={`${details.date}, ${details.time}`} />
               {details.doctorName && <DetailItem icon="fa-user-md" label={t('preferred_doctor_label')} value={details.doctorName} />}
          </div>
          
          <p className="text-xs text-text-tertiary px-4 leading-relaxed">{t('token_usage_instruction')}</p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a href={getDirectionsLink()} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full flex items-center justify-center py-4">
              <i className="fas fa-map-marker-alt mr-2 text-brand-blue-light"></i> {t('get_directions')}
            </a>
            <button onClick={onDone} className="btn-primary w-full py-4 shadow-lg shadow-brand-blue/20">
              {t('done')}
            </button>
          </div>
      </div>
    </div>
  );
};

export default Confirmation;
