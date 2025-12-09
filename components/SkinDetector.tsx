import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { startSkinAnalysis, getSkinAnalysisConclusion, queueAnalysisRequest } from '../services/geminiService';
import { TriageResultData } from '../types';
import { useTranslation } from 'react-i18next';

interface MediaSettingsRange {
  max: number;
  min: number;
  step: number;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean;
  zoom?: MediaSettingsRange;
}

interface SkinDetectorProps {
  onBack: () => void;
  onAnalysisComplete: (result: TriageResultData) => void;
}

type ComponentStep = 'upload' | 'mcq' | 'loading' | 'queued';
type LoadingStep = 'uploading' | 'preparing' | 'examining' | 'generating' | 'finalizing';

const SkinDetector = ({ onBack, onAnalysisComplete }: SkinDetectorProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ComponentStep>('upload');
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { t, i18n } = useTranslation();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loadingStep, setLoadingStep] = useState<LoadingStep>('uploading');
  const [progress, setProgress] = useState(0);
  const [cameraCapabilities, setCameraCapabilities] = useState<ExtendedMediaTrackCapabilities | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [zoomValue, setZoomValue] = useState<number>(1);
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  
  const LOADING_STEPS: LoadingStep[] = useMemo(() => ['uploading', 'preparing', 'examining', 'generating', 'finalizing'], []);
  const LOADING_STEP_LABELS: Record<LoadingStep, string> = useMemo(() => ({
      uploading: t('loading_uploading'),
      preparing: t('loading_preparing'),
      examining: t('loading_examining'),
      generating: t('loading_generating'),
      finalizing: t('loading_finalizing'),
  }), [t]);

  const mcqQuestions = useMemo(() => [
    {
      key: 'duration',
      question: t('mcq_q1_title'),
      answers: [t('mcq_q1_a1'), t('mcq_q1_a2'), t('mcq_q1_a3')],
    },
    {
      key: 'sensation',
      question: t('mcq_q2_title'),
      answers: [t('mcq_q2_a1'), t('mcq_q2_a2'), t('mcq_q2_a3'), t('mcq_q2_a4')],
    },
    {
      key: 'spread',
      question: t('mcq_q3_title'),
      answers: [t('mcq_q3_a1'), t('mcq_q3_a2'), t('mcq_q3_a3')],
    },
  ], [t]);

  useEffect(() => {
    let interval: number;
    if (step === 'loading') {
      const currentStepIndex = LOADING_STEPS.indexOf(loadingStep);
      const stepDuration = 2000 + Math.random() * 500;
      
      interval = window.setTimeout(() => {
        if (currentStepIndex < LOADING_STEPS.length - 1) {
          if (progress < ((currentStepIndex + 1) / LOADING_STEPS.length) * 100) {
              setLoadingStep(LOADING_STEPS[currentStepIndex + 1]);
          }
        }
      }, stepDuration);
    }
    return () => clearTimeout(interval);
  }, [step, loadingStep, LOADING_STEPS, progress]);


  const applyCameraConstraints = useCallback(async (flash?: boolean, zoom?: number) => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
        const constraints: any = {};
        if (cameraCapabilities?.torch) {
            constraints.torch = flash ?? isFlashOn;
        }
        if (cameraCapabilities?.zoom) {
            constraints.zoom = zoom ?? zoomValue;
        }
        await videoTrack.applyConstraints({ advanced: [constraints] });
    } catch (error) {
        console.error("Error applying constraints:", error);
    }
  }, [isFlashOn, zoomValue, cameraCapabilities]);

  useEffect(() => {
    if (isCameraOpen && streamRef.current) {
        applyCameraConstraints();
    }
  }, [isFlashOn, zoomValue, isCameraOpen, applyCameraConstraints]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      setError(null);
    }
  };
  
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
          videoRef.current.srcObject = null;
      }
    }
  }, []);

  const openCamera = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t('camera_not_supported'));
        return;
    }
    stopCameraStream();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities;
        setCameraCapabilities(capabilities);
        setZoomValue(capabilities.zoom?.min || 1);

        setIsCameraOpen(true);
        setError(null);
    } catch (err) {
        console.error("Camera access error:", err);
        if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
             setError(t('camera_permission_denied'));
        } else {
             setError(t('camera_error'));
        }
    }
  };

  const closeCamera = useCallback(() => {
    stopCameraStream();
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCameraCapabilities(null);
    setIsFlashOn(false);
    setZoomValue(1);
  }, [stopCameraStream]);
  
  useEffect(() => {
      return () => closeCamera();
  }, [closeCamera]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        if (context) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const dataUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(dataUrl);
            stopCameraStream();
        }
    }
  };
  
  const handleRetake = () => {
      setCapturedImage(null);
      openCamera();
  }

  const handleConfirmPhoto = async () => {
      if (!capturedImage) return;
      setImage(capturedImage);
      try {
          const res = await fetch(capturedImage);
          const blob: Blob = await res.blob();
          const extension = blob.type.split('/')[1] || 'jpg';
          const confirmedFile = new File([blob], `capture.${extension}`, { type: blob.type });
          setFile(confirmedFile);
      } catch (error: any) {
           console.error("Error converting data URL to file:", error);
           setError(t('error_generic'));
      }
      closeCamera();
  }
  
  const handleRemoveImage = () => {
    setImage(null);
    setFile(null);
  };

  const handleProceedToMcq = useCallback(() => {
    if (!image) {
      setError(t('error_select_image'));
      return;
    }
    setError(null);
    setStep('mcq');
  }, [image, t]);

  const handleSubmitAnalysis = useCallback(async () => {
    if (!file) {
      setError(t('error_select_image'));
      return;
    }

    setStep('loading');
    setLoadingStep('uploading');
    setProgress(0);
    setError(null);

    let base64String: string;
    try {
      base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
      });
    } catch (readError) {
        setError(t('error_read_file'));
        setStep('upload');
        return;
    }
    
    const mimeType = file.type;
    
    if (!navigator.onLine) {
        console.log("Offline mode detected. Queuing analysis.");
        const payload = { base64ImageData: base64String, mimeType, language: i18n.language, mcqAnswers: mcqAnswers || {} };
        await queueAnalysisRequest(payload);
        setStep('queued');
        return;
    }

    try {
        setLoadingStep('preparing');
        setProgress(25);
        
        const { analysisId } = await startSkinAnalysis(base64String, mimeType);
        
        setLoadingStep('examining');
        setProgress(60);

        const result = await getSkinAnalysisConclusion(analysisId, mcqAnswers || {}, i18n.language);
        
        setLoadingStep('finalizing');
        setProgress(100);

        setTimeout(() => {
            onAnalysisComplete(result);
        }, 1000);
        
    } catch (err: any) {
        setError(err.message || t('error_generic'));
        setStep('upload');
    }
  }, [mcqAnswers, i18n.language, file, onAnalysisComplete, t]);
  
  const handleMcqAnswer = (questionText: string, answer: string) => {
    setMcqAnswers(prev => {
        const newAnswers = {...prev};
        if (prev[questionText] === answer) {
            delete newAnswers[questionText];
        } else {
            newAnswers[questionText] = answer;
        }
        return newAnswers;
    });
  };

  const LoadingOverlay = () => (
    <div className="flex flex-col items-center justify-center text-center p-6 card w-full min-h-[450px]">
        <div className="relative w-24 h-24 mb-6">
            <div className="w-full h-full border-4 border-border-primary rounded-full"></div>
            <div className="absolute inset-0 w-full h-full border-4 border-t-brand-blue border-transparent rounded-full animate-spin"></div>
            <i className="fas fa-microscope text-brand-blue-light text-4xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-soft"></i>
        </div>
        <h3 className="text-2xl font-bold text-text-primary mt-4">{t('analyzing')}</h3>
        <p className="text-text-secondary mt-2 mb-8">{t('loading_moments')}</p>

        <div className="w-full max-w-sm space-y-3">
            <div className="w-full bg-bg-tertiary rounded-full h-2.5 overflow-hidden border border-border-primary">
                <div 
                    className="bg-brand-blue h-full rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-brand-blue-light font-semibold">{LOADING_STEP_LABELS[loadingStep]}</p>
        </div>
    </div>
  );
  
  const QueuedOverlay = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 card w-full min-h-[450px]">
       <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-brand-blue/10 mb-6">
          <i className="fas fa-wifi-slash text-brand-blue-light text-4xl"></i>
        </div>
        <h3 className="text-2xl font-bold text-text-primary">{t('offline_request_queued')}</h3>
        <p className="text-text-secondary mt-2 mb-8">{t('offline_request_desc')}</p>
        <button
          onClick={onBack}
          className="btn-primary max-w-xs"
        >
          {t('done')}
        </button>
    </div>
  );

  const CameraOverlay = () => (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center animate-fade-in">
        <canvas ref={canvasRef} className="hidden"></canvas>

        <div className="absolute top-0 left-0 right-0 p-4 flex justify-end items-center bg-gradient-to-b from-black/50 to-transparent z-10">
            <button onClick={closeCamera} className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center text-2xl" aria-label={t('cancel')}>
                <i className="fas fa-times"></i>
            </button>
        </div>

        <div className="relative w-full h-full flex items-center justify-center">
            {capturedImage ? (
                <img src={capturedImage} alt="Captured preview" className="max-w-full max-h-full object-contain" />
            ) : (
                <>
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" aria-label="Live camera feed"></video>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-[90%] max-w-sm aspect-[3/4] shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                            <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-white/80 rounded-tl-3xl"></div>
                            <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-white/80 rounded-tr-3xl"></div>
                            <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-white/80 rounded-bl-3xl"></div>
                            <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-white/80 rounded-br-3xl"></div>
                            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-3 bg-black/50 text-white text-sm px-3 py-1.5 rounded-full whitespace-nowrap">{t('position_area_here')}</span>
                        </div>
                    </div>
                </>
            )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col items-center justify-center bg-gradient-to-t from-black/60 to-transparent z-10">
            {capturedImage ? (
                 <div className="flex items-center justify-between w-full max-w-sm">
                    <button onClick={handleRetake} className="text-white font-bold text-lg flex items-center gap-2 py-3 px-6 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors">
                        <i className="fas fa-redo"></i> {t('retake_photo')}
                    </button>
                    <button onClick={handleConfirmPhoto} className="text-white font-bold text-lg flex items-center gap-2 py-3 px-6 rounded-full bg-brand-blue hover:bg-brand-blue-dark transition-colors">
                        <i className="fas fa-check"></i> {t('use_this_photo')}
                    </button>
                 </div>
            ) : (
                <div className="flex items-center justify-between w-full max-w-sm">
                    {cameraCapabilities?.torch ? (
                        <button 
                            onClick={() => setIsFlashOn(!isFlashOn)} 
                            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm text-white flex items-center justify-center text-xl transition-colors hover:bg-white/20"
                            aria-label={isFlashOn ? t('turn_flash_off') : t('turn_flash_on')}
                        >
                            <i className={`fas ${isFlashOn ? 'fa-bolt text-yellow-300' : 'fa-bolt-slash'}`}></i>
                        </button>
                    ) : <div className="w-14 h-14"></div> }
                    <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white border-4 border-black/20 ring-4 ring-white ring-offset-4 ring-offset-black/20 shadow-2xl" aria-label={t('capture_photo')}></button>
                     <div className="w-14 h-14">
                        {cameraCapabilities?.zoom && (
                            <input
                                type="range"
                                min={cameraCapabilities.zoom.min}
                                max={cameraCapabilities.zoom.max}
                                step={cameraCapabilities.zoom.step}
                                value={zoomValue}
                                onChange={(e) => setZoomValue(parseFloat(e.target.value))}
                                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-blue-light"
                                aria-label={t('zoom_slider')}
                            />
                        )}
                     </div>
                </div>
            )}
        </div>
    </div>
  );

  const renderContent = () => {
    switch (step) {
        case 'loading': return <LoadingOverlay />;
        case 'queued': return <QueuedOverlay />;
        case 'mcq': return (
            <div className="w-full card p-6">
                <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{t('tell_us_more')}</h2>
                <p className="text-text-secondary mb-8 text-center">{t('mcq_desc')}</p>
                
                <div className="space-y-6">
                    {mcqQuestions.map((q) => (
                        <div key={q.key}>
                            <h3 className="font-semibold text-text-primary mb-3 text-lg">{q.question}</h3>
                            <div className="flex flex-wrap gap-2">
                                {q.answers.map((answer) => (
                                    <button
                                        key={answer}
                                        onClick={() => handleMcqAnswer(q.question, answer)}
                                        className={`px-4 py-2 rounded-full border-2 font-semibold transition-all duration-200 text-sm sm:text-base
                                            ${mcqAnswers[q.question] === answer 
                                                ? 'bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                                                : 'bg-bg-secondary border-border-primary text-text-primary hover:border-brand-blue-light'
                                            }`}
                                    >
                                        {answer}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full mt-8 flex flex-col space-y-3">
                    <button onClick={handleSubmitAnalysis} className="btn-primary">
                        <i className="fas fa-microscope mr-2"></i>{t('analyze_image')}
                    </button>
                    <button onClick={() => setStep('upload')} className="btn-secondary">
                        {t('back')}
                    </button>
                </div>
            </div>
        );
        case 'upload': return (
            <div className="w-full card p-6">
                <h2 className="text-2xl font-bold text-text-primary mb-2 text-center">{t('skin_analysis_title')}</h2>
                <p className="text-text-secondary mb-6 text-center">{t('skin_analysis_desc')}</p>

                <div className="w-full">
                    <input type="file" id="imageUpload" accept="image/*" className="hidden" onChange={handleFileChange} disabled={step !== 'upload'} />
                    
                    {image && (
                    <div className="mb-6 relative group aspect-video max-w-lg mx-auto">
                      <img src={image} alt="Skin condition preview" className="rounded-lg w-full h-full object-contain shadow-md bg-bg-primary p-1 border border-border-primary" />
                      <button 
                          onClick={handleRemoveImage} 
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label={`Remove image`}
                      >
                          <i className="fas fa-times text-sm"></i>
                      </button>
                    </div>
                    )}

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${image ? 'mt-4 border-t border-border-primary pt-4' : ''}`}>
                        <label htmlFor="imageUpload" className="cursor-pointer group flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-xl transition-all border-2 border-dashed border-border-primary hover:border-brand-blue-light hover:bg-brand-blue/10">
                            <i className="fas fa-upload text-4xl text-text-secondary group-hover:text-brand-blue-light transition-colors"></i>
                            <p className="mt-3 text-lg font-semibold text-text-primary group-hover:text-brand-blue-light">{image ? t('change_photo') : t('upload_photo')}</p>
                            <p className="text-sm text-text-tertiary mt-1">{t('select_from_device')}</p>
                        </label>
                        <button onClick={openCamera} className="cursor-pointer group w-full flex flex-col items-center justify-center p-6 bg-bg-secondary rounded-xl transition-all border-2 border-dashed border-border-primary hover:border-brand-blue-light hover:bg-brand-blue/10">
                            <i className="fas fa-camera-retro text-4xl text-text-secondary group-hover:text-brand-blue-light transition-colors"></i>
                            <p className="mt-3 text-lg font-semibold text-text-primary group-hover:text-brand-blue-light">{image ? t('retake_photo') : t('use_camera')}</p>
                            <p className="text-sm text-text-tertiary mt-1">{t('capture_live_photo')}</p>
                        </button>
                    </div>
                </div>

                {error && <p className="text-red-400 mt-4 text-center animate-fade-in">{error}</p>}
                
                <div className="w-full mt-6 flex flex-col space-y-3">
                    <button
                        onClick={handleProceedToMcq}
                        disabled={!image || step !== 'upload'}
                        className="btn-primary"
                    >
                        <i className="fas fa-arrow-right mr-2"></i>
                        {t('continue_analysis')}
                    </button>
                    <button
                        onClick={onBack}
                        disabled={step !== 'upload'}
                        className="btn-secondary"
                    >
                        {t('back')}
                    </button>
                </div>
            </div>
        )
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div key={step} className="w-full animate-fade-in-up">
        {renderContent()}
      </div>
      {isCameraOpen && <CameraOverlay />}
    </div>
  );
};

export default SkinDetector;