import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Before → After confirmation for actions that change records or leave the system
 * (SMS/Gmail, No-Show, saving cases, imports). Quick reversible actions should use Undo instead.
 */

export type ChangeRow = {
  label: string;
  before?: string;
  after: string;
};

export type ConfirmOptions = {
  title: string;
  /** One plain sentence: what will happen. */
  description?: string;
  rows: ChangeRow[];
  confirmLabel?: string;
  tone?: 'primary' | 'danger' | 'success';
  /** Extra warning line, e.g. "This sends a real SMS to the parent." */
  note?: string;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export const useConfirmChange = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirmChange must be used inside <ConfirmChangeProvider>');
  return ctx;
};

const toneBtn = {
  primary: 'bg-[#007AFF] hover:bg-[#0062CC]',
  danger: 'bg-[#FF3B30] hover:bg-[#E0352B]',
  success: 'bg-[#34C759] hover:bg-[#2DB14F]',
};

export const ConfirmChangeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    // If one is already open, cancel it first.
    resolver.current?.(false);
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  useEffect(() => {
    if (!opts) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts]);

  const tone = opts?.tone ?? 'primary';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => close(false)}
            data-confirm-open
            className="fixed inset-0 !m-0 z-[120] bg-black/30 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-change-title"
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[24px] bg-white dark:bg-[#1C1C1E] shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_30px_80px_-20px_rgba(0,0,0,0.45)] overflow-hidden"
            >
              <div className="w-full overflow-hidden">
              <div className="px-6 pt-6 pb-3">
                <p className="text-[12px] font-semibold text-[#8E8E93]">
                  {isTl ? 'I-check bago i-save' : 'Check before saving'}
                </p>
                <h3
                  id="confirm-change-title"
                  className="mt-0.5 text-[20px] font-semibold text-[#1D1D1F] dark:text-white tracking-tight"
                >
                  {opts.title}
                </h3>
                {opts.description && (
                  <p className="mt-1 text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">
                    {opts.description}
                  </p>
                )}
              </div>

              {opts.rows.every((r) => r.before === undefined) ? (
                <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
                  <p className="text-[12px] font-semibold text-[#8E8E93] dark:text-[#A1A1A6] pb-1.5 border-b border-[#E5E5EA] dark:border-[#38383A]">
                    {isTl ? 'Mga detalye' : 'Details'}
                  </p>
                  {opts.rows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[110px_1fr] gap-x-3 items-start py-2 border-b border-[#F2F2F7] dark:border-[#2C2C2E] last:border-b-0 text-[13px]"
                    >
                      <span className="font-bold text-[#6E6E73] dark:text-[#A1A1A6]">{r.label}</span>
                      <span className="break-words font-bold text-[#1D1D1F] dark:text-white">
                        {r.after || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
                <table className="w-full table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col className="w-[30%]" />
                    <col className="w-[31%]" />
                    <col className="w-[8%]" />
                    <col className="w-[31%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-[12px] font-semibold text-[#8E8E93] dark:text-[#A1A1A6] border-b border-[#E5E5EA] dark:border-[#38383A]">
                      <th className="pb-2 font-extrabold" />
                      <th className="pb-2 font-extrabold">{isTl ? 'Dati' : 'Before'}</th>
                      <th className="pb-2" />
                      <th className="pb-2 font-extrabold">{isTl ? 'Magiging' : 'After'}</th>
                    </tr>
                  </thead>
                  <tbody>
                {opts.rows.map((r, i) => {
                  const unchanged = r.before !== undefined && r.before === r.after;
                  return (
                    <tr
                      key={i}
                      className="align-top border-b border-[#F2F2F7] dark:border-[#2C2C2E] last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 font-bold text-[#1D1D1F] dark:text-white">{r.label}</td>
                      <td
                        className={`py-2.5 pr-2 break-words ${
                          r.before === undefined
                            ? 'italic text-[#8A9BBD] dark:text-[#6E84B0]'
                            : unchanged
                            ? 'text-[#6E6E73] dark:text-[#A1A1A6]'
                            : 'text-[#8E8E93] line-through'
                        }`}
                      >
                        {r.before === undefined ? (isTl ? 'wala pa' : 'none') : r.before || '—'}
                      </td>
                      <td className="py-2.5 text-center text-[#8A9BBD]" aria-hidden>
                        →
                      </td>
                      <td
                        className={`py-2.5 break-words font-bold ${
                          unchanged
                            ? 'text-[#6E6E73] dark:text-[#A1A1A6] font-medium'
                            : 'text-[#1D1D1F] dark:text-white'
                        }`}
                      >
                        {r.after || '—'}
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
              )}

              {opts.note && (
                <div className="mx-6 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-[12px] font-semibold text-amber-900 dark:text-amber-200">
                  ⚠ {opts.note}
                </div>
              )}

              <div className="px-6 pt-3 pb-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="btn-press h-10 px-5 rounded-full bg-black/[0.05] dark:bg-white/10 text-[14px] font-semibold text-[#1D1D1F] dark:text-white"
                >
                  {isTl ? 'Bumalik' : 'Go back'}
                </button>
                <button
                  ref={confirmBtn}
                  type="button"
                  onClick={() => close(true)}
                  className={`btn-press h-10 px-5 rounded-full text-white text-[14px] font-semibold ${toneBtn[tone]}`}
                >
                  {opts.confirmLabel ?? (isTl ? 'Oo, i-save' : 'Yes, save')}
                </button>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
