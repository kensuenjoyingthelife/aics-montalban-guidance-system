/** Shared, plain-language validators so every form and the importer use the same rules. */

const COMMON_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'yahoo.con': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'hotmail.con': 'hotmail.com',
};

export type EmailCheck = { ok: boolean; message: string; suggestion?: string };

/** Empty is allowed (Gmail is optional). */
export const checkEmail = (value: string, isTl: boolean): EmailCheck => {
  const v = value.trim();
  if (!v) return { ok: true, message: '' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return {
      ok: false,
      message: isTl ? 'Mali ang format. Dapat ganito: pangalan@gmail.com' : 'Wrong format. It should look like: name@gmail.com',
    };
  }
  const [user, domain] = v.toLowerCase().split('@');
  const fix = COMMON_TYPOS[domain];
  if (fix) {
    return {
      ok: false,
      message: isTl ? `Baka typo: "${domain}". Ibig mo bang sabihin ${fix}?` : `Possible typo: "${domain}". Did you mean ${fix}?`,
      suggestion: `${user}@${fix}`,
    };
  }
  return { ok: true, message: isTl ? 'Tama ang email.' : 'Valid email.' };
};
