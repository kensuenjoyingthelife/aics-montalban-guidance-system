// Add or edit ONE student (restored on 2026-11-12 at the Guidance Office's request).
// The fields follow Settings › Student fields: labels can be renamed, email/relationship can be turned off,
// and the office can add its own fields (e.g. Adviser, Address). Live checks on every field.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { PhoneInput, checkPhMobile, formatPhMobile } from '../ui/PhoneInput';
import { checkEmail } from '../../services/validators';
import { useAppConfig, fieldLabel, CustomField } from '../../services/appConfig';
import type { StudentRecord } from '../../data/stage3MockData';

export interface StudentFormValue {
  studentNumber: string;
  fullName: string;
  grade: 'Grade 11' | 'Grade 12';
  section: string;
  parentName: string;
  parentRelationship: string;
  parentPhone: string;
  parentEmail: string;
  extra: Record<string, string>;
}

const input = 'w-full px-3 py-2 rounded-xl border bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white';
const okBorder = 'border-[#D3DDEE] dark:border-[#253B66]';
const badBorder = 'border-rose-400 dark:border-rose-600';
const label = 'block text-[11px] font-extrabold text-[#4A608A] dark:text-[#94A8D0] mb-1';
const err = 'mt-1 text-[11px] font-bold text-rose-700 dark:text-rose-300';
const RELATIONS = ['Mother', 'Father', 'Guardian', 'Grandparent', 'Sibling', 'Other'];
const RELATIONS_TL: Record<string, string> = { Mother: 'Nanay', Father: 'Tatay', Guardian: 'Guardian', Grandparent: 'Lolo / Lola', Sibling: 'Kapatid', Other: 'Iba pa' };

export const toFormValue = (s: StudentRecord): StudentFormValue => ({
  studentNumber: s.studentNumber,
  fullName: s.fullName,
  grade: /Grade 12/.test(s.gradeSection) ? 'Grade 12' : 'Grade 11',
  section: s.sectionCode,
  parentName: s.parentName,
  parentRelationship: s.parentRelationship || 'Mother',
  parentPhone: s.parentPhone,
  parentEmail: s.parentEmail,
  extra: { ...(s.extra ?? {}) },
});

