// Blocks right-click and the inspect shortcuts (desktop app and student portal).
// - Right-click stays allowed inside text boxes, so staff and students can still copy and paste.
// - Inspect shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U) are blocked only in real builds; while developing they work.
// This only discourages casual inspecting. Real protection is on the server (Row Level Security, Edge Functions).

const isTextBox = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t || !t.closest) return false;
  return !!t.closest('input, textarea, [contenteditable="true"]');
};

let installed = false;

export function installNoInspect(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener(
    'contextmenu',
    (e) => {
      if (!isTextBox(e.target)) e.preventDefault();
    },
    true,
  );

  if (import.meta.env.DEV) return; // keep the developer tools while building the app
  window.addEventListener(
    'keydown',
    (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const blocked = k === 'f12' || (ctrl && e.shiftKey && (k === 'i' || k === 'j' || k === 'c')) || (ctrl && k === 'u');
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
}
