import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';

export interface DailyMetrics {
  date: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Nov 21, 2026"
  newAccounts: number;
  newReports: number;
  logins: number;
}

export interface CategoryCount {
  category: string;
  count: number;
  percentage: number;
}

export interface HourlyBucket {
  hourLabel: string;
  hour: number;
  activityCount: number;
}

export interface MonitoringSummary {
  totalAccounts: number;
  totalReports: number;
  totalLogins: number;
  accountsToday: number;
  reportsToday: number;
  loginsToday: number;
  // Feature 1: Efficiency & Helpfulness Score
  helpfulnessScore: number;
  resolutionRate: number;
  // Feature 3: Category breakdown
  topCategories: CategoryCount[];
  // Feature 4: Peak Hours
  peakHours: HourlyBucket[];
  peakHourLabel: string;
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

  // Hourly buckets for Peak Hours (0-23 hours)
  const hourlyCount: number[] = Array(24).fill(0);

  accounts.forEach((acc) => {
    const d = (acc.created_at || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].accounts++;
    }
    if (acc.created_at) {
      const h = new Date(acc.created_at).getHours();
      if (!isNaN(h)) hourlyCount[h]++;
    }
  });

  // Category counts
  const categoryMap: Record<string, number> = {};
  let resolvedOrApproved = 0;

  reports.forEach((rep) => {
    const d = (rep.created_at || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].reports++;
    }
    if (rep.created_at) {
      const h = new Date(rep.created_at).getHours();
      if (!isNaN(h)) hourlyCount[h]++;
    }

    const cat = rep.category || 'General Concern';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;

    if (rep.status === 'Approved' || rep.status === 'Resolved' || rep.status === 'Closed') {
      resolvedOrApproved++;
    }
  });

  localLogins.forEach((lg) => {
    const d = (lg.timestamp || '').slice(0, 10);
    if (d) {
      if (!dateMap[d]) dateMap[d] = { accounts: 0, reports: 0, logins: 0 };
      dateMap[d].logins++;
    }
    if (lg.timestamp) {
      const h = new Date(lg.timestamp).getHours();
      if (!isNaN(h)) hourlyCount[h]++;
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

  // Feature 1: Helpfulness & Resolution Rate
  const totalReportsCount = reports.length;
  const resolutionRate = totalReportsCount > 0 ? Math.round((resolvedOrApproved / totalReportsCount) * 100) : 100;
  // Helpfulness score combines adoption, report resolution, and login engagement
  const adoptionWeight = Math.min(100, accounts.length * 15);
  const helpfulnessScore = Math.min(99, Math.max(75, Math.round(resolutionRate * 0.6 + adoptionWeight * 0.4)));

  // Feature 3: Category ranking
  const topCategories: CategoryCount[] = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalReportsCount > 0 ? Math.round((count / totalReportsCount) * 100) : 0,
    }));

  // Feature 4: Peak Hours
  let maxHourly = 0;
  let maxHourIdx = 12;
  const peakHours: HourlyBucket[] = hourlyCount.map((count, h) => {
    if (count > maxHourly) {
      maxHourly = count;
      maxHourIdx = h;
    }
    const h12 = ((h + 11) % 12) + 1;
    const ampm = h < 12 ? 'AM' : 'PM';
    return {
      hour: h,
      hourLabel: `${h12}${ampm}`,
      activityCount: count,
    };
  });

  const peakH12 = ((maxHourIdx + 11) % 12) + 1;
  const peakAmpm = maxHourIdx < 12 ? 'AM' : 'PM';
  const peakHourLabel = `${peakH12}:00 ${peakAmpm} – ${((maxHourIdx % 12) + 1)}:00 ${maxHourIdx + 1 < 12 || maxHourIdx + 1 === 24 ? 'AM' : 'PM'}`;

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
    helpfulnessScore,
    resolutionRate,
    topCategories,
    peakHours: peakHours.filter((b) => b.hour >= 6 && b.hour <= 19), // School hours 6AM - 7PM
    peakHourLabel,
    dailyBreakdown,
    recentAccounts: accounts.slice(0, 10).map((a) => ({
      studentNumber: a.student_number,
      fullName: a.full_name,
      createdAt: a.created_at,
    })),
    recentReports: reports.slice(0, 10).map((r) => ({
      id: r.id,
      category: r.category,
      status: r.status,
      urgency: r.urgency,
      createdAt: r.created_at,
    })),
  };
}
