// Help Assistant: a free, offline "ask anything about the app" chat, in Taglish or English.
// Answers come from src/services/helpKB.ts (Taglish) and helpKB.en.ts (English), written from the real screens.
// Nothing typed is saved or sent anywhere.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HELP_CATEGORIES, HELP_KB, GO_LABEL, type HelpCategory, type HelpEntry, type HelpTarget } from '../../services/helpKB';
import { HELP_EN, HELP_CATEGORIES_EN, GO_LABEL_EN } from '../../services/helpKB.en';
import { searchHelp } from '../../services/helpSearch';

type Lang = 'tl' | 'en';
type Msg =
  | { id: number; from: 'me'; text: string }
  | { id: number; from: 'me-entry'; entryId: string }
  | { id: number; from: 'me-cat'; cat: HelpCategory }
  | { id: number; from: 'answer'; entryId: string; more: string[] }
  | { id: number; from: 'none' }
  | { id: number; from: 'category'; cat: HelpCategory };

const BY_ID = new Map(HELP_KB.map((e) => [e.id, e]));
const TOP = HELP_KB.filter((e) => e.top);
const MAX_MSGS = 40;
const LANG_KEY = 'aics_help_lang';

const readLang = (): Lang => {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'tl';
  } catch {
    return 'tl';
  }
};

/** the entry's text in the chosen language */
const textOf = (e: HelpEntry, lang: Lang) => {
  const en = HELP_EN[e.id];
  return lang === 'en' && en ? en : { q: e.q, a: e.a, steps: e.steps, tip: e.tip };
};

const UI = {
  tl: {
    title: 'Help Assistant',
    sub: 'Libre at gumagana kahit walang internet. Walang nase-save sa itinatanong mo.',
    hello: 'Hi! 👋 Itanong mo lang kung paano gamitin ang system, sa sarili mong salita.',
    most: 'Mga madalas itanong',
    showAll: (n: number) => `Ipakita lahat (${n})`,
    showLess: 'Ipakita nang kaunti',
    topics: 'Mga paksa',
    count: (n: number) => `${n} tanong`,
    pick: 'Ito ang mga tanong tungkol dito. Pumili ka:',
    none1: 'Pasensya, wala pa akong sagot diyan.',
    none2: 'Subukang itanong sa ibang salita (hal. "paano mag-text sa magulang"), o pumili sa ibaba.',
    related: 'Kaugnay na tanong',
    back: '← Bumalik sa simula',
    placeholder: 'Itanong dito… hal. paano ipatawag ang magulang',
    ask: 'Itanong',
    close: 'Isara',
  },
  en: {
    title: 'Help Assistant',
    sub: 'Free and works without internet. Nothing you type is saved.',
    hello: 'Hi! 👋 Ask how to use the system, in your own words.',
    most: 'Most asked',
    showAll: (n: number) => `Show all (${n})`,
    showLess: 'Show less',
    topics: 'Topics',
    count: (n: number) => `${n} question${n === 1 ? '' : 's'}`,
    pick: 'Here are the questions on this topic. Pick one:',
    none1: 'Sorry, I don’t have an answer for that yet.',
    none2: 'Try other words (e.g. "how to text a parent"), or pick one below.',
    related: 'Related questions',
    back: '← Back to start',
    placeholder: 'Ask here… e.g. how to call a parent',
    ask: 'Ask',
    close: 'Close',
  },
};

