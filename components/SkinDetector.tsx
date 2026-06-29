
import { useState } from 'react';
import { startSkinAnalysis, getSkinAnalysisConclusion } from '../services/geminiService';
import { TriageResultData } from '../types';
import { useTranslation } from 'react-i18next';

interface SkinDetectorProps {
  onBack: () => void;
  onAnalysisComplete: (result: TriageResultData) => void;
}

type ComponentStep = 'upload' | 'mcq' | 'loading';

// ---------------------------------------------------------------------------
// Compress image via canvas before sending to server.
// Resizes the longest dimension to MAX_DIM and re-encodes as JPEG.
// Turns a 8MB raw photo into ~250KB — well within the 10mb body limit.
// ---------------------------------------------------------------------------
const MAX_DIM = 1024;
const compressImage = (file: File): Promise<{ base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
    };
    img.onerror = reject;
    img.src = url;
  });

const SkinDetector = ({ onBack, onAnalysisComplete }: SkinDetectorProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ComponentStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  
  const [progress, setProgress] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({
      duration: '',
      sensation: '',
      spreading: ''
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result as string);
        reader.readAsDataURL(selectedFile);
        setError(null);
    }
  };

  const handleProceedToMcq = () => {
    if (!image) {
      setError(t('error_select_image'));
      return;
    }
    setStep('mcq');
  };

  const handleSubmitAnalysis = async () => {
    if (!file) return;
    setStep('loading');
    setProgress(10);
    
    try {
        setProgress(25);
        // Compress before upload: ~8MB mobile photo → ~250KB JPEG
        const { base64, mimeType } = await compressImage(file);
        setProgress(40);
        const { description } = await startSkinAnalysis(base64, mimeType);
        setProgress(75);
        const res = await getSkinAnalysisConclusion(description, mcqAnswers, i18n.language);
        setProgress(100);
        setTimeout(() => onAnalysisComplete(res), 500);
    } catch (e) {
        setError(t('error_generic'));
        setStep('upload');
    }
  };

  if (step === 'loading') {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 card min-h-[450px]">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-bg-tertiary rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-brand-blue border-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-bold text-text-primary">{t('analyzing')}</h3>
            <p className="text-text-secondary mt-2">Deep learning models are examining the dermis...</p>
            <div className="w-full max-w-xs bg-bg-tertiary h-2.5 rounded-full mt-10 overflow-hidden border border-border-pro">
                <div className="bg-brand-blue h-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-scale-in">
        {step === 'upload' && (
            <div className="card p-8 sm:p-10 text-center space-y-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-extrabold tracking-tight">{t('skin_analysis_title')}</h2>
                    <p className="text-text-secondary leading-relaxed text-lg">
                        Upload a <span className="text-brand-blue font-bold">clear</span> photo of the area.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="dashed-box cursor-pointer flex flex-col items-center justify-center p-10 rounded-[2rem] bg-bg-primary/40 group">
                        <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                        <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <i className="fas fa-upload text-2xl text-brand-blue"></i>
                        </div>
                        <span className="font-bold text-xs uppercase tracking-widest text-text-primary">{t('upload_photo')}</span>
                    </label>

                    <button className="dashed-box flex flex-col items-center justify-center p-10 rounded-[2rem] bg-bg-primary/40 group">
                        <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <i className="fas fa-camera text-2xl text-brand-blue"></i>
                        </div>
                        <span className="font-bold text-xs uppercase tracking-widest text-text-primary">{t('use_camera')}</span>
                    </button>
                </div>

                {image && (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-brand-blue/20 aspect-video bg-black group">
                        <img src={image} className="w-full h-full object-contain" alt="Preview" />
                        <button onClick={() => {setImage(null); setFile(null);}} className="absolute top-3 right-3 w-10 h-10 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-transform flex items-center justify-center">
                            <i className="fas fa-trash-alt"></i>
                        </button>
                    </div>
                )}

                <div className="pt-4 flex flex-col gap-3">
                    <button 
                        onClick={handleProceedToMcq} 
                        disabled={!image} 
                        className="btn-primary w-full py-5 text-xl shadow-2xl shadow-brand-blue/20"
                    >
                        {t('continue_analysis')} <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                    <button onClick={onBack} className="btn-secondary w-full py-4 font-bold text-text-secondary">
                        {t('back')}
                    </button>
                </div>
            </div>
        )}

        {step === 'mcq' && (
            <div className="card p-8 sm:p-10 space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-extrabold">{t('tell_us_more')}</h2>
                    <p className="text-text-secondary">Clinical context helps the AI provide higher accuracy.</p>
                </div>

                <div className="space-y-8">
                    {/* Duration Question */}
                    <div className="space-y-4">
                        <p className="font-bold text-text-primary flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-[10px] flex items-center justify-center">1</span>
                            {t('mcq_q1_title')}
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { id: 'lt_week', label: t('mcq_q1_a1') },
                                { id: '1_4_weeks', label: t('mcq_q1_a2') },
                                { id: 'mt_month', label: t('mcq_q1_a3') }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setMcqAnswers({ ...mcqAnswers, duration: opt.id })}
                                    className={`relative p-5 rounded-2xl text-left border-2 transition-all duration-300 flex items-center justify-between group ${mcqAnswers.duration === opt.id 
                                        ? 'border-brand-blue bg-brand-blue/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'border-border-pro bg-bg-primary hover:border-brand-blue/30'}`}
                                >
                                    <span className={`font-bold ${mcqAnswers.duration === opt.id ? 'text-brand-blue' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                        {opt.label}
                                    </span>
                                    {mcqAnswers.duration === opt.id && (
                                        <i className="fas fa-check-circle text-brand-blue text-xl animate-fade-scale-in"></i>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sensation Question */}
                    <div className="space-y-4">
                        <p className="font-bold text-text-primary flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-[10px] flex items-center justify-center">2</span>
                            {t('mcq_q2_title')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'itchy', label: t('mcq_q2_a1') },
                                { id: 'painful', label: t('mcq_q2_a2') },
                                { id: 'both', label: t('mcq_q2_a3') },
                                { id: 'neither', label: t('mcq_q2_a4') }
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setMcqAnswers({ ...mcqAnswers, sensation: opt.id })}
                                    className={`relative p-5 rounded-2xl text-left border-2 transition-all duration-300 flex items-center justify-between group ${mcqAnswers.sensation === opt.id 
                                        ? 'border-brand-blue bg-brand-blue/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'border-border-pro bg-bg-primary hover:border-brand-blue/30'}`}
                                >
                                    <span className={`font-bold ${mcqAnswers.sensation === opt.id ? 'text-brand-blue' : 'text-text-secondary group-hover:text-text-primary'}`}>
                                        {opt.label}
                                    </span>
                                    {mcqAnswers.sensation === opt.id && (
                                        <i className="fas fa-check-circle text-brand-blue text-xl animate-fade-scale-in"></i>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 space-y-3">
                        <button 
                            onClick={handleSubmitAnalysis} 
                            disabled={!mcqAnswers.duration || !mcqAnswers.sensation}
                            className="btn-primary w-full py-5 text-xl shadow-2xl shadow-brand-blue/20"
                        >
                            {t('analyze_btn') || 'Start Medical Triage'} <i className="fas fa-brain ml-2"></i>
                        </button>
                        <button onClick={() => setStep('upload')} className="btn-secondary w-full py-4">
                            {t('back')}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SkinDetector;
