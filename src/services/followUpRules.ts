// One rule for "Parents to call" (Dashboard and Parents page use the same one).
import type { ParentAppointmentItem, FollowUpTaskItem } from '../data/dashboardMockData';

/**
 * A "reminder did not go out" task is about ONE coming conference. It is no longer needed when:
 * - no conference is coming for that case, or
 * - a conference of that case already happened (attended / did not attend) on or after the day the task was made
 *   (that was the conference the reminder was for; a new date gets its own reminder and, if it fails, its own task).
 */
export function isStaleReminderTask(t: FollowUpTaskItem, appointments: ParentAppointmentItem[], todayISO: string): boolean {
  if (t.resolved || t.category !== 'Failed SMS' || !t.caseId) return false;
  const code = t.caseId.trim().toLowerCase();
  const mine = appointments.filter((a) => (a.caseId || '').trim().toLowerCase() === code);
  const coming = mine.some((a) => a.status === 'Scheduled' && a.date >= todayISO);
  if (!coming) return true;
  const madeOn = (t.createdAt || '').slice(0, 10);
  return mine.some((a) => (a.status === 'Attended' || a.status === 'Did Not Attend') && !!madeOn && a.date >= madeOn);
}
