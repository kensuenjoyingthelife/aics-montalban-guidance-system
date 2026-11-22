import React, { useState } from 'react';
import {
  Home as HomeIcon,
  Plus,
  FolderArchive,
  MessageSquare,
  ShieldCheck,
  UserCircle2,
  Smartphone,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  X,
} from 'lucide-react';
import { officeHoursText } from '../../services/scheduling';

type Step = {
  icon: React.ElementType;
  tone: string; // gradient class from index.css (nav-c-*)
  title: [string, string]; // [Taglish, English]
  body: [string, string];
  phone: [string, string];
  web: [string, string];
  tip: [string, string];
};

const steps = (hours: string): Step[] => [
  {
    icon: HomeIcon,
    tone: 'nav-c-home',
    title: ['Home & Dashboard', 'Home & Dashboard'],
    body: [
      'Ang sentro ng iyong student portal. Agad mong makikita ang Philippine Standard Time, ang status ng iyong huling report, mga schedule ng Guidance Office, at aktibong chat.',
      'Your student portal command center. See Philippine Standard Time, latest report progress, Guidance Office schedule, and active counseling chats at a glance.',
    ],
    phone: ['Gamitin ang navigation menu sa ibaba para lumipat ng section.', 'Use the bottom navigation bar to switch sections.'],
    web: ['Gamitin ang navigation rail sa kanang bahagi ng screen.', 'Use the right-hand navigation rail to switch sections.'],
    tip: ['I-tap o i-click ang anumang information tile para sa karagdagang detalye.', 'Tap or click any information tile for quick access.'],
  },
  {
    icon: Plus,
    tone: 'nav-c-home',
    title: ['Submit a Concern Report', 'Submit a Concern Report'],
    body: [
      'I-click o i-tap ang (+) button para magsumite ng concern sa 3 simpleng hakbang: (1) Piliin ang uri ng insidente, (2) Ibigay ang detalye o pangalan ng sangkot (opsyonal), at (3) Isalaysay ang buong pangyayari kalakip ang ebidensya o litrato.',
      'Tap the (+) button to report an issue in 3 straightforward steps: (1) Select the concern category, (2) Specify the individuals involved (optional), and (3) Provide incident details and attach supporting evidence.',
    ],
    phone: ['Pindutin ang (+) button sa gitna ng bottom menu.', 'Tap the (+) button at the center of the bottom navigation.'],
    web: ['I-click ang malaking (+) button sa kanang navigation rail.', 'Click the (+) button in the right-hand desktop navigation rail.'],
    tip: ['Maaari kang mag-file para sa iyong sarili o bilang saksi para sa kaklase.', 'You can file a report for yourself or as a witness for a peer.'],
  },
  {
    icon: FolderArchive,
    tone: 'nav-c-history',
    title: ['Track My Reports', 'Track My Reports'],
    body: [
      'Subaybayan ang real-time status ng iyong mga isinumite: Amber para sa Under Review, Green para sa Accepted/Action Taken, at Red kapag Declined na may kaakibat na paliwanag.',
      'Monitor real-time progress for your submitted cases: Amber for Under Review, Green for Accepted/Action Taken, and Red for Declined with counselor remarks.',
    ],
    phone: ['Buksan ang My Reports tab sa ibaba.', 'Access the My Reports tab from the bottom bar.'],
    web: ['I-click ang My Reports sa kanang navigation rail.', 'Click My Reports in the right navigation rail.'],
    tip: ['Gamitin ang filter chips sa itaas para mabilis na masala ang reports.', 'Use top filter chips to quickly sort between review statuses.'],
  },
  {
    icon: MessageSquare,
    tone: 'nav-c-chat',
    title: ['Confidential Guidance Chat', 'Confidential Guidance Chat'],
    body: [
      `Kapag tinanggap ang iyong report, magbubukas ang Guidance Office ng ligtas at encrypted na one-on-one chat. Aktibong sumasagot ang mga counselor sa opisyal na oras ng opisina (${hours}).`,
      `Once your report is accepted, the Guidance Office activates a secure, encrypted one-on-one messaging session. Counselors actively reply during office hours (${hours}).`,
    ],
    phone: ['I-tap ang Chat icon sa navigation bar. May indicator kapag may bagong reply.', 'Tap Chat in the navigation bar. Unread indicators notify you of replies.'],
    web: ['I-click ang Chat sa kanang navigation rail para makita ang split-view messaging.', 'Click Chat in the right rail to open the split-view messaging interface.'],
    tip: ['Protektado ng end-to-end audit logging ang inyong pag-uusap alinsunod sa RA 10173.', 'All communications are strictly protected under RA 10173 data privacy laws.'],
  },
  {
    icon: ShieldCheck,
    tone: 'nav-c-me',
    title: ['Safety & Quick Exit Protection', 'Safety & Quick Exit Protection'],
    body: [
      'Kung may biglang lumapit habang gamit mo ang portal, pindutin agad ang Quick Exit o i-press ang [Esc] sa keyboard para mag-sign out agad at ma-redirect sa Google search nang walang bakas.',
      'If someone approaches while you view sensitive information, click Quick Exit or press [Esc] to instantly terminate your session and redirect to Google.',
    ],
    phone: ['Pindutin ang pulang Quick Exit sa header o i-tap ang lumulutang na safety mascot.', 'Tap the red Quick Exit in the top bar or tap the floating safety mascot.'],
    web: ['I-click ang pulang Quick Exit sa kanang itaas, o pindutin ang [Esc] sa keyboard.', 'Click the red Quick Exit at the top right, or press [Esc] on your keyboard.'],
    tip: ['Kusang magla-lock out ang session kapag 15 minutong walang aktibidad sa screen.', 'Automatic security timeout signs you out after 15 minutes of inactivity.'],
  },
  {
    icon: UserCircle2,
    tone: 'nav-c-me',
    title: ['Me (Account & System Settings)', 'Me (Account & System Settings)'],
    body: [
      'I-customize ang iyong karanasan: magpalit sa pagitan ng Dark Mode at Light Mode, magpalit ng wika (English/Taglish), i-install ang PWA App sa iyong device, o ligtas na mag-sign out.',
      'Customize your experience: toggle Dark/Light appearance, switch between English and Taglish, install the application locally, or securely sign out.',
    ],
    phone: ['Pindutin ang Me tab sa dulo ng bottom menu.', 'Tap the Me tab on the right end of the bottom menu.'],
    web: ['I-click ang Me icon sa pinakababang bahagi ng kanang navigation rail.', 'Click the Me icon at the bottom of the right-hand navigation rail.'],
    tip: ['Ligtas at kumpidensyal ang lahat ng iyong setting at impormasyon.', 'All personal preferences and credentials remain strictly confidential.'],
  },
];

