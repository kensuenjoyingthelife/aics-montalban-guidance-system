import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CelestialBackground } from '../components/auth/CelestialBackground';
import { WavyBackground } from '../components/auth/WavyBackground';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { StudentPortalUser } from '../services/studentAuthService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';

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
  createdAt: string;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, onSignOut }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';

  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Submit Concern Form State
  const [reportType, setReportType] = useState<string>('Bullying / Peer Harassment');
  const [isPeerReferral, setIsPeerReferral] = useState<boolean>(false);
  const [targetStudentName, setTargetStudentName] = useState<string>('');
  const [targetGradeSection, setTargetGradeSection] = useState<string>('');
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
        setHistory(
          rows.map((r: Record<string, unknown>) => ({
            id: Number(r.id),
            referralCode: String(r.referral_code || 'CON-REF'),
            category: String(r.category || r.concern_type || 'General Concern'),
            whatHappened: String(r.what_happened || r.summary_en || ''),
            status: String(r.status || 'Pending'),
            urgency: String(r.urgency || 'Normal'),
            createdAt: String(r.created_at || new Date().toISOString()),
          }))
        );
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchMyHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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

    setSubmitting(true);
    setSubmitError(null);

    const refCode = `CON-${Date.now().toString(36).toUpperCase()}`;

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
          student_name: isPeerReferral && targetStudentName.trim() ? targetStudentName.trim() : user.fullName,
          grade_section: isPeerReferral && targetGradeSection.trim() ? targetGradeSection.trim() : user.gradeSection || 'SHS Student',
          student_number: user.studentNumber,
          account_id: user.id,
          submitted_by: isPeerReferral ? `Peer Referral by ${user.fullName} (${user.studentNumber})` : `Self-Report: ${user.fullName}`,
          category: reportType,
          concern_type: reportType,
          urgency: isUrgent ? 'Urgent' : 'Normal',
          summary_en: whatHappened.slice(0, 160),
          summary_tl: whatHappened.slice(0, 160),
          what_happened: whatHappened,
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

      // Reset Form
      setWhatHappened('');
      setHappenedWhen('');
      setHappenedWhere('');
      setWitnesses('');
      setTruthfulAck(false);
      setIsPeerReferral(false);
      setTargetStudentName('');
      setTargetGradeSection('');
    } catch (err: unknown) {
      setSubmitting(false);
      soundFX.playError();
      setSubmitError(err instanceof Error ? err.message : 'Submission failed.');
    }
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans select-none student-portal-canvas bg-[#05112B] text-white">
      <CelestialBackground />
      <WavyBackground />

      {/* Top Navigation Bar */}
      <header className="relative z-20 w-full px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 student-portal-header bg-[#0B1E48]/80 backdrop-blur-md safe-area-top">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src="/aics-logo.jpg"
            alt="AICS Logo"
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ring-white/30 bg-white p-0.5 shadow-lg shrink-0"
          />
          <div>
            <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 sm:gap-2">
              AICS MONTALBAN
              <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                ACTIVE
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-[#9BCBFF]/90 font-medium truncate max-w-[190px] sm:max-w-none">
              {user.fullName} · #{user.studentNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto">
          <button
            type="button"
            onClick={() => {
              soundFX.playBackspace();
              onSignOut();
            }}
            className="btn-press px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:border-rose-400/40 border border-white/15 text-[11px] sm:text-xs font-bold text-white transition-colors"
          >
            {isTl ? 'Sign Out' : 'Sign Out'}
          </button>
          <SoundTogglePill />
          <LocaleSwitchPill />
          <SkyThemePill />
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="relative z-20 flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 pb-3">
          <div className="inline-flex p-1 rounded-2xl register-section-card gap-1.5">
            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('submit');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-md'
                  : 'card-subtitle-text hover:opacity-100 opacity-80'
              }`}
            >
              📝 {isTl ? 'Mag-report ng Concern / Bullying' : 'Report Concern / Bullying'}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab('history');
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-colors ${
                activeTab === 'history'
                  ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-md'
                  : 'card-subtitle-text hover:opacity-100 opacity-80'
              }`}
            >
              📁 {isTl ? 'Aking mga Reports' : 'My Submitted Reports'}
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
                  Category ng Insidente / Concern
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl cosmic-input text-xs sm:text-sm font-semibold focus:outline-none"
                >
                  <option value="Bullying / Peer Harassment">Bullying / Peer Harassment (Physical, Verbal, or Cyber)</option>
                  <option value="Peer Conflict / Fighting">Peer Conflict / Away ng Magkaklase</option>
                  <option value="Academic & Attendance Stress">Academic Stress / Madalas na Absent</option>
                  <option value="Personal Welfare & Emotional Support">Personal / Family Welfare Support</option>
                  <option value="Other Student Discipline Concern">Iba Pang Concern sa Disiplina</option>
                </select>
              </div>

              {/* Self-Report vs Peer Referral Toggle */}
              <div className="p-4 rounded-2xl register-section-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold register-label">
                      {isTl ? 'Sino ang apektado sa insidente?' : 'Who is involved in this report?'}
                    </p>
                    <p className="text-[11px] card-subtitle-text">
                      {isPeerReferral
                        ? 'Peer Referral (Inirerefer mo ang kaklase mo para matulungan ng Guidance)'
                        : 'Self-Report (Ikaw mismo ang nakaranas o may concern)'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPeerReferral}
                      onChange={(e) => setIsPeerReferral(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {isPeerReferral && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">Pangalan ng Kaklase / Involved</label>
                      <input
                        type="text"
                        required={isPeerReferral}
                        placeholder="Pangalan ng estudyanteng kailangan ng tulong"
                        value={targetStudentName}
                        onChange={(e) => setTargetStudentName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold register-label">Grade & Section</label>
                      <input
                        type="text"
                        placeholder="hal. Grade 11 · ICT-1"
                        value={targetGradeSection}
                        onChange={(e) => setTargetGradeSection(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Narrative of what happened */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold register-section-title uppercase tracking-wider">
                  Salaysay ng Pangyayari (What Happened)
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
                  <label className="text-xs font-bold register-label">Kailan Nangyari (When)</label>
                  <input
                    type="text"
                    placeholder="hal. Kaninang 10:00 AM recess"
                    value={happenedWhen}
                    onChange={(e) => setHappenedWhen(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold register-label">Saan Nangyari (Where)</label>
                  <input
                    type="text"
                    placeholder="hal. Sa tapat ng Computer Lab 2"
                    value={happenedWhere}
                    onChange={(e) => setHappenedWhere(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold register-label">Mga Saksi (Witnesses)</label>
                  <input
                    type="text"
                    placeholder="hal. Mga kaklaseng nakakita"
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
                    ⚠️ Mark as URGENT (Kailangan ng mabilisang aksyon o may banta sa kaligtasan)
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
                    Pinatutunayan ko na totoo ang aking isinusumite at nauunawaan ko na protektado ng{' '}
                    <strong>Data Privacy Act (RA 10173)</strong> ang aking pagkakakilanlan.
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
                  <span>Submitting Confidential Report...</span>
                ) : (
                  <>
                    <span>📨 Submit Report to Guidance Office</span>
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
                  Aking mga Naipasa na Concern Reports
                </h2>
                <p className="text-xs card-subtitle-text">
                  Subaybayan ang aksyon ng Guidance Associate sa iyong mga isinumite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchMyHistory()}
                className="btn-press px-3 py-1.5 rounded-lg card-back-button text-xs font-bold"
              >
                🔄 Refresh
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs card-subtitle-text">Loading your reports...</div>
            ) : history.length === 0 ? (
              <div className="p-10 rounded-2xl register-section-card text-center space-y-2">
                <span className="text-3xl">🕊️</span>
                <p className="text-sm font-extrabold register-label">Wala ka pang naisusumiteng concern report.</p>
                <p className="text-xs card-subtitle-text max-w-sm mx-auto">
                  Kung ikaw o ang iyong kaklase ay nakararanas ng bullying, harassment, o matinding stress, huwag mag-atubiling mag-submit.
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

                    <div className="shrink-0">
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
                    </div>
                  </div>
                ))}
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
    </div>
  );
};
