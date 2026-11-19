/**
 * ONE SWITCH for the Filipino Christmas theme (website + mobile student portal).
 *
 *   'auto' = on only during the season (Nov 15 – Jan 6, Three Kings), off the rest of the year
 *   'on'   = always on
 *   'off'  = back to the main theme (the UI from before the Christmas theme):
 *            no day/night campus picture, no glass login, no tune, no parol / lights / holly / greeting
 *
 * The Guidance Office changes it in the desktop app: Settings > Student portal look.
 * It is saved in the database (app_settings key "seasonal_theme"), so every student gets it.
 * CHRISTMAS_THEME below is only the fallback when the database cannot be reached.
 */
import React from 'react';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../services/supabaseClient';

export type ChristmasMode = 'auto' | 'on' | 'off';
export const CHRISTMAS_THEME = 'auto' as ChristmasMode;

const MODE_KEY = 'aics_xmas_mode_v1'; // last mode from the database, so the next visit starts right (no flash)
const MODE_EVENT = 'aics-xmas-mode';

const readCached = (): ChristmasMode => {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'auto' || v === 'on' || v === 'off') return v;
  } catch {
    /* ignore */
  }
  return CHRISTMAS_THEME;
};
let mode: ChristmasMode = readCached();

export const getChristmasMode = (): ChristmasMode => mode;

/** used when the database answers, and right after the office saves a new choice */
export const applyChristmasMode = (next: ChristmasMode): void => {
  if (next === mode) return;
  mode = next;
  try {
    localStorage.setItem(MODE_KEY, next);
  } catch {
    /* ignore */
  }
  document.documentElement.classList.toggle('xmas-on', christmasOn());
  window.dispatchEvent(new CustomEvent(MODE_EVENT, { detail: next }));
};

/** one tiny read (only this key) so the phone login stays fast */
export async function loadChristmasMode(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_settings?select=value&key=eq.seasonal_theme`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    if (!res.ok) return;
    const rows = (await res.json()) as { value?: { christmas?: string } }[];
    const v = rows[0]?.value?.christmas;
    applyChristmasMode(v === 'on' || v === 'off' || v === 'auto' ? v : 'auto');
  } catch {
    /* offline: keep the last known mode */
  }
}

/** re-renders the caller when the mode changes */
export const useChristmasMode = (): ChristmasMode => {
  const [m, setM] = React.useState<ChristmasMode>(mode);
  React.useEffect(() => {
    const on = () => setM(mode);
    window.addEventListener(MODE_EVENT, on);
    return () => window.removeEventListener(MODE_EVENT, on);
  }, []);
  return m;
};

export const isChristmasSeason = (d = new Date()): boolean => {
  const m = d.getMonth();
  const day = d.getDate();
  return (m === 10 && day >= 15) || m === 11 || (m === 0 && day <= 6);
};

export const christmasOn = (): boolean => mode === 'on' || (mode === 'auto' && isChristmasSeason());

/* Each student can turn the decorations INSIDE the portal on/off in Settings (the login is not affected). */
const DECOR_KEY = 'aics_xmas_decor_inside';
export const DECOR_EVENT = 'aics-xmas-decor';
export const insideDecorWanted = (): boolean => {
  try {
    return localStorage.getItem(DECOR_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setInsideDecorWanted = (on: boolean): void => {
  try {
    localStorage.setItem(DECOR_KEY, on ? 'on' : 'off');
  } catch {
    /* private mode: only this visit */
  }
  window.dispatchEvent(new CustomEvent(DECOR_EVENT, { detail: on }));
};
