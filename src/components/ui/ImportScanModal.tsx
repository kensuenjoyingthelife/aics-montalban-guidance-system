import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScanningScene } from './ScanningScene';
import type { ImportAnalysis } from '../../services/masterlistImport';
import type { Finding } from '../../services/importFindings';

/**
 * Center-screen "the system is reading your whole Excel" popup.
 *  Phase 1 · reading   – real worker progress (checking file → opening → scanning)
 *  Phase 2 · rows      – walks through every student actually read from the file
 *  Phase 3 · findings  – reveals the real findings one by one
 *  Phase 4 · done      – summary + Continue
 * Total ≈ 3–5 s. "Skip" jumps straight to the summary at any time.
 */

type Phase = 'reading' | 'rows' | 'findings' | 'done';

type Props = {
  open: boolean;
  isTl: boolean;
  fileName: string;
  /** Real progress from the worker: 1 checking, 2 opening, 3 scanning, 4 finished. */
  stage: number;
  analysis: ImportAnalysis | null;
  findings: Finding[];
  needsFixCount: number;
  onContinue: () => void;
  /** Kept for API compatibility; the popup cannot be cancelled while reading. */
  onCancel?: () => void;
};

const ROW_WALK_MIN_MS = 1400;
const ROW_WALK_MAX_MS = 2600;
const FINDING_STEP_MS = 320;

const toneIcon = { ok: '✓', info: '✦', warn: '!' } as const;
const toneClass = {
  ok: 'bg-emerald-500 text-white',
  info: 'bg-[#2557BE] text-white',
  warn: 'bg-amber-500 text-white',
} as const;

