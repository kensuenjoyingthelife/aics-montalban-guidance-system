// Privacy & Terms for the student portal (website + Android app).
// One page with 3 tabs: Privacy Notice · Terms of Use · Browser storage. Plain words, English + Tagalog.
// Opened from Sign In, Create Account and the portal's "Me" tab. No animation (portal rule).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getAppConfig } from '../../services/appConfig';

export type LegalTab = 'privacy' | 'terms' | 'storage';
export const LEGAL_UPDATED = 'November 27, 2026';

type Section = { h: [string, string]; p?: [string, string]; li?: Array<[string, string]> };

const content = (email: string, school: string): Record<LegalTab, Section[]> => ({
  privacy: [
    {
      h: ['1. Who we are', '1. Sino kami'],
      p: [
        `This portal is run by the Guidance Office of ${school}. The school is responsible for your personal data under the Data Privacy Act of 2012 (RA 10173).`,
        `Ang portal na ito ay pinapatakbo ng Guidance Office ng ${school}. Ang paaralan ang may pananagutan sa iyong personal na data ayon sa Data Privacy Act of 2012 (RA 10173).`,
      ],
    },
    {
      h: ['2. What we collect', '2. Anong data ang kinukuha'],
      li: [
        ['Your account: student no., name, grade and section, email, mobile number.', 'Ang account mo: student no., pangalan, grade at section, email, mobile number.'],
        ['Your password, saved only in a scrambled (hashed) form. Nobody can read it, not even the staff.', 'Ang password mo, naka-save lang sa scrambled (hashed) na anyo. Walang makakabasa nito, kahit ang staff.'],
        ['What you write in a report: what happened, when, where, who was involved, witnesses, and photos you attach.', 'Ang isinulat mo sa report: ano ang nangyari, kailan, saan, sino ang sangkot, mga saksi, at mga litratong inilakip mo.'],
        ['Your chat messages with the Guidance Office, and the dates and times of your actions.', 'Ang mga chat mo sa Guidance Office, at ang petsa at oras ng iyong mga ginawa.'],
      ],
    },
    {
      h: ['3. Why we use it', '3. Bakit ito ginagamit'],
      li: [
        ['To check that you are an enrolled AICS student (against the school masterlist).', 'Para matiyak na ikaw ay enrolled na estudyante ng AICS (ikinukumpara sa masterlist).'],
        ['To review your report, help you, and talk with you in the concern chat.', 'Para masuri ang report mo, matulungan ka, at makausap ka sa concern chat.'],
        ['To keep the school safe and follow the student handbook.', 'Para mapanatiling ligtas ang paaralan at masunod ang student handbook.'],
      ],
      p: ['We never use your data for ads and never sell it.', 'Hindi namin ginagamit ang data mo para sa ads at hindi namin ito ibinebenta.'],
    },
    {
      h: ['4. Who can see it', '4. Sino ang makakakita'],
      li: [
        ['Only the staff of the Guidance Office.', 'Ang staff lang ng Guidance Office.'],
        ['Never your classmates, the student you reported, teachers, or other parents.', 'Hindi kailanman ng mga kaklase mo, ng estudyanteng inireport mo, ng mga guro, o ng ibang magulang.'],
        ['The student you reported is never told who reported them.', 'Hindi kailanman sasabihin sa inireport mo kung sino ang nag-report.'],
        ['We share only when the law requires it, or when someone is in danger.', 'Ibinabahagi lang namin kapag hinihingi ng batas, o kapag may nasa panganib.'],
      ],
    },
    {
      h: ['5. How long we keep it', '5. Gaano katagal itinatago'],
      p: [
        'Your reports and chats are kept as school guidance records for as long as the school policy requires, then deleted. You may ask the Guidance Office to close your account.',
        'Ang mga report at chat mo ay itinatago bilang guidance records ng paaralan hangga’t kailangan ayon sa patakaran ng paaralan, at saka buburahin. Puwede mong hilingin sa Guidance Office na isara ang account mo.',
      ],
    },
    {
      h: ['6. Your rights', '6. Ang iyong mga karapatan'],
      li: [
        ['To be informed of how your data is used (this notice).', 'Malaman kung paano ginagamit ang data mo (itong notice).'],
        ['To see the data we keep about you, and to have mistakes corrected.', 'Makita ang data namin tungkol sa iyo, at maitama ang mga mali.'],
        ['To object, or to ask that your data be deleted when it is no longer needed.', 'Tumutol, o hilingin na burahin ang data mo kapag hindi na ito kailangan.'],
        ['To complain to the National Privacy Commission (privacy.gov.ph).', 'Magreklamo sa National Privacy Commission (privacy.gov.ph).'],
      ],
    },
    {
      h: ['7. Contact', '7. Makipag-ugnayan'],
      p: [
        `Go to the Guidance Office, or email ${email}.`,
        `Pumunta sa Guidance Office, o mag-email sa ${email}.`,
      ],
    },
  ],
  terms: [
    {
      h: ['1. Who can use the portal', '1. Sino ang puwedeng gumamit'],
      p: [
        'Only enrolled AICS Montalban students, with their own account. Do not share your password or use another student’s account.',
        'Mga enrolled na estudyante lang ng AICS Montalban, gamit ang sariling account. Huwag ibahagi ang password mo o gamitin ang account ng iba.',
      ],
    },
    {
      h: ['2. Report honestly', '2. Mag-report nang tapat'],
      li: [
        ['Tell what really happened. False, joke or harmful reports may be handled under the student handbook.', 'Sabihin ang totoong nangyari. Ang pekeng, biro, o nakakasakit na report ay maaaring aksyunan ayon sa student handbook.'],
        ['Attach only photos that show what happened. Do not post private photos of others.', 'Mag-lakip lang ng litratong nagpapakita ng nangyari. Huwag mag-post ng pribadong litrato ng iba.'],
      ],
    },
    {
      h: ['3. Keep the chat private and respectful', '3. Panatilihing pribado at magalang ang chat'],
      p: [
        'The concern chat opens only after your report is accepted. Be respectful, and do not share the chat with others.',
        'Bubukas lang ang concern chat kapag tinanggap ang report mo. Maging magalang, at huwag ibahagi ang chat sa iba.',
      ],
    },
    {
      h: ['4. Emergencies', '4. Emergency'],
      p: [
        'This portal is not for emergencies. If you or someone is in danger now, go to the Guidance Office or the nearest teacher or guard right away.',
        'Hindi pang-emergency ang portal na ito. Kung ikaw o may ibang nasa panganib ngayon, pumunta agad sa Guidance Office o sa pinakamalapit na guro o guard.',
      ],
    },
    {
      h: ['5. Office hours', '5. Oras ng opisina'],
      p: ['Reports are reviewed during school office hours.', 'Sinusuri ang mga report sa oras ng opisina ng paaralan.'],
    },
    {
      h: ['6. Blocked accounts', '6. Naka-block na account'],
      p: [
        'The Guidance Office may block an account that is fake, borrowed, or misused. Visit the office to fix it.',
        'Maaaring i-block ng Guidance Office ang account na peke, hiram, o maling ginamit. Pumunta sa opisina para maayos ito.',
      ],
    },
  ],
  storage: [
    {
      h: ['No tracking or ad cookies', 'Walang tracking o ad cookies'],
      p: [
        'The portal does not use cookies that track you or show ads.',
        'Hindi gumagamit ang portal ng cookies na sumusubaybay sa iyo o nagpapakita ng ads.',
      ],
    },
    {
      h: ['What your browser or phone keeps', 'Ano ang naiimbak sa browser o phone mo'],
      li: [
        ['Your sign-in, so you stay signed in. It is removed when you sign out or after 15 minutes of no use.', 'Ang sign-in mo, para manatili kang naka-sign in. Tinatanggal ito kapag nag-sign out ka o pagkalipas ng 15 minutong walang gamit.'],
        ['Your choices: language, light or dark mode, text size.', 'Ang mga pinili mo: wika, light o dark mode, laki ng text.'],
        ['An unsent report draft on your phone, so you do not lose it. It is removed once you send it.', 'Ang hindi pa naipapadalang report draft sa phone mo, para hindi mawala. Tinatanggal ito kapag naipadala na.'],
      ],
    },
    {
      h: ['On a shared phone or computer', 'Sa hiram o shared na phone o computer'],
      p: [
        'Always tap Sign out (or Exit) when you are done. You can also clear this site’s data in your browser settings.',
        'Laging pindutin ang Sign out (o Exit) kapag tapos ka na. Puwede mo ring burahin ang data ng site na ito sa settings ng browser mo.',
      ],
    },
  ],
});

