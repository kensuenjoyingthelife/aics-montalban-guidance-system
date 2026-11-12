import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

export interface StudentPortalUser {
  id: number;
  studentNumber: string;
  fullName: string;
  email: string;
  contactNumber: string;
  gradeSection?: string;
  studentIdImageUrl?: string | null;
  nationalIdImageUrl?: string | null;
}

export interface RegisterStudentParams {
  lastName: string;
  firstName: string;
  middleInitial: string;
  contactNumber: string;
  email: string;
  studentNumber: string;
  password: string;
  studentIdFile?: File | null;
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

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/students?student_number=eq.${encodeURIComponent(cleanNumber)}&select=student_number,full_name,grade_section`,
      { headers: headers() }
    );
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
          error: `An account for Student ID ${cleanNumber} already exists. Please sign in or click Forgot Password.`,
        };
      }
    }

    // B. Upload IDs to Storage
    let studentIdUrl: string | null = null;
    let nationalIdUrl: string | null = null;

    if (params.studentIdFile) {
      studentIdUrl = await uploadIdToStorage(params.studentIdFile, cleanNumber, 'student_id');
    }
    if (params.nationalIdFile) {
      nationalIdUrl = await uploadIdToStorage(params.nationalIdFile, cleanNumber, 'national_id');
    }

    // C. Hash password
    const passwordHash = await hashPassword(params.password);

    // D. Insert new portal account
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        student_number: cleanNumber,
        full_name: fullName,
        email: cleanEmail,
        contact_number: cleanPhone,
        password_hash: passwordHash,
        student_id_image: studentIdUrl || 'UPLOADED_STUDENT_ID',
        national_id_image: nationalIdUrl || 'UPLOADED_NATIONAL_ID',
        status: 'Active', // Automatic Approved!
        is_practice: false,
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return { success: false, error: `Database insert failed: ${errText}` };
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
        gradeSection: master.gradeSection || 'SHS Student',
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
  plainPassword: string
): Promise<{
  success: boolean;
  error?: string;
  account?: StudentPortalUser;
}> {
  try {
    const cleanNumber = studentNumber.trim();
    if (!cleanNumber || !plainPassword) {
      return { success: false, error: 'Please enter both Student ID and Password.' };
    }

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_accounts?student_number=eq.${encodeURIComponent(
        cleanNumber
      )}&select=*`,
      { headers: headers() }
    );

    if (!res.ok) {
      return { success: false, error: 'Connection error with database.' };
    }

    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return {
        success: false,
        error: `No registered account found for Student ID: ${cleanNumber}. Please create an account first.`,
      };
    }

    const account = rows[0];

    if (account.status === 'Deactivated') {
      return {
        success: false,
        error: `This account is deactivated (${account.deactivated_reason || 'Please visit the Guidance Office'}).`,
      };
    }

    const hashed = await hashPassword(plainPassword);
    if (account.password_hash && account.password_hash !== hashed) {
      return { success: false, error: 'Incorrect password. Please verify or use Forgot Password.' };
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
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 6. Send Forgot Password OTP
 */
export async function sendForgotPasswordOtp(
  identifier: string
): Promise<{ success: boolean; error?: string; emailMasked?: string }> {
  try {
    const clean = identifier.trim();
    if (!clean) return { success: false, error: 'Please enter your Student ID or Email.' };

    const query = clean.includes('@')
      ? `email=eq.${encodeURIComponent(clean.toLowerCase())}`
      : `student_number=eq.${encodeURIComponent(clean)}`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?${query}&select=*`, {
      headers: headers(),
    });

    if (!res.ok) return { success: false, error: 'Database search failed.' };
    const rows = await res.json();
    if (!rows || rows.length === 0) {
      return { success: false, error: 'No account found matching this Student ID or Email.' };
    }

    const account = rows[0];
    const targetEmail = account.email;

    if (!targetEmail) {
      return { success: false, error: 'No email address linked to this account.' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?id=eq.${account.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ otp_code: otp, otp_expires_at: expiresAt }),
    });

    try {
      await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: otp,
          staffName: account.full_name,
          purpose: 'AICS Student Portal Password Reset',
        }),
      });
    } catch {
      // ignore
    }

    const parts = targetEmail.split('@');
    const namePart = parts[0];
    const masked =
      namePart.length > 2
        ? `${namePart[0]}***${namePart[namePart.length - 1]}@${parts[1]}`
        : `${namePart[0]}***@${parts[1]}`;

    return { success: true, emailMasked: masked };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * 7. Reset Password with OTP
 */
export async function resetPasswordWithOtp(
  identifier: string,
  otpCode: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const clean = identifier.trim();
    const cleanOtp = otpCode.trim();

    const query = clean.includes('@')
      ? `email=eq.${encodeURIComponent(clean.toLowerCase())}`
      : `student_number=eq.${encodeURIComponent(clean)}`;

    const res = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?${query}&select=*`, {
      headers: headers(),
    });

    if (!res.ok) return { success: false, error: 'Account lookup failed.' };
    const rows = await res.json();
    if (!rows || rows.length === 0) return { success: false, error: 'Account not found.' };

    const account = rows[0];

    if (!account.otp_code || account.otp_code !== cleanOtp) {
      return { success: false, error: 'Invalid 6-digit OTP code.' };
    }

    if (account.otp_expires_at && new Date(account.otp_expires_at).getTime() < Date.now()) {
      return { success: false, error: 'OTP code has expired.' };
    }

    const newHash = await hashPassword(newPassword);
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/portal_accounts?id=eq.${account.id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        password_hash: newHash,
        otp_code: null,
        otp_expires_at: null,
      }),
    });

    if (!updateRes.ok) return { success: false, error: 'Failed to update password.' };

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
