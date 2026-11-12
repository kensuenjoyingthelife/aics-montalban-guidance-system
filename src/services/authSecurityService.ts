export interface StaffDirectoryAccount {
  email: string;
  fullName: string;
  role: string;
  department: string;
  badgeCode: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event:
    | 'PIN_GATE_UNLOCKED'
    | 'PIN_GATE_FAILED'
    | 'PIN_GATE_LOCKED'
    | 'OTP_ISSUED'
    | 'OTP_SKIPPED_UNREGISTERED'
    | 'OTP_VERIFIED_SUCCESS'
    | 'OTP_VERIFY_FAILED'
    | 'OTP_LOCKED_MAX_TRIES'
    | 'SESSION_LOCKED';
  actor: string;
  detail: string;
  severity: 'info' | 'warning' | 'emerald' | 'rose';
}

export interface ActiveOtpRecord {
  email: string;
  code: string;
  issuedAt: number;
  expiresAt: number;
  attemptsUsed: number;
  maxAttempts: number;
  used: boolean;
  locked: boolean;
  isRegisteredAccount: boolean;
}

// Safe 32-character alphabet strictly excluding 0, O, 1, I
export const SAFE_OTP_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_APP_PIN = '123456';

export const REGISTERED_STAFF_ACCOUNTS: StaffDirectoryAccount[] = [
  {
    email: 'aicsmontalbansafeguard@gmail.com',
    fullName: 'AICS Montalban Guidance Associate',
    role: 'Guidance Associate & System Administrator',
    department: 'Guidance & Counseling Office · Montalban Campus',
    badgeCode: 'AICS-GA-001',
  },
  {
    email: 'guidance.head@aics.edu.ph',
    fullName: 'Head Guidance Counselor',
    role: 'Guidance Head & Case Reviewer',
    department: 'Guidance & Counseling Office · Montalban Campus',
    badgeCode: 'AICS-GH-002',
  },
];

export function generateSafeSixCharOtp(): string {
  const array = new Uint32Array(6);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 6; i++) {
      array[i] = Math.floor(Math.random() * 100000);
    }
  }
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += SAFE_OTP_ALPHABET[array[i] % SAFE_OTP_ALPHABET.length];
  }
  return result;
}

export function isValidEmailFormat(email: string): boolean {
  const cleaned = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleaned);
}

export function findRegisteredStaff(email: string): StaffDirectoryAccount | undefined {
  const cleaned = email.trim().toLowerCase();
  return REGISTERED_STAFF_ACCOUNTS.find((acct) => acct.email.toLowerCase() === cleaned);
}

export function computePinLockoutSeconds(lockoutTier: number): number {
  if (lockoutTier <= 1) return 30;
  if (lockoutTier === 2) return 120;
  return 300;
}

export function formatTimeRemaining(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
