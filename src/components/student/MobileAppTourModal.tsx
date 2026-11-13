import React, { useState } from 'react';

interface GuidedTourStep {
  id: number;
  badgeTl: string;
  badgeEn: string;
  titleTl: string;
  titleEn: string;
  descTl: string;
  descEn: string;
  importantNoteTl: string;
  importantNoteEn: string;
}

const TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 1,
    badgeTl: 'HAKBANG 1 NG 4 • PINAKAMAHALAGA',
    badgeEn: 'STEP 1 OF 4 • MOST CRITICAL',
    titleTl: '🔴 SOS Mascot Exit: Ligtas na Takbuhan',
    titleEn: '🔴 SOS Mascot Exit: Instant Privacy Shield',
    descTl:
      'Ito ang lumulutang na bilog na Mukha ng Mascot sa screen ng phone mo! Pwede mo itong i-drag at ilipat sa kahit saang pwesto. Kapag may biglang lumapit na bully, sumilip na kaklase, o guro habang nag-susumite ka ng report, ISANG TAP LANG dito — agad magla-logout ang app, susubukang isara ang tab, at lilipat agad sa Google Search!',
    descEn:
      'This is the floating Mascot Head ball on your phone screen! You can drag and position it anywhere along the edges. If someone peeks or approaches while you are reporting, JUST ONE TAP instantly logs you out, attempts to close the tab, and escapes directly to Google Search!',
    importantNoteTl: '💡 Protektado ka: Walang makakaalam o makakakitang nagbukas ka ng guidance portal.',
    importantNoteEn: '💡 Total Protection: Nobody will ever know you had a guidance portal open.',
  },
  {
    id: 2,
    badgeTl: 'HAKBANG 2 NG 4 • KUMPIDENSYAL NA REPORT',
    badgeEn: 'STEP 2 OF 4 • CONFIDENTIAL REPORTING',
    titleTl: '📝 Page-by-Page Google Form Pag-uulat',
    titleEn: '📝 Page-by-Page Structured Concern Submission',
    descTl:
      'Naka-organize na parang Google Form ang pag-report: 1. Category at Para Kanino, 2. Nambully o Suspect Details, at 3. Salaysay at Konteksto. Tanging ang lisensyadong Guidance Associate lamang ang makakabasa nito alinsunod sa Data Privacy Act (RA 10173).',
    descEn:
      'Submissions are organized step-by-step like a Google Form: 1. Category & Scope, 2. Bully or Suspect Details, and 3. Narrative & Context. Strictly accessible only by licensed Guidance Staff under the Data Privacy Act (RA 10173).',
    importantNoteTl: '🔒 Hindi ito kailanman makikita ng kaklase, kakilala, o ibang guro.',
    importantNoteEn: '🔒 Never disclosed to classmates, peers, or unauthorized teachers.',
  },
  {
    id: 3,
    badgeTl: 'HAKBANG 3 NG 4 • REAL-TIME TRACKING & CHAT',
    badgeEn: 'STEP 3 OF 4 • TRACKING & COUNSELOR CHAT',
    titleTl: '💬 Status Tracker at 1-on-1 Guidance Chat',
    titleEn: '💬 Real-Time Tracker & 1-on-1 Guidance Chat',
    descTl:
      'Mula sa menu (My Reports at Guidance Chat), masusubaybayan mo ang aksyon ng Guidance Office. Kapag na-review na ang iyong concern, magbubukas ang pribadong 1-on-1 chat upang makausap mo sila nang direkta sa iyong cellphone.',
    descEn:
      'From the menu (My Reports & Guidance Chat), easily track actions taken. Once reviewed, a private 1-on-1 chat channel opens so you can converse directly with the Guidance Associate.',
    importantNoteTl: '🔔 Ligtas magtanong at mag-follow up sa oras ng opisina (8:00 AM - 5:00 PM).',
    importantNoteEn: '🔔 Feel completely safe to ask questions or follow up during school hours.',
  },
  {
    id: 4,
    badgeTl: 'HAKBANG 4 NG 4 • AUTO-LOGOUT SHIELD',
    badgeEn: 'STEP 4 OF 4 • AUTO-LOGOUT SHIELD',
    titleTl: '⏱️ 15-Minuto Inactivity Protection',
    titleEn: '⏱️ 15-Minute Inactivity Protection',
    descTl:
      'Kapag naiwan mong bukas ang cellphone mo o hindi mo nagalaw sa loob ng 15 minuto, kusa itong magsa-sign out upang maprotektahan ang iyong pribadong rekord laban sa mga sumisilip.',
    descEn:
      'If your phone is left unattended for 15 minutes, the system automatically signs out to ensure your confidential guidance records stay protected against prying eyes.',
    importantNoteTl: '✨ Handa ka na! Laging bukas ang AICS Guidance Office para sa iyong kaligtasan at kapakanan.',
    importantNoteEn: '✨ You are all set! The AICS Guidance Office is always ready to support your welfare.',
  },
];

