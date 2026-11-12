import React from 'react';

export type TileColor =
  | 'royal'
  | 'cobalt'
  | 'azure'
  | 'indigo'
  | 'teal'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'slate';

export type TileVariant = 'solid' | 'soft' | 'tinted';
export type TileSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SOLID_MAP: Record<TileColor, string> = {
  royal:
    'bg-gradient-to-br from-[#2557BE] to-[#0B1F4D] text-white shadow-[0_8px_20px_-4px_rgba(37,87,190,0.55)] ring-1 ring-white/25',
  cobalt:
    'bg-gradient-to-br from-[#2557BE] to-[#1E469B] text-white shadow-[0_8px_20px_-4px_rgba(37,87,190,0.55)] ring-1 ring-white/25',
  azure:
    'bg-gradient-to-br from-[#4E92DF] to-[#1E469B] text-white shadow-[0_8px_20px_-4px_rgba(78,146,223,0.55)] ring-1 ring-white/25',
  indigo:
    'bg-gradient-to-br from-[#6366F1] to-[#3730A3] text-white shadow-[0_8px_20px_-4px_rgba(99,102,241,0.52)] ring-1 ring-white/25',
  teal:
    'bg-gradient-to-br from-[#14B8A6] to-[#0F766E] text-white shadow-[0_8px_20px_-4px_rgba(20,184,166,0.52)] ring-1 ring-white/25',
  emerald:
    'bg-gradient-to-br from-[#10B981] to-[#047857] text-white shadow-[0_8px_20px_-4px_rgba(16,185,129,0.52)] ring-1 ring-white/25',
  amber:
    'bg-gradient-to-br from-[#F59E0B] to-[#B45309] text-white shadow-[0_8px_20px_-4px_rgba(245,158,11,0.52)] ring-1 ring-white/25',
  rose:
    'bg-gradient-to-br from-[#F43F5E] to-[#BE123C] text-white shadow-[0_8px_20px_-4px_rgba(244,63,94,0.52)] ring-1 ring-white/25',
  violet:
    'bg-gradient-to-br from-[#8B5CF6] to-[#5B21B6] text-white shadow-[0_8px_20px_-4px_rgba(139,92,246,0.52)] ring-1 ring-white/25',
  slate:
    'bg-gradient-to-br from-[#475569] to-[#1E293B] text-white shadow-[0_8px_20px_-4px_rgba(71,85,105,0.45)] ring-1 ring-white/20',
};

const SOFT_MAP: Record<TileColor, string> = {
  royal:
    'bg-[#E4ECFC] text-[#1E469B] ring-1 ring-[#CFD9F2] dark:bg-[#1E469B]/25 dark:text-[#7CB8F7] dark:ring-[#4E92DF]/30',
  cobalt:
    'bg-[#E4ECFC] text-[#1E469B] ring-1 ring-[#CFD9F2] dark:bg-[#1E469B]/25 dark:text-[#7CB8F7] dark:ring-[#4E92DF]/30',
  azure:
    'bg-[#E8F3FF] text-[#2557BE] ring-1 ring-[#BBD9FB] dark:bg-[#4E92DF]/20 dark:text-[#9BCBFF] dark:ring-[#7CB8F7]/30',
  indigo:
    'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-400/30',
  teal:
    'bg-teal-50 text-teal-700 ring-1 ring-teal-200/80 dark:bg-teal-500/20 dark:text-teal-300 dark:ring-teal-400/30',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-400/30',
  amber:
    'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-400/30',
  rose:
    'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80 dark:bg-rose-500/20 dark:text-rose-300 dark:ring-rose-400/30',
  violet:
    'bg-violet-50 text-violet-700 ring-1 ring-violet-200/80 dark:bg-violet-500/20 dark:text-violet-300 dark:ring-violet-400/30',
  slate:
    'bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

const SIZE_MAP: Record<TileSize, string> = {
  xs: 'w-7 h-7 rounded-lg',
  sm: 'w-9 h-9 rounded-xl',
  md: 'w-11 h-11 rounded-[14px]',
  lg: 'w-12 h-12 rounded-2xl',
  xl: 'w-14 h-14 rounded-[18px]',
};

export interface IconTileProps {
  color?: TileColor;
  variant?: TileVariant;
  size?: TileSize;
  className?: string;
  children: React.ReactNode;
}

export const IconTile: React.FC<IconTileProps> = ({
  color = 'royal',
  variant = 'solid',
  size = 'md',
  className = '',
  children,
}) => {
  const palette = variant === 'solid' ? SOLID_MAP[color] : SOFT_MAP[color];
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 transition-transform duration-200 ${SIZE_MAP[size]} ${palette} ${className}`}
    >
      {children}
    </span>
  );
};
