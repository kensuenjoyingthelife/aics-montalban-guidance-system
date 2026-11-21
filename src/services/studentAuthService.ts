import { postPortalReset } from './mailApi';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { uploadImageToCloudinary } from './cloudinaryService';

export interface StudentPortalUser {
  id: number;
  studentNumber: string;
  fullName: string;
  email: string;
  contactNumber: string;
  gradeSection?: string;
  studentIdImageUrl?: string | null;
  nationalIdImageUrl?: string | null;
  quickPin?: string | null;
}

export interface RegisterStudentParams {
  lastName: string;
  firstName: string;
  middleInitial: string;
  contactNumber: string;
  email: string;
  studentNumber: string;
  password: string;
  quickPin?: string;
  gradeSection?: string;
  studentIdFile?: File | null;
  personalPhotoFile?: File | null;
  nationalIdFile?: File | null;
}

const headers = (): HeadersInit => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
});

/**
 * 1. SHA-256 password hasher
 */
export async function hashPassword(plain: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(plain + '_AICS_SAFEGUARD_SALT_2026');
  const buf = await crypto.subtle.digest('SHA-256', data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 2. Upload file to Supabase Storage Bucket ('student-ids')
 */
export async function uploadIdToStorage(file: File, studentNumber: string, prefix: 'student_id' | 'national_id'): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${studentNumber.trim()}_${prefix}_${Date.now()}.${fileExt}`;

    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/student-ids/${filePath}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (!res.ok) {
      console.warn('Storage upload error, using object path fallback');
      return `${SUPABASE_URL}/storage/v1/object/public/student-ids/${filePath}`;
    }

    return `${SUPABASE_URL}/storage/v1/object/public/student-ids/${filePath}`;
  } catch (err) {
    console.error('Upload failed:', err);
    return null;
  }
}

/**
 * 3. Verify student in official masterlist
 */
export async function verifyStudentInMasterlist(studentNumber: string): Promise<{
  exists: boolean;
  fullName?: string;
  gradeSection?: string;
}> {
  try {
    const cleanNumber = studentNumber.trim();
    if (!cleanNumber) return { exists: false };

    // the students table is staff-only; this RPC returns just name + grade (no parent phone or email)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/portal_find_student`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_number: cleanNumber }),
    });
    if (!res.ok) return { exists: false };
    const rows = await res.json();
    if (rows && rows.length > 0) {
      return {
        exists: true,
        fullName: rows[0].full_name,
        gradeSection: rows[0].grade_section,
      };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * 4. Register Account (Automatic Approved!)
 */
export async function registerStudentPortalAccount(params: RegisterStudentParams): Promise<{
  success: boolean;
  error?: string;
  account?: StudentPortalUser;
}> {
  try {
    const cleanNumber = params.studentNumber.trim();
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.contactNumber.trim();
    const fullName = `${params.lastName.trim()}, ${params.firstName.trim()}${
      params.middleInitial.trim() ? ' ' + params.middleInitial.trim() + '.' : ''
    }`;

    // A. Check if account already exists
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_accounts?student_number=eq.${encodeURIComponent(cleanNumber)}&select=id`,
      { headers: headers() }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      if (existing && existing.length > 0) {
        return {
          success: false,
          error: "An account for this Student ID already exists. Please sign in, or tap Forgot Password if you cannot remember it.",
        };
      }
    }

    // B. Upload IDs to Storage
    let studentIdUrl: string | null = null;
    let nationalIdUrl: string | null = null;

    // Upload Student ID: Primary to Cloudinary CDN, fallback to Supabase Storage
    if (params.studentIdFile) {
      studentIdUrl = await uploadImageToCloudinary(params.studentIdFile, cleanNumber, 'student_id');
      if (!studentIdUrl) {
        studentIdUrl = await uploadIdToStorage(params.studentIdFile, cleanNumber, 'student_id');
      }
    }

    // Upload Personal Photo (Actual Face Selfie): Primary to Cloudinary CDN, fallback to Supabase Storage
    if (params.personalPhotoFile) {
      nationalIdUrl = await uploadImageToCloudinary(params.personalPhotoFile, cleanNumber, 'personal_photo');
      if (!nationalIdUrl) {
        nationalIdUrl = await uploadIdToStorage(params.personalPhotoFile, cleanNumber, 'national_id');
      }
    } else if (params.nationalIdFile) {
      nationalIdUrl = await uploadImageToCloudinary(params.nationalIdFile, cleanNumber, 'personal_photo');
      if (!nationalIdUrl) {
        nationalIdUrl = await uploadIdToStorage(params.nationalIdFile, cleanNumber, 'national_id');
      }
    }

    // C. Hash password & PIN
    const passwordHash = await hashPassword(params.password);
    const pinHash = params.quickPin ? await hashPassword(params.quickPin) : null;

    // D. Insert new portal account (with graceful fallback if quick_pin_hash is not in schema)
    const basePayload: Record<string, any> = {
      student_number: cleanNumber,
      full_name: fullName,
      email: cleanEmail,
      contact_number: cleanPhone,
      password_hash: passwordHash,
      student_id_image: studentIdUrl || 'UPLOADED_STUDENT_ID',
      national_id_image: nationalIdUrl || null,
      status: 'Active', // Automatic Approved!
      is_practice: false,
    };

    let insertRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?select=id`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        ...basePayload,
        quick_pin_hash: pinHash,
      }),
    });

    // If Supabase reports 'quick_pin_hash' column does not exist in schema cache, fallback to basePayload
    if (!insertRes.ok) {
      const errText = await insertRes.text();
      if (errText.includes('quick_pin_hash')) {
        insertRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?select=id`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(basePayload),
        });
      } else {
        return { success: false, error: `Database insert failed: ${errText}` };
      }
    }

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return { success: false, error: `Database insert failed: ${errText}` };
    }

    // Save PIN locally in student storage so PIN unlock works smoothly
    if (params.quickPin) {
      try {
        localStorage.setItem(`aics_pin_${cleanNumber}`, pinHash || '');
      } catch {}
    }

    const insertedRows = await insertRes.json();
    const newAcc = insertedRows[0];

    const master = await verifyStudentInMasterlist(cleanNumber);

    return {
      success: true,
      account: {
        id: Number(newAcc.id),
        studentNumber: cleanNumber,
        fullName: fullName,
        email: cleanEmail,
        contactNumber: cleanPhone,
        gradeSection: master.gradeSection || params.gradeSection || 'SHS Student',
        studentIdImageUrl: studentIdUrl,
        nationalIdImageUrl: nationalIdUrl,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 5. Login Student Portal Account
 */
export async function loginStudentPortal(
  studentNumber: string,
  plainPassword: string,
  turnstileToken?: string | null
): Promise<{
  success: boolean;
  error?: string;
  code?: 'no_account' | 'wrong_password' | 'deactivated' | 'offline' | 'not_human';
  account?: StudentPortalUser;
}> {
  try {
    const cleanNumber = studentNumber.trim();
    if (!cleanNumber || !plainPassword) {
      return { success: false, error: 'Please enter both Student ID and Password.' };
    }

    type LoginRes = { ok: boolean; error?: string; reason?: string; account?: Record<string, unknown>; has_pin?: boolean };
    const pHash = await hashPassword(plainPassword);
    let r: LoginRes | null = null;

    // 1. Direct secure database verification via security definer RPC
    const callRpc = async (num: string) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/portal_login`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_number: num, p_hash: pHash }),
      });
      return res.ok ? ((await res.json()) as LoginRes) : null;
    };

    r = await callRpc(cleanNumber);
    if (r && !r.ok && (r.error === 'no_account' || r.error === 'wrong_password') && cleanNumber.includes('-')) {
      r = await callRpc(cleanNumber.replace(/-/g, ''));
    }

    // Fallback to edge function if RPC failed network-wise
    if (!r) {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/aics-mailer`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'portal-login', token: turnstileToken || 'direct_login', number: cleanNumber, hash: pHash }),
        });
        r = res.ok ? ((await res.json()) as LoginRes) : null;
      } catch {
        r = null;
      }
    }

    if (!r || r.error === 'offline') return { success: false, code: 'offline', error: 'Could not connect.' };
    if (!r.ok) {
      if (r.error === 'no_account') return { success: false, code: 'no_account', error: 'Account not found.' };
      if (r.error === 'deactivated') return { success: false, code: 'deactivated', error: 'Account turned off.' };
      return { success: false, code: 'wrong_password', error: 'Wrong password.' };
    }
    const account = r.account ?? {};
    const master = await verifyStudentInMasterlist(cleanNumber);

    try {
      // Record login ping for monitoring telemetry
      const raw = localStorage.getItem('aics_monitoring_logins_history');
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({ studentNumber: cleanNumber, timestamp: new Date().toISOString() });
      if (list.length > 500) list.pop();
      localStorage.setItem('aics_monitoring_logins_history', JSON.stringify(list));
    } catch {}

    return {
      success: true,
      account: {
        id: Number(account.id),
        studentNumber: cleanNumber,
        fullName: String(account.full_name ?? ''),
        email: String(account.email ?? ''),
        contactNumber: String(account.contact_number ?? ''),
        gradeSection: master.gradeSection || 'SHS Student',
        studentIdImageUrl: account.student_id_image as string | undefined,
        nationalIdImageUrl: account.national_id_image as string | undefined,
        quickPin: r.has_pin ? 'SET' : null,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/** call a database function (security definer) with the public key */
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** the safe (non-secret) account fields */
const SAFE_COLS = 'id,student_number,full_name,email,status,contact_number,student_id_image,national_id_image';

/**
 * 5.1 Quick PIN Login / Unlock for Mobile App
 */
export async function verifyStudentQuickPin(
  studentNumber: string,
  plainPin: string
): Promise<{
  success: boolean;
  error?: string;
  account?: StudentPortalUser;
}> {
  try {
    const cleanNumber = studentNumber.trim();
    const cleanPin = plainPin.trim();
    if (!cleanNumber || cleanPin.length !== 5) {
      return { success: false, error: 'Please enter a valid 5-digit PIN.' };
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_accounts?student_number=eq.${encodeURIComponent(cleanNumber)}&select=${SAFE_COLS}`,
      { headers: headers() }
    );
    if (!res.ok) {
      return { success: false, error: 'Connection error with database.' };
    }
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return { success: false, error: 'Student account not found.' };
    }
    const account = rows[0];
    if (account.status === 'Deactivated') {
      return { success: false, error: 'This account is deactivated.' };
    }

    const hashedInputPin = await hashPassword(cleanPin);
    // checked in the database; the phone's own saved PIN still works offline-first
    const okDb = await rpc<boolean>('portal_check_pin', { p_number: cleanNumber, p_pin_hash: hashedInputPin });
    const localPin = typeof localStorage !== 'undefined' ? localStorage.getItem(`aics_pin_${cleanNumber}`) : null;
    if (!okDb && localPin !== hashedInputPin) {
      return { success: false, error: 'Incorrect 5-digit PIN. Please try again or login with password.' };
    }

    const master = await verifyStudentInMasterlist(cleanNumber);

    return {
      success: true,
      account: {
        id: Number(account.id),
        studentNumber: cleanNumber,
        fullName: account.full_name,
        email: account.email || '',
        contactNumber: account.contact_number || '',
        gradeSection: master.gradeSection || 'SHS Student',
        studentIdImageUrl: account.student_id_image,
        nationalIdImageUrl: account.national_id_image,
        quickPin: 'SET',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 6. Send Forgot Password OTP
 * The code is made, saved and emailed by the server (aics-mailer). The browser never sees it,
 * so nobody can reset another student's password.
 */
export async function sendForgotPasswordOtp(
  identifier: string
): Promise<{ success: boolean; error?: string; emailMasked?: string }> {
  try {
    const clean = identifier.trim();
    if (!clean) return { success: false, error: 'Please enter your Student ID or Email.' };
    const r = await postPortalReset(clean, 'tl');
    if (!r.ok) {
      if (r.error === 'no_account') return { success: false, error: 'No account found matching this Student ID or Email.' };
      if (r.error === 'no_email') return { success: false, error: 'No email address linked to this account.' };
      return { success: false, error: 'The code could not be sent. Please try again.' };
    }
    return { success: true, emailMasked: r.emailMasked };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 7. Reset Password with OTP (checked inside the database)
 */
export async function resetPasswordWithOtp(
  identifier: string,
  otpCode: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const r = await rpc<string>('portal_reset_password', {
      p_identifier: identifier.trim(),
      p_code: otpCode.trim(),
      p_new_hash: await hashPassword(newPassword),
    });
    if (r === 'ok') return { success: true };
    if (r === 'bad_code') return { success: false, error: 'Invalid 6-digit OTP code.' };
    if (r === 'expired') return { success: false, error: 'OTP code has expired.' };
    if (r === 'no_account') return { success: false, error: 'Account not found.' };
    return { success: false, error: 'Failed to update password.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Cloudflare Turnstile: the token from the "Verify you are human" box is checked on the SERVER
 * (aics-mailer Edge Function -> Cloudflare siteverify). Each token works once.
 */
export async function verifyTurnstileToken(token: string): Promise<{ ok: boolean; offline?: boolean }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/aics-mailer`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'turnstile', token }),
    });
    if (!res.ok) return { ok: false, offline: true };
    const d = (await res.json()) as { ok?: boolean; error?: string };
    return { ok: !!d.ok, offline: d.error === 'cloudflare-unreachable' };
  } catch {
    return { ok: false, offline: true };
  }
}

/**
 * Change password (Me > Change password). The server checks the current password first;
 * the public key cannot call the database function directly.
 */
export async function changeStudentPassword(
  studentNumber: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; code?: 'wrong_password' | 'deactivated' | 'offline' | 'no_account' }> {
  try {
    const [oldHash, newHash] = await Promise.all([hashPassword(currentPassword), hashPassword(newPassword)]);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/aics-mailer`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'portal-change-password', number: studentNumber.trim(), oldHash, newHash }),
    });
    if (!res.ok) return { ok: false, code: 'offline' };
    const d = (await res.json()) as { ok?: boolean; error?: string };
    if (d.ok) return { ok: true };
    const e = d.error;
    return { ok: false, code: e === 'deactivated' || e === 'no_account' || e === 'offline' ? e : 'wrong_password' };
  } catch {
    return { ok: false, code: 'offline' };
  }
}
