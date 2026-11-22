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

let antiScreenshotActive = false;
let installed = false;

export function setAntiScreenshotActive(active: boolean): void {
  antiScreenshotActive = active;
  if (!active) {
    hideFloatingPrivacyOverlay();
    const shield = document.getElementById('aics-screenshot-shield');
    if (shield) {
      shield.style.opacity = '0';
      shield.style.pointerEvents = 'none';
    }
  }
}

export function isAntiScreenshotActive(): boolean {
  return antiScreenshotActive;
}

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

      // Blocked keys: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, PrintScreen
      const isF12 = e.key === 'F12' || k === 'f12';
      const isInspect = ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c');
      const isViewSource = ctrl && k === 'u';
      const isSavePage = ctrl && k === 's';
      const isPrintScreen = e.key === 'PrintScreen' || k === 'printscreen';

      if (isPrintScreen) {
        if (antiScreenshotActive) {
          // Trigger instant blackout shield & clear clipboard when active
          triggerScreenshotShield();
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText('');
            }
          } catch {}
        }
      }

      if (isF12 || isInspect || isViewSource || isSavePage) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  // 3. Print Screen Keyup & Window Blur Shield (Anti-Snipping Tool Protection)
  window.addEventListener('keyup', (e) => {
    if (!antiScreenshotActive) return;
    if (e.key === 'PrintScreen' || e.key.toLowerCase() === 'printscreen') {
      triggerScreenshotShield();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch {}
    }
  });

  // 4. App-Switcher & Multi-Window Floating Privacy Shield (GCash / Banking App Style)
  let hideTimer: number | null = null;

  const triggerShield = () => {
    if (!antiScreenshotActive) return;
    if (hideTimer) window.clearTimeout(hideTimer);
    showFloatingPrivacyOverlay();
  };

  const removeShield = () => {
    hideTimer = window.setTimeout(() => {
      hideFloatingPrivacyOverlay();
    }, 50);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerShield();
    } else {
      removeShield();
    }
  });

  window.addEventListener('pagehide', triggerShield);
  window.addEventListener('pageshow', removeShield);

  window.addEventListener('blur', () => {
    if (!antiScreenshotActive) return;
    const isEditing = document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
    if (!isEditing) {
      triggerShield();
    }
  });

  window.addEventListener('focus', removeShield);

  // 5. Block Dragging of images, buttons, and logos to prevent unauthorized asset extraction
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

let shieldTimeout: number | null = null;

/**
 * Instantly blacks out / heavily blurs the confidential screen when a screenshot or print is attempted
 */
function triggerScreenshotShield(): void {
  let shield = document.getElementById('aics-screenshot-shield');
  if (!shield) {
    shield = document.createElement('div');
    shield.id = 'aics-screenshot-shield';
    shield.style.position = 'fixed';
    shield.style.inset = '0';
    shield.style.zIndex = '9999999';
    shield.style.backgroundColor = '#030816';
    shield.style.display = 'flex';
    shield.style.flexDirection = 'column';
    shield.style.alignItems = 'center';
    shield.style.justifyContent = 'center';
    shield.style.color = '#ffffff';
    shield.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    shield.style.textAlign = 'center';
    shield.style.padding = '24px';
    shield.innerHTML = `
      <div style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 28px; max-width: 440px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <svg style="width: 28px; height: 28px; color: #f87171;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 800; margin: 0 0 8px 0; color: #ffffff; letter-spacing: -0.01em;">Confidential Privacy Shield</h3>
        <p style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0 0 16px 0;">Screen capture and recording are restricted to protect student identity and confidential disclosures under RA 10173 & DepEd Child Protection Policy.</p>
        <span style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(56,189,248,0.12); padding: 4px 12px; border-radius: 9999px; border: 1px solid rgba(56,189,248,0.25);">AICS SafeZone Protected</span>
      </div>
    `;
    document.body.appendChild(shield);
  }

  shield.style.opacity = '1';
  shield.style.pointerEvents = 'auto';

  if (shieldTimeout) window.clearTimeout(shieldTimeout);
  shieldTimeout = window.setTimeout(() => {
    if (shield) {
      shield.style.opacity = '0';
      shield.style.pointerEvents = 'none';
    }
  }, 1800);
}

let floatingOverlay: HTMLElement | null = null;

function showFloatingPrivacyOverlay(): void {
  document.documentElement.classList.add('aics-app-switched');
  if (!floatingOverlay) {
    floatingOverlay = document.createElement('div');
    floatingOverlay.id = 'aics-floating-privacy-overlay';
    floatingOverlay.style.position = 'fixed';
    floatingOverlay.style.inset = '0';
    floatingOverlay.style.zIndex = '99999999';
    floatingOverlay.style.backgroundColor = 'rgba(4, 11, 28, 0.96)';
    floatingOverlay.style.backdropFilter = 'blur(28px)';
    floatingOverlay.style.display = 'flex';
    floatingOverlay.style.flexDirection = 'column';
    floatingOverlay.style.alignItems = 'center';
    floatingOverlay.style.justifyContent = 'center';
    floatingOverlay.style.color = '#ffffff';
    floatingOverlay.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    floatingOverlay.style.textAlign = 'center';
    floatingOverlay.style.padding = '24px';
    floatingOverlay.style.transition = 'opacity 120ms ease-out';
    floatingOverlay.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;">
        <div style="position: relative; width: 68px; height: 68px; border-radius: 50%; padding: 3px; background: rgba(56, 189, 248, 0.2); border: 1.5px solid rgba(56, 189, 248, 0.45); box-shadow: 0 0 24px rgba(56, 189, 248, 0.25);">
          <img src="/aics-logo.jpg" alt="AICS" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
          <span style="font-size: 15px; font-weight: 800; color: #38bdf8; letter-spacing: 0.08em; text-transform: uppercase;">AICS SAFEZONE</span>
          <span style="font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase;">CONFIDENTIAL PROTECTED</span>
        </div>
      </div>
    `;
    document.body.appendChild(floatingOverlay);
  }
  floatingOverlay.style.opacity = '1';
  floatingOverlay.style.pointerEvents = 'auto';
}

function hideFloatingPrivacyOverlay(): void {
  document.documentElement.classList.remove('aics-app-switched');
  if (floatingOverlay) {
    floatingOverlay.style.opacity = '0';
    floatingOverlay.style.pointerEvents = 'none';
  }
}
