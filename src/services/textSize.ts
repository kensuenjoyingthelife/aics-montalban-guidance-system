// "Laki ng letra": 5-tier UI zoom levels for complete control across the entire system.
// Level 1: Extra Small (0.85x) - compact desktop / high density
// Level 2: Small (0.92x) - comfortable compact
// Level 3: Normal (1.0x) - standard baseline
// Level 4: Large (1.12x) - enhanced readability
// Level 5: Extra Large (1.25x) - high visibility / accessibility
export type TextSize = 'xsmall' | 'small' | 'normal' | 'large' | 'xlarge';

export const TEXT_SIZES: { id: TextSize; zoom: number; en: string; tl: string; short: string }[] = [
  { id: 'xsmall', zoom: 0.85, en: 'Extra Small', tl: 'Pinakamaliit', short: 'XS' },
  { id: 'small', zoom: 0.92, en: 'Small', tl: 'Maliit', short: 'S' },
  { id: 'normal', zoom: 1.0, en: 'Normal', tl: 'Normal', short: 'M' },
  { id: 'large', zoom: 1.12, en: 'Large', tl: 'Malaki', short: 'L' },
  { id: 'xlarge', zoom: 1.25, en: 'Extra Large', tl: 'Pinakamalaki', short: 'XL' },
];
const KEY = 'aics_text_size_v1';
export const TEXT_SIZE_EVENT = 'aics:text-size';

export function getTextSize(): TextSize {
  try {
    const v = localStorage.getItem(KEY) as TextSize | null;
    return v && TEXT_SIZES.some((s) => s.id === v) ? v : 'small'; // Defaults to clean compact small (0.92x)
  } catch {
    return 'small';
  }
}

const inTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export function applyTextSize(size: TextSize = getTextSize()) {
  const z = TEXT_SIZES.find((s) => s.id === size)?.zoom ?? 1.0;
  const root = document.documentElement;
  root.dataset.textSize = size;
  if (inTauri()) {
    root.style.removeProperty('zoom');
    // WebView2 setZoom scales 100vh natively, so --app-zoom must be 1 to prevent h-screen from shrinking to 80vh!
    root.style.setProperty('--app-zoom', '1');
    root.style.setProperty('--aicy-inv-zoom', String(1 / z));
    import('@tauri-apps/api/webview')
      .then(({ getCurrentWebview }) => getCurrentWebview().setZoom(z))
      .catch(() => {
        root.style.setProperty('zoom', String(z));
        root.style.setProperty('--app-zoom', String(z));
      });
    return;
  }
  // Browser standard CSS zoom on root
  root.style.setProperty('zoom', String(z));
  root.style.setProperty('--app-zoom', String(z));
  // Invert zoom on floating chathead & window so its layout, font size & 1:1 Messenger geometry stay perfectly stable!
  root.style.setProperty('--aicy-inv-zoom', String(1 / z));
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