interface MobileAppTourModalProps {
  isOpen: boolean;
  onComplete: () => void;
  defaultLanguage?: 'tl' | 'en';
}

export const MobileAppTourModal: React.FC<MobileAppTourModalProps> = ({ isOpen, onComplete, defaultLanguage = 'tl' }) => {
  const [i, setI] = useState(0);
  const [lang, setLang] = useState<'tl' | 'en'>(defaultLanguage);
  if (!isOpen) return null;

  const L = lang === 'tl' ? 0 : 1;
  const all = steps(officeHoursText(lang === 'tl'));
  const s = all[i];
  const Icon = s.icon;
  const last = i === all.length - 1;
  const finish = () => { setI(0); onComplete(); };

  return (
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={L === 0 ? 'Gabay sa paggamit' : 'How to use'}>
      <div className="w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-white shadow-2xl">
        {/* top bar */}
        <div className="flex items-center justify-between gap-3 px-6 pt-5">
          <span className="text-[14px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
            {L === 0 ? `Gabay · ${i + 1} sa ${all.length}` : `Guide · ${i + 1} of ${all.length}`}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex p-1 rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
              {(['tl', 'en'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setLang(k)} className={`h-8 px-3 rounded-full text-[13px] font-semibold ${lang === k ? 'bg-white dark:bg-white/20 shadow-sm' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}>
                  {k === 'tl' ? 'Taglish' : 'English'}
                </button>
              ))}
            </div>
            <button type="button" onClick={finish} title={L === 0 ? 'Isara' : 'Close'} aria-label={L === 0 ? 'Isara' : 'Close'} className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* content */}
        <div className="px-6 pt-6 pb-2">
          <span className={`w-16 h-16 rounded-[22px] ${s.tone} text-white flex items-center justify-center shadow-lg`}>
            <Icon className="w-8 h-8" strokeWidth={2.2} />
          </span>
          <h2 className="mt-5 text-[28px] leading-tight font-bold tracking-tight">{s.title[L]}</h2>
          <p className="mt-3 text-[16px] leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6]">{s.body[L]}</p>

          <div className="mt-5 rounded-[22px] bg-black/[0.04] dark:bg-white/[0.06] divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {([
              [Smartphone, L === 0 ? 'Sa phone (app)' : 'On the phone (app)', s.phone[L]],
              [Monitor, L === 0 ? 'Sa website' : 'On the website', s.web[L]],
            ] as const).map(([Ic, label, text]) => (
              <div key={label} className="flex items-start gap-3 p-4">
                <span className="w-9 h-9 rounded-full bg-white dark:bg-white/10 flex items-center justify-center shrink-0 shadow-sm"><Ic className="w-5 h-5 text-[#0A84FF]" /></span>
                <span>
                  <span className="block text-[14px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">{label}</span>
                  <span className="block text-[15px] leading-snug">{text}</span>
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-start gap-2.5 text-[15px] font-medium text-[#248A3D] dark:text-[#30D158]">
            <Lightbulb className="w-5 h-5 mt-0.5 shrink-0" />
            {s.tip[L]}
          </p>
        </div>

        {/* progress + buttons */}
        <div className="sticky bottom-0 bg-white dark:bg-[#1C1C1E] px-6 pt-4 pb-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
          <div className="flex justify-center gap-1.5 mb-4">
            {all.map((_, k) => (
              <button key={k} type="button" onClick={() => setI(k)} aria-label={`${k + 1}`} className={`h-2 rounded-full transition-[width] duration-200 ${k === i ? 'w-7 bg-[#0A84FF]' : 'w-2 bg-black/15 dark:bg-white/20'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            {i > 0 ? (
              <button type="button" onClick={() => setI(i - 1)} className="h-14 px-5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[16px] font-semibold inline-flex items-center gap-1">
                <ChevronLeft className="w-5 h-5" />{L === 0 ? 'Bumalik' : 'Back'}
              </button>
            ) : (
              <button type="button" onClick={finish} className="h-14 px-5 rounded-full text-[16px] font-semibold text-[#6E6E73] dark:text-[#A1A1A6]">
                {L === 0 ? 'Laktawan' : 'Skip'}
              </button>
            )}
            <button type="button" onClick={() => (last ? finish() : setI(i + 1))} className="flex-1 h-14 rounded-full sd-primary text-white text-[16px] font-semibold inline-flex items-center justify-center gap-2">
              {last ? (L === 0 ? 'Simulan na' : 'Get started') : L === 0 ? 'Susunod' : 'Next'}
              {!last && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