export const StudentForm: React.FC<{
  isTl: boolean;
  existing: StudentRecord | null; // null = add
  students: StudentRecord[];
  busy: boolean;
  onCancel: () => void;
  onSave: (v: StudentFormValue) => void;
}> = ({ isTl, existing, students, busy, onCancel, onSave }) => {
  const cfg = useAppConfig();
  const sf = cfg.studentFields;
  const custom = useMemo(() => (sf.custom ?? []).filter((c) => c.active), [sf.custom]);
  const [v, setV] = useState<StudentFormValue>(
    existing
      ? toFormValue(existing)
      : { studentNumber: '', fullName: '', grade: 'Grade 11', section: '', parentName: '', parentRelationship: 'Mother', parentPhone: '', parentEmail: '', extra: {} }
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[data-confirm-open]')) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  const sections = useMemo(() => [...new Set(students.map((s) => s.sectionCode).filter(Boolean))].sort(), [students]);
  const L = (k: Parameters<typeof fieldLabel>[1]) => fieldLabel(sf, k, isTl);

  // ---- live checks ----
  const id = v.studentNumber.trim();
  const errors: Record<string, string> = {};
  if (!id) errors.studentNumber = isTl ? 'Ilagay ang student no. o LRN.' : 'Enter the student no. or LRN.';
  else if (!existing && students.some((s) => s.studentNumber === id)) errors.studentNumber = isTl ? `May estudyante na sa ${id}. Hanapin siya sa listahan at i-edit.` : `${id} is already in the list. Find them and edit instead.`;
  if (v.fullName.trim().length < 3) errors.fullName = isTl ? 'Ilagay ang buong pangalan.' : 'Enter the full name.';
  if (!v.section.trim()) errors.section = isTl ? 'Ilagay ang section (hal. ICT-1).' : 'Enter the section (e.g. ICT-1).';
  if (v.parentName.trim().length < 3) errors.parentName = isTl ? 'Ilagay ang pangalan ng magulang o guardian.' : 'Enter the parent or guardian name.';
  const ph = checkPhMobile(v.parentPhone, isTl);
  if (!ph.ok) errors.parentPhone = ph.message;
  if (sf.showEmail && v.parentEmail.trim()) {
    const ec = checkEmail(v.parentEmail.trim(), isTl);
    if (!ec.ok) errors.parentEmail = ec.message;
  }
  for (const c of custom) {
    const val = (v.extra[c.key] ?? '').trim();
    if (c.required && !val) errors[c.key] = isTl ? `Kailangan ang ${c.labelTl || c.labelEn}.` : `${c.labelEn} is required.`;
    else if (val && c.type === 'number' && !/^-?\d+(\.\d+)?$/.test(val)) errors[c.key] = isTl ? 'Numero lang.' : 'Numbers only.';
  }
  const hasErrors = Object.keys(errors).length > 0;
  const show = (k: string) => (touched[k] || touched.__submit) && errors[k];
  const box = (k: string) => `${input} ${show(k) ? badBorder : okBorder}`;

  const customInput = (c: CustomField) => {
    const val = v.extra[c.key] ?? '';
    const set = (x: string) => setV({ ...v, extra: { ...v.extra, [c.key]: x.slice(0, 200) } });
    const common = { 'data-extra-field': c.key, onBlur: () => touch(c.key), className: box(c.key) } as const;
    if (c.type === 'choice')
      return (
        <select {...common} value={val} onChange={(e) => set(e.target.value)}>
          <option value="">{isTl ? '— Pumili —' : '— Choose —'}</option>
          {c.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    return <input {...common} type={c.type === 'date' ? 'date' : 'text'} inputMode={c.type === 'number' ? 'decimal' : undefined} value={val} onChange={(e) => set(e.target.value)} />;
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] !m-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={existing ? (isTl ? 'Baguhin ang estudyante' : 'Edit student') : isTl ? 'Magdagdag ng estudyante' : 'Add a student'}
        data-student-form
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0B1527] border border-[#CBD5E1] dark:border-[#1E2E4E] shadow-2xl overflow-hidden"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched((t) => ({ ...t, __submit: true }));
          if (!hasErrors) onSave({ ...v, studentNumber: id, fullName: v.fullName.trim(), section: v.section.trim().toUpperCase(), parentName: v.parentName.trim(), parentPhone: formatPhMobile(v.parentPhone), parentEmail: sf.showEmail ? v.parentEmail.trim() : existing?.parentEmail ?? '' });
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white dark:bg-[#0B1527] border-b border-[#E2E8F0] dark:border-[#1E2E4E] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#1E469B]/10 dark:bg-[#1E469B]/20 text-[#1E469B] dark:text-[#7CB8F7] flex items-center justify-center font-black text-sm border border-[#1E469B]/20">
              {existing ? 'ED' : '+S'}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0B1F4D] dark:text-white font-serif tracking-tight">
                {existing ? (isTl ? `Baguhin si ${existing.fullName}` : `Edit ${existing.fullName}`) : isTl ? 'Magdagdag ng Estudyante' : 'Add Student Record'}
              </h3>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                {isTl ? 'Opisyal na talaan sa Senior High School Masterlist' : 'Official record in the Senior High School Masterlist'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onCancel} 
            aria-label={isTl ? 'Isara' : 'Close'} 
            title={isTl ? 'Isara' : 'Close'} 
            className="w-8 h-8 rounded-[6px] text-[#64748B] hover:text-[#0B1F4D] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center text-sm font-bold border border-transparent hover:border-[#CBD5E1]"
          >
            ✕
          </button>
        </div>

        {/* Structured Body (Cards) */}
        <div className="p-6 overflow-y-auto space-y-5 bg-[#F8FAFC] dark:bg-[#070D18]">
          {/* Card 1: Student Information */}
          <div className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#CBD5E1] dark:border-[#1E2E4E] p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E2E4E] pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                1. {isTl ? 'Impormasyon ng Estudyante' : 'Student Basic Information'}
              </span>
              <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold bg-[#F1F5F9] dark:bg-[#13203B] text-[#475569] dark:text-[#94A3B8] border border-[#CBD5E1] dark:border-[#334155]">
                Academic Info
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-1">
                <span className={label}>{L('studentNumber')} *</span>
                <input 
                  data-field="studentNumber" 
                  value={v.studentNumber} 
                  disabled={!!existing} 
                  onBlur={() => touch('studentNumber')} 
                  onChange={(e) => setV({ ...v, studentNumber: e.target.value.slice(0, 20) })} 
                  placeholder="2025-11042" 
                  className={`${box('studentNumber')} disabled:opacity-60 font-mono`} 
                />
                {existing && <span className="mt-1 block text-[11px] text-[#64748B] dark:text-[#94A3B8]">{isTl ? 'Naka-lock para hindi mawala ang kaugnay na mga records.' : 'Locked to protect connected case records.'}</span>}
                {show('studentNumber') && <span className={err}>{errors.studentNumber}</span>}
              </label>

              <label className="block sm:col-span-1">
                <span className={label}>{L('fullName')} *</span>
                <input 
                  data-field="fullName" 
                  value={v.fullName} 
                  onBlur={() => touch('fullName')} 
                  onChange={(e) => setV({ ...v, fullName: e.target.value.slice(0, 80) })} 
                  placeholder="Juan P. Dela Cruz" 
                  className={box('fullName')} 
                />
                {show('fullName') && <span className={err}>{errors.fullName}</span>}
              </label>

              <label className="block sm:col-span-1">
                <span className={label}>{L('grade')} *</span>
                <select 
                  data-field="grade" 
                  value={v.grade} 
                  onChange={(e) => setV({ ...v, grade: e.target.value as StudentFormValue['grade'] })} 
                  className={box('grade')}
                >
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </label>

              <label className="block sm:col-span-1">
                <span className={label}>{L('section')} *</span>
                <input 
                  data-field="section" 
                  list="section-list" 
                  value={v.section} 
                  onBlur={() => touch('section')} 
                  onChange={(e) => setV({ ...v, section: e.target.value.slice(0, 20) })} 
                  placeholder="ICT-1" 
                  className={box('section')} 
                />
                <datalist id="section-list">
                  {sections.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {show('section') && <span className={err}>{errors.section}</span>}
              </label>
            </div>
          </div>

          {/* Card 2: Parent / Guardian Contact Details */}
          <div className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#CBD5E1] dark:border-[#1E2E4E] p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E2E4E] pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                2. {isTl ? 'Impormasyon ng Magulang / Guardian' : 'Parent / Guardian Contact Details'}
              </span>
              <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold bg-[#F1F5F9] dark:bg-[#13203B] text-[#475569] dark:text-[#94A3B8] border border-[#CBD5E1] dark:border-[#334155]">
                Communication Info
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-1">
                <span className={label}>{L('parentName')} *</span>
                <input 
                  data-field="parentName" 
                  value={v.parentName} 
                  onBlur={() => touch('parentName')} 
                  onChange={(e) => setV({ ...v, parentName: e.target.value.slice(0, 80) })} 
                  placeholder="Maria Dela Cruz" 
                  className={box('parentName')} 
                />
                {show('parentName') && <span className={err}>{errors.parentName}</span>}
              </label>

              {sf.showRelationship && (
                <label className="block sm:col-span-1">
                  <span className={label}>{L('parentRelationship')}</span>
                  <select 
                    data-field="parentRelationship" 
                    value={v.parentRelationship} 
                    onChange={(e) => setV({ ...v, parentRelationship: e.target.value })} 
                    className={box('parentRelationship')}
                  >
                    {RELATIONS.map((r) => (
                      <option key={r} value={r}>
                        {isTl ? RELATIONS_TL[r] : r}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="block sm:col-span-1">
                <span className={label}>{L('parentPhone')} *</span>
                <PhoneInput id="stu-phone" value={v.parentPhone} onChange={(x) => setV({ ...v, parentPhone: x })} isTl={isTl} />
              </div>

              {sf.showEmail && (
                <label className="block sm:col-span-1">
                  <span className={label}>{L('parentEmail')}</span>
                  <input 
                    data-field="parentEmail" 
                    value={v.parentEmail} 
                    onBlur={() => touch('parentEmail')} 
                    onChange={(e) => setV({ ...v, parentEmail: e.target.value.slice(0, 120) })} 
                    placeholder={isTl ? 'opsyonal (hal. parent@gmail.com)' : 'optional (e.g. parent@gmail.com)'} 
                    className={box('parentEmail')} 
                  />
                  {show('parentEmail') && <span className={err}>{errors.parentEmail}</span>}
                </label>
              )}
            </div>
          </div>

          {/* Card 3: Additional Office Fields (if any enabled) */}
          {custom.length > 0 && (
            <div className="rounded-xl bg-white dark:bg-[#0F1A30] border border-[#CBD5E1] dark:border-[#1E2E4E] p-4 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E2E4E] pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1E469B] dark:text-[#7CB8F7]">
                  3. {isTl ? 'Karagdagang Impormasyon ng Opisina' : 'Custom Guidance Office Fields'}
                </span>
                <span className="px-2 py-0.5 rounded-[6px] text-[10px] font-extrabold bg-[#F1F5F9] dark:bg-[#13203B] text-[#475569] dark:text-[#94A3B8] border border-[#CBD5E1] dark:border-[#334155]">
                  Settings Custom
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {custom.map((c) => (
                  <label key={c.key} className="block sm:col-span-1">
                    <span className={label}>
                      {isTl ? c.labelTl || c.labelEn : c.labelEn}
                      {c.required ? ' *' : ''}
                    </span>
                    {customInput(c)}
                    {show(c.key) && <span className={err}>{errors[c.key]}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white dark:bg-[#0B1527] border-t border-[#E2E8F0] dark:border-[#1E2E4E] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <p className="text-xs font-bold text-rose-700 dark:text-rose-300" role="alert">
            {touched.__submit && hasErrors ? (isTl ? `May ${Object.keys(errors).length} na kailangang punan o ayusin sa itaas.` : `${Object.keys(errors).length} required field(s) need attention above.`) : ''}
          </p>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-4 py-2 rounded-[6px] border border-[#CBD5E1] dark:border-[#253B66] text-[#475569] dark:text-[#94A3B8] bg-white dark:bg-[#0F1A30] hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              {isTl ? 'Kanselahin' : 'Cancel'}
            </button>
            <button 
              type="submit" 
              data-action="save-student" 
              disabled={busy} 
              className="px-5 py-2 rounded-[6px] bg-[#1E469B] hover:bg-[#153477] text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
            >
              {busy ? (isTl ? 'Sine-save…' : 'Saving…') : existing ? (isTl ? 'I-save ang Pagbabago' : 'Save Changes') : isTl ? 'Idagdag ang Estudyante' : 'Save Student Record'}
            </button>
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
};
