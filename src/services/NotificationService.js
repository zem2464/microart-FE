import { notification } from 'antd';
import { MessageOutlined } from '@ant-design/icons';
import { SAVE_PUSH_SUBSCRIPTION } from '../graphql/userQueries';

/**
 * Notification Service
 * Handles all notification-related functionality for the chat system
 */
class NotificationService {
    constructor() {
        this.isEnabled = true;
        this.soundEnabled = true;
        this.audioContext = null;
        this.isAudioContextInitialized = false;
    }

    /**
     * Initialize or resume AudioContext (must be called after user gesture)
     * Handles all AudioContext states: running, suspended, closed
     * Creates new context if closed or failed
     */
    async initAudioContext() {
        try {
            // Check if AudioContext exists and handle its state
            if (this.audioContext) {
                const state = this.audioContext.state;
                
                // If closed, we need to create a new one
                if (state === 'closed') {
                    console.log('[NotificationService] AudioContext closed, creating new one');
                    this.audioContext = null;
                    this.isAudioContextInitialized = false;
                    // Fall through to create new context
                } 
                // If suspended, try to resume
                else if (state === 'suspended') {
                    console.log('[NotificationService] Resuming suspended AudioContext');
                    await this.audioContext.resume();
                    
                    // Verify it actually resumed
                    if (this.audioContext.state === 'running') {
                        return this.audioContext;
                    } else {
                        console.warn('[NotificationService] AudioContext failed to resume, recreating');
                        this.audioContext = null;
                        this.isAudioContextInitialized = false;
                    }
                }
                // If running, return it
                else if (state === 'running') {
                    return this.audioContext;
                }
            }

            // Create new AudioContext
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('[NotificationService] AudioContext not supported in this browser');
                return null;
            }

            this.audioContext = new AudioContext();
            console.log('[NotificationService] AudioContext created, state:', this.audioContext.state);
            
            // Resume if it starts suspended (some browsers do this)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.isAudioContextInitialized = true;
            return this.audioContext;
            
        } catch (error) {
            console.error('[NotificationService] AudioContext initialization failed:', error);
            this.audioContext = null;
            this.isAudioContextInitialized = false;
            return null;
        }
    }

    /**
     * Play notification sound
     * Implements a professional "Glass" / "Pop" sound
     * With robust fallback mechanisms
     */
    async playSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = await this.initAudioContext();
            if (!audioContext || audioContext.state !== 'running') {
                console.warn('[NotificationService] AudioContext not available, trying fallback');
                this.playFallbackSound();
                return;
            }

            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // "Glass" / "Pop" sound - Professional & Subtle
            // Sine wave starting high and dropping fast
            oscillator.type = 'sine';

            const now = audioContext.currentTime;

            // Pitch: 800Hz -> 300Hz (Fast drop creates the "pop/glass" effect)
            oscillator.frequency.setValueAtTime(800, now);
            oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.15);

            // Envelope: Fast attack, quick decay (percussive)
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02); // Soft attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); // Quick fade

            oscillator.start(now);
            oscillator.stop(now + 0.3);
        } catch (error) {
            console.warn('[NotificationService] AudioContext playSound failed, using fallback:', error);
            this.playFallbackSound();
        }
    }

    /**
     * Fallback sound using HTML5 Audio API
     * More reliable but less customizable
     */
    playFallbackSound() {
        try {
            // Create a short beep sound using data URI
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAg+ltzy0H8pBS18y/DbjUALEmK37OmkUhELTKXh8bllHAU2jdXzxoExBSF2xPDblEILFGG37eeiUhIKSqPi8bllHQU2jNbzxoExBSF2xPDbk0ILFGK27eehUhELTKPi8bhmHAU1jdXzxoExBSF2xPDblEILFGG37OiiUhELTKPi8bhkHAU2jdXzxoAxBSF2xO/bk0ILFGG37OiiUhILTKPi8bdmHAU2jNXzxoExBSJ2xO/bk0MKFGCx7eiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bkkMLFGG37OiiUhILTKPi8bhmHAU2jNXzxoExBSF2xO/bk0MKFGCw7eijUhELSqPi8bhlHAU3jNXzxoAxBSF2xO/bk0MKFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0MKFGCw7OijUhELSqPi8bhlHAU3jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSJ2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OiiUhILSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoExBSJ2xO/bk0ILFGCx7OijUhILSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSJ2xO/bk0ILFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSJ2xO/bk0ILFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSJ2xO/bk0ILFGCw7eijUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoExBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OiiUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXzxoAxBSF2xO/bk0ILFGCx7OijUhELSqPi8bhlHQU2jNXz');
            audio.volume = 0.3;
            audio.play().catch(err => {
                console.warn('[NotificationService] Fallback sound also failed:', err);
            });
        } catch (error) {
            console.warn('[NotificationService] Fallback sound failed:', error);
        }
    }

    /**
     * Play task notification sound
     * Implements a distinct "Success Chime" sound for task notifications
     * With robust fallback mechanisms
     */
    async playTaskSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = await this.initAudioContext();
            if (!audioContext || audioContext.state !== 'running') {
                console.warn('[NotificationService] AudioContext not available for task sound, trying fallback');
                this.playFallbackSound();
                return;
            }

            const now = audioContext.currentTime;

            // Create two oscillators for a pleasant chime
            const osc1 = audioContext.createOscillator();
            const osc2 = audioContext.createOscillator();
            const gainNode1 = audioContext.createGain();
            const gainNode2 = audioContext.createGain();

            osc1.connect(gainNode1);
            osc2.connect(gainNode2);
            gainNode1.connect(audioContext.destination);
            gainNode2.connect(audioContext.destination);

            // First note: C note (523.25 Hz)
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gainNode1.gain.setValueAtTime(0, now);
            gainNode1.gain.linearRampToValueAtTime(0.15, now + 0.02);
            gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

            // Second note: E note (659.25 Hz) - creates a pleasant harmony
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, now + 0.08);
            gainNode2.gain.setValueAtTime(0, now + 0.08);
            gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.1);
            gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc1.start(now);
            osc1.stop(now + 0.4);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.5);
        } catch (error) {
            console.warn('[NotificationService] Task sound failed, using fallback:', error);
            this.playFallbackSound();
        }
    }

    /**
     * Play custom sound from file
     * @param {string} soundUrl - URL to sound file
     */
    playCustomSound(soundUrl) {
        if (!this.soundEnabled) return;

        try {
            const audio = new Audio(soundUrl);
            audio.volume = 0.5;
            audio.play().catch(err => console.log('Sound play failed:', err));
        } catch (error) {
            console.log('Could not play custom sound:', error);
        }
    }

    /**
     * Show notification popup
     * @param {Object} options - Notification options
     */
    showNotification({ sender, message, onClick, roomId, title, description, type, icon }) {
        if (!this.isEnabled) return;

        notification.open({
            message: title || `New message from ${sender?.firstName || 'Unknown'}`,
            description: description || message?.content || message,
            icon: icon || <MessageOutlined style={{ color: '#1890ff' }} />,
            placement: 'topRight',
            duration: 4.5,
            onClick: () => {
                if (onClick) {
                    onClick(roomId);
                }
            }
        });
    }

    /**
     * Show task assignment notification
     * @param {Object} options - Notification options
     * @param {string} options.title - Notification title
     * @param {string} options.message - Notification message
     * @param {string} options.projectId - Project ID to navigate to
     * @param {Function} options.onNavigate - Callback to navigate to project
     */
    showTaskNotification({ title, message, projectId, onNavigate }) {
        if (!this.isEnabled) return;

        notification.open({
            message: title || 'Task Assignment',
            description: message,
            icon: <MessageOutlined style={{ color: '#1890ff' }} />,
            placement: 'topRight',
            duration: 6,
            onClick: () => {
                if (onNavigate && projectId) {
                    onNavigate(projectId);
                }
            },
            style: {
                cursor: 'pointer',
                backgroundColor: '#ffffff',
                border: '1px solid #d9d9d9',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                borderRadius: '4px'
            }
        });
    }

    /**
     * Show system notification (browser notification API)
     * Requires user permission
     * Works even when tab is not focused, minimized, or in background
     */
    async showBrowserNotification({ title, body, icon, badge, tag, requireInteraction, data }) {
        if (!this.isEnabled) return;

        try {
            // Request permission if not granted
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                console.log('[NotificationService] Permission requested:', permission);
            }

            if (Notification.permission !== 'granted') {
                console.warn('[NotificationService] Notification permission not granted');
                return;
            }

            // Try to use Service Worker notification API first (more reliable for background)
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration) {
                        console.log('[NotificationService] Showing notification via Service Worker');
                        await registration.showNotification(title, {
                            body,
                            icon: icon || '/images/logo192.png',
                            badge: badge || '/images/favicon-96x96.png',
                            tag: tag || `notification-${Date.now()}`,
                            requireInteraction: requireInteraction || false,
                            vibrate: [200, 100, 200],
                            renotify: true,
                            silent: false,
                            data: data || {}
                        });
                        return;
                    }
                } catch (swError) {
                    console.warn('[NotificationService] Service Worker notification failed:', swError);
                    // Fall back to regular Notification API
                }
            }

            // Fallback to regular Notification API
            console.log('[NotificationService] Showing notification via Notification API');
            const notification = new Notification(title, {
                body,
                icon: icon || '/images/logo192.png',
                badge: badge || '/images/favicon-96x96.png',
                tag: tag || `notification-${Date.now()}`,
                requireInteraction: requireInteraction || false,
                data: data || {}
            });

            // Handle notification click
            notification.onclick = () => {
                window.focus();
                if (data?.url) {
                    window.location.href = data.url;
                }
                notification.close();
            };
        } catch (error) {
            console.error('[NotificationService] Error showing browser notification:', error);
        }
    }

    /**
     * Handle incoming message notification
     */
    notifyNewMessage({ message, sender, roomId, onOpen }) {
        // Play sound
        this.playSound();

        // Show Ant Design notification
        this.showNotification({
            sender,
            message,
            roomId,
            onClick: onOpen
        });

        // Show browser notification if user is not on the page
        if (document.hidden) {
            this.showBrowserNotification({
                title: `New message from ${sender?.firstName || 'Unknown'}`,
                body: message?.content || message
            });
        }
    }

    /**
     * Enable/disable all notifications
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    /**
     * Enable/disable sound
     */
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
    }

    /**
     * Request browser notification permission
     */
    async requestPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }

    /**
     * Register Service Worker and Push Subscription
     * CRITICAL: This enables notifications even when browser is closed
     * @param {ApolloClient} client - Apollo Client instance to save subscription
     */
    async registerPushSubscription(client) {
        console.log('[NotificationService] 🔔 Starting push subscription registration...');
        console.log('[NotificationService] Timestamp:', new Date().toISOString());
        
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.error('[NotificationService] ✗ Push messaging is NOT supported in this browser.');
            console.error('[NotificationService] Browser:', navigator.userAgent);
            return;
        }

        console.log('[NotificationService] ✓ Browser supports Service Worker and Push API');

        try {
            // Step 1: Register or get existing service worker
            let registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                console.log('[NotificationService] No SW registration found, registering /sw.js...');
                registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('[NotificationService] ✓ Service Worker registered');
            } else {
                console.log('[NotificationService] ✓ Service Worker already registered');
            }
            
            // Step 2: Wait for service worker to be ready
            console.log('[NotificationService] Waiting for SW to be ready...');
            registration = await navigator.serviceWorker.ready;
            console.log('[NotificationService] ✓ Service Worker ready, scope:', registration.scope);

            // Ensure SW is active
            if (registration.installing) {
                console.log('[NotificationService] Service Worker is installing, waiting...');
                await new Promise((resolve) => {
                    registration.installing.addEventListener('statechange', function() {
                        if (this.state === 'activated') {
                            console.log('[NotificationService] ✓ Service Worker activated');
                            resolve();
                        }
                    });
                });
            } else if (registration.waiting) {
                console.log('[NotificationService] Service Worker is waiting, activating...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (registration.active) {
                console.log('[NotificationService] ✓ Service Worker is active');
            }

            // Step 3: Request Notification Permission (CRITICAL)
            console.log('[NotificationService] Current permission:', Notification.permission);
            
            if (Notification.permission === 'default') {
                console.log('[NotificationService] Requesting notification permission...');
                const permission = await Notification.requestPermission();
                console.log('[NotificationService] Permission result:', permission);
            }

            if (Notification.permission !== 'granted') {
                console.error('[NotificationService] ✗ Notification permission DENIED or dismissed');
                console.error('[NotificationService] Push notifications will NOT work!');
                console.error('[NotificationService] Please grant permission in browser settings');
                return;
            }

            console.log('[NotificationService] ✓ Notification permission GRANTED');

            // Step 4: Get VAPID key
            const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            console.log('[NotificationService] VAPID key present:', !!vapidPublicKey);

            if (!vapidPublicKey) {
                console.error('[NotificationService] ✗ VAPID Public Key NOT found!');
                console.error('[NotificationService] Set REACT_APP_VAPID_PUBLIC_KEY in frontend .env file');
                console.error('[NotificationService] Push notifications will NOT work!');
                return;
            }

            // Step 5: Subscribe to push notifications
            let subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                console.log('[NotificationService] ✓ Existing push subscription found');
                console.log('[NotificationService] Endpoint:', subscription.endpoint);
            } else {
                console.log('[NotificationService] Creating new push subscription...');
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
                console.log('[NotificationService] ✓ Push subscription created!');
                console.log('[NotificationService] Endpoint:', subscription.endpoint);
            }

            // Step 6: Save subscription to backend (CRITICAL)
            if (client && subscription) {
                console.log('[NotificationService] Saving subscription to backend...');
                const result = await client.mutate({
                    mutation: SAVE_PUSH_SUBSCRIPTION,
                    variables: {
                        subscription: subscription
                    }
                });
                
                if (result.data?.savePushSubscription) {
                    console.log('[NotificationService] ✓✓✓ Push subscription saved to backend SUCCESSFULLY!');
                    console.log('[NotificationService] ✓ Notifications will work even when browser is closed');
                } else {
                    console.error('[NotificationService] ✗ Failed to save subscription to backend');
                    console.error('[NotificationService] Push notifications may not work properly');
                }
            } else if (!subscription) {
                console.error('[NotificationService] ✗ CRITICAL: Failed to create subscription!');
            }

            console.log('[NotificationService] ✓ Push notification setup COMPLETE');
            console.log('[NotificationService] ========================================');

        } catch (error) {
            console.error('[NotificationService] ✗✗✗ CRITICAL ERROR during push subscription:', error);
            console.error('[NotificationService] Error name:', error.name);
            console.error('[NotificationService] Error message:', error.message);
            console.error('[NotificationService] Error stack:', error.stack);
            console.error('[NotificationService] Push notifications will NOT work!');
        }
    }
}

