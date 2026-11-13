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

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
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

    let width = video.videoWidth || 640;
    let height = video.videoHeight || 480;
    // Fast optimization: limit to 1024px maximum dimension for instant upload
    const maxDimension = 1024;
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

    // If front camera, flip horizontally for mirror selfie feel
    if (currentFacing === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const fileName = `live_capture_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      stopCamera();
      onCapture(file, previewUrl);
      onClose();
    }, 'image/jpeg', 0.72);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide">{title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>{isTl ? 'Binubuksan ang camera...' : 'Starting camera...'}</span>
            </div>
          )}

          {cameraError ? (
            <div className="p-6 text-center text-rose-400 text-xs space-y-3">
              <span className="text-3xl block">📷🚫</span>
              <p className="font-bold">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(currentFacing)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
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
              className={`w-full h-full object-cover ${currentFacing === 'user' ? 'scale-x-[-1]' : ''}`}
            />
          )}

          {/* Guidelines Overlay */}
          {!cameraError && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-dashed border-emerald-400/60 rounded-2xl flex items-center justify-center">
                <span className="text-[10px] text-emerald-300 font-bold bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {currentFacing === 'user'
                    ? isTl
                      ? 'I-sentro ang Mukha Dito'
                      : 'Center Face Here'
                    : isTl
                    ? 'I-sentro ang ID Dito'
                    : 'Center ID Here'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrentFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>🔄</span>
            <span>{currentFacing === 'user' ? (isTl ? 'Rear Cam' : 'Back Cam') : isTl ? 'Front Cam' : 'Front Cam'}</span>
          </button>

          <button
            type="button"
            onClick={handleSnap}
            disabled={isStarting || !!cameraError}
            className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <span className="text-sm">📸</span>
            <span>{isTl ? 'Kumuha ng Litrato' : 'Snap Photo'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs font-bold transition-colors"
          >
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
