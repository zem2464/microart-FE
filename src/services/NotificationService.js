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
    }

    /**
     * Play notification sound
     * Implements a professional "Glass" / "Pop" sound
     */
    async playSound() {
        if (!this.soundEnabled) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();

            if (audioContext.state === 'suspended') {
                await audioContext.resume();
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
    showNotification({ sender, message, onClick, roomId }) {
        if (!this.isEnabled) return;

        notification.open({
            message: `New message from ${sender?.firstName || 'Unknown'}`,
            description: message?.content || message,
            icon: <MessageOutlined style={{ color: '#1890ff' }} />,
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
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico'
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
        console.log('Registering push subscription...');
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging isn\'t supported.');
            return;
        }

        try {
            // Register SW
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered with scope:', registration.scope);

            // Request Permission
            const permission = await this.requestPermission();
            console.log('Notification permission status:', permission);

            if (permission !== 'granted') {
                console.warn('Notification permission not granted');
                return;
            }

            // Subscribe to PushManager
            // TODO: Get VAPID key from env or config. 
            // User needs to set REACT_APP_VAPID_PUBLIC_KEY
            const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
            console.log('VAPID Public Key present:', !!vapidPublicKey);

            if (!vapidPublicKey) {
                console.warn('VAPID Public Key not found in environment variables. Check .env file.');
                return;
            }

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            console.log('Push Subscription:', subscription);

            // Send to Backend
            if (client) {
                await client.mutate({
                    mutation: SAVE_PUSH_SUBSCRIPTION,
                    variables: {
                        subscription: subscription
                    }
                });
                console.log('Push subscription saved to backend');
            }

        } catch (error) {
            console.error('Error registering push subscription:', error);
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

// Expose for debugging
window.testNotification = () => {
    notificationService.showBrowserNotification({
        title: 'Test Notification',
        body: 'If you see this, browser notifications are working!',
        icon: '/logo192.png'
    });
};

export default notificationService;