// Utility to convert VAPID key
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// Export singleton instance
const notificationService = new NotificationService();

// Initialize AudioContext on first user interaction (required by browsers)
const initAudioOnInteraction = () => {
    notificationService.initAudioContext().then(() => {
        console.log('AudioContext initialized after user interaction');
    }).catch((error) => {
        console.log('Failed to initialize AudioContext:', error);
    });
};

// Add listeners for user interactions after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', initAudioOnInteraction, { once: true });
        document.addEventListener('keydown', initAudioOnInteraction, { once: true });
        document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
    });
} else {
    // DOM is already ready
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    document.addEventListener('keydown', initAudioOnInteraction, { once: true });
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });
}

// Expose for debugging
window.notificationService = notificationService;

// Debugging utilities
window.testNotification = () => {
    notificationService.showBrowserNotification({
        title: 'Test Notification',
        body: 'If you see this, browser notifications are working!',
        icon: '/images/logo192.png'
    });
};

window.testSound = () => {
    notificationService.playSound();
};

window.checkPushSubscription = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
            console.log('✓ Push subscription EXISTS');
            console.log('Endpoint:', subscription.endpoint);
            console.log('Keys:', { p256dh: !!subscription.getKey('p256dh'), auth: !!subscription.getKey('auth') });
            return true;
        } else {
            console.error('✗ NO push subscription found');
            console.error('Please reload the page and grant notification permission');
            return false;
        }
    } catch (error) {
        console.error('✗ Error checking subscription:', error);
        return false;
    }
};

