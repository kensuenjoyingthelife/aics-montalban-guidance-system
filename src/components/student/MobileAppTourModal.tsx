import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuidedTourStep {
  id: number;
  badge: string;
  titleTl: string;
  titleEn: string;
  targetIcon: string;
  descTl: string;
  descEn: string;
  importantNoteTl: string;
  importantNoteEn: string;
  arrowPosition: 'top-left' | 'top-right' | 'center' | 'floating-mascot' | 'bottom';
}

const TOUR_STEPS: GuidedTourStep[] = [
  {
    id: 1,
    badge: 'STEP 1 NG 4 • PINAKAMAHALAGA',
    titleTl: '🔴 SOS Emergency Exit: Ang Iyong Ligtas na Takbuhan',
    titleEn: '🔴 SOS Emergency Exit: Your Instant Safety Shield',
    targetIcon: '🤖',
    descTl:
      'Ito ang lumulutang na Mukha ng Mascot sa iyong screen. Pwede mo itong i-drag at ilipat kahit saan. Kapag may biglang sumilip, lumapit na bully, o kaklase habang nag-uulat ka, ISANG TAP LANG dito — agad magla-logout ang app, susubukang isara ang tab, at lilipat agad sa Google Search!',
    descEn:
      'This floating Mascot Head follows you everywhere and can be dragged anywhere on your screen. If someone peeks or approaches while you are reporting, JUST ONE TAP instantly purges your session, closes the screen, and escapes to Google Search!',
    importantNoteTl: '💡 Hindi malalaman ninuman na nag-open ka ng guidance report.',
    importantNoteEn: '💡 Nobody will ever know you had a guidance report open.',
    arrowPosition: 'floating-mascot',
  },
  {
    id: 2,
    badge: 'STEP 2 NG 4 • KUMPIDENSYAL NA PAG-UULAT',
    titleTl: '📝 Ligtas at Direktang Magpasa ng Concern',
    titleEn: '📝 Safe & Direct Concern Submission',
    targetIcon: '✍️',
    descTl:
      'Pindutin ang "Mag-submit ng Concern" para mag-ulat ng pambu-bully, mental distress, o problema. Tanging ang lisensyadong Guidance Counselor at Guidance Associate lamang ang makakabasa nito. Protektado ka ng Data Privacy Act (RA 10173).',
    descEn:
      'Tap "Submit a Concern" to report bullying, mental distress, or personal safety issues. Only licensed Guidance personnel can view this. Strictly protected by the Data Privacy Act (RA 10173).',
    importantNoteTl: '🔒 Bawal at hindi makikita ng mga kaklase o ibang guro ang ulat mo.',
    importantNoteEn: '🔒 Strictly hidden from peers, classmates, and teachers.',
    arrowPosition: 'center',
  },
  {
    id: 3,
    badge: 'STEP 3 NG 4 • REAL-TIME TRACKING & CHAT',
    titleTl: '💬 Status Tracker at Direct Concern Chat',
    titleEn: '💬 Status Tracker & Direct Concern Chat',
    targetIcon: '📱',
    descTl:
      'Makikita mo rito ang progreso ng iyong ulat (Pending, Under Review, o Approved). Kapag na-approve na ng Guidance Office, magbubukas ang kumpidensyal na Concern Chat para makausap mo sila nang pribado sa iyong cellphone.',
    descEn:
      'Track the real-time review progress of your concern. Once approved by the Guidance Office, a secure one-on-one Concern Chat unlocks so you can message them privately.',
    importantNoteTl: '🔔 Makakatanggap ka ng real-time notification sa phone kapag nag-reply sila.',
    importantNoteEn: '🔔 You receive instant phone notifications when guidance staff reply.',
    arrowPosition: 'bottom',
  },
  {
    id: 4,
    badge: 'STEP 4 NG 4 • INACTIVITY SHIELD',
    titleTl: '⏱️ 15-Minuto Auto-Logout Proteksyon',
    titleEn: '⏱️ 15-Minute Inactivity Auto-Logout',
    targetIcon: '🛡️',
    descTl:
      'Kapag naiwan mong bukas ang cellphone mo nang walang galaw sa loob ng 15 minuto, kusa itong magsa-sign out upang walang sinumang makialam sa iyong account.',
    descEn:
      'If you accidentally leave your phone unlocked with no activity for 15 minutes, the system automatically logs you out so no one can tamper with your records.',
    importantNoteTl: '✨ Handa ka na! Ligtas at bukas ang AICS Guidance para sa iyo anumang oras.',
    importantNoteEn: '✨ You are ready! AICS Guidance is always open and safe for you.',
    arrowPosition: 'center',
  },
];

interface MobileAppTourModalProps {
  isOpen: boolean;
  onComplete: () => void;
  isTl?: boolean;
}

export const MobileAppTourModal: React.FC<MobileAppTourModalProps> = ({
  isOpen,
  onComplete,
  isTl = true,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0B1E48] via-[#07132B] to-[#040C1E] border-2 border-sky-400/60 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-blue-950/90 flex flex-col text-white overflow-hidden">
        {/* Glowing Ambient Top Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-sky-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Top Header & Step Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black tracking-wider uppercase text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-0.5 rounded-full">
              {currentStep.badge}
            </span>
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="text-[11px] font-bold text-slate-400 hover:text-white px-2 py-1 rounded-lg transition-colors"
          >
            {isTl ? 'Laktawan (Skip)' : 'Skip'}
          </button>
        </div>

        {/* Visual Target & Illustrated Pointer Card */}
        <div className="my-4 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
          {/* Animated Big Feature Icon */}
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-3xl shadow-lg shadow-sky-500/30 mb-3 border border-white/30">
            <span>{currentStep.targetIcon}</span>
            {currentStep.id === 1 && (
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-[8px] font-black text-white uppercase border border-white">
                DRAG
              </span>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
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
            className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← {isTl ? 'Bumalik' : 'Back'}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 py-2.5 px-5 rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-600 hover:opacity-95 active:scale-98 text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all"
          >
            <span>{isLast ? (isTl ? 'Naiintindihan Ko Na! Simulan Na' : 'Got it! Get Started') : isTl ? 'Susunod (Next)' : 'Next Step'}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
