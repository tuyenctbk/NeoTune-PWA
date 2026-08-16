import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { audioEngine } from './services/audioEngine';
import { diagnosticsService } from './services/diagnosticsService';

// Register Service Worker for PWA with catch-all error handler
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] ServiceWorker registered successfully with scope:', registration.scope);
        diagnosticsService.log('info', 'pwa', `ServiceWorker registered with scope: ${registration.scope}`);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[SW] New PWA content available');
                  diagnosticsService.log('info', 'pwa', 'New PWA service worker installed and ready');
                } else {
                  console.log('[SW] Content cached for offline use');
                  diagnosticsService.log('info', 'pwa', 'ServiceWorker caching complete for offline use');
                }
              }
            };
          }
        };
      })
      .catch((err) => {
        console.warn('[SW] ServiceWorker registration catch-all handled:', err);
        diagnosticsService.log('warn', 'pwa', 'ServiceWorker registration catch-all handled: ' + (err?.message || String(err)));
      });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] ServiceWorker controller changed');
      diagnosticsService.log('info', 'pwa', 'ServiceWorker controller updated');
    });
  });
}

// Catch-all handler for PWA network connectivity transitions
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[PWA] Network connectivity transition: ONLINE detected. Re-initializing audio context & stream...');
    diagnosticsService.log('info', 'network', 'Network connectivity restored (online event). Triggering Audio Engine re-initialization...');
    audioEngine.handleNetworkRecovery().catch((e) => console.warn('Network recovery error:', e));
  });

  window.addEventListener('offline', () => {
    console.log('[PWA] Network connectivity transition: OFFLINE detected.');
    diagnosticsService.log('warn', 'network', 'Network connection lost (offline). Audio stream may pause or buffer.');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


