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
     */
    async initAudioContext() {
        // Return early if already initialized and running
        if (this.audioContext) {
            try {
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                }
                return this.audioContext;
            } catch (error) {
                console.log('Could not resume AudioContext:', error);
                return null;
            }
        }

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return null;

            this.audioContext = new AudioContext();
            this.isAudioContextInitialized = true;

            // Only try to resume if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            return this.audioContext;
        } catch (error) {
            console.log('Could not initialize AudioContext:', error);
            return null;
        }
    }

    /**
     * Play notification sound
     * Implements a professional "Glass" / "Pop" sound
     */
    async playSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = await this.initAudioContext();
            if (!audioContext) {
                console.log('AudioContext not available, notification will be silent');
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
            console.log('Could not play notification sound:', error);
        }
    }

    /**
     * Play task notification sound
     * Implements a distinct "Success Chime" sound for task notifications
     */
    async playTaskSound() {
        if (!this.soundEnabled) return;

        try {
            const audioContext = await this.initAudioContext();
            if (!audioContext) {
                console.log('AudioContext not available, notification will be silent');
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
            console.log('Could not play task notification sound:', error);
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
     */
    async showBrowserNotification({ title, body, icon }) {
        if (!this.isEnabled || !('Notification' in window)) return;

        // Request permission if not granted
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        if (Notification.permission === 'granted') {
            new Notification(title, {
                body,
                icon: icon || '/images/logo192.png',
                badge: '/images/favicon-96x96.png'
            });
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
     * @param {ApolloClient} client - Apollo Client instance to save subscription
     */
    async registerPushSubscription(client) {
        console.log('[NotificationService] Starting push subscription registration...');
        
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('[NotificationService] Push messaging is not supported in this browser.');
            return;
        }

        try {
            // Register or get existing service worker
            let registration = await navigator.serviceWorker.getRegistration();
            
            if (!registration) {
                console.log('[NotificationService] No SW registration found, registering /sw.js...');
                registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('[NotificationService] Service Worker registered, waiting for ready state...');
            }
            
            // Wait for service worker to be ready
            await navigator.serviceWorker.ready;
            console.log('[NotificationService] Service Worker ready with scope:', registration.scope);

            // Ensure SW is active
            if (registration.installing) {
                console.log('[NotificationService] Service Worker is installing...');
                await new Promise((resolve) => {
                    registration.installing.addEventListener('statechange', function() {
                        if (this.state === 'activated') {
                            resolve();
                        }
                    });
                });
            } else if (registration.waiting) {
                console.log('[NotificationService] Service Worker is waiting...');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            } else if (registration.active) {
                console.log('[NotificationService] Service Worker is active');
            }

            // Request Permission first
            const permission = await this.requestPermission();
            console.log('[NotificationService] Notification permission:', permission);

            if (permission !== 'granted') {
                console.warn('[NotificationService] Notification permission was denied or dismissed');
                return;
            }

            // Get VAPID key
            const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            console.log('[NotificationService] VAPID key present:', !!vapidPublicKey);

            if (!vapidPublicKey) {
                console.error('[NotificationService] VAPID Public Key not found. Set REACT_APP_VAPID_PUBLIC_KEY in .env file.');
                return;
            }

            // Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (subscription) {
                console.log('[NotificationService] Existing push subscription found:', subscription.endpoint);
                console.log('[NotificationService] Re-verifying subscription with backend...');
            } else {
                console.log('[NotificationService] Creating new push subscription...');
                const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: convertedVapidKey
                });
                console.log('[NotificationService] Push subscription created:', subscription.endpoint);
            }

            // Always send/update subscription to backend (in case it was cleared from DB)
            if (client && subscription) {
                await client.mutate({
                    mutation: SAVE_PUSH_SUBSCRIPTION,
                    variables: {
                        subscription: subscription
                    }
                });
                console.log('[NotificationService] Push subscription saved to backend successfully');
            } else if (!subscription) {
                console.error('[NotificationService] Failed to create subscription!');
            }

        } catch (error) {
            console.error('[NotificationService] Error registering push subscription:', error);
            if (error.message) {
                console.error('[NotificationService] Error message:', error.message);
            }
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

window.testNotification = () => {
    notificationService.showBrowserNotification({
        title: 'Test Notification',
        body: 'If you see this, browser notifications are working!',
        icon: '/logo192.png'
    });
};

window.testSound = () => {
    notificationService.playSound();
};

export default notificationService;
