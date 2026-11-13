/**
 * AICS SafeZone Comprehensive Security Engine
 * 
 * Includes:
 * 1. XSS Input Sanitizer & Tag Stripper (Anti-Cross-Site Scripting)
 * 2. Profanity, Threat & Trolling Content Filter (Tagalog & English)
 * 3. RA 10173 (Data Privacy Act of 2012) Audit Logger
 */

// 1. XSS SANITIZATION
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .trim();
}

// 2. PROFANITY & HARMFUL TROLLING FILTER
// Checks for inappropriate or trolling content before submitting guidance reports
const HARMFUL_KEYWORDS = [
  'putangina',
  'tangina',
  'gago',
  'tarantado',
  'ulol',
  'bobo',
  'inutil',
  'pokpok',
  'kupal',
  'kantot',
  'hindot',
  'puta',
  'leche',
  'pota',
  'hayop ka',
  'pakyu',
  'fuck',
  'bitch',
  'asshole',
  'bastard',
  'idiot',
  'prank report',
  'fake report',
  'testing lang ito',
];

export interface ModerationResult {
  isClean: boolean;
  flaggedWord?: string;
  sanitizedText: string;
}

export function moderateReportContent(text: string): ModerationResult {
  const sanitized = sanitizeInput(text);
  const lower = sanitized.toLowerCase();

  for (const word of HARMFUL_KEYWORDS) {
    // Regex for word boundary or isolated substring
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lower) || lower.includes(` ${word} `)) {
      return {
        isClean: false,
        flaggedWord: word,
        sanitizedText: sanitized,
      };
    }
  }

  return {
    isClean: true,
    sanitizedText: sanitized,
  };
}

// 3. RA 10173 DATA PRIVACY AUDIT TRAIL LOGGING
export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  action: 'STUDENT_LOGIN' | 'STUDENT_REGISTER' | 'REPORT_SUBMITTED' | 'AUTO_LOGOUT' | 'QUICK_EXIT' | 'STAFF_ACCESS';
  userId?: string;
  ipPlaceholder?: string;
  complianceNote: string;
}

const AUDIT_STORAGE_KEY = 'aics_security_audit_logs';

export function recordSecurityAudit(
  action: SecurityAuditEntry['action'],
  userId = 'ANONYMOUS_STUDENT'
): void {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    const logs: SecurityAuditEntry[] = raw ? JSON.parse(raw) : [];

    const newEntry: SecurityAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      action,
      userId: userId.startsWith('09') || userId.includes('@') ? 'REDACTED_USER' : userId,
      complianceNote: 'Governed under PH Republic Act 10173 (Data Privacy Act of 2012)',
    };

    // Keep latest 100 audit records
    logs.unshift(newEntry);
    if (logs.length > 100) logs.pop();

    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // safe fail
  }
}

export function getSecurityAuditLogs(): SecurityAuditEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
