import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { soundFX } from './soundEngine';

/**
 * NOTIFICATION SERVICE (Cross-Platform: Web Notification API + Capacitor Mobile)
 * - 100% Free: No server cost, zero subscription.
 * - Works on Android, iOS, and Mobile Web browsers (Chrome, Edge, Samsung Internet, Brave).
 * - Plays customizable audible chimes and vibration.
 */

const NOTIF_STORAGE_KEY = 'aics_notifications_enabled_v1';

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
        const status = await LocalNotifications.requestPermissions();
        const granted = status.display === 'granted';
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
   * Trigger discreet notification to the phone's lock screen & notification bar
   */
  public async sendDiscreetNotification(title: string, body: string): Promise<void> {
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
              title: title || 'AICS Kalang Ba',
              body: body || 'May bagong update sa iyong Guidance concern report.',
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'beep.wav',
              smallIcon: 'ic_stat_icon_config_sample',
              actionTypeId: '',
              extra: null,
            },
          ],
        });
        return;
      } catch (err) {
        console.warn('Capacitor LocalNotification failed:', err);
      }
    }

    // 3. Web Notification API (Browser on phone / desktop)
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notif = new Notification(title || 'AICS Kalang Ba', {
            body: body || 'May bagong update sa iyong Guidance concern report.',
            icon: '/aics-logo.jpg',
            badge: '/aics-logo.jpg',
            silent: false,
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {
          // Fallback if ServiceWorker required
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification(title || 'AICS Kalang Ba', {
                body: body || 'May bagong update sa iyong Guidance concern report.',
                icon: '/aics-logo.jpg',
                badge: '/aics-logo.jpg',
              });
            });
          }
        }
      }
    }
  }
}

export const notificationService = NotificationEngine.getInstance();
