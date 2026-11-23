// "At a glance" for school heads: one plain-language summary of the month, used by
// the Reports page (on screen) AND page 1 of the Monthly Report PDF, so both always agree.
import type { DisciplineCaseRecord } from '../data/stage3MockData';
import type { ParentAppointmentItem, FollowUpTaskItem } from '../data/dashboardMockData';
import type { ConcernItem } from './concernsDb';
import { monthlyReport, recidivism, type MonthlyReport, type RepeatRow } from './reportStats';

export type GlanceTone = 'good' | 'watch' | 'action' | 'info';
export interface GlanceRow {
  key: string;
  tone: GlanceTone;
  topicEn: string;
  topicTl: string;
  en: string;
  tl: string;
}
export interface MonthlyExtras {
  report: MonthlyReport;
  prev: MonthlyReport;
  closedThisMonth: number;
  closedWithin14: number;
  repeatRows: RepeatRow[];
  followUp: { tasks: number; done: number; attempts: number; open: number };
  concerns: { total: number; urgent: number; approved: number; rejected: number; waiting: number; avgHours: number | null } | null;
  overdueDays: number;
}

const day = (s: string) => (s || '').slice(0, 10);
const prevMonthOf = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthBounds = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, '0')}`] as const;
};

/** Everything the heads' summary needs, computed once from the real records. */
export function buildMonthlyExtras(
  cases: DisciplineCaseRecord[],
  appointments: ParentAppointmentItem[],
  followUps: FollowUpTaskItem[],
  concerns: ConcernItem[] | null,
  month: string,
  todayISO: string,
  overdueDays: number
): MonthlyExtras {
  const [from, to] = monthBounds(month);
  const inMonth = (iso?: string | null) => !!iso && day(iso) >= from && day(iso) <= to;
  const report = monthlyReport(cases, appointments, month, todayISO, overdueDays);
  const prev = monthlyReport(cases, appointments, prevMonthOf(month), todayISO, overdueDays);

  const closed = cases.filter((c) => c.status === 'Resolved' && inMonth(c.closedAt));
  const within = closed.filter((c) => {
    const days = (new Date(day(c.closedAt as string) + 'T00:00:00').getTime() - new Date(day(c.incidentDate) + 'T00:00:00').getTime()) / 86400000;
    return days <= 14;
  });

  const rep = recidivism(cases);
  const repeatRows = rep.rows.filter((r) => inMonth(r.lastDate));

  const tasks = followUps.filter((t) => inMonth(t.createdAt));
  const followUp = {
    tasks: tasks.length,
    done: tasks.filter((t) => t.resolved).length,
    attempts: tasks.reduce((n, t) => n + (t.attemptsCount || 0), 0),
    open: followUps.filter((t) => !t.resolved).length,
  };

  let c: MonthlyExtras['concerns'] = null;
  if (concerns) {
    const list = concerns.filter((x) => inMonth(x.createdAt));
    const reviewed = list.filter((x) => x.reviewedAt);
    const hours = reviewed.map((x) => (new Date(x.reviewedAt).getTime() - new Date(x.createdAt).getTime()) / 3600000).filter((h) => h >= 0);
    c = {
      total: list.length,
      urgent: list.filter((x) => x.urgent).length,
      approved: list.filter((x) => /approved/i.test(x.status)).length,
      rejected: list.filter((x) => /reject/i.test(x.status)).length,
      waiting: list.filter((x) => !/approved|reject/i.test(x.status)).length,
      avgHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
    };
  }

  return { report, prev, closedThisMonth: closed.length, closedWithin14: within.length, repeatRows, followUp, concerns: c, overdueDays };
}

const change = (now: number, before: number, tl: boolean) => {
  const d = now - before;
  if (d === 0) return tl ? 'kapareho ng nakaraang buwan' : 'same as last month';
  return tl ? `${d > 0 ? 'mas marami ng' : 'mas kaunti ng'} ${Math.abs(d)} kaysa nakaraang buwan` : `${Math.abs(d)} ${d > 0 ? 'more' : 'fewer'} than last month`;
};
const hoursText = (h: number, tl: boolean) => (h < 24 ? `${Math.max(1, Math.round(h))} ${tl ? 'oras' : h < 1.5 ? 'hour' : 'hours'}` : `${Math.round((h / 24) * 10) / 10} ${tl ? 'araw' : 'days'}`);

/** Plain-language rows with a status color, plus the short "what needs your attention" list. */
export function buildGlance(x: MonthlyExtras): { rows: GlanceRow[]; attentionEn: string[]; attentionTl: string[] } {
  const r = x.report;
  const rows: GlanceRow[] = [];
  const attEn: string[] = [];
  const attTl: string[] = [];

  rows.push({
    key: 'cases',
    tone: r.newCases > x.prev.newCases ? 'watch' : 'info',
    topicEn: 'New cases',
    topicTl: 'Bagong kaso',
    en: `${r.newCases} new discipline case${r.newCases === 1 ? '' : 's'} this month (${change(r.newCases, x.prev.newCases, false)}).`,
    tl: `${r.newCases} bagong kaso ngayong buwan (${change(r.newCases, x.prev.newCases, true)}).`,
  });

  const top = r.byType[0];
  if (top) {
    rows.push({
      key: 'top',
      tone: 'info',
      topicEn: 'Most common offense',
      topicTl: 'Pinakamadalas na offense',
      en: `${top.label}: ${top.count} case${top.count === 1 ? '' : 's'} (${top.pct}% of all).`,
      tl: `${top.label}: ${top.count} kaso (${top.pct}% ng lahat).`,
    });
  }

  const od = r.overdue.length;
  rows.push({
    key: 'overdue',
    tone: od > 0 ? 'action' : 'good',
    topicEn: 'Cases taking too long',
    topicTl: 'Kasong natatagalan',
    en: od > 0 ? `${od} open case${od === 1 ? ' is' : 's are'} past ${x.overdueDays} days and need${od === 1 ? 's' : ''} follow-up.` : `No case is past ${x.overdueDays} days. All are on time.`,
    tl: od > 0 ? `${od} bukas na kaso ang lampas na sa ${x.overdueDays} araw at kailangang tutukan.` : `Walang kasong lampas sa ${x.overdueDays} araw. Lahat ay nasa oras.`,
  });
  if (od > 0) {
    attEn.push(`Follow up the ${od} overdue case${od === 1 ? '' : 's'} (list in section 4).`);
    attTl.push(`Tutukan ang ${od} kasong lampas na sa oras (nasa section 4 ang listahan).`);
  }

  if (r.attendanceRate !== null) {
    const rate = r.attendanceRate;
    rows.push({
      key: 'parents',
      tone: rate >= 80 ? 'good' : rate >= 50 ? 'watch' : 'action',
      topicEn: 'Parents who came',
      topicTl: 'Magulang na dumalo',
      en: `${r.attended} of ${r.conferencesHeld} parents came to their conference (${rate}%).${x.prev.attendanceRate !== null ? ` Last month: ${x.prev.attendanceRate}%.` : ''}`,
      tl: `${r.attended} sa ${r.conferencesHeld} magulang ang dumalo sa conference (${rate}%).${x.prev.attendanceRate !== null ? ` Nakaraang buwan: ${x.prev.attendanceRate}%.` : ''}`,
    });
    if (rate < 80 && r.noShowReasons[0]) {
      attEn.push(`Parent attendance is ${rate}%. Most common reason for not coming: "${r.noShowReasons[0].label}".`);
      attTl.push(`${rate}% lang ang dumalong magulang. Pinakamadalas na dahilan: "${r.noShowReasons[0].label}".`);
    }
  } else {
    rows.push({ key: 'parents', tone: 'info', topicEn: 'Parents who came', topicTl: 'Magulang na dumalo', en: 'No parent conference was held this month.', tl: 'Walang parent conference ngayong buwan.' });
  }

  if (x.closedThisMonth > 0) {
    const pct = Math.round((x.closedWithin14 / x.closedThisMonth) * 100);
    rows.push({
      key: 'speed',
      tone: pct >= 80 ? 'good' : pct >= 50 ? 'watch' : 'action',
      topicEn: 'Cases closed on time',
      topicTl: 'Kasong naisara sa oras',
      en: `${x.closedWithin14} of ${x.closedThisMonth} closed case${x.closedThisMonth === 1 ? ' was' : 's were'} finished within 2 weeks (${pct}%)${r.avgDaysToClose !== null ? `, ${r.avgDaysToClose} days on average` : ''}.`,
      tl: `${x.closedWithin14} sa ${x.closedThisMonth} naisarang kaso ang natapos sa loob ng 2 linggo (${pct}%)${r.avgDaysToClose !== null ? `, ${r.avgDaysToClose} araw sa average` : ''}.`,
    });
  }

  const rp = x.repeatRows.length;
  rows.push({
    key: 'repeat',
    tone: rp > 0 ? 'watch' : 'good',
    topicEn: 'Repeat offenders',
    topicTl: 'Umulit ng offense',
    en: rp > 0 ? `${rp} student${rp === 1 ? '' : 's'} did the same offense again after a sanction.` : 'No student repeated an offense after a sanction.',
    tl: rp > 0 ? `${rp} estudyante ang umulit ng parehong offense kahit nabigyan na ng sanction.` : 'Walang estudyanteng umulit ng offense pagkatapos ng sanction.',
  });
  if (rp > 0) {
    attEn.push(`${rp} repeat offender${rp === 1 ? '' : 's'}: consider counseling or a parent meeting (list in section 5).`);
    attTl.push(`${rp} estudyanteng umulit: pag-isipan ang counseling o pulong sa magulang (nasa section 5).`);
  }

  if (x.concerns) {
    const c = x.concerns;
    rows.push({
      key: 'concerns',
      tone: c.waiting > 0 ? 'watch' : 'info',
      topicEn: 'Student reports',
      topicTl: 'Report ng estudyante',
      en: `${c.total} report${c.total === 1 ? '' : 's'} from students (${c.urgent} urgent).${c.avgHours !== null ? ` Reviewed in about ${hoursText(c.avgHours, false)}.` : ''}${c.waiting ? ` ${c.waiting} still waiting.` : ''}`,
      tl: `${c.total} report mula sa estudyante (${c.urgent} urgent).${c.avgHours !== null ? ` Nare-review sa loob ng mga ${hoursText(c.avgHours, true)}.` : ''}${c.waiting ? ` ${c.waiting} ang naghihintay pa.` : ''}`,
    });
    if (c.waiting > 0) {
      attEn.push(`${c.waiting} student report${c.waiting === 1 ? ' is' : 's are'} still waiting for review.`);
      attTl.push(`${c.waiting} report ng estudyante ang hindi pa nare-review.`);
    }
  }

  if (x.followUp.open > 0) {
    attEn.push(`${x.followUp.open} parent${x.followUp.open === 1 ? '' : 's'} still need${x.followUp.open === 1 ? 's' : ''} a call from the Guidance Office.`);
    attTl.push(`${x.followUp.open} magulang ang kailangan pang tawagan ng Guidance Office.`);
  }

  return { rows, attentionEn: attEn, attentionTl: attTl };
}
