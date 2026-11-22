/**
 * Parent summons messages that get firmer with each missed conference and with how heavy the matter is.
 * Rules: never name the offense or its level (parentComms SENSITIVE check), no threats, no "reply to this".
 */
import { getAppConfig } from './appConfig';

export type SummonsLevel = 'normal' | 'high' | 'urgent';
export type SummonsLang = 'taglish' | 'english';

/** level from the case severity text; only the part before "·" counts ("2nd Minor · Next is Major" stays normal) */
export function summonsLevel(severity: string): SummonsLevel {
  const s = (severity || '').split('·')[0];
  if (/grave|major/i.test(s)) return 'urgent';
  if (/serious|consecutive|3rd|[4-9]th/i.test(s)) return 'high';
  return 'normal';
}

/** summons limit from Settings → Offenses & rules (default 3, 2-5) */
export function maxSummons(): number {
  const n = Number(getAppConfig().caseRules?.maxNoShows ?? 3);
  return Math.min(5, Math.max(2, Number.isFinite(n) ? n : 3));
}

/** which summons this will be (1-based) and whether it is the last one before going on without the parent */
export function summonsAttempt(summonsCount: number | undefined): { n: number; isLast: boolean } {
  const n = Math.max(1, (summonsCount || 0) + 1);
  return { n, isLast: n >= maxSummons() };
}

const ORD_EN = ['', '1st', '2nd', '3rd', '4th', '5th', '6th'];
export const ordinal = (n: number, tl: boolean) => (tl ? `ika-${n}` : ORD_EN[n] || `${n}th`);

export const LEVEL_WORD: Record<SummonsLevel, [string, string]> = {
  normal: ['Usual', 'Karaniwan'],
  high: ['Important', 'Mahalaga'],
  urgent: ['Urgent', 'Agaran'],
};

/** "Agaran · ika-2 patawag" — why this message was picked */
export function summonsLabel(level: SummonsLevel, n: number, isLast: boolean, tl: boolean): string {
  const lv = LEVEL_WORD[level][tl ? 1 : 0];
  const at = tl ? `${ordinal(n, true)} patawag` : `${ordinal(n, false)} summons`;
  return isLast ? `${lv} · ${at} · ${tl ? 'huling paalala' : 'final notice'}` : `${lv} · ${at}`;
}

/**
 * The ready message. stage: 1 = first summons, 2 = after a no-show, 3 = last summons.
 * name = full student name, first = first name, when = "Wednesday, November 18, 9:00 AM".
 */
export function summonsMessage(o: { level: SummonsLevel; n: number; isLast: boolean; lang: SummonsLang; name: string; first: string; when: string }): string {
  const { level, n, isLast, lang, name, first, when } = o;
  const stage: 1 | 2 | 3 = isLast && n > 1 ? 3 : n >= 2 ? 2 : 1;
  const ordEn = ORD_EN[n] || `${n}th`;
  if (lang === 'english') {
    const head = 'AICS Guidance Office: Good day.';
    if (stage === 1) {
      if (level === 'normal') return `${head} You are invited to a parent conference about ${name} on ${when} at the Guidance Office. Thank you.`;
      if (level === 'high') return `${head} Your attendance is required at a parent conference about ${name} on ${when} at the Guidance Office. This is important. If you cannot come, please call the office. Thank you.`;
      return `${head} URGENT: Your personal attendance is needed for ${name} on ${when} at the Guidance Office. Please call the office to confirm. Thank you.`;
    }
    if (stage === 2) {
      if (level === 'normal') return `${head} We missed you at the last parent conference. You are invited again for ${name} on ${when} at the Guidance Office. If you cannot come, please call the office. Thank you.`;
      if (level === 'high') return `${head} This is the ${ordEn} summons for ${name}. Your attendance is required on ${when} at the Guidance Office. If this time does not work, please call the office today for another time. Thank you.`;
      return `${head} URGENT, ${ordEn} summons: Your attendance is strongly needed for ${name} on ${when} at the Guidance Office. Please call the office today to confirm. Thank you.`;
    }
    const tail = level === 'normal' ? '' : ` A letter will also be sent home with ${name}.`;
    return `${head} FINAL NOTICE (${ordEn} summons) for ${name}: please come on ${when} at the Guidance Office. If no parent or guardian attends, the school will continue the process without you, following the Student Handbook.${tail} Thank you.`;
  }
  const head = 'AICS Guidance: Magandang araw po.';
  if (stage === 1) {
    if (level === 'normal') return `${head} Inaanyayahan po kayo sa Parent Conference para kay ${name} sa ${when}, sa Guidance Office. Salamat po.`;
    if (level === 'high') return `${head} Kinakailangan po ang inyong pagdalo sa Parent Conference para kay ${name} sa ${when}, sa Guidance Office. Mahalaga po ito. Kung hindi makakarating, tumawag po sa opisina. Salamat po.`;
    return `${head} AGARAN po: Kailangan po ang inyong personal na pagdalo para kay ${name} sa ${when}, sa Guidance Office. Pakitawagan po ang opisina para kumpirmahin. Salamat po.`;
  }
  if (stage === 2) {
    if (level === 'normal') return `${head} Hindi po kayo nakarating sa nakaraang Parent Conference. Muli po namin kayong inaanyayahan para kay ${name} sa ${when}, sa Guidance Office. Kung hindi makakarating, tumawag po sa opisina. Salamat po.`;
    if (level === 'high') return `${head} Ito na po ang ${ordinal(n, true)} patawag para kay ${name}. Kailangan po ang inyong pagdalo sa ${when}, sa Guidance Office. Kung hindi po pwede ang oras, tumawag po ngayong araw para sa ibang oras. Salamat po.`;
    return `${head} AGARAN, ${ordinal(n, true)} patawag: Kailangang-kailangan po ang inyong pagdalo para kay ${name} sa ${when}, sa Guidance Office. Pakitawagan po ang opisina ngayong araw. Salamat po.`;
  }
  const tail = level === 'normal' ? '' : ` Magpapadala rin po kami ng sulat sa pamamagitan ni ${name}.`;
  return `${head} HULING PAALALA po (${ordinal(n, true)} patawag) para kay ${name}: pumunta po sa ${when}, sa Guidance Office. Kung walang magulang o guardian na dadalo, itutuloy po ng paaralan ang proseso nang wala kayo, ayon sa Student Handbook.${tail} Salamat po.`;
}

/** Step 7: tell the parent a decision was made (no offense, no sanction words) */
export function decisionNoticeMessage(lang: SummonsLang, name: string): string {
  return lang === 'english'
    ? `AICS Guidance Office: Good day. The Guidance Office has finished reviewing the matter about ${name}. Please visit or call the office during office hours to hear the result. Thank you.`
    : `AICS Guidance: Magandang araw po. Tapos na po ang pagsusuri ng Guidance Office tungkol kay ${name}. Pakibisita o pakitawagan po ang opisina sa oras ng opisina para malaman ang resulta. Salamat po.`;
}
