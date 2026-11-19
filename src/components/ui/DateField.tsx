// A date input that READS like "November 17, 2026" (never 11/17/2026) but still opens the system date picker.
import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

export const DateField: React.FC<{
  value: string; // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  isTl: boolean;
  min?: string;
  max?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  compact?: boolean;
}> = ({ value, onChange, isTl, min, max, placeholder, ariaLabel, className = '', compact }) => {
  const ref = useRef<HTMLInputElement>(null);
  const d = value ? new Date(value + 'T00:00:00') : null;
  const text =
    d && !isNaN(d.getTime())
      ? new Intl.DateTimeFormat(isTl ? 'fil-PH' : 'en-US', compact ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
      : placeholder || (isTl ? 'Pumili ng petsa' : 'Pick a date');
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={open}
        aria-label={ariaLabel}
        className={`w-full ${compact ? 'h-9 px-2.5 text-[12px]' : 'h-11 px-3.5 text-[14px]'} rounded-xl border border-[#E5E5EA] dark:border-white/10 bg-white dark:bg-[#1C1C1E] hover:border-[#007AFF] text-left inline-flex items-center gap-2 transition-colors ${
          value ? 'text-[#1D1D1F] dark:text-[#F5F5F7]' : 'text-[#8E8E93]'
        }`}
      >
        <Calendar className="w-4 h-4 shrink-0 text-[#007AFF] dark:text-[#409CFF]" aria-hidden />
        <span className="truncate">{text}</span>
      </button>
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 pointer-events-none"
      />
    </div>
  );
};
