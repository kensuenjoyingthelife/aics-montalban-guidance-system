/**
 * AICS SafeZone Client-Side Anti-Tampering & Security Shield
 * 
 * Enforced Protection Across Production & Public Web:
 * 1. Blocks right-click context menu (exempts legitimate copy/paste inside input/textarea)
 * 2. Blocks developer inspect shortcuts:
 *    - F12
 *    - Ctrl + Shift + I (Inspect)
 *    - Ctrl + Shift + J (Console)
 *    - Ctrl + Shift + C (Element Inspector)
 *    - Ctrl + U (View Page Source)
 *    - Ctrl + S (Save Page / Steal assets)
 * 3. Prevents dragging of sensitive branding images and confidential UI cards
 * 4. Shows non-intrusive security toast/indicator if devtools tampering attempted
 */

const isTextBox = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t || !t.closest) return false;
  return !!t.closest('input, textarea, [contenteditable="true"]');
};

let installed = false;

export function installNoInspect(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  // 1. Block Right-Click Context Menu everywhere except inside text inputs (for paste)
  window.addEventListener(
    'contextmenu',
    (e) => {
      if (!isTextBox(e.target)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  // 2. Block Developer Keyboard Shortcuts across both Production & Staging
  window.addEventListener(
    'keydown',
    (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Blocked keys: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S
      const isF12 = e.key === 'F12' || k === 'f12';
      const isInspect = ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c');
      const isViewSource = ctrl && k === 'u';
      const isSavePage = ctrl && k === 's';

      if (isF12 || isInspect || isViewSource || isSavePage) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  // 3. Block Dragging of images, buttons, and logos to prevent unauthorized asset extraction
  window.addEventListener(
    'dragstart',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'IMG' || target.closest('img, svg, .select-none'))) {
        e.preventDefault();
      }
    },
    { capture: true }
  );
}
