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

type TourPoint = { label: [string, string]; text: [string, string] };

type Step = {
  icon: React.ElementType;
  tone: string;
  badge: [string, string];
  title: [string, string];
  tagline: [string, string];
  points: TourPoint[];
  phone: [string, string];
  web: [string, string];
  tip: [string, string];
};

const steps = (hours: string): Step[] => [
  {
    icon: HomeIcon,
    tone: 'nav-c-home',
    badge: ['Overview', 'Overview'],
    title: ['Home & Real-Time Overview', 'Home & Real-Time Overview'],
    tagline: ['Ang pangunahing dashboard para sa status at schedules.', 'Your primary dashboard for status and office schedules.'],
    points: [
      { label: ['Live Clock', 'Live Clock'], text: ['Philippine Standard Time at petsa para sa opisyal na guidance logs.', 'Synchronized Philippine Standard Time for official guidance records.'] },
      { label: ['Office Hours', 'Office Hours'], text: ['Makikita kung bukas ngayon ang Guidance Office at kung kailan susunod na magbubukas.', 'Live status showing if the Guidance Office is open or when it next opens.'] },
      { label: ['Active Feed', 'Active Feed'], text: ['Quick preview ng huling isinumiteng report at aktibong counseling chat.', 'Quick preview of your most recent report status and ongoing chat.'] },
    ],
    phone: ['Pindutin ang Home sa bottom navigation bar.', 'Tap Home in the bottom navigation bar.'],
    web: ['I-click ang Home icon sa navigation rail sa kanan.', 'Click the Home icon on the right-hand navigation rail.'],
    tip: ['I-tap ang alinmang information card para sa mabilisang access.', 'Click any information card for instant navigation.'],
  },
  {
    icon: Plus,
    tone: 'nav-c-home',
    badge: ['Reporting', 'Reporting'],
    title: ['Submit a Concern Report', 'Submit a Concern Report'],
    tagline: ['Ligtas at kumpidensyal na pag-uulat sa 3 simpleng hakbang.', 'Safe and confidential 3-step incident reporting.'],
    points: [
      { label: ['Step 1: Kategorya', 'Step 1: Category'], text: ['Pumili mula sa mga listahan tulad ng bullying, harassment, o academic issues.', 'Select from verified categories such as bullying, harassment, or conflicts.'] },
      { label: ['Step 2: Mga Sangkot', 'Step 2: People Involved'], text: ['Ibigay ang pangalan o detalye ng mga sangkot (opsyonal kung hindi sigurado).', 'Identify the involved individuals (optional if identity is unknown).'] },
      { label: ['Step 3: Salaysay', 'Step 3: Incident Details'], text: ['Isalaysay ang buong nangyari at maglakip ng litrato o ebidensya.', 'Narrate the incident and attach photos or supporting evidence.'] },
    ],
    phone: ['Pindutin ang (+) button sa gitna ng bottom menu.', 'Tap the (+) button at the center of the bottom menu.'],
    web: ['I-click ang (+) action button sa kanang navigation rail.', 'Click the (+) action button in the right navigation rail.'],
    tip: ['Maaaring mag-ulat para sa sarili o bilang saksi para sa kapwa estudyante.', 'You can report for yourself or as a bystander for a classmate.'],
  },
  {
    icon: FolderArchive,
    tone: 'nav-c-history',
    badge: ['Tracking', 'Tracking'],
    title: ['Track My Reports', 'Track My Reports'],
    tagline: ['Real-time status tracking at opisyal na action remarks.', 'Real-time progress monitoring and official guidance remarks.'],
    points: [
      { label: ['Amber: Under Review', 'Amber: Under Review'], text: ['Kasalukuyang sinusuri at bina-validate ng Guidance Office.', 'Your submission is being reviewed and validated by the counselor.'] },
      { label: ['Green: Action Taken', 'Green: Action Taken'], text: ['Tinanggap ang ulat at isinasagawa na ang tamang due process.', 'Report accepted; appropriate guidance due process is active.'] },
      { label: ['Red: Case Resolved/Declined', 'Red: Case Resolved/Declined'], text: ['Nalutas o hindi tinanggap kalakip ang paliwanag mula sa guidance.', 'Report resolved or declined with official explanation notes.'] },
    ],
    phone: ['I-tap ang My Reports tab sa ilalim na menu.', 'Tap My Reports in the bottom navigation menu.'],
    web: ['I-click ang My Reports sa kanang navigation rail.', 'Click My Reports in the right navigation rail.'],
    tip: ['Gamitin ang filter buttons sa itaas para salain ang reports ayon sa status.', 'Use top filter buttons to quickly sort by status.']
  },
  {
    icon: MessageSquare,
    tone: 'nav-c-chat',
    badge: ['Messaging', 'Messaging'],
    title: ['Confidential Guidance Chat', 'Confidential Guidance Chat'],
    tagline: ['One-on-one encrypted counseling kasama ang Guidance Office.', 'Direct one-on-one encrypted counseling with counselors.'],
    points: [
      { label: ['Direct Counselors', 'Direct Counselors'], text: ['Tanging ang Guidance Office lamang ang makakabasa ng inyong chat.', 'Only the authorized Guidance Office staff can read this conversation.'] },
      { label: ['Office Hours', 'Office Hours'], text: [`Aktibong sumasagot sa opisyal na schedule: ${hours}.`, `Active counseling response during official schedule: ${hours}.`] },
      { label: ['Audit Security', 'Audit Security'], text: ['Protektado ng RA 10173 at hindi ibubunyag sa inireklamong partido.', 'Protected under RA 10173; never revealed to reported parties.'] },
    ],
    phone: ['Buksan ang Chat tab sa ibaba. May red dot indicator kapag may bagong reply.', 'Open Chat at the bottom. A red dot alerts you to unread replies.'],
    web: ['I-click ang Chat sa kanang navigation rail para sa two-column view.', 'Click Chat in the right rail to access full two-column messaging.'],
    tip: ['Ligtas kang makakapagtanong o makakapagbigay ng karagdagang detalye dito.', 'You can freely ask questions or provide additional case details here.'],
  },
  {
    icon: ShieldCheck,
    tone: 'nav-c-me',
    badge: ['Security', 'Security'],
    title: ['Safety & Quick Exit Protection', 'Safety & Quick Exit Protection'],
    tagline: ['Agarang proteksyon kapag may sumilip o lumapit sa iyo.', 'Instant protection when someone approaches your screen.'],
    points: [
      { label: ['Quick Exit [Esc]', 'Quick Exit [Esc]'], text: ['1-click instant sign out at redirection sa Google upang walang makasilip.', 'One-click immediate logout and redirect to Google search.'] },
      { label: ['Floating Mascot', 'Floating Mascot'], text: ['Movable quick exit button sa mobile na maaaring i-drag kahit saan sa screen.', 'Movable mobile bubble button you can position anywhere on screen.'] },
      { label: ['15-Min Auto Timeout', '15-Min Auto Timeout'], text: ['Kusang magsa-sign out kapag 15 minutong walang ginagawa para sa kaligtasan.', 'Automatic security lockout after 15 minutes of inactivity.'] },
    ],
    phone: ['Pindutin ang pulang Quick Exit sa itaas o ang lumulutang na safety mascot.', 'Tap the red Quick Exit at the top or drag the floating safety mascot.'],
    web: ['I-click ang Quick Exit button sa itaas o pindutin ang [Esc] sa keyboard.', 'Click the top Quick Exit button or press [Esc] on your keyboard.'],
    tip: ['Ligtas ang iyong data: walang makakasilip ng iyong account pag-alis mo.', 'Your session leaves zero accessible browser trace after exiting.'],
  },
  {
    icon: UserCircle2,
    tone: 'nav-c-me',
    badge: ['Preferences', 'Preferences'],
    title: ['Me (Account & Settings)', 'Me (Account & Settings)'],
    tagline: ['I-customize ang iyong portal experience at account settings.', 'Customize your portal preferences and account security.'],
    points: [
      { label: ['Dark / Light Mode', 'Dark / Light Mode'], text: ['Pumili sa pagitan ng Midnight Aurora Dark Mode at Crisp Light Mode.', 'Toggle between Midnight Aurora Dark Mode and Crisp Light Mode.'] },
      { label: ['Language Switch', 'Language Switch'], text: ['Mabilisang magpalit sa pagitan ng English at Taglish language.', 'Seamlessly switch between English and Taglish interface text.'] },
      { label: ['PWA App Install', 'PWA App Install'], text: ['I-install ang portal bilang standalone app sa iyong phone o computer.', 'Install the portal as a dedicated app on your phone or PC.'] },
    ],
    phone: ['Pindutin ang Me tab sa kanang dulo ng bottom menu.', 'Tap the Me tab on the right end of the bottom menu.'],
    web: ['I-click ang Me icon sa navigation rail sa kanan.', 'Click the Me icon on the right-hand desktop navigation rail.'],
    tip: ['Dito mo rin mabubuksan ulit ang gabay na ito anumang oras.', 'You can re-open this guide anytime from this settings view.'],
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
        <div className="px-6 pt-5 pb-2 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`w-14 h-14 rounded-2xl ${s.tone} text-white flex items-center justify-center shadow-lg shrink-0`}>
              <Icon className="w-7 h-7" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#0A84FF]/10 text-[#0A84FF] dark:bg-white/10 dark:text-sky-300 mb-1">
                {s.badge[L]}
              </span>
              <h2 className="text-[22px] leading-tight font-bold tracking-tight text-[#1D1D1F] dark:text-white truncate">
                {s.title[L]}
              </h2>
            </div>
          </div>

          <p className="text-[14px] leading-snug text-[#6E6E73] dark:text-[#A1A1A6]">
            {s.tagline[L]}
          </p>

          {/* Structured Points Grid */}
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.1] bg-black/[0.02] dark:bg-white/[0.03] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
            {s.points.map((pt, idx) => (
              <div key={idx} className="p-3.5 flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] dark:bg-sky-400/20 dark:text-sky-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-[13px] font-bold text-[#1D1D1F] dark:text-white leading-tight">
                    {pt.label[L]}
                  </p>
                  <p className="text-[13px] text-[#48484A] dark:text-[#C7C7CC] leading-relaxed mt-0.5">
                    {pt.text[L]}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Device Location Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-[#0A84FF] shrink-0" />
              <div className="min-w-0 text-xs">
                <span className="font-semibold block text-[#8E8E93] dark:text-[#98989D] uppercase text-[10px]">Mobile Phone</span>
                <span className="truncate block font-medium">{s.phone[L]}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.04] dark:border-white/[0.08] flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-[#0A84FF] shrink-0" />
              <div className="min-w-0 text-xs">
                <span className="font-semibold block text-[#8E8E93] dark:text-[#98989D] uppercase text-[10px]">Computer Website</span>
                <span className="truncate block font-medium">{s.web[L]}</span>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-2 text-[13px] font-semibold text-[#248A3D] dark:text-[#30D158] bg-[#30D158]/10 rounded-xl px-3 py-2">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <span>{s.tip[L]}</span>
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
