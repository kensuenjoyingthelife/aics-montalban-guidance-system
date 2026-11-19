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
    title: ['Ito ang Home mo', 'This is your Home'],
    body: [
      'Dito mo makikita agad: ang oras at petsa, ang huling report mo at ang lagay nito, kung bukas ang Guidance Office ngayon, at kung may bukas kang chat.',
      'Here you see at a glance: the time and date, your latest report and where it stands, whether the Guidance Office is open now, and any open chat.',
    ],
    phone: ['Nasa ibaba ang menu: Home, Reports, Chat, Me.', 'The menu is at the bottom: Home, Reports, Chat, Me.'],
    web: ['Nasa kanang gilid ang menu: Home, Reports, Chat, Me.', 'The menu is on the right side: Home, Reports, Chat, Me.'],
    tip: ['Pindutin ang kahit anong card para buksan ito.', 'Tap any card to open it.'],
  },
  {
    icon: Plus,
    tone: 'nav-c-home',
    title: ['Paano mag-report', 'How to report'],
    body: [
      'Pindutin ang asul na + button. May 3 maikling hakbang: (1) piliin ang uri ng concern, (2) sabihin kung sino ang inirereklamo — okay lang kung hindi mo alam ang pangalan, (3) ikuwento ang nangyari. Pwede ka ring magdagdag ng litrato. Pindutin ang "Ipadala sa Guidance".',
      'Tap the blue + button. There are 3 short steps: (1) pick the kind of concern, (2) say who it is about — it is okay if you do not know their name, (3) tell what happened. You can add photos too. Then tap "Send to Guidance".',
    ],
    phone: ['Ang + ay nasa kanan ng menu sa ibaba.', 'The + is to the right of the bottom menu.'],
    web: ['Ang + ay nasa ibaba ng menu sa kanan. Pwede ring pindutin ang "Something to report?" sa Home.', 'The + is below the menu on the right. You can also click "Something to report?" on Home.'],
    tip: ['Pwede kang mag-report para sa kaibigan o kaklase.', 'You can also report for a friend or classmate.'],
  },
  {
    icon: FolderArchive,
    tone: 'nav-c-history',
    title: ['Tingnan ang lagay ng report', 'Check where your report stands'],
    body: [
      'Buksan ang Reports. Bawat report ay may kulay: kahel = Sinusuri ng Guidance, berde = Tinanggap, pula = Hindi tinanggap. Makikita mo rin ang petsa at ang report code mo.',
      'Open Reports. Each report has a color: orange = Being reviewed, green = Accepted, red = Not accepted. You also see the date and your report code.',
    ],
    phone: ['Pindutin ang Reports sa menu sa ibaba.', 'Tap Reports in the bottom menu.'],
    web: ['I-click ang Reports sa menu sa kanan.', 'Click Reports in the menu on the right.'],
    tip: ['Pindutin ang paikot na arrow para i-refresh.', 'Tap the round arrow to refresh.'],
  },
  {
    icon: MessageSquare,
    tone: 'nav-c-chat',
    title: ['Kausapin ang Guidance', 'Talk to Guidance'],
    body: [
      `Kapag tinanggap ng Guidance ang report mo, bubuksan nila ang isang pribadong chat. Doon ka nila kakausapin. Sumasagot sila sa oras ng opisina: ${hours}.`,
      `When Guidance accepts your report, they open a private chat. That is where they will talk to you. They reply during office hours: ${hours}.`,
    ],
    phone: ['Pindutin ang Chat sa menu. May berdeng tuldok kapag may bukas na chat.', 'Tap Chat in the menu. A green dot means a chat is open.'],
    web: ['I-click ang Chat sa kanan, o ang chat card sa Home.', 'Click Chat on the right, or the chat card on Home.'],
    tip: ['Hindi pa mabubuksan ang chat habang sinusuri pa ang report.', 'The chat cannot open while the report is still being reviewed.'],
  },
  {
    icon: ShieldCheck,
    tone: 'nav-c-me',
    title: ['Manatiling ligtas', 'Stay safe'],
    body: [
      'Kung may biglang sumilip, gamitin ang Quick Exit: agad kang mai-sign out at lilipat sa Google. Kusa ka ring masa-sign out kapag 15 minuto kang walang ginagawa (may babala 1 minuto bago nito). Ang Guidance Office lang ang makakabasa ng report mo.',
      'If someone peeks, use Quick Exit: you are signed out at once and moved to Google. You are also signed out after 15 minutes of no activity (with a warning 1 minute before). Only the Guidance Office can read your report.',
    ],
    phone: ['Pindutin ang lumulutang na mukha (pwede itong i-drag) o ang pulang Quick Exit sa itaas.', 'Tap the floating face (you can drag it) or the red Quick Exit at the top.'],
    web: ['I-click ang pulang Quick Exit sa kanang itaas, o pindutin ang Esc sa keyboard.', 'Click the red Quick Exit at the top right, or press Esc on the keyboard.'],
    tip: ['Hindi sasabihin sa inireklamo kung sino ka.', 'The reported student is never told who you are.'],
  },
  {
    icon: UserCircle2,
    tone: 'nav-c-me',
    title: ['Ang Me tab', 'The Me tab'],
    body: [
      'Sa Me, mababago mo ang wika (Taglish o English), light o dark mode, at tunog. Dito mo rin mai-install ang app, mabubuksan ulit ang gabay na ito, at makakapag-sign out.',
      'In Me, you can change the language (Taglish or English), light or dark mode, and sound. You can also install the app, open this guide again, and sign out.',
    ],
    phone: ['Pindutin ang Me sa menu sa ibaba.', 'Tap Me in the bottom menu.'],
    web: ['I-click ang Me sa menu sa kanan.', 'Click Me in the menu on the right.'],
    tip: ['Handa ka na! Nandito ang Guidance Office para sa iyo.', 'You are all set! The Guidance Office is here for you.'],
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
