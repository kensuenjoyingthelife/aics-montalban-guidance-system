import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Nov 21, 2026"
  newAccounts: number;
  newReports: number;
  logins: number;
}

export interface MonitoringSummary {
  totalAccounts: number;
  totalReports: number;
  totalLogins: number;
  accountsToday: number;
  reportsToday: number;
  loginsToday: number;
  dailyBreakdown: DailyMetrics[];
  recentAccounts: {
    studentNumber: string;
    fullName: string;
    createdAt: string;
  }[];
  recentReports: {
    id: number;
    category: string;
    status: string;
    urgency: string;
    createdAt: string;
  }[];
}

const LOCAL_LOGINS_KEY = 'aics_monitoring_logins_history';

/**
 * Record a student login ping locally & in telemetry history
 */
export function recordStudentLoginPing(studentNumber: string): void {
  try {
    const raw = localStorage.getItem(LOCAL_LOGINS_KEY);
    const list: { studentNumber: string; timestamp: string }[] = raw ? JSON.parse(raw) : [];
    list.unshift({
      studentNumber: studentNumber.trim(),
      timestamp: new Date().toISOString(),
    });
    // Keep last 500 local login records
    if (list.length > 500) list.pop();
    localStorage.setItem(LOCAL_LOGINS_KEY, JSON.stringify(list));
  } catch {
    // safe fail
  }
}

/**
 * Fetch all registered portal accounts
 */
export async function fetchAllAccounts(): Promise<{ student_number: string; full_name: string; created_at: string }[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_accounts?select=student_number,full_name,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch all submitted student concerns/reports
 */
export async function fetchAllReports(): Promise<{ id: number; student_number: string; category: string; status: string; urgency: string; created_at: string }[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/student_concerns?select=id,student_number,category,status,urgency,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch all active chat messages to count communication engagement
 */
export async function fetchMessagesCount(): Promise<number> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/concern_messages?select=id`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Load complete aggregated metrics for the Guidance Monitoring Dashboard
 */
export async function loadMonitoringSummary(): Promise<MonitoringSummary> {
  const [accounts, reports] = await Promise.all([
    fetchAllAccounts(),
    fetchAllReports(),
  ]);

  // Read stored logins from localStorage
  let localLogins: { studentNumber: string; timestamp: string }[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_LOGINS_KEY);
    if (raw) localLogins = JSON.parse(raw);
  } catch {}

  const todayStr = new Date().toISOString().slice(0, 10);

  // Group by date (YYYY-MM-DD)
  const dateMap: Record<string, { accounts: number; reports: number; logins: number }> = {};

  // Seed last 7 days so chart/table always has context
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dateMap[key] = { accounts: 0, reports: 0, logins: 0 };
  }

  accounts.forEach((acc) => {
    const d = (acc.created_at || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].accounts++;
    }
  });

  reports.forEach((rep) => {
    const d = (rep.created_at || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].reports++;
    }
  });

  localLogins.forEach((lg) => {
    const d = (lg.timestamp || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].logins++;
    }
  });

  // Calculate totals and today metrics
  let accountsToday = 0;
  let reportsToday = 0;
  let loginsToday = 0;

  if (dateMap[todayStr]) {
    accountsToday = dateMap[todayStr].accounts;
    reportsToday = dateMap[todayStr].reports;
    loginsToday = dateMap[todayStr].logins;
  }

  const sortedDates = Object.keys(dateMap).sort().reverse();
  const dailyBreakdown: DailyMetrics[] = sortedDates.map((dStr) => {
    const d = new Date(dStr + 'T00:00:00');
    const displayDate = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    });
    return {
      date: dStr,
      displayDate,
      newAccounts: dateMap[dStr].accounts,
      newReports: dateMap[dStr].reports,
      logins: dateMap[dStr].logins,
    };
  });

  return {
    totalAccounts: accounts.length,
    totalReports: reports.length,
    totalLogins: localLogins.length,
    accountsToday,
    reportsToday,
    loginsToday,
    dailyBreakdown,
    recentAccounts: accounts.slice(0, 8).map((a) => ({
      studentNumber: a.student_number,
      fullName: a.full_name,
      createdAt: a.created_at,
    })),
    recentReports: reports.slice(0, 8).map((r) => ({
      id: r.id,
      category: r.category,
      status: r.status,
      urgency: r.urgency,
      createdAt: r.created_at,
    })),
  };
}
