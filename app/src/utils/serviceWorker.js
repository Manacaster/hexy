// HEXY.PRO App - /app/src/utils/serviceWorker.js - Utility function to register a service worker for the app.
 

import { say } from './debug';

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
        say('ServiceWorker registration successful', registration.scope);
      }, function(err) {
        say('ServiceWorker registration failed', err);
      });
    });
  }
}
