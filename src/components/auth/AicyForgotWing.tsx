// Forgot-password left wing (website): Aicy the robot mascot, the same moving robot as the mobile app,
// shown as tall as the boy and girl on the sign-in page, with the same speech bubble style.
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SafezoneMascot } from './SafezoneMascot';

const LINES: { tag: [string, string]; text: [string, string] }[] = [
  { tag: ['No worries', 'Okay lang'], text: ['Forgot your password? It happens. Type your Student ID and I will email you a code.', 'Nakalimutan ang password? Okay lang yan. Ilagay ang Student ID mo at padadalhan kita ng code sa email.'] },
  { tag: ['Stay safe', 'Ingat'], text: ['Never share the code with anyone, not even a friend.', 'Huwag ibigay ang code kahit kanino, kahit sa kaibigan.'] },
  { tag: ['Almost there', 'Malapit na'], text: ['After the code, pick a new password you can remember.', 'Pagkatapos ng code, pumili ng bagong password na madali mong maaalala.'] },
];

export const AicyForgotWing: React.FC<{ isTl: boolean }> = ({ isTl }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % LINES.length), 4200);
    return () => window.clearInterval(t);
  }, []);
  const cur = LINES[i];
  return (
    <div className="flex flex-col items-center justify-end select-none w-full max-w-xl mx-auto">
      <div className="relative w-full max-w-lg mb-4 min-h-[96px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="relative w-full px-5 py-4 rounded-2xl bg-[#081832]/90 border border-white/20 text-white shadow-2xl shadow-blue-950/80 backdrop-blur-xl text-center"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-mono font-black tracking-widest uppercase text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                {cur.tag[isTl ? 1 : 0]}
              </span>
              <span className="text-[11px] font-bold text-sky-300">Aicy · AICS SafeZone</span>
            </div>
            <p className="text-[15px] font-semibold leading-snug">“{cur.text[isTl ? 1 : 0]}”</p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-[#081832] border-r border-b border-white/20" />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* the same moving robot as the mobile app, shown about as tall as the boy and girl (zoom keeps its animation) */}
      <div className="w-full flex justify-center" style={{ zoom: 1.9 }}>
        <SafezoneMascot />
      </div>
    </div>
  );
};
