// Settings — features flowchart page 17 (PIN-protected). The office sets up how the system works:
// office days & hours (+ closed days), people's schedules, offenses & rules, SMS templates,
// accounts & security, backup & retention. Every change: check → confirm → save → audit trail.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../context/LanguageContext';
import { useConfirmChange } from '../components/ui/ConfirmChange';
import { soundFX } from '../services/soundEngine';
import type { ToastNextAction } from './DashboardPage';
import {
  useAppConfig,
  saveConfig,
  writeRow,
  refreshLists,
  checkPin,
  makePinRecord,
  fillTemplate,
  DEFAULTS,
  OfficeHours,
  PersonSchedule,
  OffenseRow,
  StaffAccount,
  getAppConfig,
  StudentFields,
  CustomField,
  CoreField,
  CORE_FIELD_WORDS,
} from '../services/appConfig';
import { buildSlots, fmtClock, todayISO } from '../services/scheduling';
import { smsInfo } from '../services/smsText';
import { findSensitiveWords } from '../services/parentComms';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';
import type { HandbookClassification } from '../data/stage3MockData';

type Section = 'office' | 'people' | 'offenses' | 'students' | 'sms' | 'security' | 'backup';
interface Props {
  onTriggerToast: (msg: string, undo?: () => void, next?: ToastNextAction) => void;
}

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEK_EN: Record<string, string> = { Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun' };
const WEEK_TL: Record<string, string> = { Mon: 'Lun', Tue: 'Mar', Wed: 'Miy', Thu: 'Huw', Fri: 'Biy', Sat: 'Sab', Sun: 'Lin' };
const LEVELS: HandbookClassification[] = ['Minor', 'Less Serious', 'Serious', 'Grave'];
const LEVEL_TONE: Record<string, string> = {
  Minor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  'Less Serious': 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  Serious: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  Grave: 'bg-rose-600 text-white',
};
const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap';
const primary = `${btn} px-5 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`;
const ghost = `${btn} px-3 py-2 saas-card-subtle`;
const card = 'rounded-2xl saas-card';
const sub = 'text-xs text-[#4A608A] dark:text-[#94A8D0]';
const h2 = 'text-base font-extrabold text-[#0B1F4D] dark:text-white';
const label = 'block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1';
const input = 'w-full px-3 py-2 rounded-xl border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';
const errText = 'text-xs font-bold text-rose-700 dark:text-rose-300';
const toMin = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
const clock = (t: string) => (Number.isNaN(toMin(t)) ? t : fmtClock(toMin(t)).replace(/^0/, ''));
const NOT_SAVED = (tl: boolean) => (tl ? '⚠️ Hindi na-save. I-check ang internet, tapos subukan ulit.' : '⚠️ Not saved. Check the internet, then try again.');

const DayPicker: React.FC<{ value: string[]; onChange: (d: string[]) => void; isTl: boolean; id: string }> = ({ value, onChange, isTl, id }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label={isTl ? 'Mga araw' : 'Days'}>
    {WEEK.map((d) => {
      const on = value.includes(d);
      return (
        <button
          key={d}
          type="button"
          aria-pressed={on}
          data-day-toggle={`${id}-${d}`}
          onClick={() => onChange(on ? value.filter((x) => x !== d) : WEEK.filter((x) => x === d || value.includes(x)))}
          className={`w-12 py-2 rounded-lg text-xs font-extrabold border ${on ? 'bg-[#1E469B] text-white border-[#1E469B]' : 'border-[#D3DDEE] dark:border-[#253B66] text-[#4A608A] dark:text-[#94A8D0]'}`}
        >
          {isTl ? WEEK_TL[d] : WEEK_EN[d]}
        </button>
      );
    })}
  </div>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, footer, wide }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-confirm-open]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/50 flex items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0F1A30] border border-[#D3DDEE] dark:border-[#253B66] shadow-2xl`}>
        <div className="px-6 py-4 border-b border-[#DCE5F2] dark:border-[#1E3158] flex items-center justify-between">
          <h3 className={h2}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className="w-8 h-8 rounded-lg text-[#4A608A] hover:bg-slate-100 dark:hover:bg-slate-800">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">{children}</div>
        <div className="px-6 py-4 border-t border-[#DCE5F2] dark:border-[#1E3158] flex justify-end gap-2">{footer}</div>
      </div>
    </div>,
    document.body
  );
};

