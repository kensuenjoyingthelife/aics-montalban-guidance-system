import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WavyBackground } from '../components/auth/WavyBackground';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { StudentPortalUser } from '../services/studentAuthService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { QuickExitButton } from '../components/security/QuickExitButton';
import { moderateReportContent, recordSecurityAudit } from '../services/securityEngine';
import {
  ConcernMessage,
  fetchMessages,
  fetchMessagesAfter,
  sendMessage,
} from '../services/concernsDb';

interface StudentDashboardProps {
  user: StudentPortalUser;
  onSignOut: () => void;
}

interface StudentConcernHistory {
  id: number;
  referralCode: string;
  category: string;
  whatHappened: string;
  status: string;
  urgency: string;
  chatStatus: 'None' | 'Open' | 'Closed';
  chatClosedAt: string;
  createdAt: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onSignOut }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';

  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'chat'>('submit');

  // Submit Concern Form State
  const [reportType, setReportType] = useState<string>('Bullying / Peer Harassment');
  // Reporting Role: 'self' (Mag-report sa sarili) vs 'peer' (I-report ang nangyari sa kaibigan/kaklase)
  const [reportingRole, setReportingRole] = useState<'self' | 'peer'>('self');
  const [friendName, setFriendName] = useState<string>('');
  const [friendGradeSection, setFriendGradeSection] = useState<string>('');
  const [knowsSuspect, setKnowsSuspect] = useState<'yes' | 'no' | 'unsure'>('no');
  const [suspectName, setSuspectName] = useState<string>('');
  const [suspectDetails, setSuspectDetails] = useState<string>('');
  const [whatHappened, setWhatHappened] = useState<string>('');
  const [happenedWhen, setHappenedWhen] = useState<string>('');
  const [happenedWhere, setHappenedWhere] = useState<string>('');
  const [witnesses, setWitnesses] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [truthfulAck, setTruthfulAck] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedConcernCode, setSubmittedConcernCode] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<StudentConcernHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Direct Student-Guidance Chat State
  const [selectedChatConcern, setSelectedChatConcern] = useState<StudentConcernHistory | null>(null);
  const [chatMessages, setChatMessages] = useState<ConcernMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [chatInputText, setChatInputText] = useState<string>('');
  const [sendingMsg, setSendingMsg] = useState<boolean>(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-Logout Inactivity Timer: 15 minutes (900 seconds)
  // Protects students so no evidence of reporting is left open on shared phones or school computers
  const [secondsRemaining, setSecondsRemaining] = useState<number>(15 * 60);
  const [showIdleWarning, setShowIdleWarning] = useState<boolean>(false);

  // Quick Panic / Discretion Shield Mode
  // If someone approaches or student presses ESC / Panic button, immediately covers the screen with study notes
  const [panicMode, setPanicMode] = useState<boolean>(false);

  // Reset timer on any active user interaction
  const resetInactivityTimer = () => {
    setSecondsRemaining(15 * 60);
    if (showIdleWarning) setShowIdleWarning(false);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Emergency Quick Shield on ESC key
      if (e.key === 'Escape') {
        setPanicMode(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          soundFX.playBackspace();
          onSignOut();
          return 0;
        }
        // Show silent discrete banner when only 60 seconds left
        if (prev <= 60 && !showIdleWarning) {
          setShowIdleWarning(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [showIdleWarning, onSignOut]);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMyHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/student_concerns?student_number=eq.${encodeURIComponent(
          user.studentNumber
        )}&select=*&order=id.desc`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );
      if (res.ok) {
        const rows = await res.json();
        const mapped: StudentConcernHistory[] = rows.map((r: Record<string, unknown>) => ({
          id: Number(r.id),
          referralCode: String(r.referral_code || 'CON-REF'),
          category: String(r.category || r.concern_type || 'General Concern'),
          whatHappened: String(r.what_happened || r.summary_en || ''),
          status: String(r.status || 'Pending'),
          urgency: String(r.urgency || 'Normal'),
          chatStatus: (String(r.chat_status || 'None') as 'None' | 'Open' | 'Closed'),
          chatClosedAt: String(r.chat_closed_at || ''),
          createdAt: String(r.created_at || new Date().toISOString()),
        }));
        setHistory(mapped);

        // If no chat is selected yet, automatically select the most recent concern with an Open or Closed chat
        if (!selectedChatConcern && mapped.length > 0) {
          const firstWithChat = mapped.find((c) => c.chatStatus === 'Open') || mapped[0];
          setSelectedChatConcern(firstWithChat);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    void fetchMyHistory();
  }, []);

  // Poll for new messages when in Chat tab with a selected concern
  useEffect(() => {
    if (!selectedChatConcern) return;
    let isMounted = true;
    let lastMsgId = 0;

    const loadInitialMessages = async () => {
      setLoadingMessages(true);
      const msgs = await fetchMessages(selectedChatConcern.id);
      if (!isMounted) return;
      if (msgs) {
        setChatMessages(msgs);
        if (msgs.length > 0) lastMsgId = msgs[msgs.length - 1].id;
        setTimeout(scrollToBottom, 100);
      }
      setLoadingMessages(false);
    };

    void loadInitialMessages();

    // Check for new office responses every 3.5 seconds
    const interval = setInterval(async () => {
      if (document.visibilityState !== 'visible' || !isMounted) return;
      if (lastMsgId > 0) {
        const newer = await fetchMessagesAfter(selectedChatConcern.id, lastMsgId);
        if (isMounted && newer && newer.length > 0) {
          lastMsgId = newer[newer.length - 1].id;
          soundFX.playStepUnlock();
          setChatMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = newer.filter((m) => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
          setTimeout(scrollToBottom, 100);
        }
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedChatConcern?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChatConcern || !chatInputText.trim() || sendingMsg) return;

    const textToSend = chatInputText.trim();
    setSendingMsg(true);
    soundFX.playToggleSwitch(true);

    const saved = await sendMessage(selectedChatConcern.id, 'student', textToSend);
    setSendingMsg(false);

    if (saved) {
      setChatInputText('');
      setChatMessages((prev) => [...prev, saved]);
      setTimeout(scrollToBottom, 100);
    } else {
      soundFX.playError();
    }
  };

  const openConcernChat = (item: StudentConcernHistory) => {
    setSelectedChatConcern(item);
    setActiveTab('chat');
    soundFX.playToggleSwitch(true);
  };

  const handleSubmitConcern = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!truthfulAck) {
      soundFX.playError();
      setSubmitError(
        isTl
          ? 'Pakisuyong kumpirmahin ang Data Privacy at Truthfulness statement.'
          : 'Please acknowledge that the submitted concern is truthful and confidential.'
      );
      return;
    }

    if (!whatHappened.trim()) {
      soundFX.playError();
      setSubmitError(isTl ? 'Ilagay ang detalye ng pangyayari.' : 'Please describe what happened.');
      return;
    }

    // Security Filter: Moderation & XSS Sanitization Check
    const moderation = moderateReportContent(whatHappened);
    if (!moderation.isClean) {
      soundFX.playError();
      setSubmitError(
        isTl
          ? `Bawal ang hindi kanais-nais na pananalita o trolling sa opisyal na ulat. Natagpuan ang: "${moderation.flaggedWord}".`
          : `Inappropriate language or trolling is strictly prohibited in official reports. Detected: "${moderation.flaggedWord}".`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const refCode = `CON-${Date.now().toString(36).toUpperCase()}`;

    const isPeer = reportingRole === 'peer';
    const finalNarrative = [
      isPeer ? `[REPORT FOR FRIEND/CLASSMATE: ${friendName} (${friendGradeSection || 'N/A'})]` : '[SELF-REPORT BY STUDENT]',
      knowsSuspect === 'yes' ? `[SUSPECT / NAMBULLY: ${suspectName}${suspectDetails ? ` - ${suspectDetails}` : ''}]` : (knowsSuspect === 'unsure' ? '[SUSPECT / NAMBULLY: Unsure / May kutob pero hindi sigurado]' : '[SUSPECT / NAMBULLY: Hindi kilala ang nambully]'),
      `[SALAYSAY / WHAT HAPPENED]:\n${moderation.sanitizedText}`
    ].join('\n\n');

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/student_concerns`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          referral_code: refCode,
          student_name: isPeer && friendName.trim() ? friendName.trim() : user.fullName,
          grade_section: isPeer && friendGradeSection.trim() ? friendGradeSection.trim() : user.gradeSection || 'SHS Student',
          student_number: user.studentNumber,
          account_id: user.id,
          submitted_by: isPeer ? `Report for Friend by ${user.fullName} (${user.studentNumber})` : `Self-Report: ${user.fullName}`,
          category: reportType,
          concern_type: reportType,
          urgency: isUrgent ? 'Urgent' : 'Normal',
          summary_en: whatHappened.slice(0, 160),
          summary_tl: whatHappened.slice(0, 160),
          what_happened: finalNarrative,
          happened_when: happenedWhen || 'Not specified',
          happened_where: happenedWhere || 'AICS Campus / Online',
          witnesses: witnesses || 'None',
          is_confidential: true,
          is_urgent: isUrgent,
          truthful: true,
          status: 'Pending',
          chat_status: 'None',
          is_practice: false,
        }),
      });

      setSubmitting(false);

      if (!res.ok) {
        soundFX.playError();
        setSubmitError('Failed to submit concern. Please try again.');
        return;
      }

      soundFX.playSuccessCheck();
      setSubmittedConcernCode(refCode);
      recordSecurityAudit('REPORT_SUBMITTED', user.studentNumber);

      // Reset Form
      setWhatHappened('');
      setHappenedWhen('');
      setHappenedWhere('');
      setWitnesses('');
      setTruthfulAck(false);
      setReportingRole('self');
      setFriendName('');
      setFriendGradeSection('');
      setKnowsSuspect('no');
      setSuspectName('');
      setSuspectDetails('');
    } catch (err: unknown) {
      setSubmitting(false);
      soundFX.playError();
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans select-none student-portal-canvas bg-[#05112B] text-white">
      <WavyBackground />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-3.5 sm:py-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 student-portal-header bg-[#0B1E48]/80 backdrop-blur-md safe-area-top">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <img
            src="/aics-logo.jpg"
            alt="AICS Logo"
            className="w-9 h-9 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-white/40 bg-white p-0.5 shadow-xl shrink-0"
          />
          <div>
            <h1 className="text-xs sm:text-base font-extrabold tracking-tight text-white dark:text-white flex items-center gap-1.5 sm:gap-2">
              <span>AICS MONTALBAN</span>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ACTIVE
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs text-[#9BCBFF] font-semibold truncate max-w-[200px] sm:max-w-none">
              Safe & Confidential Concern Reporting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Emergency SOS Quick-Exit Button (Immediate Safety Escape) */}
          <QuickExitButton onTrigger={onSignOut} />

          {/* Quick Panic / Discretion Shield Button */}
          <button
            type="button"
            onClick={() => {
              soundFX.playBackspace();
              setPanicMode(true);
            }}
            className="btn-press px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            title={isTl ? 'Quick Privacy Shield (o pindutin ang ESC key)' : 'Quick Privacy Shield (or press ESC key)'}
          >
            <span>🛡️</span>
            <span className="hidden sm:inline">{isTl ? 'Quick Shield' : 'Quick Shield'}</span>
          </button>

          {/* Discretion & Auto-Logout Security Indicator */}
          <div
            title={
              isTl
                ? `Awtomatikong magla-logout sa loob ng ${Math.ceil(secondsRemaining / 60)} minuto upang walang makakita ng iyong mga ulat kapag naiwan ang device.`
                : `Auto-logout in ${Math.ceil(secondsRemaining / 60)} minutes of inactivity to keep your reports strictly confidential.`
            }
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-mono text-[#9BCBFF]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>⏱ {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}</span>
          </div>

          {/* High-Visibility Dedicated Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              soundFX.playBackspace();
              onSignOut();
            }}
            className="btn-press px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-950/40 border border-rose-400/40 flex items-center gap-1.5 transition-all"
            title={isTl ? 'Mag-sign out sa portal' : 'Sign out from portal'}
          >
            <span>🚪</span>
            <span>{isTl ? 'Sign Out' : 'Sign Out'}</span>
          </button>
          <SoundTogglePill />
          <LocaleSwitchPill />
          <SkyThemePill />
        </div>
      </header>

      {/* Inactivity Warning Banner (Discreetly alerts student when only 60s left) */}
      <AnimatePresence>
        {showIdleWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-30 w-full bg-amber-500/20 border-b border-amber-400/40 px-4 py-2 text-center text-xs text-amber-200 font-semibold flex items-center justify-center gap-2"
          >
            <span>🔒</span>
            <span>
              {isTl
                ? `Para sa iyong kaligtasan, magla-logout ang portal sa loob ng ${secondsRemaining}s dahil walang galaw. Pindutin ang kahit saan upang manatiling naka-login.`
                : `For your safety and privacy, you will be logged out in ${secondsRemaining}s due to inactivity. Click anywhere to stay signed in.`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <main className="relative z-20 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3 flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-2xl register-section-card gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('submit');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-md'
                  : 'card-subtitle-text hover:opacity-100 opacity-80'
              }`}
            >
              📝 {isTl ? 'Mag-report ng Concern' : 'Report Concern'}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('history');
                void fetchMyHistory();
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-md'
                  : 'card-subtitle-text hover:opacity-100 opacity-80'
              }`}
            >
              📁 {isTl ? 'Aking mga Reports' : 'My Reports'}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('chat');
              }}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors flex items-center gap-1.5 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-md'
                  : 'card-subtitle-text hover:opacity-100 opacity-80'
              }`}
            >
              <span>💬 {isTl ? 'Kausapin ang Guidance' : 'Guidance Chat'}</span>
              {history.some((c) => c.chatStatus === 'Open') && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          </div>

          <span className="text-[11px] font-semibold card-subtitle-text hidden sm:inline">
            🔒 RA 10173 Data Privacy Protected
          </span>
        </div>

        {/* TAB 1: SUBMIT REPORT */}
        {activeTab === 'submit' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl cosmic-glass-card p-6 sm:p-8 space-y-6 shadow-2xl"
          >
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold card-title-text">
                {isTl ? 'Magsumite ng Confidential Report sa Guidance' : 'Submit Confidential Concern Report'}
              </h2>
              <p className="text-xs card-subtitle-text mt-0.5">
                {isTl
                  ? 'Tanging ang AICS Guidance Associate lamang ang makakabasa nito. Ligtas ka rito.'
                  : 'Direct, private channel to the AICS Montalban Guidance Office.'}
              </p>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitConcern} className="space-y-5">
              {/* Report Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold register-section-title uppercase tracking-wider">
                  {isTl ? 'Category ng Insidente / Concern' : 'Incident / Concern Category'}
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl cosmic-input text-xs sm:text-sm font-semibold focus:outline-none"
                >
                  <option value="Bullying / Peer Harassment">
                    {isTl ? 'Bullying / Peer Harassment (Physical, Verbal, o Cyber)' : 'Bullying / Peer Harassment (Physical, Verbal, or Cyber)'}
                  </option>
                  <option value="Peer Conflict / Fighting">
                    {isTl ? 'Peer Conflict / Away ng Magkaklase' : 'Peer Conflict / Student Disputes'}
                  </option>
                  <option value="Academic & Attendance Stress">
                    {isTl ? 'Academic Stress / Madalas na Absent' : 'Academic & Attendance Stress'}
                  </option>
                  <option value="Personal Welfare & Emotional Support">
                    {isTl ? 'Personal / Family Welfare Support' : 'Personal Welfare & Emotional Support'}
                  </option>
                  <option value="Other Student Discipline Concern">
                    {isTl ? 'Iba Pang Concern sa Disiplina' : 'Other Student Discipline Concern'}
                  </option>
                </select>
              </div>

              {/* 1. SINO ANG MAGREREPORT: SARILI O PARA SA KAIBIGAN */}
              <div className="p-4 sm:p-5 rounded-2xl register-section-card space-y-4">
                <label className="text-xs font-extrabold register-section-title uppercase tracking-wider block">
                  {isTl ? '1. Para kanino ang report na ito?' : '1. Who is this report for?'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playToggleSwitch(true);
                      setReportingRole('self');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      reportingRole === 'self'
                        ? 'bg-blue-600/20 border-blue-400 shadow-md ring-1 ring-blue-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg">🙋</span>
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        {isTl ? 'Para sa Sarili Ko' : 'For Myself (Self-Report)'}
                      </p>
                      <p className="text-[11px] text-sky-200/80 mt-0.5">
                        {isTl ? 'Ako mismo ang nakaranas o may concern' : 'I personally experienced or have this concern'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playToggleSwitch(true);
                      setReportingRole('peer');
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 ${
                      reportingRole === 'peer'
                        ? 'bg-blue-600/20 border-blue-400 shadow-md ring-1 ring-blue-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg">🤝</span>
                    <div>
                      <p className="text-xs font-extrabold text-white">
                        {isTl ? 'Para sa Aking Kaibigan / Kaklase' : 'For a Friend / Classmate'}
                      </p>
                      <p className="text-[11px] text-sky-200/80 mt-0.5">
                        {isTl ? 'Irereport ko ang nangyari sa aking kaibigan' : 'Reporting an incident that happened to my friend'}
                      </p>
                    </div>
                  </button>
                </div>

                {/* Details if Reporting for a Friend */}
                {reportingRole === 'peer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">
                        {isTl ? 'Pangalan ng Kaibigan / Biktima' : 'Friend / Affected Student Name'} *
                      </label>
                      <input
                        type="text"
                        required={reportingRole === 'peer'}
                        placeholder={isTl ? 'Buong pangalan ng kaibigan' : 'Full name of your friend'}
                        value={friendName}
                        onChange={(e) => setFriendName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">Grade & Section</label>
                      <input
                        type="text"
                        placeholder="e.g. Grade 11 · STEM-1"
                        value={friendGradeSection}
                        onChange={(e) => setFriendGradeSection(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. KILALA BA ANG NAMBULLY O SUSPECT? */}
              <div className="p-4 sm:p-5 rounded-2xl register-section-card space-y-4">
                <label className="text-xs font-extrabold register-section-title uppercase tracking-wider block">
                  {isTl ? '2. Kilala mo ba ang Nambully o Suspect?' : '2. Do you know the Bully / Person Involved?'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'yes', labelTl: 'Oo, Kilala ko ang Nambully', labelEn: 'Yes, I know the suspect' },
                    { id: 'no', labelTl: 'Hindi ko kilala', labelEn: 'No, I do not know them' },
                    { id: 'unsure', labelTl: 'May kutob / Hindi sigurado', labelEn: 'Unsure / May suspect' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        soundFX.playToggleSwitch(true);
                        setKnowsSuspect(opt.id as any);
                      }}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        knowsSuspect === opt.id
                          ? 'bg-blue-600/25 border-blue-400 text-white shadow-sm ring-1 ring-blue-400'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {isTl ? opt.labelTl : opt.labelEn}
                    </button>
                  ))}
                </div>

                {knowsSuspect === 'yes' && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">
                        {isTl ? 'Pangalan ng Nambully / Suspect' : 'Name of Bully / Suspect'} *
                      </label>
                      <input
                        type="text"
                        required={knowsSuspect === 'yes'}
                        placeholder={isTl ? 'Pangalan o alyas ng nambully' : 'Full name or alias of the person who bullied'}
                        value={suspectName}
                        onChange={(e) => setSuspectName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">
                        {isTl ? 'Section o Pagkakakilanlan (Opsyonal)' : 'Grade, Section, or Physical Description (Optional)'}
                      </label>
                      <input
                        type="text"
                        placeholder={isTl ? 'hal. Kaklase sa ICT, o nakatambay sa hallway' : 'e.g. Classmate, section, or clothes worn'}
                        value={suspectDetails}
                        onChange={(e) => setSuspectDetails(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Narrative of what happened */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold register-section-title uppercase tracking-wider">
                  {isTl ? 'Salaysay ng Pangyayari (What Happened)' : 'Incident Narrative (What Happened)'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    isTl
                      ? 'Ikuwento nang tapat ang buong pangyayari. Ano ang ginawa o sinabi? Sino-sino ang kasama?'
                      : 'Provide an honest description of the incident. What happened? Who was involved?'
                  }
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  className="w-full p-4 rounded-xl cosmic-input text-xs sm:text-sm font-semibold focus:outline-none leading-relaxed"
                />
              </div>

              {/* Incident Context Details (When & Where) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold register-label">
                    {isTl ? 'Kailan Nangyari (When)' : 'When It Happened'}
                  </label>
                  <input
                    type="text"
                    placeholder={isTl ? 'hal. Kaninang 10:00 AM recess' : 'e.g. Today during 10:00 AM recess'}
                    value={happenedWhen}
                    onChange={(e) => setHappenedWhen(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold register-label">
                    {isTl ? 'Saan Nangyari (Where)' : 'Where It Happened'}
                  </label>
                  <input
                    type="text"
                    placeholder={isTl ? 'hal. Sa tapat ng Computer Lab 2' : 'e.g. Near Computer Lab 2'}
                    value={happenedWhere}
                    onChange={(e) => setHappenedWhere(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold register-label">
                    {isTl ? 'Mga Saksi (Witnesses)' : 'Witnesses Present'}
                  </label>
                  <input
                    type="text"
                    placeholder={isTl ? 'hal. Mga kaklaseng nakakita' : 'e.g. Classmates who saw the event'}
                    value={witnesses}
                    onChange={(e) => setWitnesses(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Urgency & Truthfulness Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="w-4 h-4 rounded accent-rose-500"
                  />
                  <span className="font-bold text-rose-600 dark:text-rose-300">
                    {isTl
                      ? '⚠️ Mark as URGENT (Kailangan ng mabilisang aksyon o may banta sa kaligtasan)'
                      : '⚠️ Mark as URGENT (Immediate intervention needed / Safety threat)'}
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs register-label opacity-90 leading-snug">
                  <input
                    type="checkbox"
                    checked={truthfulAck}
                    onChange={(e) => setTruthfulAck(e.target.checked)}
                    className="w-4 h-4 rounded accent-emerald-500 mt-0.5"
                  />
                  <span>
                    {isTl ? (
                      <>
                        Pinatutunayan ko na totoo ang aking isinusumite at nauunawaan ko na protektado ng{' '}
                        <strong>Data Privacy Act (RA 10173)</strong> ang aking pagkakakilanlan.
                      </>
                    ) : (
                      <>
                        I certify that this report is truthful and understand that my identity is protected under the{' '}
                        <strong>Data Privacy Act (RA 10173)</strong>.
                      </>
                    )}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !truthfulAck || !whatHappened.trim()}
                className="btn-press w-full py-4 rounded-xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] hover:from-[#18387D] hover:to-[#1E469B] text-white text-sm font-extrabold shadow-lg shadow-blue-950/30 border border-white/10 disabled:opacity-45 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>{isTl ? 'Isinusumite ang Confidential Report...' : 'Submitting Confidential Report...'}</span>
                ) : (
                  <>
                    <span>{isTl ? '📨 Isumite ang Report sa Guidance Office' : '📨 Submit Report to Guidance Office'}</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* TAB 2: MY SUBMITTED REPORTS HISTORY */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl cosmic-glass-card p-6 sm:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold card-title-text">
                  {isTl ? 'Aking mga Naipasa na Concern Reports' : 'My Submitted Concern Reports'}
                </h2>
                <p className="text-xs card-subtitle-text">
                  {isTl
                    ? 'Subaybayan ang aksyon ng Guidance Associate sa iyong mga isinumite.'
                    : 'Track the status and actions taken by the Guidance Associate.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchMyHistory()}
                className="btn-press px-3 py-1.5 rounded-lg card-back-button text-xs font-bold"
              >
                🔄 {isTl ? 'I-refresh' : 'Refresh'}
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs card-subtitle-text">
                {isTl ? 'Kinukuha ang iyong mga reports...' : 'Loading your reports...'}
              </div>
            ) : history.length === 0 ? (
              <div className="p-10 rounded-2xl register-section-card text-center space-y-2">
                <span className="text-3xl">🕊️</span>
                <p className="text-sm font-extrabold register-label">
                  {isTl ? 'Wala ka pang naisusumiteng concern report.' : 'You have not submitted any concern reports yet.'}
                </p>
                <p className="text-xs card-subtitle-text max-w-sm mx-auto">
                  {isTl
                    ? 'Kung ikaw o ang iyong kaklase ay nakararanas ng bullying, harassment, o matinding stress, huwag mag-atubiling mag-submit.'
                    : 'If you or a classmate are experiencing bullying, harassment, or distress, feel safe to file a report.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl register-inner-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                          {item.referralCode}
                        </span>
                        <span className="text-xs font-extrabold register-label">
                          · {item.category}
                        </span>
                        {item.urgency === 'Urgent' && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-extrabold border border-rose-500/40">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs register-label opacity-90 line-clamp-2">{item.whatHappened}</p>
                      <p className="text-[10px] card-subtitle-text">
                        Date: {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                          item.status === 'Resolved' || item.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-400/40'
                            : item.status === 'In Counseling'
                            ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-400/40'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-400/40'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.chatStatus === 'Open' && (
                        <button
                          type="button"
                          onClick={() => openConcernChat(item)}
                          className="btn-press px-3 py-1 rounded-full bg-[#1E469B] hover:bg-[#2557BE] text-white text-xs font-bold shadow flex items-center gap-1"
                        >
                          <span>💬 Chat</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: CONFIDENTIAL GUIDANCE CHAT */}
        {activeTab === 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl cosmic-glass-card p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            {/* Chat Header & Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 dark:border-white/10 gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold card-title-text flex items-center gap-2">
                  <span>💬</span>
                  <span>{isTl ? 'Kumpidensyal na Chat sa Guidance Office' : 'Confidential Guidance Office Chat'}</span>
                </h2>
                <p className="text-xs card-subtitle-text">
                  {isTl
                    ? 'Direktang mensahe sa AICS Guidance Associate. Ligtas at protektado ng Data Privacy.'
                    : 'Direct, private conversation with the Guidance Associate. Protected by RA 10173.'}
                </p>
              </div>

              {/* Selector for multi-concern students */}
              {history.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs card-subtitle-text font-bold">Topic:</span>
                  <select
                    value={selectedChatConcern?.id || ''}
                    onChange={(e) => {
                      const found = history.find((h) => h.id === Number(e.target.value));
                      if (found) setSelectedChatConcern(found);
                    }}
                    className="px-3 py-1.5 rounded-xl cosmic-input text-xs font-bold"
                  >
                    {history.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.referralCode} — {h.category.slice(0, 24)} ({h.chatStatus})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Chat Body */}
            {!selectedChatConcern ? (
              <div className="p-10 rounded-2xl register-section-card text-center space-y-2">
                <span className="text-3xl">🕊️</span>
                <p className="text-sm font-extrabold register-label">
                  {isTl ? 'Walang aktibong chat session.' : 'No active chat session.'}
                </p>
                <p className="text-xs card-subtitle-text max-w-sm mx-auto">
                  {isTl
                    ? 'Magsumite muna ng report sa "Mag-report ng Concern". Kapag binuksan ng Guidance Office ang chat, maaari ka nang makipag-usap dito.'
                    : 'Submit a concern report first. Once the Guidance Office opens the channel, you can communicate directly here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Chat Topic Banner */}
                <div className="p-3 rounded-2xl register-inner-card flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-[#1E469B] dark:text-[#7CB8F7]">
                      {selectedChatConcern.referralCode}
                    </span>
                    <span className="font-bold register-label truncate max-w-[220px] sm:max-w-md">
                      · {selectedChatConcern.category}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                      selectedChatConcern.chatStatus === 'Open'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-400/30'
                        : 'bg-slate-500/20 text-slate-600 dark:text-slate-300 border border-slate-400/30'
                    }`}
                  >
                    {selectedChatConcern.chatStatus === 'Open'
                      ? isTl ? 'Bukas ang Chat' : 'Chat Open'
                      : isTl ? 'Sarado ang Chat' : 'Chat Closed'}
                  </span>
                </div>

                {/* Message Stream */}
                <div className="h-[380px] sm:h-[440px] overflow-y-auto p-4 rounded-2xl register-section-card space-y-3">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs card-subtitle-text">
                      Loading messages...
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <span className="text-3xl">🤝</span>
                      <p className="text-sm font-bold register-label">
                        {isTl ? 'Magsimula ng pag-uusap sa Guidance Office' : 'Start the conversation with Guidance'}
                      </p>
                      <p className="text-xs card-subtitle-text max-w-sm">
                        {isTl
                          ? 'Maaari kang mag-iwan ng karagdagang impormasyon o magtanong. Sasagutin ito ng Guidance Associate sa oras ng opisina.'
                          : 'Leave any additional details or questions. The Guidance Associate will respond during office hours.'}
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => {
                      const isStudent = msg.sender === 'student';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                              isStudent
                                ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white rounded-br-xs'
                                : 'register-inner-card border register-label rounded-bl-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] font-extrabold pb-1 opacity-80 border-b border-white/10 dark:border-white/10 mb-1">
                              <span>{isStudent ? 'Ikaw (Student)' : '🏛️ AICS Guidance Office'}</span>
                              <span className="font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {/* Chat Input Field */}
                {selectedChatConcern.chatStatus === 'Closed' ? (
                  <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center text-xs font-semibold card-subtitle-text">
                    🔒 {isTl ? 'Isinara na ng Guidance Office ang chat session na ito. Nananatiling nakatago ang mga mensahe.' : 'This chat session has been closed by the Guidance Office. Messages are securely archived.'}
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={isTl ? 'Isulat ang iyong mensahe sa Guidance Office...' : 'Type your message to the Guidance Office...'}
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      disabled={sendingMsg}
                      className="flex-1 px-4 py-3 rounded-2xl cosmic-input text-xs sm:text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!chatInputText.trim() || sendingMsg}
                      className="btn-press px-5 sm:px-6 py-3 rounded-2xl bg-gradient-to-r from-[#1E469B] to-[#2557BE] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm shadow-lg disabled:opacity-40 transition-all flex items-center gap-1.5"
                    >
                      {sendingMsg ? (
                        <span>...</span>
                      ) : (
                        <>
                          <span>Send</span>
                          <span>↗</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-3 text-center text-xs card-subtitle-text">
        AICS Montalban Student Guidance Office · All submissions are strictly confidential (RA 10173 Protected)
      </footer>

      {/* Success Submission Modal */}
      <AnimatePresence>
        {submittedConcernCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#06122B]/75 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-[#0B1E48] border border-emerald-400/50 p-6 sm:p-7 text-center shadow-2xl space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/40">
                <svg
                  className="w-9 h-9 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className="text-xl font-extrabold text-white">Report Submitted Successfully!</h3>
              <p className="text-xs text-[#9BCBFF]/80">
                Natanggap na ng AICS Guidance Office ang iyong confidential concern report.
              </p>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/15 text-center">
                <span className="text-[11px] text-white/60 block">Reference Tracking Code:</span>
                <span className="font-mono text-base font-extrabold text-emerald-300">
                  {submittedConcernCode}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playToggleSwitch(true);
                  setSubmittedConcernCode(null);
                  setActiveTab('history');
                }}
                className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-extrabold text-xs shadow-lg"
              >
                Tingnan sa Aking Reports List →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====================================================
          QUICK PRIVACY SHIELD OVERLAY (TRIGGERED BY ESC OR BUTTON)
          Covers the entire screen instantly with innocent school study material
          ==================================================== */}
      <AnimatePresence>
        {panicMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0A162E] text-slate-200 p-6 sm:p-10 flex flex-col justify-between overflow-y-auto font-sans"
          >
            <div className="max-w-3xl mx-auto w-full space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <img src="/aics-logo.jpg" alt="AICS" className="w-10 h-10 rounded-full" />
                  <div>
                    <h2 className="text-base font-extrabold text-white">AICS Montalban · Senior High School Department</h2>
                    <p className="text-xs text-blue-300">General Academic & Technical-Vocational Review Materials</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setPanicMode(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                >
                  {isTl ? 'Ipagpatuloy ang Portal →' : 'Resume Portal →'}
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm leading-relaxed p-6 rounded-2xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400">MODULE 3: INFORMATION MANAGEMENT CONCEPTS</span>
                <h3 className="text-lg font-bold text-white">Database Systems & Structured Information Life Cycle</h3>
                <p>
                  Information systems form the backbone of modern institutional data processing. Relational databases organize records into tables, each consisting of rows and columns designed to maintain high referential integrity and confidentiality.
                </p>
                <div className="p-4 rounded-xl bg-black/30 border border-white/5 font-mono text-xs text-blue-200 space-y-1">
                  <p className="text-white/60">// Sample SQL Architecture Reference</p>
                  <p>SELECT student_id, section_code, academic_year FROM institutional_registry</p>
                  <p>WHERE status = &apos;ENROLLED&apos; ORDER BY section_code ASC;</p>
                </div>
                <p>
                  By enforcing strict data validation rules at the application layer, institutional software ensures that duplicate student records are rejected while safeguarding confidential student records in compliance with national privacy frameworks.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                <span>Press <strong>Resume Portal</strong> at top right to return safely.</span>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    onSignOut();
                  }}
                  className="text-rose-400 hover:underline font-bold"
                >
                  {isTl ? 'Mag-Sign Out Na Agad' : 'Instant Sign Out'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
