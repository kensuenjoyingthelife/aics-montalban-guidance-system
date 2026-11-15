import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { soundFX } from './soundEngine';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

/**
 * NOTIFICATION SERVICE (Cross-Platform: Web Push / ServiceWorker + Capacitor Mobile FCM)
 * - 100% Free: No server cost, zero subscription (Firebase Cloud Messaging Spark Free Tier).
 * - Works on Android APK lock screen, iOS, and Mobile Web browsers (Chrome, Edge, Samsung Internet).
 * - Wakes phone screen even when app is closed / phone is locked.
 */

const NOTIF_STORAGE_KEY = 'aics_notifications_enabled_v1';
const PUSH_TOKEN_KEY = 'aics_device_push_token_v1';

export class NotificationEngine {
  private static instance: NotificationEngine;
  private enabled: boolean = true;

  private constructor() {
    try {
      const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  public static getInstance(): NotificationEngine {
    if (!NotificationEngine.instance) {
      NotificationEngine.instance = new NotificationEngine();
    }
    return NotificationEngine.instance;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, String(val));
    } catch {
      // ignore
    }
  }

  /**
   * Request native permission from student's phone or browser
   */
  public async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // 1. Request Local Notifications permission
        const localStatus = await LocalNotifications.requestPermissions();
        
        // 2. Request Push Notifications permission (FCM Wakeup)
        let pushGranted = false;
        try {
          const pushStatus = await PushNotifications.requestPermissions();
          pushGranted = pushStatus.receive === 'granted';
          if (pushGranted) {
            await PushNotifications.register();
            this.setupPushListeners();
          }
        } catch (pushErr) {
          console.warn('PushNotifications registration skipped/failed:', pushErr);
        }

        const granted = localStatus.display === 'granted' || pushGranted;
        this.setEnabled(granted);
        return granted;
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        const granted = permission === 'granted';
        this.setEnabled(granted);
        return granted;
      }
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
    }
    return false;
  }

  /**
   * Setup FCM token listener to save device token in Supabase
   */
  private setupPushListeners(): void {
    if (!Capacitor.isNativePlatform()) return;

    PushNotifications.addListener('registration', (token: Token) => {
      console.log('FCM Push Token successfully registered:', token.value);
      try {
        localStorage.setItem(PUSH_TOKEN_KEY, token.value);
      } catch {
        // ignore
      }
    });

    PushNotifications.addListener('registrationError', (error: any) => {
      console.warn('FCM Push registration error:', error);
    });

    // Alert arrived while app in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      soundFX.playStepUnlock();
      console.log('Push notification received:', notification);
    });

    // Student clicked on notification from phone lock screen -> route directly to chat tab
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Student tapped push notification:', notification.actionId, notification.inputValue);
      window.focus();
      try {
        window.location.hash = '#chat';
        window.dispatchEvent(new CustomEvent('aics:navigate-tab', { detail: { tab: 'chat' } }));
      } catch {
        // ignore
      }
    });
  }

  /**
   * Trigger discreet notification to the phone's lock screen & notification bar
   */
  public async sendDiscreetNotification(title: string, body: string, targetTab: string = 'chat'): Promise<void> {
    if (!this.enabled) return;

    // 1. Play in-app audio chime
    soundFX.playStepUnlock();

    // 2. Mobile Native (Capacitor APK / iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now() % 100000,
              title: title || 'AICS Guidance Office',
              body: body || 'May bagong mensahe o update sa iyong concern report.',
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'beep.wav',
              smallIcon: 'ic_stat_icon_config_sample',
              actionTypeId: '',
              extra: { targetTab },
            },
          ],
        });
        return;
      } catch (err) {
        console.warn('Capacitor LocalNotification failed:', err);
      }
    }

    // 3. Web Notification API (Browser on phone / desktop / PWA)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const handleNotifClick = (notifInstance: any) => {
          window.focus();
          try {
            window.location.hash = '#chat';
            window.dispatchEvent(new CustomEvent('aics:navigate-tab', { detail: { tab: 'chat' } }));
          } catch {
            // ignore
          }
          notifInstance.close();
        };

        try {
          const notif = new Notification(title || 'AICS Guidance Office', {
            body: body || 'May bagong mensahe sa iyong concern report.',
            icon: '/aics-logo.jpg',
            badge: '/aics-logo.jpg',
            silent: false,
            data: { url: '/?tab=chat', targetTab },
          });

          notif.onclick = () => handleNotifClick(notif);
        } catch {
          // Fallback if ServiceWorker required
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title || 'AICS Guidance Office', {
                body: body || 'May bagong mensahe sa iyong concern report.',
                icon: '/aics-logo.jpg',
                badge: '/aics-logo.jpg',
                data: { url: '/?tab=chat', targetTab },
              });
            });
          }
        }
      }
    }
  }
}

export const notificationService = NotificationEngine.getInstance();