// =====================================================================================
const SettingsPage: React.FC<Props> = ({ onTriggerToast }) => {
  const { locale } = useLanguage();
  const isTl = locale === 'tl';
  const cfg = useAppConfig();
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState<Section>('office');

  if (!unlocked) return <PinGate isTl={isTl} onOk={() => setUnlocked(true)} />;

  const sections: [Section, string, string][] = [
    ['office', isTl ? 'Araw at oras ng office' : 'Office days & hours', isTl ? 'Ginagamit ng Smart Scheduling' : 'Used by Smart Scheduling'],
    ['people', isTl ? 'Schedule ng mga tao' : 'People’s schedules', isTl ? 'Counselor, Principal at iba pa' : 'Counselor, Principal and others'],
    ['offenses', isTl ? 'Offenses at patakaran' : 'Offenses & rules', isTl ? 'Handbook, antas, sanction' : 'Handbook, levels, sanctions'],
    ['students', isTl ? 'Impormasyon ng estudyante' : 'Student fields', isTl ? 'Ano ang hinihingi sa "Add student"' : 'What "Add student" asks for'],
    ['sms', isTl ? 'SMS templates' : 'SMS templates', isTl ? 'Mensahe sa magulang' : 'Messages to parents'],
    ['security', isTl ? 'Accounts at security' : 'Accounts & security', isTl ? 'Staff, PIN, sign-out' : 'Staff, PIN, sign-out'],
    ['backup', isTl ? 'Backup at retention' : 'Backup & retention', isTl ? 'I-download ang lahat ng data' : 'Download all data'],
  ];

  return (
    <main className="p-5 lg:p-6 max-w-[1440px] w-full mx-auto flex-1">
      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 items-start">
        <nav className={`${card} p-2 space-y-1 lg:sticky lg:top-4`} aria-label={isTl ? 'Mga bahagi ng Settings' : 'Settings sections'}>
          {sections.map(([id, title, hint]) => (
            <button
              key={id}
              type="button"
              data-settings-section={id}
              aria-current={section === id ? 'page' : undefined}
              onClick={() => {
                soundFX.playToggleSwitch(true);
                setSection(id);
              }}
              className={`w-full text-left rounded-xl px-3 py-2.5 ${section === id ? 'bg-[#1E469B] text-white' : 'hover:bg-[#EEF3FC] dark:hover:bg-[#13203B] text-[#0B1F4D] dark:text-white'}`}
            >
              <span className="block text-sm font-extrabold">{title}</span>
              <span className={`block text-[11px] ${section === id ? 'text-white/80' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>{hint}</span>
            </button>
          ))}
          <p className={`${sub} px-3 pt-2`}>🔒 {isTl ? 'Naitatala sa Audit Trail ang bawat pagbabago.' : 'Every change is kept in the Audit Trail.'}</p>
        </nav>
        <div className="min-w-0">
          {!cfg.loaded && (
            <div role="alert" className="mb-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-xs font-bold text-amber-900 dark:text-amber-200">
              {isTl ? 'Hindi pa nakuha ang settings mula sa database. I-check ang internet. Ang nakikita ay ang default.' : 'Settings were not loaded from the database yet. Check the internet. You are seeing the defaults.'}
            </div>
          )}
          {section === 'office' && <OfficeSection isTl={isTl} toast={onTriggerToast} />}
          {section === 'people' && <PeopleSection isTl={isTl} toast={onTriggerToast} />}
          {section === 'offenses' && <OffensesSection isTl={isTl} toast={onTriggerToast} />}
          {section === 'students' && <StudentFieldsSection isTl={isTl} toast={onTriggerToast} />}
          {section === 'sms' && <SmsSection isTl={isTl} toast={onTriggerToast} />}
          {section === 'security' && <SecuritySection isTl={isTl} toast={onTriggerToast} />}
          {section === 'backup' && <BackupSection isTl={isTl} toast={onTriggerToast} />}
        </div>
      </div>
    </main>
  );
};

// ------------------------------------------------------------------ PIN gate
const PinGate: React.FC<{ isTl: boolean; onOk: () => void }> = ({ isTl, onOk }) => {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!/^\d{6}$/.test(pin)) return setErr(isTl ? 'Ilagay ang 6 na numero ng PIN.' : 'Enter the 6-digit PIN.');
    setBusy(true);
    const ok = await checkPin(pin);
    setBusy(false);
    if (ok) {
      soundFX.playStepUnlock();
      onOk();
    } else {
      soundFX.playError();
      setPin('');
      setErr(isTl ? 'Maling PIN. Subukan ulit. (Ito ang PIN na ginagamit sa pag-sign in.)' : 'Wrong PIN. Try again. (It is the same PIN you use to sign in.)');
    }
  };
  return (
    <main className="p-6 flex-1 flex items-center justify-center">
      <form
        className={`${card} p-8 w-full max-w-sm space-y-4 text-center`}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="text-3xl">🔒</div>
        <h2 className={h2}>{isTl ? 'Ilagay ang PIN para buksan ang Settings' : 'Enter the PIN to open Settings'}</h2>
        <p className={sub}>{isTl ? 'Pinoprotektahan ito para hindi mabago ng iba ang system.' : 'This keeps other people from changing how the system works.'}</p>
        <input
          data-settings-pin
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
            setErr('');
          }}
          inputMode="numeric"
          type="password"
          autoFocus
          aria-label="PIN"
          placeholder="••••••"
          className={`${input} text-center tracking-[0.6em] text-lg font-extrabold`}
        />
        {err && <p className={errText} role="alert">{err}</p>}
        <button type="submit" disabled={busy || pin.length !== 6} className={`${primary} w-full`}>
          {busy ? (isTl ? 'Sinusuri…' : 'Checking…') : isTl ? 'Buksan' : 'Open Settings'}
        </button>
      </form>
    </main>
  );
};

// ------------------------------------------------------------------ 1. Office days & hours (+ closed days)
const OfficeSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [o, setO] = useState<OfficeHours>(cfg.officeHours);
  useEffect(() => setO(cfg.officeHours), [cfg.officeHours]);
  const slots = useMemo(() => buildSlots(o), [o]);
  const problems: string[] = [];
  if (!o.days.length) problems.push(isTl ? 'Pumili ng kahit isang araw.' : 'Pick at least one day.');
  if (!(toMin(o.end) > toMin(o.start))) problems.push(isTl ? 'Ang sarado ay dapat pagkatapos ng bukas.' : 'Closing time must be after opening time.');
  if ((o.lunchStart || o.lunchEnd) && !(toMin(o.lunchEnd) > toMin(o.lunchStart))) problems.push(isTl ? 'Ang tapos ng lunch ay dapat pagkatapos ng simula nito.' : 'Lunch end must be after lunch start.');
  if (!slots.length) problems.push(isTl ? 'Walang kasyang conference time. Habaan ang oras o paikliin ang conference.' : 'No conference time fits. Make the hours longer or the conference shorter.');
  const changed = JSON.stringify(o) !== JSON.stringify(cfg.officeHours);
  const save = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang araw at oras ng office?' : 'Save office days & hours?',
      rows: [
        { label: isTl ? 'Mga araw' : 'Days', before: cfg.officeHours.days.join(', '), after: o.days.join(', ') },
        { label: isTl ? 'Oras' : 'Hours', before: `${clock(cfg.officeHours.start)}–${clock(cfg.officeHours.end)}`, after: `${clock(o.start)}–${clock(o.end)}` },
        { label: 'Lunch', before: `${clock(cfg.officeHours.lunchStart)}–${clock(cfg.officeHours.lunchEnd)}`, after: o.lunchStart ? `${clock(o.lunchStart)}–${clock(o.lunchEnd)}` : isTl ? 'Wala' : 'None' },
        { label: isTl ? 'Haba ng conference' : 'Conference length', before: `${cfg.officeHours.slotMinutes} min`, after: `${o.slotMinutes} min` },
        { label: isTl ? 'Conference times bawat araw' : 'Conference times a day', before: String(buildSlots(cfg.officeHours).length), after: String(slots.length) },
      ],
      note: isTl ? 'Hindi gagalawin ang mga conference na naka-schedule na.' : 'Conferences already scheduled are not changed.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const prev = cfg.officeHours;
    if (!(await saveConfig('office_hours', o))) return toast(NOT_SAVED(isTl));
    soundFX.playSuccessCheck();
    toast(isTl ? '✓ Na-save. Ito na ang gagamitin ng Smart Scheduling.' : '✓ Saved. Smart Scheduling now uses these hours.', () => void saveConfig('office_hours', prev));
  };

  // closed days
  const [day, setDay] = useState('');
  const [reason, setReason] = useState('');
  const dup = cfg.closedDays.some((d) => d.day === day);
  const addClosed = async () => {
    const r = await writeRow('school_closed_days', 'POST', { day, reason: reason.trim() });
    if (!r) return toast(NOT_SAVED(isTl));
    await refreshLists();
    setDay('');
    setReason('');
    toast(isTl ? `✓ Walang pasok sa ${day}. Hindi na ito iaalok sa scheduling.` : `✓ ${day} is closed. Scheduling will not offer it.`);
  };
  const removeClosed = async (id: number, d: string, why: string) => {
    const ok = await confirmChange({
      title: isTl ? 'Alisin ang araw na walang pasok?' : 'Remove this closed day?',
      rows: [{ label: d, before: why, after: isTl ? 'Bukas ulit ang office' : 'Office open again' }],
      confirmLabel: isTl ? 'Oo, alisin' : 'Yes, remove',
      tone: 'danger',
    });
    if (!ok) return;
    if (!(await writeRow('school_closed_days', 'DELETE', null, id))) return toast(NOT_SAVED(isTl));
    await refreshLists();
    toast(isTl ? 'Inalis ang araw.' : 'Closed day removed.', async () => {
      await writeRow('school_closed_days', 'POST', { day: d, reason: why });
      await refreshLists();
    });
  };
  const upcoming = cfg.closedDays.filter((d) => d.day >= todayISO());
  const past = cfg.closedDays.filter((d) => d.day < todayISO());

  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-4`} data-section="office">
        <div>
          <h2 className={h2}>{isTl ? 'Araw at oras ng office' : 'Office days & hours'}</h2>
          <p className={sub}>{isTl ? 'Dito kumukuha ang Smart Scheduling ng mga puwedeng araw at oras ng conference.' : 'Smart Scheduling offers conference days and times from these.'}</p>
        </div>
        <div>
          <span className={label}>{isTl ? 'Mga araw na bukas' : 'Open days'}</span>
          <DayPicker id="office" value={o.days} onChange={(d) => setO({ ...o, days: d })} isTl={isTl} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(
            [
              ['start', isTl ? 'Bukas' : 'Opens'],
              ['end', isTl ? 'Sarado' : 'Closes'],
              ['lunchStart', isTl ? 'Simula ng lunch' : 'Lunch starts'],
              ['lunchEnd', isTl ? 'Tapos ng lunch' : 'Lunch ends'],
            ] as const
          ).map(([k, t]) => (
            <label key={k}>
              <span className={label}>{t}</span>
              <input type="time" data-office-field={k} value={o[k]} onChange={(e) => setO({ ...o, [k]: e.target.value })} className={input} />
            </label>
          ))}
          <label>
            <span className={label}>{isTl ? 'Haba ng conference' : 'Conference length'}</span>
            <select data-office-field="slotMinutes" value={o.slotMinutes} onChange={(e) => setO({ ...o, slotMinutes: Number(e.target.value) })} className={input}>
              {[30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} min
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="rounded-xl saas-card-subtle p-3">
          <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white" data-slot-preview>
            {isTl ? `${slots.length} conference time bawat araw:` : `${slots.length} conference times a day:`}
          </p>
          <p className={sub}>{slots.map((t) => fmtClock(t).replace(/^0/, '')).join(' · ') || '—'}</p>
        </div>
        {problems.map((p) => (
          <p key={p} className={errText} role="alert">
            ⚠ {p}
          </p>
        ))}
        <div className="flex justify-end gap-2">
          {changed && (
            <button type="button" className={ghost} onClick={() => setO(cfg.officeHours)}>
              {isTl ? 'Ibalik' : 'Undo changes'}
            </button>
          )}
          <button type="button" data-action="save-office" disabled={!changed || problems.length > 0} onClick={() => void save()} className={primary}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </div>
      </section>

      <section className={`${card} p-5 space-y-3`} data-section="closed">
        <div>
          <h2 className={h2}>{isTl ? 'Walang pasok (holiday, event)' : 'Closed days (holidays, events)'}</h2>
          <p className={sub}>{isTl ? 'Hindi iaalok ng Smart Scheduling ang mga araw na ito.' : 'Smart Scheduling never offers these days.'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2 items-end">
          <label>
            <span className={label}>{isTl ? 'Petsa' : 'Date'}</span>
            <input type="date" data-closed-day value={day} min={todayISO()} onChange={(e) => setDay(e.target.value)} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Dahilan' : 'Reason'}</span>
            <input data-closed-reason value={reason} onChange={(e) => setReason(e.target.value.slice(0, 120))} placeholder={isTl ? 'hal. Bonifacio Day' : 'e.g. Bonifacio Day'} className={input} />
          </label>
          <button type="button" data-action="add-closed" disabled={!day || reason.trim().length < 2 || dup} onClick={() => void addClosed()} className={`${btn} px-4 py-2.5 bg-[#1E469B] text-white disabled:opacity-50`}>
            + {isTl ? 'Idagdag' : 'Add'}
          </button>
        </div>
        {dup && <p className={errText}>{isTl ? 'Nasa listahan na ang petsang ito.' : 'This date is already on the list.'}</p>}
        <div className="space-y-1.5">
          {upcoming.length === 0 && <p className={sub}>{isTl ? 'Walang darating na araw na walang pasok.' : 'No upcoming closed days.'}</p>}
          {[...upcoming, ...past].slice(0, 60).map((d) => (
            <div key={d.id} data-closed-row={d.day} className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2 saas-card-subtle ${d.day < todayISO() ? 'opacity-60' : ''}`}>
              <span className="text-sm text-[#0B1F4D] dark:text-white">
                <b>{new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d.day + 'T00:00:00'))}</b> · {d.reason}
                {d.day < todayISO() ? ` · ${isTl ? 'lumipas na' : 'past'}` : ''}
              </span>
              <button type="button" onClick={() => void removeClosed(d.id, d.day, d.reason)} className={`${btn} text-rose-700 dark:text-rose-300`}>
                {isTl ? 'Alisin' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

// ------------------------------------------------------------------ 2. People's schedules
const ROLE_PRESETS = ['Principal', 'Assistant Principal', 'Guidance Counselor', 'Discipline Officer', 'Registrar'];
const PeopleSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [days, setDays] = useState<string[]>(cfg.counselorDays);
  useEffect(() => setDays(cfg.counselorDays), [cfg.counselorDays]);
  const [edit, setEdit] = useState<PersonSchedule | 'new' | null>(null);
  const changed = JSON.stringify(days) !== JSON.stringify(cfg.counselorDays);
  const saveCounselor = async () => {
    const prev = cfg.counselorDays;
    if (!(await saveConfig('counselor_days', days))) return toast(NOT_SAVED(isTl));
    toast(isTl ? '✓ Na-save ang araw ng counselor. Ito na ang iaalok sa listahan ng counselor.' : '✓ Counselor days saved. The counselor list now offers these days.', () => void saveConfig('counselor_days', prev));
  };
  const remove = async (p: PersonSchedule) => {
    const ok = await confirmChange({
      title: isTl ? 'Alisin sa listahan?' : 'Remove from the list?',
      rows: [{ label: p.role, before: p.name, after: isTl ? 'Inalis' : 'Removed' }],
      confirmLabel: isTl ? 'Oo, alisin' : 'Yes, remove',
      tone: 'danger',
    });
    if (!ok) return;
    if (!(await writeRow('people_schedules', 'DELETE', null, p.id))) return toast(NOT_SAVED(isTl));
    await refreshLists();
    toast(isTl ? `Inalis si ${p.name}.` : `${p.name} was removed.`, async () => {
      await writeRow('people_schedules', 'POST', { role: p.role, name: p.name, days: p.days, start_time: p.start, end_time: p.end, note: p.note || null });
      await refreshLists();
    });
  };
  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-3`} data-section="counselor">
        <div>
          <h2 className={h2}>{isTl ? 'Araw ng guidance counselor' : 'Guidance counselor days'}</h2>
          <p className={sub}>{isTl ? 'Ang mga araw na ito ang iaalok kapag nag-schedule sa "Counselor".' : 'These are the days offered when you schedule in "Counselor".'}</p>
        </div>
        <DayPicker id="counselor" value={days} onChange={setDays} isTl={isTl} />
        <div className="flex justify-end">
          <button type="button" data-action="save-counselor" disabled={!changed} onClick={() => void saveCounselor()} className={primary}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </div>
      </section>
      <section className={`${card} p-5 space-y-3`} data-section="people">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{isTl ? 'Schedule ng iba pang tao' : 'Other people’s schedules'}</h2>
            <p className={sub}>{isTl ? 'hal. kailan nasa school ang Principal — para alam kung kailan puwede ang conference na kailangan siya.' : 'e.g. when the Principal is in school — so you know when a conference that needs them can happen.'}</p>
          </div>
          <button type="button" data-action="add-person" onClick={() => setEdit('new')} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
            + {isTl ? 'Magdagdag' : 'Add person'}
          </button>
        </div>
        {cfg.people.length === 0 && <p className={sub}>{isTl ? 'Wala pa. Pindutin ang "+ Magdagdag" para ilagay ang Principal o iba pa.' : 'Nobody yet. Press "+ Add person" to add the Principal or others.'}</p>}
        <div className="space-y-1.5">
          {cfg.people.map((p) => (
            <div key={p.id} data-person-row={p.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 saas-card-subtle">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                  {p.name} <span className={sub}>· {p.role}</span>
                </p>
                <p className={sub}>
                  {(p.days.length ? p.days.map((d) => (isTl ? WEEK_TL[d] : WEEK_EN[d])).join(', ') : isTl ? 'Walang araw' : 'No days')} · {clock(p.start)}–{clock(p.end)}
                  {p.note ? ` · ${p.note}` : ''}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEdit(p)} className={ghost}>
                  {isTl ? 'Baguhin' : 'Edit'}
                </button>
                <button type="button" onClick={() => void remove(p)} className={`${btn} text-rose-700 dark:text-rose-300`}>
                  {isTl ? 'Alisin' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      {edit && <PersonWindow isTl={isTl} person={edit === 'new' ? null : edit} onClose={() => setEdit(null)} toast={toast} />}
    </div>
  );
};
const PersonWindow: React.FC<{ isTl: boolean; person: PersonSchedule | null; onClose: () => void; toast: Props['onTriggerToast'] }> = ({ isTl, person, onClose, toast }) => {
  const [role, setRole] = useState(person?.role ?? 'Principal');
  const [name, setName] = useState(person?.name ?? '');
  const [days, setDays] = useState<string[]>(person?.days ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [start, setStart] = useState(person?.start ?? '08:00');
  const [end, setEnd] = useState(person?.end ?? '17:00');
  const [note, setNote] = useState(person?.note ?? '');
  const [busy, setBusy] = useState(false);
  const bad =
    role.trim().length < 2 ? (isTl ? 'Ilagay ang posisyon.' : 'Enter the role.') : name.trim().length < 2 ? (isTl ? 'Ilagay ang pangalan.' : 'Enter the name.') : !(toMin(end) > toMin(start)) ? (isTl ? 'Ang uwi ay dapat pagkatapos ng dating.' : 'Leaves must be after arrives.') : '';
  const save = async () => {
    setBusy(true);
    const body = { role: role.trim(), name: name.trim(), days, start_time: start, end_time: end, note: note.trim() || null, updated_at: new Date().toISOString() };
    const r = person ? await writeRow('people_schedules', 'PATCH', body, person.id) : await writeRow('people_schedules', 'POST', body);
    setBusy(false);
    if (!r) return toast(NOT_SAVED(isTl));
    await refreshLists();
    soundFX.playSuccessCheck();
    toast(isTl ? `✓ Na-save ang schedule ni ${name.trim()}.` : `✓ ${name.trim()}'s schedule saved.`);
    onClose();
  };
  return (
    <Modal
      title={person ? (isTl ? 'Baguhin ang schedule' : 'Edit schedule') : isTl ? 'Magdagdag ng tao' : 'Add a person'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghost}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="save-person" disabled={!!bad || busy} onClick={() => void save()} className={primary}>
            {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save' : 'Save'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={label}>{isTl ? 'Posisyon' : 'Role'}</span>
          <input list="role-presets" data-person-role value={role} onChange={(e) => setRole(e.target.value.slice(0, 60))} className={input} />
          <datalist id="role-presets">
            {ROLE_PRESETS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <label>
          <span className={label}>{isTl ? 'Pangalan' : 'Name'}</span>
          <input data-person-name value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} placeholder="Dr. Maria Santos" className={input} />
        </label>
      </div>
      <div>
        <span className={label}>{isTl ? 'Mga araw sa school' : 'Days in school'}</span>
        <DayPicker id="person" value={days} onChange={setDays} isTl={isTl} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={label}>{isTl ? 'Dating' : 'Arrives'}</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={input} />
        </label>
        <label>
          <span className={label}>{isTl ? 'Uwi' : 'Leaves'}</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={input} />
        </label>
      </div>
      <label className="block">
        <span className={label}>{isTl ? 'Tala (opsyonal)' : 'Note (optional)'}</span>
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 120))} placeholder={isTl ? 'hal. Nasa meeting tuwing Lunes ng umaga' : 'e.g. In meetings on Monday mornings'} className={input} />
      </label>
      {bad && <p className={errText}>{bad}</p>}
    </Modal>
  );
};

// ------------------------------------------------------------------ 3. Offenses & rules
const OffensesSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [edit, setEdit] = useState<OffenseRow | 'new' | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [rules, setRules] = useState(cfg.caseRules);
  useEffect(() => setRules(cfg.caseRules), [cfg.caseRules]);
  const active = cfg.offenses.filter((o) => o.active).sort((a, b) => a.sortOrder - b.sortOrder);
  const removed = cfg.offenses.filter((o) => !o.active);
  const rulesBad =
    !(rules.escalateAfterMinors >= 2 && rules.escalateAfterMinors <= 5)
      ? isTl ? 'Ang bilang ng minor ay 2 hanggang 5.' : 'Minor count must be 2 to 5.'
      : !(rules.overdueDays >= 3 && rules.overdueDays <= 60)
      ? isTl ? 'Ang overdue ay 3 hanggang 60 araw.' : 'Overdue must be 3 to 60 days.'
      : !((rules.pendingSanctionDays ?? 3) >= 1 && (rules.pendingSanctionDays ?? 3) <= 30)
      ? isTl ? 'Ang alert sa sanction ay 1 hanggang 30 araw.' : 'Sanction alert must be 1 to 30 days.'
      : !((rules.idHoldDays ?? 3) >= 1 && (rules.idHoldDays ?? 3) <= 30)
      ? isTl ? 'Ang alert sa ID ay 1 hanggang 30 araw.' : 'ID alert must be 1 to 30 days.'
      : '';
  const rulesChanged = JSON.stringify(rules) !== JSON.stringify(cfg.caseRules);
  const saveRules = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang mga patakaran?' : 'Save the rules?',
      rows: [
        { label: isTl ? 'Ilang minor sa sunod-sunod = Serious' : 'Minors in a row = Serious', before: String(cfg.caseRules.escalateAfterMinors), after: String(rules.escalateAfterMinors) },
        { label: isTl ? 'Overdue pagkatapos ng' : 'Overdue after', before: `${cfg.caseRules.overdueDays} ${isTl ? 'araw' : 'days'}`, after: `${rules.overdueDays} ${isTl ? 'araw' : 'days'}` },
        { label: isTl ? 'Alert: sanction na naghihintay' : 'Alert: sanction waiting', before: `${cfg.caseRules.pendingSanctionDays ?? 3} ${isTl ? 'araw' : 'days'}`, after: `${rules.pendingSanctionDays ?? 3} ${isTl ? 'araw' : 'days'}` },
        { label: isTl ? 'Alert: ID na hawak' : 'Alert: ID kept', before: `${cfg.caseRules.idHoldDays ?? 3} ${isTl ? 'araw' : 'days'}`, after: `${rules.idHoldDays ?? 3} ${isTl ? 'araw' : 'days'}` },
      ],
      note: isTl ? 'Para lang sa mga bagong kaso. Hindi binabago ang mga naitala na.' : 'Applies to new cases only. Saved cases do not change.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const prev = cfg.caseRules;
    if (!(await saveConfig('case_rules', rules))) return toast(NOT_SAVED(isTl));
    toast(isTl ? '✓ Na-save ang mga patakaran.' : '✓ Rules saved.', () => void saveConfig('case_rules', prev));
  };
  const setActive = async (o: OffenseRow, on: boolean) => {
    if (!on && active.length <= 1) return toast(isTl ? '⚠️ Kailangan ng kahit isang offense sa handbook.' : '⚠️ The handbook needs at least one offense.');
    if (!on) {
      const ok = await confirmChange({
        title: isTl ? 'Alisin ang offense sa listahan?' : 'Remove this offense from the list?',
        rows: [{ label: o.policyCode, before: isTl ? o.titleTl : o.titleEn, after: isTl ? 'Hindi na mapipili sa bagong kaso' : 'Cannot be picked for new cases' }],
        note: isTl ? 'Hindi mabubura ang mga lumang kaso na may ganitong offense. Puwede itong ibalik.' : 'Old cases with this offense are kept. You can bring it back.',
        confirmLabel: isTl ? 'Oo, alisin' : 'Yes, remove',
        tone: 'danger',
      });
      if (!ok) return;
    }
    if (!(await writeRow('offense_policies', 'PATCH', { is_active: on }, o.id))) return toast(NOT_SAVED(isTl));
    await refreshLists();
    toast(on ? (isTl ? '✓ Naibalik ang offense.' : '✓ Offense brought back.') : isTl ? 'Inalis ang offense.' : 'Offense removed.', on ? undefined : async () => {
      await writeRow('offense_policies', 'PATCH', { is_active: true }, o.id);
      await refreshLists();
    });
  };
  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-3`} data-section="rules">
        <h2 className={h2}>{isTl ? 'Mga patakaran' : 'Rules'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label>
            <span className={label}>{isTl ? 'Ilang minor sa sunod-sunod bago maging Serious (manuscript: 2)' : 'Minor offenses in a row before it counts as Serious (manuscript: 2)'}</span>
            <input type="number" min={2} max={5} data-rule="escalate" value={rules.escalateAfterMinors} onChange={(e) => setRules({ ...rules, escalateAfterMinors: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Overdue kapag bukas nang higit (araw)' : 'Overdue when open more than (days)'}</span>
            <input type="number" min={3} max={60} data-rule="overdue" value={rules.overdueDays} onChange={(e) => setRules({ ...rules, overdueDays: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Alert kapag ang sanction ay naghihintay sa magulang nang higit (araw)' : 'Alert when a sanction waits for the parent more than (days)'}</span>
            <input type="number" min={1} max={30} data-rule="pending" value={rules.pendingSanctionDays ?? 3} onChange={(e) => setRules({ ...rules, pendingSanctionDays: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Alert kapag hawak ang ID nang higit (araw)' : 'Alert when an ID is kept more than (days)'}</span>
            <input type="number" min={1} max={30} data-rule="idhold" value={rules.idHoldDays ?? 3} onChange={(e) => setRules({ ...rules, idHoldDays: Number(e.target.value) })} className={input} />
          </label>
        </div>
        {rulesBad && <p className={errText}>⚠ {rulesBad}</p>}
        <div className="flex justify-end">
          <button type="button" data-action="save-rules" disabled={!rulesChanged || !!rulesBad} onClick={() => void saveRules()} className={primary}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </div>
      </section>
      <section className={`${card} p-5 space-y-3`} data-section="offenses">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{isTl ? `Mga offense sa handbook (${active.length})` : `Handbook offenses (${active.length})`}</h2>
            <p className={sub}>{isTl ? 'Ito ang mapipili sa "+ New case". Ang sanction ay para sa 1st, 2nd at 3rd na beses.' : 'These can be picked in "+ New case". Sanctions are for the 1st, 2nd and 3rd time.'}</p>
          </div>
          <button type="button" data-action="add-offense" onClick={() => setEdit('new')} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
            + {isTl ? 'Magdagdag ng offense' : 'Add offense'}
          </button>
        </div>
        <ul className="flex flex-wrap gap-2" aria-label={isTl ? 'Ibig sabihin ng kulay' : 'What the colors mean'} data-legend>
          {LEVELS.map((l) => (
            <li key={l} className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${LEVEL_TONE[l]}`}>
              {l}
            </li>
          ))}
          <li className={sub}>{isTl ? '← antas ng offense (mula magaan hanggang pinakamabigat)' : '← offense level (lightest to heaviest)'}</li>
        </ul>
        <div className="space-y-1.5">
          {active.map((o) => (
            <div key={o.id} data-offense-row={o.policyCode} className="flex flex-wrap items-start justify-between gap-3 rounded-xl px-3 py-2.5 saas-card-subtle">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                  <span className={`mr-2 px-2 py-0.5 rounded-full text-[11px] ${LEVEL_TONE[o.classification]}`}>{o.classification}</span>
                  {isTl ? o.titleTl : o.titleEn} <span className={sub}>· {o.policyCode}</span>
                </p>
                <p className={`${sub} mt-1`}>1st: {isTl ? o.sanction1stTl : o.sanction1stEn}</p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEdit(o)} className={ghost}>
                  {isTl ? 'Baguhin' : 'Edit'}
                </button>
                <button type="button" onClick={() => void setActive(o, false)} className={`${btn} text-rose-700 dark:text-rose-300`}>
                  {isTl ? 'Alisin' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {removed.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowRemoved((v) => !v)} className={`${btn} saas-card-subtle`}>
              {showRemoved ? '▾' : '▸'} {isTl ? `Mga inalis (${removed.length})` : `Removed (${removed.length})`}
            </button>
            {showRemoved && (
              <div className="mt-2 space-y-1.5">
                {removed.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 saas-card-subtle opacity-70">
                    <span className="text-sm text-[#0B1F4D] dark:text-white">
                      {isTl ? o.titleTl : o.titleEn} <span className={sub}>· {o.policyCode}</span>
                    </span>
                    <button type="button" onClick={() => void setActive(o, true)} className={ghost}>
                      {isTl ? 'Ibalik' : 'Bring back'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
      {edit && <OffenseWindow isTl={isTl} offense={edit === 'new' ? null : edit} onClose={() => setEdit(null)} toast={toast} />}
    </div>
  );
};
const OffenseWindow: React.FC<{ isTl: boolean; offense: OffenseRow | null; onClose: () => void; toast: Props['onTriggerToast'] }> = ({ isTl, offense, onClose, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [f, setF] = useState({
    titleEn: offense?.titleEn ?? '',
    titleTl: offense?.titleTl ?? '',
    classification: (offense?.classification ?? 'Minor') as HandbookClassification,
    s1En: offense?.sanction1stEn ?? '',
    s1Tl: offense?.sanction1stTl ?? '',
    s2En: offense?.sanction2ndEn ?? '',
    s2Tl: offense?.sanction2ndTl ?? '',
    s3En: offense?.sanction3rdEn ?? '',
    s3Tl: offense?.sanction3rdTl ?? '',
  });
  const [busy, setBusy] = useState(false);
  const dupName = cfg.offenses.some((o) => o.id !== offense?.id && o.titleEn.trim().toLowerCase() === f.titleEn.trim().toLowerCase());
  const bad =
    f.titleEn.trim().length < 3 ? (isTl ? 'Ilagay ang pangalan ng offense (English).' : 'Enter the offense name (English).') : dupName ? (isTl ? 'May offense na na ganito ang pangalan.' : 'An offense with this name already exists.') : f.s1En.trim().length < 3 ? (isTl ? 'Ilagay ang sanction sa unang beses.' : 'Enter the 1st-time sanction.') : '';
  const nextCode = () => {
    const prefix = { Minor: 'MIN', 'Less Serious': 'LSR', Serious: 'SER', Grave: 'GRV' }[f.classification];
    const used = new Set(cfg.offenses.map((o) => o.policyCode));
    for (let i = 1; i < 999; i++) {
      const c = `${prefix}-${String(i).padStart(2, '0')}`;
      if (!used.has(c)) return c;
    }
    return `${prefix}-${Date.now()}`;
  };
  const save = async () => {
    const t = (v: string, fb: string) => (v.trim() ? v.trim() : fb.trim());
    const body = {
      title_en: f.titleEn.trim(),
      title_tl: t(f.titleTl, f.titleEn),
      classification: f.classification,
      category: f.classification === 'Minor' ? 'Minor' : 'Major',
      sanction_1st: f.s1En.trim(),
      sanction_1st_tl: t(f.s1Tl, f.s1En),
      sanction_2nd: t(f.s2En, f.s1En),
      sanction_2nd_tl: t(f.s2Tl, t(f.s2En, f.s1En)),
      sanction_3rd: t(f.s3En, t(f.s2En, f.s1En)),
      sanction_3rd_tl: t(f.s3Tl, t(f.s3En, t(f.s2En, f.s1En))),
    };
    if (offense) {
      const ok = await confirmChange({
        title: isTl ? 'I-save ang pagbabago sa offense?' : 'Save changes to this offense?',
        rows: [
          { label: isTl ? 'Pangalan' : 'Name', before: offense.titleEn, after: body.title_en },
          { label: isTl ? 'Antas' : 'Level', before: offense.classification, after: body.classification },
          { label: '1st', before: offense.sanction1stEn, after: body.sanction_1st },
        ],
        note: isTl ? 'Para sa mga bagong kaso. Hindi binabago ang mga naitala na.' : 'For new cases. Saved cases do not change.',
        confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
      });
      if (!ok) return;
    }
    setBusy(true);
    const r = offense
      ? await writeRow('offense_policies', 'PATCH', body, offense.id)
      : await writeRow('offense_policies', 'POST', { ...body, policy_code: nextCode(), is_active: true, sort_order: cfg.offenses.length + 1 });
    setBusy(false);
    if (!r) return toast(NOT_SAVED(isTl));
    await refreshLists();
    soundFX.playSuccessCheck();
    toast(isTl ? `✓ Na-save ang "${body.title_en}". Mapipili na ito sa "+ New case".` : `✓ "${body.title_en}" saved. It can now be picked in "+ New case".`);
    onClose();
  };
  const field = (k: keyof typeof f, t: string, ph = '') => (
    <label className="block">
      <span className={label}>{t}</span>
      <input data-offense-field={k} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value.slice(0, 160) })} placeholder={ph} className={input} />
    </label>
  );
  return (
    <Modal
      wide
      title={offense ? (isTl ? 'Baguhin ang offense' : 'Edit offense') : isTl ? 'Magdagdag ng offense' : 'Add an offense'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghost}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="save-offense" disabled={!!bad || busy} onClick={() => void save()} className={primary}>
            {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save' : 'Save'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {field('titleEn', isTl ? 'Pangalan (English) *' : 'Name (English) *', 'e.g. Littering')}
        {field('titleTl', isTl ? 'Pangalan (Tagalog)' : 'Name (Tagalog)', 'hal. Pagkakalat')}
      </div>
      <div>
        <span className={label}>{isTl ? 'Antas *' : 'Level *'}</span>
        <div className="flex flex-wrap gap-1.5">
          {LEVELS.map((l) => (
            <button key={l} type="button" data-level={l} aria-pressed={f.classification === l} onClick={() => setF({ ...f, classification: l })} className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${f.classification === l ? `${LEVEL_TONE[l]} border-transparent ring-2 ring-[#1E469B]` : 'border-[#D3DDEE] dark:border-[#253B66] text-[#4A608A] dark:text-[#94A8D0]'}`}>
              {l}
            </button>
          ))}
        </div>
        <p className={`${sub} mt-1`}>{isTl ? 'Minor = magaan. Less Serious, Serious, Grave = kailangan ng conference sa magulang.' : 'Minor = light. Less Serious, Serious, Grave = needs a parent conference.'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {field('s1En', isTl ? 'Sanction sa 1st na beses (English) *' : '1st time sanction (English) *', 'e.g. Verbal warning')}
        {field('s1Tl', isTl ? 'Sanction sa 1st (Tagalog)' : '1st time (Tagalog)')}
        {field('s2En', isTl ? 'Sanction sa 2nd (English)' : '2nd time (English)')}
        {field('s2Tl', isTl ? 'Sanction sa 2nd (Tagalog)' : '2nd time (Tagalog)')}
        {field('s3En', isTl ? 'Sanction sa 3rd (English)' : '3rd time (English)')}
        {field('s3Tl', isTl ? 'Sanction sa 3rd (Tagalog)' : '3rd time (Tagalog)')}
      </div>
      <p className={sub}>{isTl ? 'Kapag walang Tagalog, ang English ang gagamitin. Kapag walang 2nd/3rd, ang nauna ang gagamitin.' : 'Empty Tagalog uses the English. Empty 2nd/3rd uses the one before.'}</p>
      {bad && <p className={errText}>{bad}</p>}
    </Modal>
  );
};

// ------------------------------------------------------------------ 3b. Student fields (what "Add student" asks for)
const CORE_ORDER: CoreField[] = ['studentNumber', 'fullName', 'grade', 'section', 'parentName', 'parentPhone', 'parentEmail', 'parentRelationship'];
const TYPE_WORDS: Record<CustomField['type'], [string, string]> = { text: ['Text', 'Text'], number: ['Number', 'Numero'], date: ['Date', 'Petsa'], choice: ['Choice (list)', 'Pagpipilian'] };
const StudentFieldsSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [f, setF] = useState<StudentFields>(cfg.studentFields);
  useEffect(() => setF(cfg.studentFields), [cfg.studentFields]);
  const [edit, setEdit] = useState<CustomField | 'new' | null>(null);
  const changed = JSON.stringify(f) !== JSON.stringify(cfg.studentFields);
  const active = f.custom.filter((c) => c.active);
  const removed = f.custom.filter((c) => !c.active);
  const setLabel = (k: CoreField, lang: 'en' | 'tl', v: string) =>
    setF({ ...f, labels: { ...f.labels, [k]: { en: f.labels[k]?.en ?? '', tl: f.labels[k]?.tl ?? '', [lang]: v.slice(0, 60) } } });
  const move = (key: string, dir: -1 | 1) => {
    const list = f.custom.slice();
    const i = list.findIndex((c) => c.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    setF({ ...f, custom: list });
  };
  const save = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang mga field ng estudyante?' : 'Save the student fields?',
      rows: [
        { label: isTl ? 'Sariling field' : 'Own fields', before: String(cfg.studentFields.custom.filter((c) => c.active).length), after: String(active.length) },
        { label: isTl ? 'Email ng magulang' : 'Parent email', before: cfg.studentFields.showEmail ? (isTl ? 'Ipinapakita' : 'Shown') : isTl ? 'Nakatago' : 'Hidden', after: f.showEmail ? (isTl ? 'Ipinapakita' : 'Shown') : isTl ? 'Nakatago' : 'Hidden' },
        { label: isTl ? 'Relasyon' : 'Relationship', before: cfg.studentFields.showRelationship ? (isTl ? 'Ipinapakita' : 'Shown') : isTl ? 'Nakatago' : 'Hidden', after: f.showRelationship ? (isTl ? 'Ipinapakita' : 'Shown') : isTl ? 'Nakatago' : 'Hidden' },
      ],
      note: isTl ? 'Hindi mabubura ang impormasyong naitala na. Ang tinanggal na field ay nakatago lang at puwedeng ibalik.' : 'Saved information is never deleted. A removed field is only hidden and can be brought back.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const prev = cfg.studentFields;
    if (!(await saveConfig('student_fields', f))) return toast(NOT_SAVED(isTl));
    soundFX.playSuccessCheck();
    toast(isTl ? '✓ Na-save. Ito na ang makikita sa "Add student" at "Edit".' : '✓ Saved. "Add student" and "Edit" now show these fields.', () => void saveConfig('student_fields', prev));
  };
  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-3`} data-section="core-fields">
        <div>
          <h2 className={h2}>{isTl ? 'Mga pangunahing field' : 'Main fields'}</h2>
          <p className={sub}>
            {isTl
              ? 'Kailangan ng system ang mga ito (hal. ang mobile ng magulang para sa SMS), kaya hindi matatanggal — pero puwedeng palitan ang pangalan nila.'
              : 'The system needs these (e.g. the parent mobile for SMS), so they cannot be removed — but you can rename them.'}
          </p>
        </div>
        <div className="space-y-2">
          {CORE_ORDER.map((k) => {
            const optional = k === 'parentEmail' || k === 'parentRelationship';
            const shown = k === 'parentEmail' ? f.showEmail : k === 'parentRelationship' ? f.showRelationship : true;
            return (
              <div key={k} data-core-field={k} className={`grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-center rounded-xl px-3 py-2 saas-card-subtle ${shown ? '' : 'opacity-60'}`}>
                <input aria-label={`${CORE_FIELD_WORDS[k][0]} (English)`} value={f.labels[k]?.en ?? ''} placeholder={CORE_FIELD_WORDS[k][0]} onChange={(e) => setLabel(k, 'en', e.target.value)} className={input} />
                <input aria-label={`${CORE_FIELD_WORDS[k][1]} (Tagalog)`} value={f.labels[k]?.tl ?? ''} placeholder={CORE_FIELD_WORDS[k][1]} onChange={(e) => setLabel(k, 'tl', e.target.value)} className={input} />
                {optional ? (
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#0B1F4D] dark:text-white whitespace-nowrap">
                    <input
                      type="checkbox"
                      data-toggle-field={k}
                      checked={shown}
                      onChange={(e) => setF(k === 'parentEmail' ? { ...f, showEmail: e.target.checked } : { ...f, showRelationship: e.target.checked })}
                    />
                    {isTl ? 'Ipakita' : 'Show'}
                  </label>
                ) : (
                  <span className="text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] whitespace-nowrap">{isTl ? 'Kailangan' : 'Required'}</span>
                )}
              </div>
            );
          })}
        </div>
        <p className={sub}>{isTl ? 'Walang laman = gagamitin ang orihinal na pangalan (nakikita sa malabong sulat).' : 'Empty = the original name is used (shown in grey).'}</p>
      </section>

      <section className={`${card} p-5 space-y-3`} data-section="custom-fields">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{isTl ? `Sariling field (${active.length})` : `Your own fields (${active.length})`}</h2>
            <p className={sub}>{isTl ? 'hal. Adviser, Address, Birthday, Emergency contact. Lalabas ito sa "Add student" at sa record ng estudyante.' : 'e.g. Adviser, Address, Birthday, Emergency contact. Shown in "Add student" and the student record.'}</p>
          </div>
          <button type="button" data-action="add-field" onClick={() => setEdit('new')} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
            + {isTl ? 'Magdagdag ng field' : 'Add field'}
          </button>
        </div>
        {active.length === 0 && <p className={sub}>{isTl ? 'Wala pa. Pindutin ang "+ Magdagdag ng field".' : 'None yet. Press "+ Add field".'}</p>}
        <div className="space-y-1.5">
          {active.map((c, i) => (
            <div key={c.key} data-custom-field={c.labelEn} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 saas-card-subtle">
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">
                  {isTl ? c.labelTl || c.labelEn : c.labelEn} {c.required && <span className="text-rose-600">*</span>}
                </p>
                <p className={sub}>
                  {TYPE_WORDS[c.type][isTl ? 1 : 0]}
                  {c.type === 'choice' ? `: ${c.options.join(', ')}` : ''} · {c.required ? (isTl ? 'Kailangan' : 'Required') : isTl ? 'Opsyonal' : 'Optional'}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" aria-label={isTl ? 'Itaas' : 'Move up'} title={isTl ? 'Itaas' : 'Move up'} disabled={i === 0} onClick={() => move(c.key, -1)} className={`${ghost} disabled:opacity-40`}>
                  ↑
                </button>
                <button type="button" aria-label={isTl ? 'Ibaba' : 'Move down'} title={isTl ? 'Ibaba' : 'Move down'} disabled={i === active.length - 1} onClick={() => move(c.key, 1)} className={`${ghost} disabled:opacity-40`}>
                  ↓
                </button>
                <button type="button" onClick={() => setEdit(c)} className={ghost}>
                  {isTl ? 'Baguhin' : 'Edit'}
                </button>
                <button type="button" data-action="remove-field" onClick={() => setF({ ...f, custom: f.custom.map((x) => (x.key === c.key ? { ...x, active: false } : x)) })} className={`${btn} text-rose-700 dark:text-rose-300`}>
                  {isTl ? 'Alisin' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
        {removed.length > 0 && (
          <div className="space-y-1.5">
            <p className={sub}>{isTl ? 'Mga inalis (nakatago, hindi nabura ang naitala):' : 'Removed (hidden, saved information kept):'}</p>
            {removed.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 saas-card-subtle opacity-70">
                <span className="text-sm text-[#0B1F4D] dark:text-white">{isTl ? c.labelTl || c.labelEn : c.labelEn}</span>
                <button type="button" onClick={() => setF({ ...f, custom: f.custom.map((x) => (x.key === c.key ? { ...x, active: true } : x)) })} className={ghost}>
                  {isTl ? 'Ibalik' : 'Bring back'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <div className="flex justify-end gap-2">
        {changed && (
          <button type="button" className={ghost} onClick={() => setF(cfg.studentFields)}>
            {isTl ? 'Ibalik ang dati' : 'Undo changes'}
          </button>
        )}
        <button type="button" data-action="save-fields" disabled={!changed} onClick={() => void save()} className={primary}>
          {isTl ? 'I-save' : 'Save'}
        </button>
      </div>
      {edit && (
        <FieldWindow
          isTl={isTl}
          field={edit === 'new' ? null : edit}
          taken={f.custom.filter((c) => edit === 'new' || c.key !== edit.key).map((c) => c.labelEn.trim().toLowerCase())}
          onClose={() => setEdit(null)}
          onDone={(c) => {
            setF({ ...f, custom: edit === 'new' ? [...f.custom, c] : f.custom.map((x) => (x.key === c.key ? c : x)) });
            setEdit(null);
            toast(isTl ? 'Idinagdag sa listahan. Pindutin ang "I-save" para magamit.' : 'Added to the list. Press "Save" to use it.');
          }}
        />
      )}
    </div>
  );
};
const FieldWindow: React.FC<{ isTl: boolean; field: CustomField | null; taken: string[]; onClose: () => void; onDone: (c: CustomField) => void }> = ({ isTl, field, taken, onClose, onDone }) => {
  const [en, setEn] = useState(field?.labelEn ?? '');
  const [tl, setTl] = useState(field?.labelTl ?? '');
  const [type, setType] = useState<CustomField['type']>(field?.type ?? 'text');
  const [opts, setOpts] = useState((field?.options ?? []).join(', '));
  const [required, setRequired] = useState(field?.required ?? false);
  const options = opts.split(',').map((x) => x.trim()).filter(Boolean);
  const bad =
    en.trim().length < 2
      ? isTl ? 'Ilagay ang pangalan ng field (English).' : 'Enter the field name (English).'
      : taken.includes(en.trim().toLowerCase())
      ? isTl ? 'May field na na ganito ang pangalan.' : 'A field with this name already exists.'
      : type === 'choice' && options.length < 2
      ? isTl ? 'Maglagay ng kahit 2 pagpipilian, hiwalay sa kuwit.' : 'Enter at least 2 choices, separated by commas.'
      : '';
  return (
    <Modal
      title={field ? (isTl ? 'Baguhin ang field' : 'Edit field') : isTl ? 'Magdagdag ng field' : 'Add a field'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghost}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button
            type="button"
            data-action="done-field"
            disabled={!!bad}
            onClick={() =>
              onDone({
                key: field?.key ?? `f_${Date.now().toString(36)}`,
                labelEn: en.trim(),
                labelTl: tl.trim(),
                type,
                options: type === 'choice' ? options : [],
                required,
                active: field?.active ?? true,
              })
            }
            className={primary}
          >
            {isTl ? 'Tapos' : 'Done'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={label}>{isTl ? 'Pangalan (English) *' : 'Name (English) *'}</span>
          <input data-field-en value={en} onChange={(e) => setEn(e.target.value.slice(0, 60))} placeholder="Adviser" className={input} />
        </label>
        <label>
          <span className={label}>{isTl ? 'Pangalan (Tagalog)' : 'Name (Tagalog)'}</span>
          <input value={tl} onChange={(e) => setTl(e.target.value.slice(0, 60))} placeholder="Adviser" className={input} />
        </label>
      </div>
      <div>
        <span className={label}>{isTl ? 'Uri' : 'Type'}</span>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(TYPE_WORDS) as CustomField['type'][]).map((t) => (
            <button key={t} type="button" data-field-type={t} aria-pressed={type === t} onClick={() => setType(t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${type === t ? 'bg-[#1E469B] text-white border-[#1E469B]' : 'border-[#D3DDEE] dark:border-[#253B66] text-[#4A608A] dark:text-[#94A8D0]'}`}>
              {TYPE_WORDS[t][isTl ? 1 : 0]}
            </button>
          ))}
        </div>
      </div>
      {type === 'choice' && (
        <label className="block">
          <span className={label}>{isTl ? 'Mga pagpipilian (hiwalay sa kuwit)' : 'Choices (separated by commas)'}</span>
          <input data-field-options value={opts} onChange={(e) => setOpts(e.target.value.slice(0, 300))} placeholder="Catholic, Christian, Muslim, Other" className={input} />
        </label>
      )}
      <label className="inline-flex items-center gap-2 text-sm font-bold text-[#0B1F4D] dark:text-white">
        <input type="checkbox" data-field-required checked={required} onChange={(e) => setRequired(e.target.checked)} />
        {isTl ? 'Kailangang sagutan (required)' : 'Must be filled in (required)'}
      </label>
      {bad && <p className={errText}>{bad}</p>}
    </Modal>
  );
};

// ------------------------------------------------------------------ 4. SMS templates
const SMS_KINDS: ['notice' | 'reminder' | 'reschedule', string, string][] = [
  ['notice', 'Invitation (new conference)', 'Imbitasyon (bagong conference)'],
  ['reminder', 'Reminder (one day before)', 'Paalala (isang araw bago)'],
  ['reschedule', 'New date (rescheduled)', 'Bagong petsa (inilipat)'],
];
const SmsSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [t, setT] = useState(cfg.smsTemplates);
  useEffect(() => setT(cfg.smsTemplates), [cfg.smsTemplates]);
  const sample = (tpl: string) => fillTemplate(tpl, 'Juan P. Dela Cruz', 'Biy Nob 14, 9:00 AM');
  const issues = (tpl: string): string[] => {
    const out: string[] = [];
    if (!tpl.includes('{student}')) out.push(isTl ? 'Kulang ang {student} (pangalan ng estudyante).' : 'Missing {student} (the student name).');
    if (!tpl.includes('{when}')) out.push(isTl ? 'Kulang ang {when} (petsa at oras).' : 'Missing {when} (date and time).');
    const bad = findSensitiveWords(tpl);
    if (bad.length) out.push(isTl ? `Bawal ang detalye ng offense: ${bad.join(', ')}` : `No offense details allowed: ${bad.join(', ')}`);
    return out;
  };
  const anyBad = SMS_KINDS.some(([k]) => issues(t[k]).length > 0);
  const changed = JSON.stringify(t) !== JSON.stringify(cfg.smsTemplates);
  const save = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang SMS templates?' : 'Save the SMS templates?',
      rows: SMS_KINDS.filter(([k]) => t[k] !== cfg.smsTemplates[k]).map(([k, en, tl]) => ({ label: isTl ? tl : en, before: cfg.smsTemplates[k], after: t[k] })),
      note: isTl ? 'Ito na ang gagamitin sa susunod na SMS sa magulang.' : 'The next SMS to parents will use these.',
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const prev = cfg.smsTemplates;
    if (!(await saveConfig('sms_templates', t))) return toast(NOT_SAVED(isTl));
    toast(isTl ? '✓ Na-save ang SMS templates.' : '✓ SMS templates saved.', () => void saveConfig('sms_templates', prev));
  };
  return (
    <section className={`${card} p-5 space-y-4`} data-section="sms">
      <div>
        <h2 className={h2}>{isTl ? 'SMS templates (Filipino)' : 'SMS templates (Filipino)'}</h2>
        <p className={sub}>
          {isTl
            ? 'Ilagay ang {student} at {when} — papalitan ito ng pangalan ng estudyante at ng petsa/oras. Bawal ang detalye ng offense. 1 SMS = 160 letra.'
            : 'Use {student} and {when} — they are replaced by the student name and the date/time. No offense details. 1 SMS = 160 letters.'}
        </p>
      </div>
      {SMS_KINDS.map(([k, en, tl]) => {
        const info = smsInfo(sample(t[k]));
        const iss = issues(t[k]);
        return (
          <div key={k} className="space-y-1.5" data-sms-template={k}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">{isTl ? tl : en}</span>
              <button type="button" onClick={() => setT({ ...t, [k]: DEFAULTS.smsTemplates[k] })} className={`${btn} saas-card-subtle`} title={isTl ? 'Ibalik ang orihinal na mensahe' : 'Go back to the original message'}>
                {isTl ? 'Orihinal' : 'Original'}
              </button>
            </div>
            <textarea rows={3} value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value.slice(0, 480) })} className={`${input} leading-relaxed`} />
            <p className={sub}>
              <b>{isTl ? 'Ganito ang matatanggap:' : 'The parent gets:'}</b> {sample(t[k])}
            </p>
            <p className={`text-xs font-bold ${info.parts > 1 ? 'text-amber-700 dark:text-amber-300' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
              {isTl ? `${info.length} letra · ${info.parts} SMS` : `${info.length} letters · ${info.parts} SMS`}
              {info.parts > 1 ? (isTl ? ' — paikliin para 1 SMS lang' : ' — shorten it to 1 SMS') : ''}
            </p>
            {iss.map((x) => (
              <p key={x} className={errText}>
                ⚠ {x}
              </p>
            ))}
          </div>
        );
      })}
      <div className="flex justify-end">
        <button type="button" data-action="save-sms" disabled={!changed || anyBad} onClick={() => void save()} className={primary}>
          {isTl ? 'I-save' : 'Save'}
        </button>
      </div>
    </section>
  );
};

// ------------------------------------------------------------------ 5. Accounts & security
const SecuritySection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [sec, setSec] = useState(cfg.security);
  useEffect(() => setSec(cfg.security), [cfg.security]);
  const [edit, setEdit] = useState<StaffAccount | 'new' | null>(null);
  const [pinOld, setPinOld] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinNew2, setPinNew2] = useState('');
  const [pinErr, setPinErr] = useState('');
  const secBad =
    !(sec.autoSignOutMinutes >= 5 && sec.autoSignOutMinutes <= 120)
      ? isTl ? 'Ang auto sign-out ay 5 hanggang 120 minuto.' : 'Auto sign-out must be 5 to 120 minutes.'
      : !(sec.pinMaxTries >= 3 && sec.pinMaxTries <= 10)
      ? isTl ? 'Ang maling subok ay 3 hanggang 10.' : 'Wrong tries must be 3 to 10.'
      : !(sec.pinLockMinutes >= 1 && sec.pinLockMinutes <= 60)
      ? isTl ? 'Ang lock ay 1 hanggang 60 minuto.' : 'Lock time must be 1 to 60 minutes.'
      : '';
  const secChanged = JSON.stringify(sec) !== JSON.stringify(cfg.security);
  const saveSec = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang security?' : 'Save security settings?',
      rows: [
        { label: isTl ? 'Auto sign-out kapag walang galaw' : 'Auto sign-out when idle', before: `${cfg.security.autoSignOutMinutes} min`, after: `${sec.autoSignOutMinutes} min` },
        { label: isTl ? 'Maling PIN bago ma-lock' : 'Wrong PINs before lock', before: String(cfg.security.pinMaxTries), after: String(sec.pinMaxTries) },
        { label: isTl ? 'Tagal ng lock' : 'Lock time', before: `${cfg.security.pinLockMinutes} min`, after: `${sec.pinLockMinutes} min` },
      ],
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    const prev = cfg.security;
    if (!(await saveConfig('security', sec))) return toast(NOT_SAVED(isTl));
    toast(isTl ? '✓ Na-save ang security.' : '✓ Security saved.', () => void saveConfig('security', prev));
  };
  const changePin = async () => {
    setPinErr('');
    if (!/^\d{6}$/.test(pinNew)) return setPinErr(isTl ? 'Ang bagong PIN ay 6 na numero.' : 'The new PIN must be 6 digits.');
    if (pinNew !== pinNew2) return setPinErr(isTl ? 'Hindi pareho ang dalawang bagong PIN.' : 'The two new PINs are not the same.');
    if (/^(\d)\1{5}$/.test(pinNew) || pinNew === '123456' || pinNew === '654321') return setPinErr(isTl ? 'Masyadong madaling hulaan. Pumili ng iba.' : 'Too easy to guess. Pick another.');
    if (!(await checkPin(pinOld))) return setPinErr(isTl ? 'Mali ang kasalukuyang PIN.' : 'The current PIN is wrong.');
    const ok = await confirmChange({
      title: isTl ? 'Palitan ang PIN?' : 'Change the PIN?',
      rows: [{ label: 'PIN', before: '••••••', after: isTl ? 'Bagong PIN' : 'New PIN' }],
      note: isTl ? 'Gagamitin ito sa susunod na pag-sign in at sa pagbukas ng Settings. Isulat ito sa ligtas na lugar.' : 'Use it at the next sign-in and to open Settings. Keep it somewhere safe.',
      confirmLabel: isTl ? 'Oo, palitan' : 'Yes, change',
      tone: 'danger',
    });
    if (!ok) return;
    if (!(await saveConfig('app_pin', await makePinRecord(pinNew)))) return toast(NOT_SAVED(isTl));
    setPinOld('');
    setPinNew('');
    setPinNew2('');
    soundFX.playSuccessCheck();
    toast(isTl ? '✓ Napalitan ang PIN.' : '✓ PIN changed.');
  };
  const toggleStaff = async (a: StaffAccount) => {
    const activeCount = cfg.staff.filter((x) => x.active).length;
    if (a.active && activeCount <= 1) return toast(isTl ? '⚠️ Kailangan ng kahit isang aktibong account para maka-sign in.' : '⚠️ At least one active account is needed to sign in.');
    if (a.active) {
      const ok = await confirmChange({
        title: isTl ? 'Patayin ang account?' : 'Turn off this account?',
        rows: [{ label: a.email, before: isTl ? 'Puwedeng mag-sign in' : 'Can sign in', after: isTl ? 'Hindi na makaka-sign in' : 'Cannot sign in' }],
        confirmLabel: isTl ? 'Oo, patayin' : 'Yes, turn off',
        tone: 'danger',
      });
      if (!ok) return;
    }
    if (!(await writeRow('guidance_staff', 'PATCH', { is_active: !a.active }, a.id))) return toast(NOT_SAVED(isTl));
    await refreshLists();
    toast(a.active ? (isTl ? `Napatay ang account ng ${a.email}.` : `${a.email} turned off.`) : isTl ? `Naibalik ang ${a.email}.` : `${a.email} turned on.`, a.active ? async () => {
      await writeRow('guidance_staff', 'PATCH', { is_active: true }, a.id);
      await refreshLists();
    } : undefined);
  };
  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-3`} data-section="staff">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={h2}>{isTl ? 'Mga staff account' : 'Staff accounts'}</h2>
            <p className={sub}>{isTl ? 'Ang mga email na ito lang ang makakatanggap ng sign-in code (OTP).' : 'Only these emails can receive the sign-in code (OTP).'}</p>
          </div>
          <button type="button" data-action="add-staff" onClick={() => setEdit('new')} className={`${btn} px-4 py-2 bg-[#1E469B] text-white`}>
            + {isTl ? 'Magdagdag ng account' : 'Add account'}
          </button>
        </div>
        <div className="space-y-1.5">
          {cfg.staff.map((a) => (
            <div key={a.id} data-staff-row={a.email} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 saas-card-subtle ${a.active ? '' : 'opacity-60'}`}>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white break-all">
                  {a.fullName} <span className={sub}>· {a.email}</span>
                </p>
                <p className={sub}>
                  {a.role} · {a.active ? (isTl ? 'Aktibo' : 'Active') : isTl ? 'Naka-off' : 'Turned off'}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" onClick={() => setEdit(a)} className={ghost}>
                  {isTl ? 'Baguhin' : 'Edit'}
                </button>
                <button type="button" onClick={() => void toggleStaff(a)} className={`${btn} ${a.active ? 'text-rose-700 dark:text-rose-300' : 'saas-card-subtle'}`}>
                  {a.active ? (isTl ? 'Patayin' : 'Turn off') : isTl ? 'Buksan ulit' : 'Turn on'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={`${card} p-5 space-y-3`} data-section="pin">
        <h2 className={h2}>{isTl ? 'Palitan ang PIN (6 na numero)' : 'Change the PIN (6 digits)'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(
            [
              [pinOld, setPinOld, isTl ? 'Kasalukuyang PIN' : 'Current PIN', 'old'],
              [pinNew, setPinNew, isTl ? 'Bagong PIN' : 'New PIN', 'new'],
              [pinNew2, setPinNew2, isTl ? 'Ulitin ang bagong PIN' : 'New PIN again', 'new2'],
            ] as [string, (v: string) => void, string, string][]
          ).map(([v, setV, t, id]) => (
            <label key={id}>
              <span className={label}>{t}</span>
              <input type="password" inputMode="numeric" data-pin-field={id} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`${input} tracking-[0.4em]`} />
            </label>
          ))}
        </div>
        {pinErr && <p className={errText} role="alert">⚠ {pinErr}</p>}
        <div className="flex justify-end">
          <button type="button" data-action="change-pin" disabled={pinOld.length !== 6 || pinNew.length !== 6 || pinNew2.length !== 6} onClick={() => void changePin()} className={primary}>
            {isTl ? 'Palitan ang PIN' : 'Change PIN'}
          </button>
        </div>
      </section>
      <section className={`${card} p-5 space-y-3`} data-section="security">
        <h2 className={h2}>{isTl ? 'Sign-out at lockout' : 'Sign-out & lockout'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label>
            <span className={label}>{isTl ? 'Auto sign-out kapag walang galaw (minuto)' : 'Auto sign-out when idle (minutes)'}</span>
            <input type="number" min={5} max={120} data-sec="signout" value={sec.autoSignOutMinutes} onChange={(e) => setSec({ ...sec, autoSignOutMinutes: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Maling PIN bago ma-lock' : 'Wrong PINs before it locks'}</span>
            <input type="number" min={3} max={10} data-sec="tries" value={sec.pinMaxTries} onChange={(e) => setSec({ ...sec, pinMaxTries: Number(e.target.value) })} className={input} />
          </label>
          <label>
            <span className={label}>{isTl ? 'Tagal ng lock (minuto)' : 'Lock time (minutes)'}</span>
            <input type="number" min={1} max={60} data-sec="lock" value={sec.pinLockMinutes} onChange={(e) => setSec({ ...sec, pinLockMinutes: Number(e.target.value) })} className={input} />
          </label>
        </div>
        {secBad && <p className={errText}>⚠ {secBad}</p>}
        <div className="flex justify-end">
          <button type="button" data-action="save-security" disabled={!secChanged || !!secBad} onClick={() => void saveSec()} className={primary}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </div>
      </section>
      {edit && <StaffWindow isTl={isTl} account={edit === 'new' ? null : edit} onClose={() => setEdit(null)} toast={toast} />}
    </div>
  );
};
const StaffWindow: React.FC<{ isTl: boolean; account: StaffAccount | null; onClose: () => void; toast: Props['onTriggerToast'] }> = ({ isTl, account, onClose, toast }) => {
  const cfg = useAppConfig();
  const [email, setEmail] = useState(account?.email ?? '');
  const [name, setName] = useState(account?.fullName ?? '');
  const [role, setRole] = useState(account?.role ?? 'Guidance Associate');
  const [busy, setBusy] = useState(false);
  const clean = email.trim().toLowerCase();
  const bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)
    ? isTl ? 'Maglagay ng tamang email (hal. guidance@aics.edu.ph).' : 'Enter a valid email (e.g. guidance@aics.edu.ph).'
    : cfg.staff.some((a) => a.id !== account?.id && a.email.toLowerCase() === clean)
    ? isTl ? 'Nasa listahan na ang email na ito.' : 'This email is already on the list.'
    : name.trim().length < 2
    ? isTl ? 'Ilagay ang pangalan.' : 'Enter the name.'
    : '';
  const save = async () => {
    setBusy(true);
    const body = { email: clean, full_name: name.trim(), role: role.trim() || 'Guidance Associate' };
    const r = account ? await writeRow('guidance_staff', 'PATCH', body, account.id) : await writeRow('guidance_staff', 'POST', { ...body, is_active: true, department: 'Guidance & Counseling Office', badge_code: `AICS-${Date.now().toString(36).toUpperCase()}` });
    setBusy(false);
    if (!r) return toast(NOT_SAVED(isTl));
    await refreshLists();
    soundFX.playSuccessCheck();
    toast(isTl ? `✓ Na-save. Puwede nang mag-sign in ang ${clean}.` : `✓ Saved. ${clean} can now sign in.`);
    onClose();
  };
  return (
    <Modal
      title={account ? (isTl ? 'Baguhin ang account' : 'Edit account') : isTl ? 'Magdagdag ng staff account' : 'Add a staff account'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={ghost}>
            {isTl ? 'Kanselahin' : 'Cancel'}
          </button>
          <button type="button" data-action="save-staff" disabled={!!bad || busy} onClick={() => void save()} className={primary}>
            {busy ? (isTl ? 'Sine-save…' : 'Saving…') : isTl ? 'I-save' : 'Save'}
          </button>
        </>
      }
    >
      <label className="block">
        <span className={label}>Email</span>
        <input data-staff-email value={email} onChange={(e) => setEmail(e.target.value.slice(0, 120))} placeholder="guidance@aics.edu.ph" className={input} />
      </label>
      <label className="block">
        <span className={label}>{isTl ? 'Pangalan' : 'Name'}</span>
        <input data-staff-name value={name} onChange={(e) => setName(e.target.value.slice(0, 80))} className={input} />
      </label>
      <label className="block">
        <span className={label}>{isTl ? 'Posisyon' : 'Role'}</span>
        <input value={role} onChange={(e) => setRole(e.target.value.slice(0, 80))} className={input} />
      </label>
      {bad && <p className={errText}>{bad}</p>}
    </Modal>
  );
};

// ------------------------------------------------------------------ 6. Backup & retention
const BACKUP_TABLES = [
  'students',
  'discipline_cases',
  'parent_appointments',
  'follow_up_tasks',
  'contact_logs',
  'sms_gmail_logs',
  'student_concerns',
  'concern_messages',
  'counselor_referrals',
  'case_handover_notes',
  'confiscated_ids',
  'offense_policies',
  'school_closed_days',
  'people_schedules',
  'guidance_staff',
  'office_activity_logs',
  'audit_changes',
];
const BackupSection: React.FC<{ isTl: boolean; toast: Props['onTriggerToast'] }> = ({ isTl, toast }) => {
  const cfg = useAppConfig();
  const confirmChange = useConfirmChange();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [days, setDays] = useState(cfg.retention.idImageDays);
  useEffect(() => setDays(cfg.retention.idImageDays), [cfg.retention.idImageDays]);
  const download = async () => {
    setBusy(true);
    const out: Record<string, unknown[]> = {};
    const counts: string[] = [];
    try {
      for (const t of BACKUP_TABLES) {
        setProgress(t);
        const rows: unknown[] = [];
        for (let from = 0; from < 1000000; from += 1000) {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&order=id.asc&offset=${from}&limit=1000`, {
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          });
          if (!res.ok) throw new Error(t);
          const page = (await res.json()) as unknown[];
          rows.push(...page);
          if (page.length !== 1000) break;
        }
        out[t] = rows;
        counts.push(`${t}: ${rows.length}`);
      }
      // settings without the PIN (never put the PIN hash in a file)
      const settings = { ...getAppConfig() } as Record<string, unknown>;
      delete settings.pin;
      const file = { app: 'AICS Guidance Office', exportedAt: new Date().toISOString(), settings, tables: out };
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICS-Guidance-Backup-${todayISO()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      soundFX.playSuccessCheck();
      toast(isTl ? `✓ Na-download ang backup (${BACKUP_TABLES.length} table). Itago ito sa ligtas na lugar — may personal na data ito.` : `✓ Backup downloaded (${BACKUP_TABLES.length} tables). Keep it somewhere safe — it has personal data.`);
    } catch (e) {
      toast(isTl ? `⚠️ Hindi natapos ang backup (${(e as Error).message}). I-check ang internet, tapos subukan ulit.` : `⚠️ Backup did not finish (${(e as Error).message}). Check the internet, then try again.`);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };
  const saveRetention = async () => {
    const ok = await confirmChange({
      title: isTl ? 'I-save ang retention?' : 'Save retention?',
      rows: [{ label: isTl ? 'Burahin ang ID photo ng concern pagkatapos ng' : 'Delete concern ID photos after', before: `${cfg.retention.idImageDays} ${isTl ? 'araw' : 'days'}`, after: `${days} ${isTl ? 'araw' : 'days'}` }],
      confirmLabel: isTl ? 'Oo, i-save' : 'Yes, save',
    });
    if (!ok) return;
    if (!(await saveConfig('retention', { idImageDays: days }))) return toast(NOT_SAVED(isTl));
    toast(isTl ? '✓ Na-save.' : '✓ Saved.');
  };
  return (
    <div className="space-y-4">
      <section className={`${card} p-5 space-y-3`} data-section="backup">
        <h2 className={h2}>{isTl ? 'I-download ang backup' : 'Download a backup'}</h2>
        <p className={sub}>
          {isTl
            ? 'Isang file (.json) na may lahat ng estudyante, kaso, conference, concern, tala at history. Hindi kasama ang PIN. Gawin ito kahit isang beses bawat buwan.'
            : 'One file (.json) with every student, case, conference, concern, note and history. The PIN is not included. Do this at least once a month.'}
        </p>
        <div className="flex items-center justify-end gap-3">
          {busy && <span className={sub}>{isTl ? `Kinukuha: ${progress}…` : `Getting: ${progress}…`}</span>}
          <button type="button" data-action="backup" disabled={busy} onClick={() => void download()} className={primary}>
            ⬇ {busy ? (isTl ? 'Ginagawa…' : 'Working…') : isTl ? 'I-download ang backup' : 'Download backup'}
          </button>
        </div>
      </section>
      <section className={`${card} p-5 space-y-3`} data-section="retention">
        <h2 className={h2}>{isTl ? 'Gaano katagal itatago ang ID photo' : 'How long ID photos are kept'}</h2>
        <p className={sub}>
          {isTl
            ? 'Para sa ID at selfie na ipinapadala ng estudyante kasama ng concern (student portal). Buburahin ito pagkalipas ng ilang araw para sa Data Privacy Act.'
            : 'For the ID and selfie a student sends with a concern (student portal). They are deleted after this many days for the Data Privacy Act.'}
        </p>
        <label className="block max-w-xs">
          <span className={label}>{isTl ? 'Araw' : 'Days'}</span>
          <input type="number" min={7} max={365} data-retention value={days} onChange={(e) => setDays(Number(e.target.value))} className={input} />
        </label>
        {!(days >= 7 && days <= 365) && <p className={errText}>⚠ {isTl ? '7 hanggang 365 araw.' : '7 to 365 days.'}</p>}
        <div className="flex justify-end">
          <button type="button" data-action="save-retention" disabled={days === cfg.retention.idImageDays || !(days >= 7 && days <= 365)} onClick={() => void saveRetention()} className={primary}>
            {isTl ? 'I-save' : 'Save'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