export const HelpAssistant: React.FC<{
  isTl: boolean;
  onClose: () => void;
  onGo: (t: HelpTarget) => void;
}> = ({ onClose, onGo }) => {
  const [lang, setLangState] = useState<Lang>(readLang);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [allTop, setAllTop] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const u = UI[lang];
  const catLabel = (c: HelpCategory) => (lang === 'en' ? HELP_CATEGORIES_EN[c] : HELP_CATEGORIES.find((x) => x.id === c)?.label) ?? c;
  const goLabel = (t: HelpTarget) => (lang === 'en' ? GO_LABEL_EN[t] : GO_LABEL[t]);
  const catCounts = useMemo(() => Object.fromEntries(HELP_CATEGORIES.map((c) => [c.id, HELP_KB.filter((e) => e.cat === c.id).length])), []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* the choice just isn't remembered */
    }
  };

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    const el = listRef.current;
    if (el && msgs.length) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const push = (...m: Omit<Msg, 'id'>[]) => setMsgs((prev) => [...prev, ...m.map((x) => ({ ...x, id: nextId.current++ }) as Msg)].slice(-MAX_MSGS));

  const openEntry = (e: HelpEntry) => {
    const more = searchHelp(e.q, 4)
      .map((h) => h.entry.id)
      .filter((id) => id !== e.id)
      .slice(0, 2);
    push({ from: 'me-entry', entryId: e.id } as Omit<Msg, 'id'>, { from: 'answer', entryId: e.id, more } as Omit<Msg, 'id'>);
  };

  const ask = () => {
    const q = text.trim();
    if (!q) return;
    setText('');
    const hits = searchHelp(q, 3);
    if (!hits.length) return push({ from: 'me', text: q } as Omit<Msg, 'id'>, { from: 'none' } as Omit<Msg, 'id'>);
    push({ from: 'me', text: q } as Omit<Msg, 'id'>, { from: 'answer', entryId: hits[0].entry.id, more: hits.slice(1).map((h) => h.entry.id) } as Omit<Msg, 'id'>);
  };

  const showCategory = (cat: HelpCategory) => push({ from: 'me-cat', cat } as Omit<Msg, 'id'>, { from: 'category', cat } as Omit<Msg, 'id'>);

  // ---------- look ----------
  const row =
    'w-full flex items-center justify-between gap-3 text-left px-3 py-2 rounded-xl bg-white dark:bg-[#0B1527] border border-[#DCE5F2] dark:border-[#1E3158] hover:border-[#1E469B] dark:hover:border-[#7CB8F7] text-[13px] font-semibold text-[#0B1F4D] dark:text-white btn-press';
  const qRow = (e: HelpEntry) => (
    <button key={e.id} type="button" data-help-q={e.id} onClick={() => openEntry(e)} className={row}>
      <span className="min-w-0">{textOf(e, lang).q}</span>
      <span aria-hidden className="shrink-0 text-[#1E469B] dark:text-[#7CB8F7]">›</span>
    </button>
  );
  const card = 'rounded-2xl bg-white dark:bg-[#0F1D38] border border-[#DCE5F2] dark:border-[#1E3158] p-4 space-y-2.5 shadow-sm';
  const sectionTitle = 'text-[11px] font-extrabold uppercase tracking-wide text-[#4A608A] dark:text-[#94A8D0]';
  const me = 'max-w-[85%] rounded-2xl rounded-tr-md bg-[#1E469B] text-white px-4 py-2 text-sm whitespace-pre-wrap break-words';

  const home = (
    <div className="space-y-4" data-help-hello>
      <p className="text-sm text-[#0B1F4D] dark:text-white">{u.hello}</p>
      <section className="space-y-2">
        <p className={sectionTitle}>⭐ {u.most}</p>
        <div className="space-y-1.5">{(allTop ? TOP : TOP.slice(0, 6)).map(qRow)}</div>
        <button type="button" data-help-more onClick={() => setAllTop((v) => !v)} className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7] underline underline-offset-2">
          {allTop ? u.showLess : u.showAll(TOP.length)}
        </button>
      </section>
      <section className="space-y-2">
        <p className={sectionTitle}>📚 {u.topics}</p>
        <div className="grid grid-cols-3 gap-2">
          {HELP_CATEGORIES.map((c) => {
            const label = catLabel(c.id);
            const icon = label.split(' ')[0];
            return (
              <button key={c.id} type="button" data-help-cat={c.id} onClick={() => showCategory(c.id)} className="flex flex-col items-start gap-0.5 p-2.5 rounded-xl bg-white dark:bg-[#0B1527] border border-[#DCE5F2] dark:border-[#1E3158] hover:border-[#1E469B] dark:hover:border-[#7CB8F7] text-left btn-press">
                <span className="text-lg leading-none">{icon}</span>
                <span className="text-xs font-extrabold text-[#0B1F4D] dark:text-white leading-tight">{label.slice(icon.length).trim()}</span>
                <span className="text-[10.5px] text-[#4A608A] dark:text-[#94A8D0]">{u.count(catCounts[c.id])}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end" data-help-assistant>
      <button type="button" aria-label={u.close} onClick={onClose} className="absolute inset-0 bg-[#06122B]/30 backdrop-blur-[2px] cursor-default" />
      <aside role="dialog" aria-modal="true" aria-label={u.title} className="relative h-full w-[460px] max-w-full flex flex-col bg-[#F4F7FC] dark:bg-[#0A1428] border-l border-[#D3DDEE] dark:border-[#1E3158] shadow-2xl">
        <header className="px-5 pt-4 pb-3 bg-white dark:bg-[#0F1D38] border-b border-[#DCE5F2] dark:border-[#1E3158] space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-[#0B1F4D] dark:text-white">💬 {u.title}</h2>
            <div className="flex items-center gap-2">
              <div role="group" aria-label="Language" className="inline-flex p-0.5 rounded-lg bg-[#EEF3FC] dark:bg-[#0B1527] border border-[#DCE5F2] dark:border-[#1E3158]" data-help-lang>
                {(['tl', 'en'] as Lang[]).map((l) => (
                  <button key={l} type="button" data-help-lang-btn={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold ${lang === l ? 'bg-[#1E469B] text-white' : 'text-[#4A608A] dark:text-[#94A8D0]'}`}>
                    {l === 'tl' ? 'Taglish' : 'English'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} aria-label={u.close} title={`${u.close} (Esc)`} className="text-sm font-bold text-[#4A608A] hover:text-[#0B1F4D] dark:hover:text-white px-1">
                ✕
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[#4A608A] dark:text-[#94A8D0]">🔒 {u.sub}</p>
        </header>

        {msgs.length > 0 && (
          <div className="px-4 py-2 border-b border-[#DCE5F2] dark:border-[#1E3158] bg-white/60 dark:bg-[#0F1D38]/60">
            <button type="button" data-help-home onClick={() => setMsgs([])} className="text-xs font-bold text-[#1E469B] dark:text-[#7CB8F7]">
              {u.back}
            </button>
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" data-help-list>
          {msgs.length === 0
            ? home
            : msgs.map((m) => {
                if (m.from === 'me' || m.from === 'me-entry' || m.from === 'me-cat') {
                  const t = m.from === 'me' ? m.text : m.from === 'me-entry' ? textOf(BY_ID.get(m.entryId)!, lang).q : catLabel(m.cat);
                  return (
                    <div key={m.id} className="flex justify-end">
                      <p className={me}>{t}</p>
                    </div>
                  );
                }
                if (m.from === 'category')
                  return (
                    <div key={m.id} className={card} data-help-category={m.cat}>
                      <p className="text-sm text-[#0B1F4D] dark:text-white">{u.pick}</p>
                      <div className="space-y-1.5">{HELP_KB.filter((e) => e.cat === m.cat).map(qRow)}</div>
                    </div>
                  );
                if (m.from === 'none')
                  return (
                    <div key={m.id} className={card} data-help-none>
                      <p className="text-sm font-extrabold text-[#0B1F4D] dark:text-white">🤔 {u.none1}</p>
                      <p className="text-sm text-[#0B1F4D] dark:text-white">{u.none2}</p>
                      <button type="button" data-help-go="guide" onClick={() => onGo('guide')} className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold btn-press">
                        {goLabel('guide')} →
                      </button>
                      <div className="space-y-1.5">{TOP.slice(0, 6).map(qRow)}</div>
                    </div>
                  );
                const e = BY_ID.get(m.entryId)!;
                const tx = textOf(e, lang);
                return (
                  <div key={m.id} className={card} data-help-answer={e.id}>
                    <p className="text-[15px] font-extrabold text-[#0B1F4D] dark:text-white leading-snug">{tx.q}</p>
                    <p className="text-sm leading-relaxed text-[#0B1F4D] dark:text-white">{tx.a}</p>
                    {tx.steps && (
                      <ol className="space-y-1.5">
                        {tx.steps.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[#0B1F4D] dark:text-white">
                            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-[#E4ECFC] dark:bg-[#192D58] text-[#1E469B] dark:text-[#7CB8F7] text-[11px] font-extrabold flex items-center justify-center">{i + 1}</span>
                            <span className="min-w-0">{s}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {tx.tip && <p className="text-xs rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 px-3 py-2">💡 {tx.tip}</p>}
                    {e.go && (
                      <button type="button" data-help-go={e.go} onClick={() => onGo(e.go!)} className="px-3 py-1.5 rounded-lg bg-[#1E469B] text-white text-xs font-extrabold btn-press">
                        {goLabel(e.go)} →
                      </button>
                    )}
                    {m.more.length > 0 && (
                      <div className="pt-2 mt-1 border-t border-[#EEF3FC] dark:border-[#1E3158] space-y-1.5">
                        <p className={sectionTitle}>{u.related}</p>
                        {m.more.map((id) => BY_ID.get(id)).filter(Boolean).map((x) => qRow(x!))}
                      </div>
                    )}
                  </div>
                );
              })}
        </div>

        <form
          className="p-3 bg-white dark:bg-[#0F1D38] border-t border-[#DCE5F2] dark:border-[#1E3158] flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            ask();
          }}
        >
          <input
            ref={inputRef}
            data-help-input
            value={text}
            onChange={(ev) => setText(ev.target.value.slice(0, 200))}
            placeholder={u.placeholder}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-[#C9D6EC] dark:border-[#253B66] bg-white dark:bg-[#0B1527] text-sm text-[#0B1F4D] dark:text-white focus:outline-none focus:ring-4 focus:ring-[#1E469B]/20"
          />
          <button type="submit" data-help-send disabled={!text.trim()} className="px-4 py-2.5 rounded-xl bg-[#1E469B] text-white text-sm font-extrabold whitespace-nowrap disabled:opacity-50">
            {u.ask}
          </button>
        </form>
      </aside>
    </div>,
    document.body,
  );
};