export const ImportScanModal: React.FC<Props> = ({
  open,
  isTl,
  fileName,
  stage,
  analysis,
  findings,
  needsFixCount,
  onContinue,

}) => {
  const [phase, setPhase] = useState<Phase>('reading');
  const [rowIndex, setRowIndex] = useState(0);
  const [shownFindings, setShownFindings] = useState(0);
  const continueRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const rows = analysis?.extract.rows ?? [];
  const total = rows.length;

  // Reset when a new file starts
  useEffect(() => {
    if (open && !analysis) {
      setPhase('reading');
      setRowIndex(0);
      setShownFindings(0);
    }
  }, [open, analysis]);

  // Phase 1 → 2 when the worker finishes
  useEffect(() => {
    if (open && analysis && phase === 'reading') setPhase(total > 0 ? 'rows' : 'findings');
  }, [open, analysis, phase, total]);

  // Phase 2: walk through every row (rAF-driven, no work per frame besides one state update)
  useEffect(() => {
    if (phase !== 'rows' || total === 0) return;
    const duration = Math.min(ROW_WALK_MAX_MS, Math.max(ROW_WALK_MIN_MS, total * 60));
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setRowIndex(Math.min(total - 1, Math.floor(p * total)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPhase('findings');
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, total]);

  // Phase 3: reveal findings one by one
  useEffect(() => {
    if (phase !== 'findings') return;
    if (shownFindings >= findings.length) {
      const id = window.setTimeout(() => setPhase('done'), 250);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setShownFindings((n) => n + 1), FINDING_STEP_MS);
    return () => window.clearTimeout(id);
  }, [phase, shownFindings, findings.length]);

  // Focus stays inside the popup. While reading, nothing can be clicked or tabbed to;
  // when done, the only control is "See the results".
  useEffect(() => {
    if (!open) return;
    if (phase === 'done') continueRef.current?.focus();
    else dialogRef.current?.focus();
  }, [open, phase]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault(); // keep keyboard focus inside the popup
        if (phase === 'done') continueRef.current?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault(); // must wait until reading finishes
      }
    };
    // If focus ever lands outside the popup (e.g. a click on the backdrop), pull it back in
    const onFocusIn = (e: FocusEvent) => {
      if (!dialogRef.current?.contains(e.target as Node)) {
        (phase === 'done' ? continueRef.current : dialogRef.current)?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, phase]);

  // Overall percent across the 3 visible phases
  const percent = useMemo(() => {
    if (phase === 'done') return 100;
    if (phase === 'reading') return Math.round(((Math.max(stage, 1) - 0.5) / 3) * 40); // 0–40%
    if (phase === 'rows') return 40 + Math.round(((rowIndex + 1) / Math.max(total, 1)) * 40); // 40–80%
    return 80 + Math.round((shownFindings / Math.max(findings.length, 1)) * 20); // 80–100%
  }, [phase, stage, rowIndex, total, shownFindings, findings.length]);

  const current = rows[rowIndex];
  const readingLabel = [
    isTl ? 'Chine-check ang file…' : 'Checking the file…',
    isTl ? 'Binubuksan ang Excel…' : 'Opening the Excel file…',
    isTl ? 'Hinahanap ang mga column at estudyante…' : 'Finding columns and students…',
  ][Math.min(Math.max(stage, 1), 3) - 1];

  const headline =
    phase === 'done'
      ? isTl
        ? 'Tapos nang basahin ang buong file!'
        : 'Finished reading the whole file!'
      : phase === 'findings'
      ? isTl
        ? 'Sinusuri ang mga nakita…'
        : 'Checking what we found…'
      : phase === 'rows'
      ? isTl
        ? 'Binabasa ang bawat estudyante…'
        : 'Reading every student…'
      : readingLabel;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // Backdrop swallows clicks and keeps focus in the popup (nothing behind can be used)
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
          className="fixed inset-0 !m-0 z-[110] bg-[#06122B]/55 backdrop-blur-[3px] flex items-center justify-center p-4"
        >
          <motion.div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-scan-title"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="w-full max-w-xl max-h-[calc(100dvh/var(--app-zoom,1)_-_2rem)] flex flex-col rounded-3xl saas-card shadow-2xl overflow-hidden outline-none"
          >
            {/* Header + body scroll together on short screens; the footer button always stays visible */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {/* Official header: AICS seal + system name */}
            <div className="flex items-center gap-3 px-6 pt-5 pb-3 bg-[#EEF3FD] dark:bg-[#12213F]">
              <span className="w-10 h-10 shrink-0 rounded-full overflow-hidden ring-2 ring-white dark:ring-[#1E3158] shadow-sm bg-white">
                {/* The seal ring is ~78% of the image, so scale 1.28× to fill the circle exactly */}
                <img
                  src={`${import.meta.env.BASE_URL}aics-logo.jpg`}
                  alt="AICS seal"
                  className="w-full h-full object-cover scale-[1.28]"
                  draggable={false}
                />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="text-[13px] font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl ? 'AICS Guidance Office' : 'AICS Guidance Office'}
                </p>
                <p className="text-[11px] font-semibold text-[#4A608A] dark:text-[#94A8D0]">
                  {isTl ? 'Masterlist Scanner · Montalban' : 'Masterlist Scanner · Montalban'}
                </p>
              </div>
            </div>

            {/* Illustration */}
            <div className="bg-gradient-to-b from-[#EEF3FD] to-transparent dark:from-[#12213F] px-6 pt-1">
              <ScanningScene
                done={phase === 'done'}
                title={isTl ? 'Binabasa ang Excel' : 'Reading the Excel file'}
                className="w-full max-w-sm max-h-[30vh] mx-auto block"
              />
            </div>

            <div className="px-6 pb-2">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#2557BE] dark:text-[#7CB8F7] truncate">
                {fileName}
              </p>
              <h3 id="import-scan-title" className="mt-0.5 text-lg font-extrabold text-[#0B1F4D] dark:text-white" aria-live="polite">
                {headline}
              </h3>

              {/* Progress */}
              <div className="mt-3 flex items-center gap-3">
                <div className="relative flex-1 h-2.5 rounded-full bg-[#DCE5F2] dark:bg-[#1E3158] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-200 ease-out ${
                      phase === 'done' ? 'from-emerald-500 to-emerald-400' : 'from-[#1E469B] to-[#4E92DF]'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                  {phase !== 'done' && (
                    <div className="import-scan absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 dark:via-white/25 to-transparent" />
                  )}
                </div>
                <span className="w-10 text-right text-xs font-mono font-bold text-[#2557BE] dark:text-[#7CB8F7]">{percent}%</span>
              </div>

              {/* Phase 2: live row reader */}
              {(phase === 'rows' || (phase !== 'reading' && total > 0)) && (
                <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-[#F6F9FE] dark:bg-[#0E1A33] border border-[#E2E9F5] dark:border-[#1E3158]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#687FA8] dark:text-[#89A7DF]">
                    <span>
                      {(analysis?.sourceLabels[rowIndex] ?? '').replace(/\brow (\d+)$/, isTl ? 'Row $1 sa Excel' : 'Excel row $1')}
                    </span>
                    <span className="font-mono">
                      {isTl ? 'Estudyante' : 'Student'} {Math.min(rowIndex + 1, total)} / {total}
                    </span>
                  </div>
                  {current && (
                    <div className="mt-1 flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 shrink-0 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#AFCBFA] text-[11px] font-extrabold flex items-center justify-center">
                        {(current.fullName || '?')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((w) => w[0])
                          .join('')
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white truncate">
                          {current.fullName || (isTl ? '(walang pangalan)' : '(no name)')}
                        </p>
                        <p className="text-[11px] font-semibold text-[#4A608A] dark:text-[#94A8D0] truncate font-mono">
                          {current.studentNumber || '—'} · {current.gradeSection || '—'} · {current.parentPhone || '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 3: findings */}
              {(phase === 'findings' || phase === 'done') && (
                <ul className="mt-3 space-y-1.5" aria-live="polite">
                  {findings.slice(0, shownFindings).map((f, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-start gap-2.5 text-[13px] font-semibold text-[#0B1F4D] dark:text-white"
                    >
                      <span className={`mt-0.5 w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full text-[10px] font-extrabold flex items-center justify-center ${toneClass[f.tone]}`}>
                        {toneIcon[f.tone]}
                      </span>
                      <span>{f.text}</span>
                    </motion.li>
                  ))}
                </ul>
              )}

              {phase === 'done' && analysis && (
                <div
                  className={`mt-3 px-3.5 py-2.5 rounded-xl text-[13px] font-bold ${
                    needsFixCount > 0
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                  }`}
                >
                  {needsFixCount > 0
                    ? isTl
                      ? `${total - needsFixCount} handa nang i-save · ${needsFixCount} row ang aayusin mo sa susunod na hakbang.`
                      : `${total - needsFixCount} ready to save · ${needsFixCount} ${needsFixCount === 1 ? 'row' : 'rows'} to fix in the next step.`
                    : isTl
                    ? `Lahat ng ${total} estudyante ay handa nang i-save!`
                    : `All ${total} students are ready to save!`}
                </div>
              )}
            </div>
            <div className="h-3" />
            </div>

            <div className="shrink-0 px-6 py-4 flex items-center justify-end gap-2 min-h-[64px] bg-[#F6F9FE] dark:bg-[#0E1A33] border-t border-[#E2E9F5] dark:border-[#1E3158]">
              {phase === 'done' ? (
                <button
                  ref={continueRef}
                  type="button"
                  onClick={onContinue}
                  className="btn-press px-5 py-2.5 rounded-xl bg-[#1E469B] hover:bg-[#16377E] text-white text-xs font-extrabold shadow-sm"
                >
                  {isTl ? 'Tingnan ang resulta →' : 'See the results →'}
                </button>
              ) : (
                <p className="text-xs font-semibold text-[#687FA8] dark:text-[#89A7DF]">
                  {isTl ? 'Sandali lang, binabasa pa…' : 'Please wait, still reading…'}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImportScanModal;
