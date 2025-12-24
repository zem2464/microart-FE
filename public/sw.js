/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    // Take control immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    // Take control of all clients immediately
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function (event) {
    console.log('[SW] Push event received', event);
    
    let data = {};
    
    try {
        if (event.data) {
            data = event.data.json();
            console.log('[SW] Push data:', data);
        } else {
            console.log('[SW] Push event has no data');
            data = {
                title: 'New Notification',
                body: 'You have a new message',
            };
        }
    } catch (error) {
        console.error('[SW] Error parsing push data:', error);
        data = {
            title: 'New Notification',
            body: 'You have a new message',
        };
    }
    
    // Get the origin from the service worker location
    const origin = self.location.origin;
    
    const options = {
        body: data.body || 'You have a new message',
        icon: data.icon || `${origin}/images/logo192.png`,
        badge: data.badge || `${origin}/images/favicon-96x96.png`,
        vibrate: [200, 100, 200],
        tag: data.data?.roomId || `notification-${Date.now()}`,
        requireInteraction: false,
        silent: false,
        renotify: true,
        data: {
            dateOfArrival: Date.now(),
            url: data.data?.url || '/',
            roomId: data.data?.roomId
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
            .then(() => console.log('[SW] Notification shown successfully'))
            .catch(error => console.error('[SW] Error showing notification:', error))
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
    const roomId = event.notification.data.roomId;

    const promiseChain = self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        // Try to find an existing window
        let clientToUse = null;
        
        for (let i = 0; i < windowClients.length; i++) {
            const client = windowClients[i];
            // Focus any window from our app
            if (client.url.includes(self.location.origin)) {
                clientToUse = client;
                break;
            }
        }

        if (clientToUse) {
            // Focus the window and send message to open chat
            return clientToUse.focus().then(client => {
                if (roomId) {
                    client.postMessage({
                        type: 'OPEN_CHAT',
                        roomId: roomId
                    });
                }
                return client;
            });
        } else {
            // Open new window
            return self.clients.openWindow(urlToOpen);
        }
    });

    event.waitUntil(promiseChain);
});

// Fetch event handler - network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // For GraphQL/API requests - network first
    if (url.pathname.includes('/graphql') || url.pathname.includes('/api')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return new Response(
                        JSON.stringify({ errors: [{ message: 'Network error - offline' }] }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }
    
    // For static assets - cache first, fallback to network
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request).then((response) => {
                    // Cache valid responses
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }
                    
                    const responseToCache = response.clone();
                    caches.open('microart-v1').then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    
                    return response;
                });
            })
    );
});

// Message event handler - for communication from app
self.addEventListener('message', (event) => {
    console.log('[SW] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            })
        );
    }
});
