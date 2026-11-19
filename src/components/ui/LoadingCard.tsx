import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, WifiOff, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface LoadingTaskOptions {
  id?: string;
  titleEn?: string;
  titleTl?: string;
  messageEn?: string;
  messageTl?: string;
  timeoutMs?: number;
}

interface LoadingContextType {
  startLoading: (opts?: LoadingTaskOptions) => string;
  stopLoading: (id?: string) => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export const useLoading = (): LoadingContextType => {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return ctx;
};

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';

  const [activeTasks, setActiveTasks] = useState<Map<string, LoadingTaskOptions>>(new Map());
  const [slowDetected, setSlowDetected] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const slowTimerRef = useRef<number | null>(null);

  // Monitor browser online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isLoading = activeTasks.size > 0;

  // Track slow connection / long pending request (> 3.2s)
  useEffect(() => {
    if (isLoading) {
      slowTimerRef.current = window.setTimeout(() => {
        setSlowDetected(true);
      }, 3200);
    } else {
      setSlowDetected(false);
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
    }
    return () => {
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
      }
    };
  }, [isLoading]);

  const startLoading = useCallback((opts?: LoadingTaskOptions): string => {
    const taskId = opts?.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setActiveTasks((prev) => {
      const next = new Map(prev);
      next.set(taskId, { id: taskId, ...opts });
      return next;
    });
    return taskId;
  }, []);

  const stopLoading = useCallback((id?: string) => {
    setActiveTasks((prev) => {
      const next = new Map(prev);
      if (id) {
        next.delete(id);
      } else {
        // clear all if no id specified
        next.clear();
      }
      return next;
    });
  }, []);

  // Derive latest active task metadata
  const currentTask = Array.from(activeTasks.values()).pop();
  const title = isTl
    ? currentTask?.titleTl || 'Ipinoproseso ang aksyon...'
    : currentTask?.titleEn || 'Processing request...';
  const message = isTl
    ? currentTask?.messageTl || 'Kumokonekta sa secure database, sandali lamang...'
    : currentTask?.messageEn || 'Connecting to secure database, please wait...';

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading, isLoading }}>
      {children}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="global-loading-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none"
          >
            <motion.div
              key="global-loading-card"
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#94A3B8] dark:border-[#38383A] p-5 shadow-2xl relative overflow-hidden"
              role="alertdialog"
              aria-busy="true"
              aria-live="assertive"
            >
              {/* Subtle top indicator bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#007AFF] via-sky-500 to-indigo-600 animate-pulse" />

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-[#13233F] border border-blue-200 dark:border-blue-800/60 shrink-0 text-[#007AFF] dark:text-[#409CFF]">
                  {isOffline ? (
                    <WifiOff className="w-6 h-6 text-rose-500" />
                  ) : (
                    <Loader2 className="w-6 h-6 animate-spin text-[#007AFF] dark:text-[#409CFF]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-[#1D1D1F] dark:text-white leading-tight">
                    {isOffline
                      ? isTl ? 'Nawalan ng Koneksyon' : 'Offline Mode Detected'
                      : title}
                  </h4>
                  <p className="text-xs text-[#6E6E73] dark:text-[#A1A1A6] mt-1 leading-relaxed">
                    {isOffline
                      ? isTl
                        ? 'Walang aktibong internet. Sinusubukang i-sync ang data kapag bumalik ang linya.'
                        : 'No internet connection detected. Retrying when connection is restored.'
                      : message}
                  </p>

                  {/* Slow Internet / High Latency Warning Badge */}
                  {slowDetected && !isOffline && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                      <span className="font-medium leading-tight">
                        {isTl
                          ? 'Medyo mabagal ang internet. Huwag isara, patuloy na naghihintay ng tugon...'
                          : 'Slow connection detected. Do not close, still awaiting server response...'}
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Safe Dismiss button if hanging > 8s */}
              {slowDetected && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => stopLoading()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] dark:hover:text-white border border-[#D1D1D6] dark:border-[#38383A] active:scale-[0.97] transition-all"
                  >
                    {isTl ? 'Isara ang abiso' : 'Dismiss notice'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoadingContext.Provider>
  );
};
