/**
 * Client-Side Rate Limiter & Anti-Brute-Force Security Utility
 * 
 * Features:
 * - Tracks failed attempts per action key (e.g. login, forgot-password)
 * - Triggers cooldown lockout after max attempts exceeded (default: 5 attempts -> 5 min lockout)
 * - Safe persistence in localStorage + in-memory cache
 * - Auto-cleanup of expired lockouts
 */

interface RateLimitRecord {
  attempts: number;
  lockedUntil: number | null; // epoch timestamp
}

const STORAGE_PREFIX = 'aics_security_rl_';

export class ClientRateLimiter {
  private key: string;
  private maxAttempts: number;
  private lockoutDurationMs: number;

  constructor(key: string, maxAttempts = 5, lockoutDurationMinutes = 5) {
    this.key = `${STORAGE_PREFIX}${key}`;
    this.maxAttempts = maxAttempts;
    this.lockoutDurationMs = lockoutDurationMinutes * 60 * 1000;
  }

  private getRecord(): RateLimitRecord {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return { attempts: 0, lockedUntil: null };
      const parsed: RateLimitRecord = JSON.parse(raw);

      // Check if lockout expired
      if (parsed.lockedUntil && Date.now() > parsed.lockedUntil) {
        this.reset();
        return { attempts: 0, lockedUntil: null };
      }
      return parsed;
    } catch {
      return { attempts: 0, lockedUntil: null };
    }
  }

  private saveRecord(record: RateLimitRecord) {
    try {
      localStorage.setItem(this.key, JSON.stringify(record));
    } catch {
      // ignore
    }
  }

  public isLocked(): { locked: boolean; remainingSeconds: number; attempts: number; maxAttempts: number } {
    const rec = this.getRecord();
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
      const remainingSeconds = Math.max(1, Math.ceil((rec.lockedUntil - Date.now()) / 1000));
      return {
        locked: true,
        remainingSeconds,
        attempts: rec.attempts,
        maxAttempts: this.maxAttempts,
      };
    }
    return {
      locked: false,
      remainingSeconds: 0,
      attempts: rec.attempts,
      maxAttempts: this.maxAttempts,
    };
  }

  public recordFailedAttempt(): { locked: boolean; remainingSeconds: number; attempts: number } {
    const rec = this.getRecord();
    const newAttempts = rec.attempts + 1;

    if (newAttempts >= this.maxAttempts) {
      const lockedUntil = Date.now() + this.lockoutDurationMs;
      this.saveRecord({ attempts: newAttempts, lockedUntil });
      return {
        locked: true,
        remainingSeconds: Math.ceil(this.lockoutDurationMs / 1000),
        attempts: newAttempts,
      };
    }

    this.saveRecord({ attempts: newAttempts, lockedUntil: null });
    return {
      locked: false,
      remainingSeconds: 0,
      attempts: newAttempts,
    };
  }

  public reset() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // ignore
    }
  }
}

// Singletons for Auth Flows
export const studentLoginRateLimiter = new ClientRateLimiter('student_login', 5, 5);
export const studentForgotRateLimiter = new ClientRateLimiter('student_forgot', 3, 5);
export const studentRegisterRateLimiter = new ClientRateLimiter('student_register', 6, 10);
