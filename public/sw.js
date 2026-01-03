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
    console.log('[SW] 🔔 Push event received at', new Date().toISOString());
    
    let data = {};
    let notificationTitle = 'New Message';
    let notificationOptions = {};
    
    try {
        if (event.data) {
            data = event.data.json();
            console.log('[SW] Push data parsed:', JSON.stringify(data));
            notificationTitle = data.title || 'New Message';
        } else {
            console.warn('[SW] Push event has no data, using defaults');
            data = {
                title: 'New Message',
                body: 'You have a new message',
            };
        }
    } catch (error) {
        console.error('[SW] ⚠️ Error parsing push data:', error);
        data = {
            title: 'New Message',
            body: 'You have a new message',
        };
        notificationTitle = 'New Message';
    }
    
    // Get the origin from the service worker location
    const origin = self.location.origin;
    console.log('[SW] Origin:', origin);
    
    // Prepare notification options with all required fields
    notificationOptions = {
        body: data.body || 'You have a new message',
        icon: data.icon || `${origin}/images/logo192.png`,
        badge: data.badge || `${origin}/images/favicon-96x96.png`,
        vibrate: [200, 100, 200],
        tag: data.data?.roomId ? `chat-${data.data.roomId}` : `notification-${Date.now()}`,
        requireInteraction: false, // Auto-dismiss after a few seconds
        silent: false, // Play system sound
        renotify: true, // Notify even if same tag exists
        timestamp: Date.now(),
        actions: [
            {
                action: 'open',
                title: 'Open Chat'
            },
            {
                action: 'close',
                title: 'Dismiss'
            }
        ],
        data: {
            dateOfArrival: Date.now(),
            url: data.data?.url || '/messages',
            roomId: data.data?.roomId,
            timestamp: data.data?.timestamp
        }
    };

    console.log('[SW] Showing notification:', notificationTitle);
    console.log('[SW] Notification options:', JSON.stringify(notificationOptions));

    // CRITICAL: Use event.waitUntil to ensure notification is shown even if browser is closed
    event.waitUntil(
        self.registration.showNotification(notificationTitle, notificationOptions)
            .then(() => {
                console.log('[SW] ✓ Notification shown successfully at', new Date().toISOString());
            })
            .catch(error => {
                console.error('[SW] ✗ CRITICAL: Failed to show notification:', error);
                console.error('[SW] Error details:', error.message, error.stack);
                
                // Fallback: Try showing a basic notification
                return self.registration.showNotification('New Message', {
                    body: 'You have a new message',
                    icon: `${origin}/images/logo192.png`,
                    tag: 'fallback-notification'
                }).catch(fallbackError => {
                    console.error('[SW] ✗ Even fallback notification failed:', fallbackError);
                });
            })
    );
});

self.addEventListener('notificationclick', function (event) {
    console.log('[SW] 👆 Notification clicked at', new Date().toISOString());
    console.log('[SW] Action:', event.action);
    console.log('[SW] Notification data:', event.notification.data);
    
    // Close notification
    event.notification.close();

    // Handle different actions
    if (event.action === 'close') {
        console.log('[SW] User dismissed notification');
        return;
    }

    // Determine URL to open
    const urlToOpen = event.notification.data?.url 
        ? new URL(event.notification.data.url, self.location.origin).href
        : new URL('/messages', self.location.origin).href;
    const roomId = event.notification.data?.roomId;

    console.log('[SW] Target URL:', urlToOpen);
    console.log('[SW] Room ID:', roomId);

    // CRITICAL: Use event.waitUntil to ensure window opens even if browser was closed
    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients) => {
            console.log('[SW] Found', windowClients.length, 'window client(s)');
            
            // Try to find an existing window from our app
            let clientToUse = null;
            
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                console.log('[SW] Checking client:', client.url);
                // Focus any window from our app
                if (client.url.includes(self.location.origin)) {
                    clientToUse = client;
                    break;
                }
            }

            if (clientToUse) {
                console.log('[SW] ✓ Found existing window, focusing it');
                // Focus the window first
                return clientToUse.focus().then(client => {
                    console.log('[SW] Focused client, posting message to navigate');
                    // Use postMessage instead of navigate() to avoid service worker activation errors
                    // The client will handle navigation via message listener
                    client.postMessage({
                        type: 'NAVIGATE_TO_URL',
                        url: urlToOpen,
                        roomId: roomId
                    });
                    console.log('[SW] ✓ Message posted to client for navigation');
                    return client;
                }).catch(focusError => {
                    console.error('[SW] Focus failed:', focusError);
                    // If focus fails, open a new window instead
                    console.log('[SW] Opening new window as fallback');
                    return self.clients.openWindow(urlToOpen);
                });
            } else {
                console.log('[SW] ✓ No existing window, opening new one:', urlToOpen);
                // Open new window
                return self.clients.openWindow(urlToOpen).then(client => {
                    console.log('[SW] ✓ New window opened successfully');
                    return client;
                }).catch(openError => {
                    console.error('[SW] ✗ Failed to open window:', openError);
                    throw openError;
                });
            }
        })
    );
});

// Fetch event handler - network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip unsupported schemes (chrome-extension, blob, data, etc.)
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        return;
    }
    
    // Skip navigation requests (page loads) - let them go straight to network
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request));
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
    
    // Only cache static assets (js, css, images, fonts, etc.)
    const staticAssetExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.woff', '.woff2', '.ttf', '.ico'];
    const isStaticAsset = staticAssetExtensions.some(ext => url.pathname.endsWith(ext));
    
    if (!isStaticAsset) {
        // Not a static asset, fetch from network
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
                    }).catch(err => {
                        console.log('[SW] Cache put failed:', err);
                    });
                    
                    return response;
                }).catch(error => {
                    console.log('[SW] Fetch failed:', error);
                    throw error;
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
