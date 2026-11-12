import React from 'react';

/**
 * Philippine mobile number rule: starts with 09, exactly 11 digits.
 * Display format: 09XX-XXX-XXXX
 */

export type PhoneCheck = {
  ok: boolean;
  /** Short, plain-language message shown under the input. */
  message: string;
  /** Optional one-click fix (e.g. +63 → 09). */
  fixTo?: string;
};

export const phoneDigits = (value: string) => value.replace(/\D/g, '');

export const formatPhMobile = (value: string) => {
  const d = phoneDigits(value).slice(0, 11);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
};

export const checkPhMobile = (value: string, isTl: boolean): PhoneCheck => {
  const raw = value.trim();
  const d = phoneDigits(raw);

  if (!d) {
    return {
      ok: false,
      message: isTl
        ? 'Ilagay ang number na nagsisimula sa 09 (11 digits). Hal: 0917-123-4567'
        : 'Enter a number that starts with 09 (11 digits). Ex: 0917-123-4567',
    };
  }

  // +63 / 63 international format → offer to convert to 09
  if (raw.startsWith('+63') || (d.startsWith('63') && d.length >= 11)) {
    const local = '0' + d.slice(2);
    return {
      ok: false,
      message: isTl
        ? 'Gamitin ang 09 imbes na +63.'
        : 'Use 09 instead of +63.',
      fixTo: local.length === 11 ? formatPhMobile(local) : undefined,
    };
  }

  // Missing the leading 0 (e.g. 9171234567)
  if (d.startsWith('9') && d.length === 10) {
    return {
      ok: false,
      message: isTl ? 'Kulang ng 0 sa unahan. Dapat 09.' : 'Missing the 0 in front. It should start with 09.',
      fixTo: formatPhMobile('0' + d),
    };
  }

  if (!d.startsWith('09')) {
    const start = d.slice(0, 2);
    return {
      ok: false,
      message: isTl
        ? `Dapat nagsisimula sa 09, hindi ${start}.`
        : `Must start with 09, not ${start}.`,
    };
  }

  if (d.length < 11) {
    const left = 11 - d.length;
    return {
      ok: false,
      message: isTl
        ? `Kulang ng ${left} digit (${d.length}/11).`
        : `${left} more digit${left > 1 ? 's' : ''} needed (${d.length}/11).`,
    };
  }

  if (d.length > 11) {
    return {
      ok: false,
      message: isTl
        ? `Sobra ng ${d.length - 11} digit (${d.length}/11).`
        : `Too long by ${d.length - 11} digit${d.length - 11 > 1 ? 's' : ''} (${d.length}/11).`,
    };
  }

  return { ok: true, message: isTl ? 'Tama ang mobile number.' : 'Valid mobile number.' };
};

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  isTl: boolean;
  className?: string;
  /** Compact mode for table cells: smaller hint text. */
  compact?: boolean;
  id?: string;
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  isTl,
  className = '',
  compact = false,
  id,
}) => {
  const check = checkPhMobile(value, isTl);
  const empty = phoneDigits(value).length === 0;
  const hintId = id ? `${id}-hint` : undefined;

  const handleChange = (next: string) => {
    // Keep +63 visible so we can tell the user how to fix it; otherwise auto-format.
    if (next.trim().startsWith('+')) {
      onChange(next.replace(/[^\d+\s-]/g, ''));
      return;
    }
    const d = phoneDigits(next);
    // Allow up to 12 digits only when it looks like 63XXXXXXXXXX
    if (d.startsWith('63')) {
      onChange(d.slice(0, 12));
      return;
    }
    onChange(formatPhMobile(next));
  };

  const tone = empty
    ? ''
    : check.ok
    ? 'ring-2 ring-emerald-500/70 focus:outline-none'
    : 'ring-2 ring-rose-500 bg-rose-50/60 dark:bg-rose-950/30 focus:outline-none';

  return (
    <div className="space-y-1">
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="09XX-XXX-XXXX"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        aria-invalid={!empty && !check.ok}
        aria-describedby={hintId}
        className={`${className} ${tone}`}
      />
      <p
        id={hintId}
        role={!empty && !check.ok ? 'alert' : undefined}
        className={`flex flex-wrap items-center gap-1.5 font-semibold ${
          compact ? 'text-[10px]' : 'text-[11px]'
        } ${
          empty
            ? 'text-[#687FA8] dark:text-[#89A7DF]'
            : check.ok
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        <span>{empty ? 'ⓘ' : check.ok ? '✓' : '⚠'}</span>
        <span>{check.message}</span>
        {check.fixTo && (
          <button
            type="button"
            onClick={() => onChange(check.fixTo!)}
            className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 font-extrabold hover:bg-rose-200"
          >
            {isTl ? `Gawing ${check.fixTo}` : `Change to ${check.fixTo}`}
          </button>
        )}
      </p>
    </div>
  );
};
