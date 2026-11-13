import React, { useEffect, useRef, useState } from 'react';

interface LiveCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  title: string;
  description: string;
  facingMode?: 'user' | 'environment';
  isTl?: boolean;
}

export const LiveCameraCaptureModal: React.FC<LiveCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title,
  description,
  facingMode = 'user',
  isTl = true,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [currentFacing, setCurrentFacing] = useState<'user' | 'environment'>(facingMode);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    startCamera(currentFacing);
    return () => {
      stopCamera();
    };
  }, [isOpen, currentFacing]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (facing: 'user' | 'environment') => {
    setIsStarting(true);
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          isTl
            ? 'Hindi suportado ang camera sa browser o device na ito.'
            : 'Camera API is not supported in this browser or device.'
        );
      }

      // Request natural full-resolution sensor stream (portrait 9:16 or landscape)
      const isMobile = window.innerWidth < 768;
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: isMobile ? 1080 : 1920 },
          height: { ideal: isMobile ? 1920 : 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          isTl
            ? 'Hindi pinayagan ang camera permission. Pakisuyong i-allow ang Camera sa browser settings.'
            : 'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else {
        setCameraError(
          err.message ||
            (isTl
              ? 'Hindi mabuksan ang camera. Pakitingnan kung may ibang app na gumagamit nito.'
              : 'Could not start camera. Check if another app is using it.')
        );
      }
    }
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Capture the ACTUAL full resolution of the video stream
    let width = video.videoWidth || 1280;
    let height = video.videoHeight || 720;

    // Cap maximum dimension to 1440px to ensure zero lag while preserving full camera detail
    const maxDimension = 1440;
    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front camera, mirror horizontally so selfie looks natural
    if (currentFacing === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Capture FULL frame (not cropped to 2x2 or square)
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `live_full_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        stopCamera();
        onCapture(file, previewUrl);
        onClose();
      },
      'image/jpeg',
      0.75
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/95 backdrop-blur-lg animate-fadeIn">
      {/* Full Screen Viewport on Mobile, Roomy Modal on Desktop */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl bg-slate-950 border-0 sm:border border-slate-800 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/90 z-20">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide">{title}</h3>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Full Size Camera Viewport (Habaan ang view - 4:3 or natural full mobile height) */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[55vh] sm:min-h-[480px]">
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs z-10 bg-slate-950">
              <div className="w-9 h-9 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-semibold">{isTl ? 'Binubuksan ang buong camera...' : 'Starting camera...'}</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center text-rose-400 text-xs space-y-3 z-10">
              <span className="text-4xl block">📷🚫</span>
              <p className="font-bold text-sm">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(currentFacing)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                {isTl ? 'Subukan Muli' : 'Retry'}
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover sm:object-contain ${
                currentFacing === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />
          )}

          {/* Full Camera Viewfinder Framing Guide */}
          {!cameraError && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
              {currentFacing === 'environment' ? (
                /* ID Card Landscape Frame (Wide rectangular ID shape) */
                <div className="w-[85%] max-w-md aspect-[1.586/1] border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col items-center justify-between p-3 bg-emerald-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <span className="text-[11px] text-emerald-300 font-extrabold bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/40">
                    {isTl ? '🪪 I-sentro ang AICS Student ID Dito' : '🪪 Align Student ID Here'}
                  </span>
                  <span className="text-[10px] text-slate-300 opacity-80 bg-black/60 px-2 py-0.5 rounded-md">
                    {isTl ? 'Tiyaking maliwanag at nababasa ang ID' : 'Ensure ID text is clear and readable'}
                  </span>
                </div>
              ) : (
                /* Portrait Face Guide (Generous oval/rounded frame for natural selfies) */
                <div className="w-[75%] max-w-xs aspect-[3/4] border-2 border-dashed border-cyan-400/80 rounded-[40px] flex flex-col items-center justify-between p-4 bg-cyan-500/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <span className="text-[11px] text-cyan-300 font-extrabold bg-slate-950/80 px-3 py-1 rounded-full border border-cyan-500/40">
                    {isTl ? '👤 I-sentro ang Iyong Mukha Dito' : '👤 Center Your Face Here'}
                  </span>
                  <span className="text-[10px] text-slate-300 opacity-80 bg-black/60 px-2 py-0.5 rounded-md">
                    {isTl ? 'Actual live selfie (Buong mukha)' : 'Actual live selfie (Full face)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Shutter Controls */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-around gap-4 z-20">
          {/* Flip Camera Button */}
          <button
            type="button"
            onClick={() => setCurrentFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold flex flex-col items-center gap-1 transition-all active:scale-95"
          >
            <span className="text-lg">🔄</span>
            <span className="text-[10px]">
              {currentFacing === 'user' ? (isTl ? 'Rear Camera' : 'Back Camera') : isTl ? 'Front Camera' : 'Front Camera'}
            </span>
          </button>

          {/* Large Shutter Button (Full size mobile snap) */}
          <button
            type="button"
            onClick={handleSnap}
            disabled={isStarting || !!cameraError}
            className="w-20 h-20 rounded-full border-4 border-white/80 bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center shadow-2xl shadow-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Capture Photo"
          >
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-slate-950 text-2xl font-black">
              📸
            </div>
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs font-bold flex flex-col items-center gap-1 transition-colors active:scale-95"
          >
            <span className="text-lg">✕</span>
            <span className="text-[10px]">{isTl ? 'Isara' : 'Close'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
