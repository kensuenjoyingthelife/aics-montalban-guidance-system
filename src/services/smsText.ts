// How many SMS a message costs. Plain letters: 160 per SMS (153 per part when longer).
// One special symbol (emoji, "·", curly quotes…) switches to 70 per SMS (67 per part),
// so we swap common symbols for plain ones before sending.
const GSM =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = '^{}\\[~]|€';

export function toSmsSafe(msg: string): string {
  return String(msg || '')
    .replace(/[·•]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/ /g, ' ');
}

export function smsInfo(msg: string): { length: number; parts: number; unicode: boolean; badChars: string[] } {
  const text = toSmsSafe(msg);
  const chars = [...text];
  const bad = [...new Set(chars.filter((c) => !GSM.includes(c) && !GSM_EXT.includes(c)))];
  const unicode = bad.length > 0;
  const length = unicode ? chars.length : chars.reduce((n, c) => n + (GSM_EXT.includes(c) ? 2 : 1), 0);
  const single = unicode ? 70 : 160;
  const part = unicode ? 67 : 153;
  return { length, parts: length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / part), unicode, badChars: bad };
}
