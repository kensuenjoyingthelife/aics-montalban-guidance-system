import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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
