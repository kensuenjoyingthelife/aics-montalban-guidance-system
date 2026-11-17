import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installStaffAuthFetch } from './services/staffAuth';

// every database request from the staff app carries the signed-in staff token (Supabase Auth)
installStaffAuthFetch();
// fonts are bundled with the app (works offline and inside Tauri)
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './index.css';
import { applyTextSize } from './services/textSize';

// apply the saved text size before the first paint (no jump)
applyTextSize();

// AGENTS.md §3.2: weak school laptops / phones get instant (no-animation) UI
try {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const weak = (nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2;
  if (weak || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('lite');
  }
} catch {
  /* old WebView: keep defaults */
}

// Register Service Worker for PWA Offline & Background Notifications
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => {
        console.log('AICS SafeZone PWA Service Worker registered:', reg.scope);
      },
      (err) => {
        console.warn('PWA Service Worker registration failed:', err);
      }
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
