// "Laki ng letra": makes the whole app bigger for staff who need larger text.
// Uses CSS zoom on the page root (WebView2/Tauri and Chromium support it), so px and rem
// sizes, icons and buttons all grow together and the layout reflows instead of overflowing.
export type TextSize = 'normal' | 'large' | 'xlarge';
export const TEXT_SIZES: { id: TextSize; zoom: number; en: string; tl: string }[] = [
  { id: 'normal', zoom: 1, en: 'Normal', tl: 'Normal' },
  { id: 'large', zoom: 1.15, en: 'Large', tl: 'Malaki' },
  { id: 'xlarge', zoom: 1.3, en: 'Larger', tl: 'Mas malaki' },
];
const KEY = 'aics_text_size_v1';
export const TEXT_SIZE_EVENT = 'aics:text-size';

export function getTextSize(): TextSize {
  try {
    const v = localStorage.getItem(KEY) as TextSize | null;
    return v && TEXT_SIZES.some((s) => s.id === v) ? v : 'normal';
  } catch {
    return 'normal';
  }
}

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function applyTextSize(size: TextSize = getTextSize()) {
  const z = TEXT_SIZES.find((s) => s.id === size)?.zoom ?? 1;
  const root = document.documentElement;
  root.dataset.textSize = size;
  if (inTauri()) {
    // Desktop app: real window zoom (like Ctrl +). The layout re-flows for the smaller
    // effective width, so nothing is cut off and "screen height" stays correct.
    root.style.removeProperty('zoom');
    root.style.setProperty('--app-zoom', '1');
    import('@tauri-apps/api/webview')
      .then(({ getCurrentWebview }) => getCurrentWebview().setZoom(z))
      .catch(() => {
        root.style.setProperty('zoom', String(z)); // fallback
        root.style.setProperty('--app-zoom', String(z));
      });
    return;
  }
  // Browser preview fallback: CSS zoom
  root.style.setProperty('zoom', String(z));
  root.style.setProperty('--app-zoom', String(z));
}

export function setTextSize(size: TextSize) {
  try {
    localStorage.setItem(KEY, size);
  } catch {
    /* storage blocked: still applies for this session */
  }
  applyTextSize(size);
  window.dispatchEvent(new CustomEvent(TEXT_SIZE_EVENT, { detail: size }));
}
