import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';

export const HeadlineCarousel: React.FC = () => {
  const { t } = useLanguage();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % t.headlines.length);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [t.headlines.length]);

  const currentLine = t.headlines[index % t.headlines.length];

  return (
    <div className="relative min-h-[34px] flex items-center justify-center lg:justify-start overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={`${index}-${currentLine}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="text-base sm:text-[18px] font-bold text-white tracking-wide flex items-center gap-2.5 drop-shadow-sm"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5CE1E6] shadow-[0_0_10px_#5CE1E6] shrink-0" />
          <span>{currentLine}</span>
        </motion.p>
      </AnimatePresence>
    </div>
  );
};
