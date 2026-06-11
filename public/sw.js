// Self-destructing service worker.
// This file exists solely to unregister any previously installed SW
// that is causing infinite reload loops in development.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister().then(() => {
    self.clients.matchAll({ type: 'window' }).then(clients => {
      for (const client of clients) {
        client.navigate(client.url);
      }
    });
  });
});