const TABS: Array<[LegalTab, string, string]> = [
  ['privacy', 'Privacy Notice', 'Privacy Notice'],
  ['terms', 'Terms of Use', 'Terms of Use'],
  ['storage', 'Browser storage', 'Browser storage'],
];

export const PrivacyTerms: React.FC<{ open: boolean; onClose: () => void; isTl: boolean; initialTab?: LegalTab }> = ({ open, onClose, isTl, initialTab = 'privacy' }) => {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const cfg = getAppConfig();
  const school = cfg.campus?.schoolName ? `${cfg.campus.schoolName.toLowerCase().replace(/\b\w+/g, (w) => (['of', 'and', 'the', 'de'].includes(w) ? w : w[0].toUpperCase() + w.slice(1)))} (${cfg.campus.campusName || 'Montalban'})` : 'AICS Montalban';
  const email = cfg.campus?.officialEmail || 'the Guidance Office email';
  const L = isTl ? 1 : 0;
  const sections = content(email, school)[tab];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={isTl ? 'Privacy at Terms' : 'Privacy and Terms'} data-legal>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl h-[92dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-t-[22px] sm:rounded-[22px] shadow-2xl overflow-hidden">
        {/* header */}
        <div className="px-5 pt-4 pb-3 border-b border-black/[0.08] dark:border-white/[0.1]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px] font-bold leading-tight">{isTl ? 'Privacy at Terms' : 'Privacy & Terms'}</h2>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#A1A1A6] mt-0.5">
                {isTl ? 'Huling binago' : 'Last updated'}: {LEGAL_UPDATED} · AICS Guidance Office
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label={isTl ? 'Isara' : 'Close'} className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/[0.1] flex items-center justify-center shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/[0.05] dark:bg-white/[0.08]">
            {TABS.map(([k, en, tl]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                data-legal-tab={k}
                onClick={() => setTab(k)}
                className={`h-9 rounded-lg text-[13px] font-semibold ${tab === k ? 'bg-white dark:bg-[#3A3A3C] shadow-sm' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}
              >
                {isTl ? tl : en}
              </button>
            ))}
          </div>
        </div>

        {/* body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5">
          {sections.map((s) => (
            <section key={s.h[0]}>
              <h3 className="text-[15px] font-bold mb-1.5">{s.h[L]}</h3>
              {s.li && (
                <ul className="list-disc pl-5 space-y-1 text-[14px] leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6]">
                  {s.li.map((x) => (
                    <li key={x[0]}>{x[L]}</li>
                  ))}
                </ul>
              )}
              {s.p && <p className="text-[14px] leading-relaxed text-[#3A3A3C] dark:text-[#D1D1D6] mt-1">{s.p[L]}</p>}
            </section>
          ))}
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t border-black/[0.08] dark:border-white/[0.1] flex justify-end" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} className="h-11 px-6 rounded-full bg-[#007AFF] text-white text-[15px] font-semibold">
            {isTl ? 'Tapos' : 'Done'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/** small gray "Privacy Notice · Terms of Use" links (Sign In, Create Account) */
export const LegalLinks: React.FC<{ isTl: boolean; onOpen: (t: LegalTab) => void; className?: string }> = ({ isTl, onOpen, className = '' }) => (
  <p className={`text-center text-[12px] text-[#8E8E93] ${className}`} data-legal-links>
    <button type="button" onClick={() => onOpen('privacy')} className="underline-offset-2 hover:underline">
      Privacy Notice
    </button>
    <span aria-hidden> · </span>
    <button type="button" onClick={() => onOpen('terms')} className="underline-offset-2 hover:underline">
      Terms of Use
    </button>
    <span className="sr-only">{isTl ? 'Basahin ang privacy at terms' : 'Read privacy and terms'}</span>
  </p>
);
