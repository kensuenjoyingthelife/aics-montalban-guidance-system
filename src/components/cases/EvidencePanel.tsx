// Evidence on a case: attach photos / PDFs, view them inside the app, hide with Undo.
// Private: every view uses a link that expires after 2 minutes.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConfirmChange } from '../ui/ConfirmChange';
import { Evidence, fetchEvidence, uploadEvidence, signedEvidenceUrl, setEvidenceHidden, checkEvidenceFile } from '../../services/evidenceDb';

const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export const EvidencePanel: React.FC<{
  caseCode: string;
  isTl: boolean;
  by: string;
  onToast: (msg: string, undo?: () => void) => void;
  onChanged?: () => void;
}> = ({ caseCode, isTl, by, onToast, onChanged }) => {
  const confirmChange = useConfirmChange();
  const [items, setItems] = useState<Evidence[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<number, string>>({});
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [view, setView] = useState<{ ev: Evidence; url: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // keep the latest toast function without re-loading the list on every parent render
  const toastRef = useRef(onToast);
  toastRef.current = onToast;
  const load = useCallback(async () => {
    const r = await fetchEvidence(caseCode);
    setItems(r ?? []);
    if (!r) toastRef.current(isTl ? '⚠️ Hindi makuha ang evidence. I-check ang internet.' : '⚠️ Could not load the evidence. Check the internet.');
  }, [caseCode, isTl]);
  useEffect(() => {
    void load();
  }, [load]);
  // thumbnails for the first 12 photos only (each needs its own private link)
  useEffect(() => {
    (items ?? [])
      .filter((e) => !e.hidden && e.mime.startsWith('image/') && !thumbs[e.id])
      .slice(0, 12)
      .forEach((e) => void signedEvidenceUrl(e.path).then((u) => u && setThumbs((t) => ({ ...t, [e.id]: u }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const pick = (f: File | null) => {
    setErr('');
    setFile(null);
    if (!f) return;
    const bad = checkEvidenceFile(f, isTl);
    if (bad) return setErr(bad);
    setFile(f);
  };
  const upload = async () => {
    if (!file) return;
    setBusy(true);
    const r = await uploadEvidence(caseCode, file, note, by);
    setBusy(false);
    if (!r.row) return setErr(isTl ? 'Hindi na-upload. I-check ang internet, tapos subukan ulit.' : 'Not uploaded. Check the internet, then try again.');
    setItems((l) => [r.row!, ...(l ?? [])]);
    setFile(null);
    setNote('');
    if (input.current) input.current.value = '';
    onChanged?.();
    onToast(isTl ? `✓ Naidagdag ang ${r.row.fileName}. Pribado ito — sa office lang makikita.` : `✓ ${r.row.fileName} attached. It is private — office only.`);
  };
  const open = async (ev: Evidence) => {
    const url = await signedEvidenceUrl(ev.path);
    if (!url) return onToast(isTl ? '⚠️ Hindi mabuksan ang file. I-check ang internet.' : '⚠️ Could not open the file. Check the internet.');
    setView({ ev, url });
  };
  const hide = async (ev: Evidence, h: boolean) => {
    if (h) {
      const ok = await confirmChange({
        title: isTl ? 'Alisin ang evidence sa listahan?' : 'Remove this evidence from the list?',
        rows: [{ label: ev.fileName, before: isTl ? 'Nakikita' : 'Shown', after: isTl ? 'Nakatago' : 'Hidden' }],
        note: isTl ? 'Hindi binubura ang file — itinatago lang, para sa record. Puwedeng ibalik.' : 'The file is not deleted — only hidden, for the record. You can bring it back.',
        confirmLabel: isTl ? 'Oo, alisin' : 'Yes, remove',
        tone: 'danger',
      });
      if (!ok) return;
    }
    if (!(await setEvidenceHidden(ev.id, h))) return onToast(isTl ? '⚠️ Hindi na-save. I-check ang internet.' : '⚠️ Not saved. Check the internet.');
    setItems((l) => (l ?? []).map((x) => (x.id === ev.id ? { ...x, hidden: h } : x)));
    onToast(h ? (isTl ? 'Inalis sa listahan.' : 'Removed from the list.') : isTl ? 'Naibalik.' : 'Brought back.', h ? async () => {
      if (await setEvidenceHidden(ev.id, false)) setItems((l) => (l ?? []).map((x) => (x.id === ev.id ? { ...x, hidden: false } : x)));
    } : undefined);
  };

  // Esc closes only the viewer (not the case window behind it)
  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setView(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [view]);

  const shown = (items ?? []).filter((e) => !e.hidden);
  const hidden = (items ?? []).filter((e) => e.hidden);
  const when = (iso: string) => new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

  return (
    <div className="space-y-2" data-evidence>
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-[#4A608A] dark:text-[#94A8D0]">
          📎 {isTl ? `Evidence (${shown.length})` : `Evidence (${shown.length})`} <span className="font-normal">· {isTl ? 'pribado, sa office lang' : 'private, office only'}</span>
        </p>
        <button type="button" data-action="attach" onClick={() => input.current?.click()} className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold whitespace-nowrap">
          + {isTl ? 'Mag-attach ng file' : 'Attach a file'}
        </button>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" data-evidence-input onChange={(e) => pick(e.target.files?.[0] ?? null)} />
      </div>
      {err && <p className="text-xs font-bold text-rose-700 dark:text-rose-300" role="alert">⚠ {err}</p>}
      {file && (
        <div className="rounded-xl border border-[#1E469B] bg-[#EEF3FC] dark:bg-[#13203B] p-3 space-y-2" data-evidence-pending>
          <p className="text-xs font-extrabold text-[#0B1F4D] dark:text-white break-all">
            {file.name} · {size(file.size)}
          </p>
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={isTl ? 'Maikling paliwanag (opsyonal), hal. "Litrato ng sirang upuan"' : 'Short note (optional), e.g. "Photo of the broken chair"'} className="w-full px-3 py-2 rounded-lg border border-[#D3DDEE] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-xs text-[#0B1F4D] dark:text-white" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => pick(null)} className="px-3 py-1.5 rounded-lg saas-card-subtle text-xs font-bold">
              {isTl ? 'Kanselahin' : 'Cancel'}
            </button>
            <button type="button" data-action="upload" disabled={busy} onClick={() => void upload()} className="px-4 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-bold disabled:opacity-50">
              {busy ? (isTl ? 'Ina-upload…' : 'Uploading…') : isTl ? 'I-upload' : 'Upload'}
            </button>
          </div>
        </div>
      )}
      {items === null && <p className="text-xs text-[#4A608A]">{isTl ? 'Kinukuha…' : 'Loading…'}</p>}
      {items !== null && shown.length === 0 && !file && <p className="text-xs text-[#4A608A] dark:text-[#94A8D0]">{isTl ? 'Wala pang evidence. Puwedeng mag-attach ng litrato o PDF (hanggang 10 MB).' : 'No evidence yet. You can attach a photo or PDF (up to 10 MB).'}</p>}
      <div className="grid grid-cols-2 gap-2">
        {shown.map((e) => (
          <div key={e.id} data-evidence-item={e.fileName} className="rounded-xl saas-card-subtle p-2 flex gap-2 items-start">
            <button type="button" onClick={() => void open(e)} title={isTl ? 'Buksan' : 'Open'} className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[#E4ECFC] dark:bg-[#192D58] flex items-center justify-center text-lg">
              {e.mime.startsWith('image/') && thumbs[e.id] ? <img src={thumbs[e.id]} alt="" className="w-full h-full object-cover" /> : e.mime === 'application/pdf' ? '📄' : '🖼'}
            </button>
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => void open(e)} className="block text-left text-xs font-extrabold text-[#1E469B] dark:text-[#7CB8F7] underline break-all">
                {e.fileName}
              </button>
              <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">
                {size(e.size)} · {when(e.at)}
              </p>
              {e.note && <p className="text-[11px] text-[#0B1F4D] dark:text-white break-words">{e.note}</p>}
              <button type="button" onClick={() => void hide(e, true)} className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                {isTl ? 'Alisin' : 'Remove'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {hidden.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHidden((v) => !v)} className="text-[11px] font-bold text-[#4A608A] dark:text-[#94A8D0]">
            {showHidden ? '▾' : '▸'} {isTl ? `Mga inalis (${hidden.length})` : `Removed (${hidden.length})`}
          </button>
          {showHidden &&
            hidden.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs py-1 opacity-70">
                <span className="break-all">{e.fileName}</span>
                <button type="button" onClick={() => void hide(e, false)} className="px-2 py-0.5 rounded saas-card-subtle font-bold">
                  {isTl ? 'Ibalik' : 'Bring back'}
                </button>
              </div>
            ))}
        </div>
      )}
      {view &&
        createPortal(
          <div className="fixed inset-0 z-[90] !m-0 bg-black/80 flex flex-col p-4" onMouseDown={(e) => e.target === e.currentTarget && setView(null)} data-evidence-viewer>
            <div className="flex items-center justify-between text-white mb-2">
              <p className="text-sm font-bold break-all">{view.ev.fileName}</p>
              <button type="button" onClick={() => setView(null)} aria-label={isTl ? 'Isara' : 'Close'} title={isTl ? 'Isara' : 'Close'} className="w-9 h-9 rounded-lg bg-white/15 font-bold">
                ✕
              </button>
            </div>
            <div className="flex-1 min-h-0 flex items-center justify-center">
              {view.ev.mime.startsWith('image/') ? (
                <img src={view.url} alt={view.ev.fileName} className="max-w-full max-h-full object-contain rounded-lg" />
              ) : (
                <iframe title={view.ev.fileName} src={view.url} className="w-full h-full rounded-lg bg-white" />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
