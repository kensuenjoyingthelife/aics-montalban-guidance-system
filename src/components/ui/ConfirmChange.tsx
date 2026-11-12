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
  primary: 'bg-[#1E469B] hover:bg-[#16377E]',
  danger: 'bg-rose-600 hover:bg-rose-700',
  success: 'bg-emerald-600 hover:bg-emerald-700',
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
            className="fixed inset-0 !m-0 z-[120] bg-[#06122B]/45 backdrop-blur-[3px] flex items-center justify-center p-4"
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-change-title"
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 6 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-2xl saas-card shadow-2xl border border-[#DCE5F2] dark:border-[#243B6B] overflow-hidden"
            >
              <div className="px-6 pt-5 pb-3">
                <p className="text-[11px] font-extrabold tracking-wider uppercase text-[#687FA8] dark:text-[#89A7DF]">
                  {isTl ? 'I-check muna bago i-save' : 'Review before saving'}
                </p>
                <h3
                  id="confirm-change-title"
                  className="mt-1 text-lg font-extrabold text-[#0B1F4D] dark:text-white"
                >
                  {opts.title}
                </h3>
                {opts.description && (
                  <p className="mt-1 text-[13px] font-medium text-[#4A608A] dark:text-[#94A8D0]">
                    {opts.description}
                  </p>
                )}
              </div>

              {opts.rows.every((r) => r.before === undefined) ? (
                <div className="px-6 pb-2 max-h-[50vh] overflow-y-auto">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#687FA8] dark:text-[#89A7DF] pb-1.5 border-b border-[#E2E9F5] dark:border-[#1E3158]">
                    {isTl ? 'Mga detalye' : 'Details'}
                  </p>
                  {opts.rows.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[110px_1fr] gap-x-3 items-start py-2 border-b border-[#EEF2F9] dark:border-[#172644] last:border-b-0 text-[13px]"
                    >
                      <span className="font-bold text-[#4A608A] dark:text-[#94A8D0]">{r.label}</span>
                      <span className="break-words font-bold text-[#0B1F4D] dark:text-white">
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
                    <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-[#687FA8] dark:text-[#89A7DF] border-b border-[#E2E9F5] dark:border-[#1E3158]">
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
                      className="align-top border-b border-[#EEF2F9] dark:border-[#172644] last:border-b-0"
                    >
                      <td className="py-2.5 pr-3 font-bold text-[#0B1F4D] dark:text-white">{r.label}</td>
                      <td
                        className={`py-2.5 pr-2 break-words ${
                          r.before === undefined
                            ? 'italic text-[#8A9BBD] dark:text-[#6E84B0]'
                            : unchanged
                            ? 'text-[#4A608A] dark:text-[#94A8D0]'
                            : 'text-rose-700 dark:text-rose-300 line-through decoration-rose-400/60'
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
                            ? 'text-[#4A608A] dark:text-[#94A8D0] font-medium'
                            : 'text-emerald-700 dark:text-emerald-300'
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

              <div className="px-6 py-4 mt-3 flex justify-end gap-2 bg-[#F6F9FE] dark:bg-[#0E1A33] border-t border-[#E2E9F5] dark:border-[#1E3158]">
                <button
                  type="button"
                  onClick={() => close(false)}
                  className="btn-press px-4 py-2 rounded-lg saas-card-subtle text-xs font-bold text-[#0B1F4D] dark:text-white"
                >
                  {isTl ? 'Bumalik / I-edit' : 'Go back & edit'}
                </button>
                <button
                  ref={confirmBtn}
                  type="button"
                  onClick={() => close(true)}
                  className={`btn-press px-5 py-2 rounded-lg text-white text-xs font-extrabold shadow-sm ${toneBtn[tone]}`}
                >
                  {opts.confirmLabel ?? (isTl ? 'Oo, i-save' : 'Yes, save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
};
