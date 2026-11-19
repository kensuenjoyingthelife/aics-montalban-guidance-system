import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Cpu,
  FileCheck,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Info
} from 'lucide-react';
import { soundFX } from '../../services/soundEngine';

export const AICY_TERMS_STORAGE_KEY = 'aics_aicy_ai_terms_accepted_v1';

export const isAicyTermsAccepted = (): boolean => {
  try {
    return localStorage.getItem(AICY_TERMS_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setAicyTermsAccepted = (accepted: boolean): void => {
  try {
    if (accepted) {
      localStorage.setItem(AICY_TERMS_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(AICY_TERMS_STORAGE_KEY);
    }
  } catch {
    // ignore in restricted environments
  }
};

interface AicyTermsModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const AicyTermsModal: React.FC<AicyTermsModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreedCheck, setAgreedCheck] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    setAicyTermsAccepted(true);
    soundFX.playSuccessCheck();
    onAccept();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aicy AI Terms and Data Privacy Agreement"
      className="fixed inset-0 z-[9999] pointer-events-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-text"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] border-2 border-[#007AFF]/40 dark:border-sky-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#007AFF] via-[#16377E] to-[#0B1F4D] text-white flex items-center justify-between border-b border-sky-400/20">
          <div className="flex items-center gap-3">
            {/* 3D EVE-Style Head Ball (Terms Header) */}
            <div className="w-11 h-11 rounded-full mascot-shell-head flex items-center justify-center p-1 overflow-hidden shadow-inner shrink-0 border border-white/20">
              <div className="w-8 h-6 rounded-full mascot-visor-glass flex items-center justify-center gap-1.5 overflow-hidden">
                <svg className="w-2.5 h-2" viewBox="0 0 20 14" fill="none">
                  <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                </svg>
                <svg className="w-2.5 h-2" viewBox="0 0 20 14" fill="none">
                  <path d="M 2 12 Q 10 1 18 12" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">Aicy AI</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                  Data Privacy Bound
                </span>
              </div>
              <p className="text-xs text-blue-100/90 font-medium">
                Terms of Use, System Security & Technical Privacy Safeguards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDecline}
            title="Close"
            aria-label="Close"
            className="w-8 h-8 rounded-lg hover:bg-white/15 active:scale-[0.97] transition-all flex items-center justify-center text-white/90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 clean-scroll bg-[#F5F5F7] dark:bg-[#070D1B]"
        >
          {/* Important Notice Callout */}
          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-[#007AFF] dark:text-[#409CFF] shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed text-[#1D1D1F] dark:text-sky-200">
              <p className="font-extrabold text-[12.5px] text-[#007AFF] dark:text-[#409CFF]">
                Mandatory Notice for Guidance Personnel
              </p>
              <p className="mt-0.5 font-medium">
                Prior to interacting with <strong>Aicy AI</strong>, Guidance Staff must review and confirm adherence to the terms and privacy safeguards below. This operational charter strictly complies with <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and the <strong>Department of Education Child Protection Policy</strong>.
              </p>
            </div>
          </div>

          {/* CARD 1: Purpose of Aicy AI */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007AFF] dark:text-[#409CFF]">
              <Cpu className="w-4 h-4 text-[#007AFF] dark:text-[#409CFF]" />
              <span>1. System Purpose: Guidance Assistant & Workflow Navigator</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              <strong>Aicy AI</strong> is designed exclusively as an <strong>intelligent assistant</strong> to help Guidance Office staff navigate institutional workflows, locate portal modules, adhere to Standard Operating Procedures (SOPs), and streamline administrative management.
            </p>
            <p className="text-[11.5px] text-[#6E6E73] dark:text-[#A1A1A6] font-semibold bg-slate-50 dark:bg-[#1C1C1E] p-2 rounded-lg border border-slate-100 dark:border-white/5">
              Examples of supported inquiries: "How do I schedule a parent conference?", "Where can I view the student masterlist?", "How do I generate an official incident slip?".
            </p>
          </div>

          {/* CARD 2: Zero Data Leakage & Technical Proofs */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-[#1C1C1E] shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>2. Zero Data Ingestion & Technical Architecture Proofs</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              <strong>Student records are never ingested or transmitted to third-party language models.</strong> For verification by institutional administrators, thesis evaluation panels, and external auditors, the system enforces the following guarantees:
            </p>
            <div className="space-y-1.5 text-[11px] text-emerald-950 dark:text-emerald-200 font-medium">
              <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-0.5">
                <p className="font-extrabold text-emerald-900 dark:text-emerald-300">
                  • Technical Proof 1: Code-Level Sanitization & Zero Database Dumping
                </p>
                <p>
                  The system payload only contains the specific operational query entered by the staff (e.g. "how to resolve a case"). Database tables, student credentials, and contact details are explicitly excluded from AI prompts.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-0.5">
                <p className="font-extrabold text-emerald-900 dark:text-emerald-300">
                  • Technical Proof 2: Transparent Network Payload Inspection
                </p>
                <p>
                  All network requests are inspectable via Browser Developer Tools (F12). No confidential student files or discipline case history are sent across external model endpoints.
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-0.5">
                <p className="font-extrabold text-emerald-900 dark:text-emerald-300">
                  • Technical Proof 3: Zero-Data Retention & Non-Training Policy
                </p>
                <p>
                  The underlying API integration operates under an enterprise zero-retention policy. Queries are processed statelessly in memory and are never utilized to train public or proprietary models.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 3: Human Authority & Accountability */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-white dark:bg-[#1C1C1E] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>3. Human-in-the-Loop Authority & Disciplinary Accountability</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              <strong>Disciplinary outcomes are never automated.</strong> Aicy AI does not issue sanctions, close cases, or modify records autonomously. The designated Guidance Counselor or Guidance Associate retains <strong>sole responsibility, legal discretion, and ethical authority</strong> over every formal decision.
            </p>
          </div>

          {/* CARD 4: Data Privacy Act (RA 10173) & Legal Compliance */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#38383A] bg-white dark:bg-[#1C1C1E] shadow-xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#007AFF] dark:text-[#409CFF]">
              <ShieldCheck className="w-4 h-4 text-[#007AFF] dark:text-[#409CFF]" />
              <span>4. Full Compliance with RA 10173 (Data Privacy Act of 2012)</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              Every system interaction adheres to the fundamental privacy principles of <em>Transparency, Legitimate Purpose, and Proportionality</em>. The institution rigorously safeguards the privacy, academic welfare, and reputation of every student under its care.
            </p>
          </div>
        </div>

        {/* Footer Acceptance Section */}
        <div className="p-4 bg-slate-50 dark:bg-[#1C1C1E] border-t border-slate-200 dark:border-[#38383A] space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedCheck}
              onChange={(e) => {
                setAgreedCheck(e.target.checked);
                soundFX.playToggleSwitch(e.target.checked);
              }}
              className="mt-0.5 w-4 h-4 rounded text-[#007AFF] border-slate-300 focus:ring-[#007AFF] cursor-pointer"
            />
            <span className="text-xs font-bold text-[#1D1D1F] dark:text-white leading-tight">
              I have read, understood, and accept these operational terms. I confirm as Guidance Personnel that AI serves strictly as an assistive tool, and our office retains full accountability for all official actions.
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-[#6E6E73] dark:text-[#A1A1A6] font-medium">
              Ready to initialize assistant.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDecline}
                className="px-4 py-2 rounded-xl text-xs font-bold saas-card-subtle text-[#6E6E73] dark:text-[#A1A1A6] hover:text-[#1D1D1F] active:scale-[0.97] transition-all"
              >
                Decline
              </button>
              <button
                type="button"
                disabled={!agreedCheck}
                onClick={handleAccept}
                className="px-5 py-2 rounded-xl text-xs font-black bg-[#007AFF] hover:bg-[#0062CC] text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-[0.97] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Accept & Proceed</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