window.testPushFromConsole = async (apolloClient) => {
    console.log('🔔 Testing push notification...');
    console.log('Make sure Apollo Client is available');
    
    if (!apolloClient) {
        console.error('✗ Apollo Client not provided');
        console.error('Usage: window.testPushFromConsole(client)');
        return;
    }

    const hasSubscription = await window.checkPushSubscription();
    if (!hasSubscription) {
        return;
    }

    try {
        const { default: client } = apolloClient;
        const mutation = await import('../graphql/testPush.js');
        
        const result = await client.mutate({
            mutation: mutation.TEST_PUSH_NOTIFICATION,
            variables: {
                title: 'Test from Console',
                body: 'This is a test push notification'
            }
        });

        if (result.data?.testPushNotification) {
            console.log('✓ Test push notification sent successfully!');
            console.log('Check if you received a notification');
        } else {
            console.error('✗ Failed to send test notification');
        }
    } catch (error) {
        console.error('✗ Error sending test notification:', error);
    }
};

console.log('');
console.log('🔔 Push Notification Debug Utilities:');
console.log('  window.testNotification()           - Test browser notification');
console.log('  window.testSound()                  - Test notification sound');
console.log('  window.checkPushSubscription()      - Check if push subscription exists');
console.log('  window.testPushFromConsole(client)  - Send test push (needs Apollo Client)');
console.log('');

export default notificationService;