interface MobileAppTourModalProps {
  isOpen: boolean;
  onComplete: () => void;
  defaultLanguage?: 'tl' | 'en';
}

export const MobileAppTourModal: React.FC<MobileAppTourModalProps> = ({
  isOpen,
  onComplete,
  defaultLanguage = 'tl',
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lang, setLang] = useState<'tl' | 'en'>(defaultLanguage);
  const isTl = lang === 'tl';

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-md bg-[#07132B] border-2 border-sky-400/70 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-blue-950/90 flex flex-col text-white overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-500/25 blur-3xl rounded-full pointer-events-none" />

        {/* Top Header: Step Badge + Taglish/English Switcher */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-wider uppercase text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
              {isTl ? currentStep.badgeTl : currentStep.badgeEn}
            </span>
          </div>

          {/* Taglish / English Toggle */}
          <div className="flex items-center p-0.5 rounded-full bg-black/50 border border-white/20">
            <button
              type="button"
              onClick={() => setLang('tl')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer ${
                isTl ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Taglish
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition-colors cursor-pointer ${
                !isTl ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Visual Target Showcase Card */}
        <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
          {/* STEP 1: EXACT MATCH 3D MASCOT HEAD SOS BALL */}
          {currentStep.id === 1 ? (
            <div className="relative mb-3 flex items-center justify-center">
              {/* Outer Pulsing Halo */}
              <div className="relative w-16 h-16 rounded-full bg-slate-900/90 p-1 shadow-2xl shadow-rose-950/80 border-2 border-rose-500 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping pointer-events-none" />

                {/* 3D EVE-Style Pearl Head Sphere */}
                <div className="relative w-14 h-14 rounded-full mascot-shell-head flex items-center justify-center p-1 overflow-hidden shadow-inner">
                  {/* Top Gloss Specular Highlight */}
                  <div className="absolute top-1 left-2 w-5 h-2.5 bg-white/90 rounded-full blur-[0.8px] transform -rotate-30 pointer-events-none" />

                  {/* Deep Obsidian Black Visor */}
                  <div className="relative w-11 h-8 rounded-full mascot-visor-glass flex items-center justify-center gap-1.5 overflow-hidden">
                    {/* Visor Glare Shine */}
                    <div className="absolute -top-1 -left-1 w-7 h-3 bg-white/35 blur-[1px] rounded-full transform -rotate-12 pointer-events-none" />

                    {/* Cute Glowing Cyan Smiling Eyes */}
                    <svg className="w-3.5 h-3 overflow-visible" viewBox="0 0 20 14" fill="none">
                      <path
                        d="M 2 12 Q 10 1 18 12"
                        stroke="#38BDF8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_5px_rgba(56,189,248,0.95)]"
                      />
                    </svg>
                    <svg className="w-3.5 h-3 overflow-visible" viewBox="0 0 20 14" fill="none">
                      <path
                        d="M 2 12 Q 10 1 18 12"
                        stroke="#38BDF8"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="drop-shadow-[0_0_5px_rgba(56,189,248,0.95)]"
                      />
                    </svg>
                  </div>

                  {/* Red SOS Badge */}
                  <span className="absolute bottom-1 px-1.5 py-[0.5px] rounded-full bg-rose-600 text-[7px] font-black text-white tracking-widest uppercase leading-none shadow-md border border-rose-400/40">
                    SOS
                  </span>
                </div>
              </div>
              <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-rose-600 text-[8px] font-black text-white uppercase border border-white shadow-md">
                TAP TO ESCAPE
              </span>
            </div>
          ) : currentStep.id === 2 ? (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shadow-blue-500/30 mb-3 border border-white/20">
              <span>✍️</span>
            </div>
          ) : currentStep.id === 3 ? (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 mb-3 border border-white/20">
              <span>💬</span>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 mb-3 border border-white/20">
              <span>🛡️</span>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
            {isTl ? currentStep.titleTl : currentStep.titleEn}
          </h3>

          <p className="text-xs text-sky-100/90 leading-relaxed mt-2 text-justify sm:text-center">
            {isTl ? currentStep.descTl : currentStep.descEn}
          </p>

          <div className="mt-3 w-full p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-[11px] font-bold text-emerald-300 text-left flex items-start gap-2">
            <span className="shrink-0 text-sm">💡</span>
            <span>{isTl ? currentStep.importantNoteTl : currentStep.importantNoteEn}</span>
          </div>
        </div>

        {/* Step Dots Pagination */}
        <div className="flex items-center justify-center gap-1.5 py-1 mb-4">
          {TOUR_STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStepIndex
                  ? 'w-7 bg-sky-400 shadow-sm shadow-sky-400/50'
                  : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Bottom Nav Controls */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirst}
            className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            ← {isTl ? 'Bumalik' : 'Back'}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 active:scale-98 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span>{isLast ? (isTl ? 'Naiintindihan Ko Na! Simulan Na' : 'Got it! Get Started') : isTl ? 'Susunod (Next)' : 'Next Step'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
