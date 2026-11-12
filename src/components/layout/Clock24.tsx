import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export const Clock24: React.FC = React.memo(() => {
  const { locale } = useLanguage();
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeString = now.toLocaleTimeString(locale === 'tl' ? 'en-PH' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateString = now.toLocaleDateString(locale === 'tl' ? 'en-PH' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full saas-card-subtle text-xs font-bold text-[#3B5284] dark:text-[#B8D0FA]">
      <span className="w-2 h-2 rounded-full bg-emerald-500" />
      <span className="font-mono font-extrabold text-[#0B1F4D] dark:text-white">
        {timeString}
      </span>
      <span className="opacity-50">·</span>
      <span>{dateString}</span>
    </div>
  );
});
