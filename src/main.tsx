import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { initSync, isSyncConfigured } from './services/syncService';
import './ui/theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Boot the (optional) sync machine. PKCE returns ?code= in the query — once
// consumed, strip it so reloads and the hash router stay clean.
if (isSyncConfigured()) {
  initSync()
    .then(() => {
      if (window.location.search) {
        history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
    })
    .catch(() => {
      /* sync is optional; the app never blocks on it */
    });
}

// PWA: registration must never break the app (or the single-file demo build,
// which has no separate sw.js to serve).
if (import.meta.env.PROD && !import.meta.env.BUILD_SINGLE) {
  try {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
      });
    }
  } catch {
    /* no service worker support: fine */
  }
}
