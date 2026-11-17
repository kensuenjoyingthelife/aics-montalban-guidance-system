import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  FileEdit,
  FolderArchive,
  MessageSquare,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Shield,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Bell,
  BellOff,
  Camera,
  Image as ImageIcon,
  Trash2,
  Compass,
  Lock as LockIcon,
  User,
  Users,
  Clock,
  Send,
  FileText,
  Download,
  CheckCheck,
} from 'lucide-react';
import { WavyBackground } from '../components/auth/WavyBackground';
import { SoundTogglePill, soundFX } from '../services/soundEngine';
import { notificationService } from '../services/notificationService';
import { SkyThemePill } from '../context/ThemeContext';
import { LocaleSwitchPill, useLanguage } from '../context/LanguageContext';
import { StudentPortalUser } from '../services/studentAuthService';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import { loadAppConfig, useAppConfig } from '../services/appConfig';
import { officeHoursText } from '../services/scheduling';
import { Clock as ClockIcon, Check as CheckIcon, ShieldCheck as ShieldIcon } from 'lucide-react';
import { QuickExitButton } from '../components/security/QuickExitButton';
import { MobileAppTourModal } from '../components/student/MobileAppTourModal';
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

  // Multi-step Google Form-style pagination for report submission (1 -> 2 -> 3)
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  // Notifications toggle state
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => notificationService.isEnabled());

  // Right-side Drawer / Menu Bar state
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  // office hours come from the office's Settings (never a hard-coded schedule)
  useAppConfig();
  useEffect(() => {
    void loadAppConfig();
  }, []);
  const hoursText = officeHoursText(isTl);

  // Submit Concern Form State
  const [reportType, setReportType] = useState<string>('Vaping / Smoking Infraction');
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
  const [isAnonymousWhistleblower, setIsAnonymousWhistleblower] = useState<boolean>(false);
  const [truthfulAck, setTruthfulAck] = useState<boolean>(false);
  const [evidencePhotos, setEvidencePhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

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

  // PWA / APK Install Prompt State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [canInstallApp, setCanInstallApp] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstallApp(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    soundFX.playStepUnlock();
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setCanInstallApp(false);
      }
      setInstallPrompt(null);
    } else {
      // Guide user if on iOS Safari or already installed
      alert(
        isTl
          ? 'Para i-install: Pindutin ang Share button sa Safari at piliin ang "Add to Home Screen", o pumunta sa Chrome menu at i-click ang "Install App".'
          : 'To install: Tap the Share button in Safari and choose "Add to Home Screen", or open Chrome settings and tap "Install App".'
      );
    }
  };

  // Listen to deep-link custom event from Lock Screen Notification Click
  useEffect(() => {
    const handleNavEvent = (e: any) => {
      const tab = e.detail?.tab;
      if (tab === 'chat') {
        setActiveTab('chat');
        soundFX.playToggleSwitch(true);
      }
    };
    window.addEventListener('aics:navigate-tab', handleNavEvent);
    if (window.location.hash === '#chat' || window.location.search.includes('tab=chat')) {
      setActiveTab('chat');
    }
    return () => window.removeEventListener('aics:navigate-tab', handleNavEvent);
  }, []);

  // Guided Onboarding Tour for Mobile Phone Users
  const [showMobileTour, setShowMobileTour] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hasSeen = localStorage.getItem('aics_mobile_tour_completed');
    const isMobileDevice = window.innerWidth < 768 || 'ontouchstart' in window;
    return !hasSeen && isMobileDevice;
  });

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

  // Track previous statuses to trigger native phone notifications on change
  const prevStatusesRef = useRef<Record<number, string>>({});

  const fetchMyHistory = async (notifyOnChange: boolean = false) => {
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

        // Check if any report status changed and notify student's phone
        if (notifyOnChange) {
          mapped.forEach((item) => {
            const prev = prevStatusesRef.current[item.id];
            if (prev && prev !== item.status) {
              const s = item.status.toLowerCase();
              if (s === 'approved' || s === 'resolved') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Approved: Your report (${item.referralCode}) has been approved by Guidance.`
                );
              } else if (s === 'rejected' || s === 'dismissed' || s === 'declined') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Reject: Your report (${item.referralCode}) was reviewed and closed.`
                );
              } else if (s === 'in counseling' || s === 'investigating' || s === 'under review') {
                void notificationService.sendDiscreetNotification(
                  'AICS',
                  `Action Taken: Guidance is now actively addressing your concern (${item.referralCode}).`
                );
              }
            }
          });
        }

        // Store latest statuses in ref
        const newStatuses: Record<number, string> = {};
        mapped.forEach((m) => {
          newStatuses[m.id] = m.status;
        });
        prevStatusesRef.current = newStatuses;

        // Only update state if data actually changed to prevent mobile screen flicker / glitching!
        setHistory((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(mapped)) {
            return prev; // Zero DOM re-render = Zero screen jump/glitch!
          }
          return mapped;
        });

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
    void fetchMyHistory(false);

    // Periodically poll for status changes (e.g. Approved, Reject) every 10 seconds
    const statusInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchMyHistory(true);
      }
    }, 10000);

    return () => clearInterval(statusInterval);
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
          
          // Send discreet native mobile / browser push notification
          const officeMsgs = newer.filter((m) => m.sender !== 'student');
          if (officeMsgs.length > 0) {
            void notificationService.sendDiscreetNotification(
              'AICS',
              'Message you: The Guidance Office sent a response to your concern.'
            );
          }

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

    const handleEvidenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const maxPhotos = 10;
    const remainingSlots = maxPhotos - evidencePhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(isTl ? 'Hanggang 10 litrato ang maaaring i-attach bawat report.' : 'Maximum 10 photos allowed per report.');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setPhotoError(isTl ? 'Litrato lamang (PNG, JPG, JPEG) ang maaaring i-attach.' : 'Only image files allowed.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setPhotoError(isTl ? 'Masyadong malaki ang litrato (Maximum 8MB).' : 'Image size exceeds 8MB limit.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.65);
            setEvidencePhotos((prev) => [...prev, compressed].slice(0, 10));
            soundFX.playToggleSwitch(true);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

    // Reset input value so taking consecutive photos or selecting the same photo works seamlessly
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeEvidencePhoto = (idx: number) => {
    soundFX.playBackspace();
    setEvidencePhotos((prev) => prev.filter((_, i) => i !== idx));
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
      knowsSuspect === 'yes' ? `[RESPONDENT / INIREREKLAMO: ${suspectName}${suspectDetails ? ` - Palatandaan: ${suspectDetails}` : ''}]` : (knowsSuspect === 'unsure' ? `[RESPONDENT / INIREREKLAMO: Hindi tiyak ang pangalan - Palatandaan: ${suspectDetails || 'N/A'}]` : `[RESPONDENT / INIREREKLAMO: Hindi kilala ang pangalan - Palatandaan: ${suspectDetails || 'N/A'}]`),
      `[SALAYSAY / WHAT HAPPENED]:\n${moderation.sanitizedText}`,
      ...(evidencePhotos.length > 0 ? evidencePhotos.map((p, idx) => `[EVIDENCE_PHOTO_${idx + 1}]: ${p}`) : [])
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
          student_name: isAnonymousWhistleblower
            ? (isTl ? 'Protektadong Whistleblower (DepEd DO 40)' : 'Protected Whistleblower (DepEd DO 40)')
            : (isPeer && friendName.trim() ? friendName.trim() : user.fullName),
          grade_section: isAnonymousWhistleblower
            ? 'Confidential'
            : (isPeer && friendGradeSection.trim() ? friendGradeSection.trim() : user.gradeSection || 'SHS Student'),
          student_number: isAnonymousWhistleblower ? 'ANON-DO40' : user.studentNumber,
          account_id: user.id,
          submitted_by: isAnonymousWhistleblower
            ? 'Anonymous Whistleblower (DepEd Child Protection Policy DO 40, s. 2012)'
            : (isPeer ? `Report for Friend by ${user.fullName} (${user.studentNumber})` : `Self-Report: ${user.fullName}`),
          category: reportType,
          concern_type: reportType,
          urgency: isUrgent ? 'Urgent' : 'Normal',
          who_involved: knowsSuspect === 'yes' ? `${suspectName}${suspectDetails ? ` (${suspectDetails})` : ''}` : (knowsSuspect === 'unsure' ? `Hindi tiyak${suspectDetails ? ` (${suspectDetails})` : ''}` : `Hindi kilala${suspectDetails ? ` (${suspectDetails})` : ''}`),
          summary_en: (isAnonymousWhistleblower ? '[ANONYMOUS WHISTLEBLOWER - DEPED DO 40] ' : '') + whatHappened.slice(0, 160),
          summary_tl: (isAnonymousWhistleblower ? '[ANONYMOUS WHISTLEBLOWER - DEPED DO 40] ' : '') + whatHappened.slice(0, 160),
          what_happened: (isAnonymousWhistleblower ? `[DEPED DO 40, S. 2012 ANONYMOUS WHISTLEBLOWER SUBMISSION]\n[REPORTER IDENTITY SHIELDED FOR CHILD PROTECTION]\n\n` : '') + finalNarrative,
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

      // Trigger instant submission confirmation notification on phone
      void notificationService.sendDiscreetNotification(
        'AICS',
        `Submitted: Your concern report (${refCode}) was received safely by Guidance.`
      );

      // Reset Form
      setFormStep(1);
      setWhatHappened('');
      setHappenedWhen('');
      setHappenedWhere('');
      setWitnesses('');
      setEvidencePhotos([]);
      setIsAnonymousWhistleblower(false);
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
    <div className="min-h-[100dvh] w-full relative flex flex-col justify-start overflow-x-clip font-sans select-none student-portal-canvas sd-canvas bg-[#F5F5F7] dark:bg-[#0B1220] text-slate-900 dark:text-white transition-colors duration-150">
      {/* Top Navigation Bar - Clean, Organized & Non-Congested Header */}
      <header className="sticky top-0 z-30 w-full sd-header safe-area-top">
        <div className="max-w-3xl mx-auto h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/aics-logo.jpg" alt="AICS" className="w-8 h-8 rounded-full object-cover bg-white shrink-0" />
            <div className="min-w-0 leading-tight">
              <p className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">AICS Kalang Ba</p>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] truncate">{user.fullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:block">
              <QuickExitButton onTrigger={onSignOut} />
            </div>
            <button
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setIsMenuOpen(true);
              }}
              aria-label={isTl ? 'Buksan ang menu' : 'Open menu'}
              title={isTl ? 'Menu' : 'Menu'}
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] active:scale-[0.97] transition-[transform,background-color] duration-150"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Right Drawer Navigation (Native CSS for 100% reliable clicks on mobile) */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[99990] flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Right Drawer Panel */}
          <div
            className="relative h-full w-[290px] sm:w-[340px] bg-[#071330] border-l border-white/15 z-[99995] flex flex-col justify-between shadow-2xl p-5 overflow-y-auto"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0"><Compass className="w-4 h-4" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      AICS KALANG BA
                    </h3>
                    <p className="text-[10px] text-sky-300/70 font-semibold truncate max-w-[170px]">
                      {user.fullName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playBackspace();
                    setIsMenuOpen(false);
                  }}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Primary Features Navigation */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-slate-400 block px-1">
                  {isTl ? 'Pangunahing Aksyon' : 'Main Features'}
                </label>

                {/* 1. Report Concern */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setActiveTab('submit');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'submit'
                      ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-lg ring-1 ring-sky-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileEdit className="w-4 h-4 text-sky-400" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">
                        {isTl ? 'Report Concern' : 'Report Concern'}
                      </p>
                      <p className="text-[10px] text-sky-200/70">
                        {isTl ? 'Magsumite ng insidente' : 'Submit confidential incident'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                {/* 2. My Reports */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setActiveTab('history');
                    void fetchMyHistory();
                    setIsMenuOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-lg ring-1 ring-sky-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FolderArchive className="w-4 h-4 text-amber-400" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">
                        {isTl ? 'My Reports' : 'My Reports'}
                      </p>
                      <p className="text-[10px] text-sky-200/70">
                        {isTl ? 'Subaybayan ang aksyon' : 'Track case resolutions'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>

                {/* 3. Guidance Chat */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setActiveTab('chat');
                    setIsMenuOpen(false);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-gradient-to-r from-[#1E469B] to-[#2557BE] text-white shadow-lg ring-1 ring-sky-300'
                      : 'bg-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    <div className="text-left">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold">
                          {isTl ? 'Guidance Chat' : 'Guidance Chat'}
                        </p>
                        {history.some((c) => c.chatStatus === 'Open') && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[10px] text-sky-200/70">
                        {isTl ? '1-on-1 counselor live chat' : '1-on-1 private counselor chat'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-50" />
                </button>
              </div>

              {/* System Settings & Toggles Cluster */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <label className="text-[10px] font-semibold text-slate-400 block px-1">
                  {isTl ? 'Hitsura at Wika' : 'Display & Preferences'}
                </label>

                {/* Theme Switcher Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span className="text-xs font-bold text-slate-300">
                    {isTl ? 'Dark / Light Mode' : 'Sky Theme (Dark/Light)'}
                  </span>
                  <SkyThemePill />
                </div>

                {/* Language Switcher Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span className="text-xs font-bold text-slate-300">
                    {isTl ? 'Wika (EN / TL)' : 'Language (EN / TL)'}
                  </span>
                  <LocaleSwitchPill />
                </div>

                {/* Notifications Toggle Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <div className="flex items-center gap-2">
                    {notificationsEnabled ? (
                      <Bell className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <BellOff className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-300">
                      {isTl ? 'Phone Notification' : 'Push Notification'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const next = !notificationsEnabled;
                      if (next) {
                        const granted = await notificationService.requestPermission();
                        setNotificationsEnabled(granted);
                        if (granted) {
                          soundFX.playToggleSwitch(true);
                          void notificationService.sendDiscreetNotification(
                            'AICS Kalang Ba',
                            isTl
                              ? 'Aktibo na ang phone notifications para sa iyong mga reports!'
                              : 'Phone notifications are now enabled for your reports!'
                          );
                        } else {
                          soundFX.playError();
                        }
                      } else {
                        soundFX.playToggleSwitch(false);
                        notificationService.setEnabled(false);
                        setNotificationsEnabled(false);
                      }
                    }}
                    className={`btn-press px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer transition-all ${
                      notificationsEnabled
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {notificationsEnabled ? (isTl ? 'Bukas' : 'ON') : (isTl ? 'Naka-off' : 'OFF')}
                  </button>
                </div>

                {/* Sound FX Toggle Row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                  <span className="text-xs font-bold text-slate-300">
                    {isTl ? 'Audio & Sound FX' : 'Audio FX'}
                  </span>
                  <SoundTogglePill />
                </div>

                {/* Install App on Phone / Desktop Button */}
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-press w-full p-3 rounded-xl sd-primary text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{isTl ? 'I-install ang App sa Telepono / PC' : 'Install App to Phone / PC'}</span>
                </button>

                {/* User Guide Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playToggleSwitch(true);
                    setShowMobileTour(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full p-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>{isTl ? 'Buksan ang Gabay sa Paggamit' : 'Open User Guide Tour'}</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer: Safe Sign Out */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playBackspace();
                  setIsMenuOpen(false);
                  onSignOut();
                }}
                className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-950/40 border border-rose-400/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isTl ? 'Sign Out sa Portal' : 'Sign Out of Portal'}</span>
              </button>
              <p className="text-[10px] text-center text-slate-400 font-medium">
                AICS Montalban · RA 10173 Protected
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Floating AssistiveTouch SOS Mascot Ball (Always Top-Level at Root Body Z-Index) */}
      <div className="md:hidden">
        <QuickExitButton onTrigger={onSignOut} />
      </div>

      {/* Inactivity Warning Banner (Discreetly alerts student when only 60s left) */}
      <AnimatePresence>
        {showIdleWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative z-30 w-full bg-amber-500/20 border-b border-amber-400/40 px-4 py-2 text-center text-xs text-amber-200 font-semibold flex items-center justify-center gap-2"
          >
            <span>
              <LockIcon className="w-3.5 h-3.5 text-amber-300 inline shrink-0 mr-1.5" />
              {isTl
                ? `Para sa iyong kaligtasan, magla-logout ang portal sa loob ng ${secondsRemaining}s dahil walang galaw. Pindutin ang kahit saan upang manatiling naka-login.`
                : `For your safety and privacy, you will be logged out in ${secondsRemaining}s due to inactivity. Click anywhere to stay signed in.`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area (Clean Responsive Vertical Flow: Compact Spacing on Mobile) */}
      <main className={`relative z-20 flex-1 w-full mx-auto px-4 pt-4 sm:px-6 space-y-5 pb-28 md:pb-10 ${activeTab === 'submit' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* Navigation Tabs (Hidden on Mobile < 768px because everything is neatly in the Right Menu Drawer) */}
        <div className="hidden md:flex justify-center pt-2">
          <div className="seg-track p-1" role="tablist">
            {([
              ['submit', FileEdit, isTl ? 'Mag-report' : 'Report'],
              ['history', FolderArchive, isTl ? 'Aking mga Report' : 'My Reports'],
              ['chat', MessageSquare, isTl ? 'Chat' : 'Chat'],
            ] as const).map(([k, Icon, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={activeTab === k}
                onClick={() => {
                  soundFX.playToggleSwitch(true);
                  setActiveTab(k);
                  if (k === 'history') void fetchMyHistory();
                }}
                className={`h-9 px-5 text-[14px] inline-flex items-center gap-2 ${activeTab === k ? 'seg-on' : 'seg-off'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {k === 'chat' && history.some((c) => c.chatStatus === 'Open') && <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: SUBMIT REPORT (Compact, Responsive Padding) */}
        {activeTab === 'submit' && (
          <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6 lg:items-start">
          {/* LEFT (website): who is reporting, the 3 steps, office hours — the form gets the full right side */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
            <div className="sd-hero p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-[17px] font-semibold">
                  {user.fullName.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-semibold truncate">{user.fullName}</p>
                  <p className="text-[12px] text-white/75 truncate">{user.gradeSection || user.studentNumber}</p>
                </div>
              </div>
              <p className="mt-4 text-[13px] leading-snug text-white/85 flex items-start gap-2">
                <ShieldIcon className="w-4 h-4 mt-0.5 shrink-0" />
                {isTl ? 'Pribado ito. Ang Guidance Office lang ang makakabasa.' : 'This is private. Only the Guidance Office can read it.'}
              </p>
            </div>
            <ol className="sd-card p-3">
              {[
                isTl ? 'Uri ng concern' : 'What kind of concern',
                isTl ? 'Sino ang inirereklamo' : 'Who it is about',
                isTl ? 'Ano ang nangyari' : 'What happened',
              ].map((s, i) => {
                const n = i + 1;
                const done = formStep > n;
                const on = formStep === n;
                return (
                  <li key={n} className={`flex items-center gap-3 px-3 py-3 rounded-xl ${on ? 'bg-[#0A84FF]/[0.08]' : ''}`}>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${done ? 'bg-[#30D158] text-white' : on ? 'bg-[#0A84FF] text-white' : 'bg-black/[0.06] dark:bg-white/[0.1] text-[#6E6E73]'}`}>
                      {done ? <CheckIcon className="w-4 h-4" /> : n}
                    </span>
                    <span className={`text-[14px] ${on ? 'font-semibold text-[#1D1D1F] dark:text-white' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}>{s}</span>
                  </li>
                );
              })}
            </ol>
            <div className="sd-card p-4 flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl tile-grad tile-teal text-white flex items-center justify-center shrink-0"><ClockIcon className="w-4 h-4" /></span>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#1D1D1F] dark:text-white">{isTl ? 'Oras ng Guidance Office' : 'Guidance Office hours'}</p>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#A1A1A6]">{hoursText}</p>
                <p className="mt-1 text-[12px] text-[#8E8E93]">{isTl ? 'Ang report sa labas ng oras ay babasahin sa susunod na pasok.' : 'Reports sent after hours are read on the next office day.'}</p>
              </div>
            </div>
          </aside>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="sd-card p-5 sm:p-7 space-y-5"
          >
            {/* Form Header & Progress Tracker */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-semibold">
                      Page {formStep} of 3
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" /> RA 10173 Protected
                    </span>
                  </div>
                  <h2 className="text-base sm:text-xl font-semibold card-title-text mt-1">
                    {formStep === 1 && (isTl ? '1. Category ng Insidente & Para Kanino' : '1. Incident Category & Scope')}
                    {formStep === 2 && (isTl ? '2. Inirereklamong Estudyante (Respondent) & Detalye' : '2. Reported Student (Respondent) & Incident Details')}
                    {formStep === 3 && (isTl ? '3. Salaysay, Konteksto & Pagsumite' : '3. Narrative Context & Submission')}
                  </h2>
                  <p className="text-xs card-subtitle-text mt-0.5">
                    {isTl
                      ? 'Tanging ang AICS Guidance Associate lamang ang makakabasa nito. Ligtas ka rito.'
                      : 'Direct, private channel to the AICS Montalban Guidance Office.'}
                  </p>
                </div>

                {/* Visual Step Bar (phones) */}
                <div className="flex lg:hidden items-center gap-2 self-start sm:self-auto">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-2 rounded-full transition-all ${
                        formStep === step
                          ? 'w-8 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                          : formStep > step
                          ? 'w-4 bg-emerald-400'
                          : 'w-4 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* office hours (phones; the website shows it on the left) */}
            <div className="lg:hidden p-3.5 rounded-2xl sd-note flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl tile-grad tile-teal text-white flex items-center justify-center shrink-0"><ClockIcon className="w-4 h-4" /></span>
              <p className="text-[13px] text-[#1D1D1F] dark:text-white">
                <b className="font-semibold">{isTl ? 'Oras ng opisina' : 'Office hours'}:</b> {hoursText}
              </p>
            </div>

{submitError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitConcern} className="space-y-6">
              {/* ========================================================= */}
              {/* STEP 1: CATEGORY & SINO ANG MAGREREPORT                   */}
              {/* ========================================================= */}
              {formStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Category Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold register-section-title block">
                      {isTl ? 'A. Piliin ang Uri ng Concern' : 'A. Select Incident / Concern Category'} *
                    </label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl cosmic-input text-xs sm:text-sm font-semibold focus:outline-none"
                    >
                      <optgroup label={isTl ? '── MAJOR / SERIOUS OFFENSES (Mabibigat na Paglabag) ──' : '── MAJOR & SERIOUS OFFENSES ──'}>
                        <option value="Physical Bullying & Fighting">
                          {isTl ? 'Physical Bullying, Away, o Pananakit (RA 10627)' : 'Physical Bullying, Assault, or Fighting'}
                        </option>
                        <option value="Cyberbullying & Online Harassment">
                          {isTl ? 'Cyberbullying o Paninirang-Puri sa Social Media' : 'Cyberbullying & Online Harassment'}
                        </option>
                        <option value="Vaping / Smoking Infraction">
                          {isTl ? 'Vaping o Paninigarilyo sa Loob ng Campus' : 'Vaping / Smoking on Campus'}
                        </option>
                        <option value="Extortion & Coercion">
                          {isTl ? 'Panghihingi ng Pera (Extortion) o Pananakot' : 'Extortion, Blackmail, or Threat'}
                        </option>
                        <option value="Weapons & Dangerous Contraband">
                          {isTl ? 'Matatalim na Bagay o Delikadong Gamit' : 'Weapons & Dangerous Contraband'}
                        </option>
                        <option value="Vandalism & Campus Property Damage">
                          {isTl ? 'Pagsira sa Gamit ng Paaralan (Vandalism)' : 'Vandalism & Campus Property Damage'}
                        </option>
                        <option value="Cutting Classes & Truancy">
                          {isTl ? 'Pagtakas sa Gate o Pag-cutting Classes' : 'Cutting Classes & Gate Truancy'}
                        </option>
                        <option value="Forgery & Tampering of Records">
                          {isTl ? 'Pamemeke ng Pirma ng Magulang o Records' : 'Forgery of Parent Signature or Records'}
                        </option>
                      </optgroup>

                      <optgroup label={isTl ? '── MINOR OFFENSES (Magaan na Paglabag) ──' : '── MINOR OFFENSES ──'}>
                        <option value="Habitual Tardiness">
                          {isTl ? 'Madalas na Pagkahuli sa Klase / Gate (Tardiness)' : 'Habitual Tardiness & Late Arrival'}
                        </option>
                        <option value="Improper Uniform & Dress Code">
                          {isTl ? 'Paglabag sa Tamang Uniporme o Gupit (Dress Code)' : 'Improper Uniform & Dress Code Violation'}
                        </option>
                        <option value="Improper Use of School ID">
                          {isTl ? 'Hindi Pagsusuot o Maling Paggamit ng School ID' : 'Non-Wearing or Improper Use of School ID'}
                        </option>
                        <option value="Classroom Disruption">
                          {isTl ? 'Kakulitan o Kaingayan sa Klase (Disruption)' : 'Classroom Disruption & Noise'}
                        </option>
                        <option value="Littering on Campus">
                          {isTl ? 'Pagtatapon ng Kalat sa Campus (Littering)' : 'Campus Littering Infraction'}
                        </option>
                        <option value="Unauthorized Device Use">
                          {isTl ? 'Paggamit ng Cellphone Habang Nagkaklase' : 'Unauthorized Mobile Phone Use in Class'}
                        </option>
                        <option value="Other Disciplinary Infraction">
                          {isTl ? 'Iba Pang Paglabag sa Student Handbook' : 'Other Disciplinary Handbook Infraction'}
                        </option>
                      </optgroup>
                    </select>
                  </div>

                  {/* SINO ANG MAGREREPORT: SARILI O PARA SA KAIBIGAN */}
                  <div className="p-4 sm:p-5 rounded-2xl sd-group space-y-4">
                    <label className="text-xs font-semibold register-section-title block">
                      {isTl ? 'B. Para kanino ang report na ito?' : 'B. Who is this report for?'} *
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          soundFX.playToggleSwitch(true);
                          setReportingRole('self');
                        }}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          reportingRole === 'self'
                            ? 'bg-[#0A84FF]/[0.07] dark:bg-[#0A84FF]/20 border-[#0A84FF] ring-1 ring-[#0A84FF]'
                            : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0"><User className="w-4 h-4" /></div>
                        <div>
                          <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white">
                            {isTl ? 'Para sa Sarili Ko' : 'For Myself (Self-Report)'}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-sky-200/80 mt-0.5">
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
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          reportingRole === 'peer'
                            ? 'bg-[#0A84FF]/[0.07] dark:bg-[#0A84FF]/20 border-[#0A84FF] ring-1 ring-[#0A84FF]'
                            : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0"><Users className="w-4 h-4" /></div>
                        <div>
                          <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white">
                            {isTl ? 'Para sa Aking Kaibigan / Kaklase' : 'For a Friend / Classmate'}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-sky-200/80 mt-0.5">
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

                  {/* Step 1 Next Button */}
                  <div className="sd-actionbar flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (reportingRole === 'peer' && !friendName.trim()) {
                          soundFX.playError();
                          setSubmitError(isTl ? 'Pakilagay ang pangalan ng kaibigan.' : 'Please enter your friend\'s name.');
                          return;
                        }
                        setSubmitError(null);
                        soundFX.playToggleSwitch(true);
                        setFormStep(2);
                      }}
                      className="btn-press px-6 py-3 rounded-xl sd-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-950/40 flex items-center gap-2"
                    >
                      <span>{isTl ? 'Pumunta sa Hakbang 2' : 'Next: Bully & Suspect Info'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: KILALA BA ANG NAMBULLY O SUSPECT?                 */}
              {/* ========================================================= */}
              {formStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  <div className="p-4 sm:p-5 rounded-2xl sd-group space-y-4">
                    <label className="text-xs font-semibold register-section-title block">
                      {isTl ? 'Kilala mo ba ang Inirereklamong Estudyante (Respondent)?' : 'Do you know the Reported Student (Respondent)?'} *
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'yes', labelTl: 'Oo, Kilala ko ang Inirereklamo', labelEn: 'Yes, I know the student' },
                        { id: 'no', labelTl: 'Hindi ko kilala (Unknown)', labelEn: 'I do not know (Unknown)' },
                        { id: 'unsure', labelTl: 'May kutob / Hindi sigurado sa pangalan', labelEn: 'Unsure of full name / Suspected' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            soundFX.playToggleSwitch(true);
                            setKnowsSuspect(opt.id as any);
                          }}
                          className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            knowsSuspect === opt.id
                              ? 'bg-[#0A84FF]/[0.07] dark:bg-[#0A84FF]/20 border-[#0A84FF] text-[#1D1D1F] dark:text-white ring-1 ring-[#0A84FF] dark:ring-blue-400'
                              : 'bg-white dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                          }`}
                        >
                          {isTl ? opt.labelTl : opt.labelEn}
                        </button>
                      ))}
                    </div>

                                        {knowsSuspect !== 'yes' && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{isTl ? 'Mga Palatandaan (Physical Identifiers / Hangout Spot)' : 'Physical Identifiers & Description'}</span>
                        </div>
                        <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                          {isTl
                            ? 'Kahit hindi mo alam ang pangalan, ilagay ang anumang palatandaan (suot, kulay ng bag, estimated grade, o kung saan karaniwang tumatambay) upang matulungan ang Guidance.'
                            : 'Even without a name, describe their appearance, uniform, estimated grade/strand, or hangout area to aid Guidance.'}
                        </p>
                        <input
                          type="text"
                          placeholder={isTl ? 'hal. Matangkad, laging nasa 3rd floor hallway tuwing break, naka-black bag' : 'e.g. Tall, hangs out at 3rd floor hallway during recess, black backpack'}
                          value={suspectDetails}
                          onChange={(e) => setSuspectDetails(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                        />
                      </div>
                    )}

                    {knowsSuspect === 'yes' && (
                      <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/10">
                        <div className="space-y-1">
                          <label className="text-xs font-bold register-label">
                            {isTl ? 'Pangalan ng Inirereklamo (Respondent)' : 'Name of Reported Student (Respondent)'} *
                          </label>
                          <input
                            type="text"
                            required={knowsSuspect === 'yes'}
                            placeholder={isTl ? 'hal. Juan Dela Cruz (o alyas / palayaw)' : 'e.g. Juan Dela Cruz (or nickname / alias)'}
                            value={suspectName}
                            onChange={(e) => setSuspectName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold register-label">
                            {isTl ? 'Baitang, Strand, o Palatandaan (Optional)' : 'Grade, Strand, or Physical Identifiers (Optional)'}
                          </label>
                          <input
                            type="text"
                            placeholder={isTl ? 'hal. Grade 11 ICT-2, matangkad, laging nakasuot ng jacket na itim' : 'e.g. Grade 11 ICT-2, tall, wears black hoodie'}
                            value={suspectDetails}
                            onChange={(e) => setSuspectDetails(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 Back & Next Buttons */}
                  <div className="sd-actionbar flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playBackspace();
                        setFormStep(1);
                      }}
                      className="btn-press px-4 py-2.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{isTl ? 'Bumalik sa Hakbang 1' : 'Back to Step 1'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (knowsSuspect === 'yes' && !suspectName.trim()) {
                          soundFX.playError();
                          setSubmitError(isTl ? 'Pakilagay ang pangalan ng inirereklamong estudyante.' : 'Please enter the name of the reported student.');
                          return;
                        }
                        setSubmitError(null);
                        soundFX.playToggleSwitch(true);
                        setFormStep(3);
                      }}
                      className="btn-press px-6 py-3 rounded-xl sd-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-950/40 flex items-center gap-2"
                    >
                      <span>{isTl ? 'Pumunta sa Hakbang 3' : 'Next: Salaysay & Review'}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ========================================================= */}
              {/* STEP 3: SALAYSAY, KONTEKSTO & TERMS & CONDITION          */}
              {/* ========================================================= */}
              {formStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-5"
                >
                  {/* Narrative of what happened */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold register-section-title block">
                      {isTl ? 'Salaysay ng Pangyayari (What Happened)' : 'Incident Narrative (What Happened)'} *
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
                        placeholder={isTl ? 'hal. Kaninang 10:15 AM recess (o ilagay N/A kung di matandaan)' : 'e.g. Today at 10:15 AM recess (or N/A)'}
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
                        placeholder={isTl ? 'hal. CR ng 3rd floor malapit sa Lab 2 (o ilagay N/A)' : 'e.g. 3rd floor CR near Lab 2 (or N/A)'}
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
                        placeholder={isTl ? 'hal. 2 kaklase sa ICT-1 / Guwardya (o ilagay N/A kung walang saksi)' : 'e.g. 2 ICT-1 classmates / Security guard (or N/A)'}
                        value={witnesses}
                        onChange={(e) => setWitnesses(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl cosmic-input text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* PHOTO & PHYSICAL EVIDENCE ATTACHMENT CARD */}
                  <div className="p-4 rounded-2xl sd-group space-y-3 border border-sky-300/40 dark:border-sky-800/40 bg-sky-50/40 dark:bg-[#0B1527]/60">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1E469B] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Camera className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#1D1D1F] dark:text-white block">
                            {isTl ? 'Mag-attach ng Litrato o Ebidensya (Opsyonal)' : 'Attach Photo Evidence (Optional)'}
                          </label>
                          <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                            {isTl
                              ? 'Pasa, pananakit, sira o bandalismong gamit, vape/kontrabando, o screenshot ng cyberbullying.'
                              : 'Photos of injuries/bruises, damaged property, contraband/vape, or cyberbullying screenshots.'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/20">
                        {evidencePhotos.length} {isTl ? 'Litrato na-attach' : 'Photos attached'}
                      </span>
                    </div>

                    {photoError && (
                      <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{photoError}</span>
                      </p>
                    )}

                    {/* Upload Triggers (Always visible if under 10 photos) */}
                    {evidencePhotos.length < 10 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {/* Option 1: Direct Camera Shutter */}
                        <label className="rounded-xl border-2 border-dashed border-sky-400/80 dark:border-sky-700 hover:border-[#1E469B] bg-white/80 dark:bg-white/5 hover:bg-sky-50/90 p-3.5 flex items-center gap-3 cursor-pointer transition-all shadow-xs">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleEvidenceUpload}
                            className="hidden"
                          />
                          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                            <Camera className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white leading-tight">
                              {evidencePhotos.length === 0
                                ? (isTl ? 'Picturan Agad (Camera)' : 'Take Photo (Camera)')
                                : (isTl ? 'Kumuha Pa ng Litrato (Camera)' : 'Take Another Photo (Camera)')}
                            </p>
                            <p className="text-[10px] text-[#4A608A] dark:text-[#94A8D0]">
                              {isTl ? 'Live camera capture' : 'Live camera snapshot'}
                            </p>
                          </div>
                        </label>

                        {/* Option 2: Upload Multiple from Gallery / Files */}
                        <label className="rounded-xl border-2 border-dashed border-blue-400/80 dark:border-blue-700 hover:border-[#1E469B] bg-white/80 dark:bg-white/5 hover:bg-blue-50/90 p-3.5 flex items-center gap-3 cursor-pointer transition-all shadow-xs">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleEvidenceUpload}
                            className="hidden"
                          />
                          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-[#6E6E73] dark:text-sky-300 flex items-center justify-center shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-xs font-semibold text-[#1D1D1F] dark:text-white leading-tight">
                              {evidencePhotos.length === 0
                                ? (isTl ? 'Pumili sa Gallery / Files' : 'Select Photos / Gallery')
                                : (isTl ? 'Magdagdag Pa mula Gallery' : 'Add More from Gallery')}
                            </p>
                            <p className="text-[10px] text-[#4A608A] dark:text-[#94A8D0]">
                              {isTl ? 'Kahit ilan (hanggang 10)' : 'Upload more photos (up to 10)'}
                            </p>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Previews Grid if photos are uploaded */}
                    {evidencePhotos.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[#1D1D1F] dark:text-white">
                            {isTl ? 'Mga Na-attach na Litrato' : 'Attached Photos'} ({evidencePhotos.length}/10)
                          </span>
                          <span className="text-[10px] text-[#4A608A] dark:text-[#94A8D0]">
                            {isTl ? 'I-click ang basurahan para alisin' : 'Click trash icon to remove'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                          {evidencePhotos.map((photoUrl, idx) => (
                            <div key={idx} className="relative group rounded-xl overflow-hidden border-2 border-sky-400/50 dark:border-sky-700 aspect-video bg-black/5 flex items-center justify-center shadow-xs">
                              <img src={photoUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeEvidencePhoto(idx)}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                                title={isTl ? 'Alisin ang litrato' : 'Remove photo'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/60 text-white">
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Urgency & Truthfulness Checkboxes */}
                  <div className="space-y-3 pt-2">
                    {/* DepEd DO 40 Anonymous Whistleblower Protection */}
                    <label className="flex items-start gap-2.5 cursor-pointer text-xs p-2.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20">
                      <input
                        type="checkbox"
                        checked={isAnonymousWhistleblower}
                        onChange={(e) => setIsAnonymousWhistleblower(e.target.checked)}
                        className="w-4 h-4 rounded accent-[#1E469B] mt-0.5"
                      />
                      <div>
                        <span className="font-semibold text-[#6E6E73] dark:text-[#7CB8F7] block">
                          {isTl
                            ? 'Isumite bilang Anonymous Whistleblower (DepEd DO 40, s. 2012)'
                            : 'Submit as Anonymous Whistleblower (DepEd DO 40, s. 2012)'}
                        </span>
                        <span className="text-[11px] card-subtitle-text block mt-0.5">
                          {isTl
                            ? 'Itatago ang iyong pangalan sa case board. Direktang ipapasa sa Guidance Office alinsunod sa DepEd Child Protection Policy.'
                            : 'Shields your identity on case records. Filed directly to Guidance under DepEd Child Protection Policy.'}
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="w-4 h-4 rounded accent-rose-500"
                      />
                      <span className="font-bold text-rose-500 dark:text-rose-300">
                        {isTl
                          ? 'Mark as URGENT (Kailangan ng mabilisang aksyon o may banta sa kaligtasan)'
                          : 'Mark as URGENT (Immediate intervention needed / Safety threat)'}
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

                  {/* Step 3 Action Buttons */}
                  <div className="sd-actionbar flex flex-row items-center justify-between gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playBackspace();
                        setFormStep(2);
                      }}
                      className="btn-press w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-200/70 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>{isTl ? 'Bumalik sa Hakbang 2' : 'Back to Step 2'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !truthfulAck || !whatHappened.trim()}
                      className="btn-press w-full sm:w-auto px-8 py-3.5 rounded-xl sd-primary text-white text-xs sm:text-sm font-semibold shadow-lg shadow-emerald-950/40 border border-emerald-400/40 disabled:opacity-45 transition-all flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <span>{isTl ? 'Isinusumite ang Report...' : 'Submitting Report...'}</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isTl ? 'Isumite Na sa Guidance Office' : 'Submit Confidential Report Now'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </motion.div>
          </div>
        )}

        {/* TAB 2: MY SUBMITTED REPORTS HISTORY */}
        {activeTab === 'history' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl sd-card p-6 sm:p-8 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold card-title-text">
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
                <span className="flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /><span>{isTl ? 'I-refresh' : 'Refresh'}</span></span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="p-8 text-center text-xs card-subtitle-text">
                {isTl ? 'Kinukuha ang iyong mga reports...' : 'Loading your reports...'}
              </div>
            ) : history.length === 0 ? (
              <div className="p-10 rounded-2xl sd-group text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"><FileText className="w-6 h-6" /></div>
                <p className="text-sm font-semibold register-label">
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
                        <span className="font-mono text-xs font-semibold text-[#6E6E73] dark:text-[#7CB8F7]">
                          {item.referralCode}
                        </span>
                        <span className="text-xs font-semibold register-label">
                          · {item.category}
                        </span>
                        {item.urgency === 'Urgent' && (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[10px] font-semibold border border-rose-500/40">
                            URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-xs register-label opacity-90 line-clamp-2">{item.whatHappened}</p>
                      <p className="text-[10px] card-subtitle-text">
                        {isTl ? 'Petsa' : 'Date'}: {new Date(item.createdAt).toLocaleDateString(isTl ? 'fil-PH' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
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
                          <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /><span>Chat</span></span>
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
            className="rounded-3xl sd-card p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            {/* Chat Header & Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 dark:border-white/10 gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold card-title-text flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
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
              <div className="p-10 rounded-2xl sd-group text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center"><MessageSquare className="w-6 h-6" /></div>
                <p className="text-sm font-semibold register-label">
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
                    <span className="font-mono font-semibold text-[#6E6E73] dark:text-[#7CB8F7]">
                      {selectedChatConcern.referralCode}
                    </span>
                    <span className="font-bold register-label truncate max-w-[220px] sm:max-w-md">
                      · {selectedChatConcern.category}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
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
                <div className="h-[380px] sm:h-[440px] overflow-y-auto p-4 rounded-2xl sd-group space-y-3">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs card-subtitle-text">
                      Loading messages...
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><Users className="w-6 h-6" /></div>
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
                                ? 'sd-bubble-me rounded-br-md'
                                : 'sd-bubble-office rounded-bl-md'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] font-semibold pb-1 opacity-80 border-b border-white/10 dark:border-white/10 mb-1">
                              <span>{isStudent ? 'Ikaw (Student)' : 'AICS Guidance Office'}</span>
                              <div className="flex items-center gap-1.5 font-mono">
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                {isStudent && (
                                  <span className="inline-flex items-center gap-0.5 text-sky-200" title={isTl ? 'Binasa ng Guidance Office' : 'Seen by Guidance Office'}>
                                    <CheckCheck className="w-3 h-3 text-sky-300" />
                                    <span className="text-[9px] font-sans font-semibold">{isTl ? 'Seen' : 'Seen'}</span>
                                  </span>
                                )}
                              </div>
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
                    {isTl ? 'Isinara na ng Guidance Office ang chat session na ito. Nananatiling nakatago ang mga mensahe.' : 'This chat session has been closed by the Guidance Office. Messages are securely archived.'}
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
                      className="btn-press px-5 sm:px-6 py-3 rounded-2xl sd-primary text-white font-semibold text-xs sm:text-sm shadow-lg disabled:opacity-40 transition-all flex items-center gap-1.5"
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

      {/* Footer (Messenger-Style Clean: hidden on mobile phones so keyboard never pushes or squishes it) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 sd-tabbar" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label={isTl ? 'Mga seksyon' : 'Sections'}>
        <div className="grid grid-cols-3 h-16">
          {([
            ['submit', FileEdit, isTl ? 'Mag-report' : 'Report'],
            ['history', FolderArchive, isTl ? 'Mga Report' : 'My Reports'],
            ['chat', MessageSquare, 'Chat'],
          ] as const).map(([k, Icon, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setActiveTab(k);
                if (k === 'history') void fetchMyHistory();
              }}
              className={`relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-[0.97] transition-transform duration-150 ${activeTab === k ? 'text-[#0A84FF]' : 'text-[#8E8E93]'}`}
            >
              <Icon className="w-6 h-6" strokeWidth={activeTab === k ? 2.2 : 1.75} />
              {label}
              {k === 'chat' && history.some((c) => c.chatStatus === 'Open') && <span className="absolute top-2.5 right-[calc(50%-18px)] w-2 h-2 rounded-full bg-[#30D158]" />}
            </button>
          ))}
        </div>
      </nav>

      <footer className="relative z-20 py-3 text-center text-xs card-subtitle-text mt-auto student-footer hidden md:block">
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

              <h3 className="text-xl font-semibold text-white">Report Submitted Successfully!</h3>
              <p className="text-xs text-[#9BCBFF]/80">
                Natanggap na ng AICS Guidance Office ang iyong confidential concern report.
              </p>

              <div className="p-3.5 rounded-xl bg-black/40 border border-white/15 text-center">
                <span className="text-[11px] text-white/60 block">Reference Tracking Code:</span>
                <span className="font-mono text-base font-semibold text-emerald-300">
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
                className="btn-press w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs shadow-lg"
              >
                Tingnan sa Aking Reports List →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guideline / Onboarding Tour Modal */}
      <MobileAppTourModal
        isOpen={showMobileTour}
        onComplete={() => {
          localStorage.setItem('aics_mobile_tour_completed', 'true');
          setShowMobileTour(false);
        }}
      />
    </div>
  );
};
