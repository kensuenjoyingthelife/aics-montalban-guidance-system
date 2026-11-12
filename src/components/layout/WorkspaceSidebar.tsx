import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { soundFX, useSound } from '../../services/soundEngine';
import { DuotoneIcon } from '../ui/icons';
import { TEXT_SIZES, TextSize, getTextSize, setTextSize } from '../../services/textSize';
import {
  MAIN_SIDEBAR_CATEGORIES,
  MainCategoryId,
  MainCategoryNavItem,
} from '../../data/stage3MockData';

interface WorkspaceSidebarProps {
  activeCategoryId: MainCategoryId;
  onSelectCategory: (item: MainCategoryNavItem) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onLockTerminal: () => void;
  staffEmail: string;
  openCasesCount: number;
  todayAppointmentsCount: number;
  pendingConcernsCount: number;
  confiscatedIdsCount: number;
  referralsWaitingCount?: number;
}

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  activeCategoryId,
  onSelectCategory,
  collapsed,
  onToggleCollapse,
  onLockTerminal,
  staffEmail,
  openCasesCount,
  todayAppointmentsCount,
  pendingConcernsCount,
  confiscatedIdsCount,
  referralsWaitingCount,
}) => {
  const { locale, setLocale } = useLanguage();
  const { theme, toggleThemeWithAura } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const isTl = locale === 'tl';
  const isDark = theme === 'dark';
  const [textSize, setTextSizeState] = React.useState<TextSize>(getTextSize());

  const getBadgeCount = (item: MainCategoryNavItem): number | undefined => {
    if (item.badgeKey === 'cases') return openCasesCount;
    if (item.badgeKey === 'parents') return todayAppointmentsCount;
    if (item.badgeKey === 'concerns') return pendingConcernsCount;
    if (item.badgeKey === 'ids') return confiscatedIdsCount;
    if (item.badgeKey === 'referrals') return referralsWaitingCount;
    return undefined;
  };

  // Every number says what it counts (Golden Rule 4)
  const badgeMeaning = (item: MainCategoryNavItem, n: number): string => {
    const en: Record<string, string> = {
      cases: `${n} open case${n === 1 ? '' : 's'}`,
      parents: `${n} conference${n === 1 ? '' : 's'} today`,
      concerns: `${n} concern${n === 1 ? '' : 's'} waiting for review`,
      ids: `${n} ID${n === 1 ? '' : 's'} on hold`,
      referrals: `${n} student${n === 1 ? '' : 's'} waiting for the counselor`,
    };
    const tl: Record<string, string> = {
      cases: `${n} bukas na kaso`,
      parents: `${n} conference ngayong araw`,
      concerns: `${n} concern na naghihintay`,
      ids: `${n} ID na naka-hold`,
      referrals: `${n} estudyanteng naghihintay sa counselor`,
    };
    return (isTl ? tl : en)[item.badgeKey ?? ''] ?? '';
  };

  return (
    <aside
      className={`relative z-30 shrink-0 h-screen sticky top-0 flex flex-col justify-between transition-[width] duration-200 select-none ${
        collapsed ? 'w-[76px]' : 'w-[258px]'
      } bg-[#0B1F4D] dark:bg-[#060C1A] border-r border-[#1C366E] dark:border-[#182747] text-white`}
    >
      {/* Top Official Brand Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src="/aics-logo.jpg"
            alt="AICS Seal"
            className="w-9 h-9 rounded-full object-cover bg-white p-0.5 ring-1 ring-white/40 shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-extrabold tracking-tight text-white truncate">
                AICS MONTALBAN
              </p>
              <p className="text-[11px] font-medium text-[#9BCBFF] truncate">
                Guidance Office System
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          onClick={() => {
            soundFX.playToggleSwitch(!collapsed);
            onToggleCollapse();
          }}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-[#9BCBFF] hover:text-white shrink-0 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${
              collapsed ? 'rotate-180' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* OPTION 1 NAVIGATION: 6 Clean, Spacious Main Categories (Zero Scrolling Needed!) */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto clean-scroll">
        {!collapsed && (
          <div className="px-3 pb-1.5 text-[10px] font-extrabold tracking-[0.14em] text-[#7CB8F7]/80 uppercase">
            {isTl ? 'MENU' : 'MENU'}
          </div>
        )}

        {MAIN_SIDEBAR_CATEGORIES.map((item, idx) => {
          const isActive = item.id === activeCategoryId;
          const badgeVal = getBadgeCount(item);
          const isReady = item.stageNumber <= 3; // pages that are built; others show "Soon"
          const label = isTl ? item.labelTl : item.labelEn;
          const meaning = badgeVal ? badgeMeaning(item, badgeVal) : '';

          return (
            <button
              key={item.id}
              type="button"
              title={
                !isReady
                  ? `${label} — ${isTl ? 'paparating pa' : 'coming soon'}`
                  : meaning
                  ? `${label} — ${meaning}`
                  : label
              }
              aria-label={meaning ? `${label}, ${meaning}` : label}
              onClick={() => {
                soundFX.playKeyClick(idx);
                onSelectCategory(item);
              }}
              className={`btn-press w-full flex items-center ${
                collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-1.5'
              } rounded-2xl text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[#2557BE] text-white shadow-md ring-1 ring-[#7CB8F7]/50'
                  : isReady
                  ? 'text-[#DCE8FF] hover:bg-white/8 hover:text-white'
                  : 'text-[#DCE8FF]/55 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white/8 text-[#7CB8F7]'
                  }`}
                >
                  <DuotoneIcon name={item.icon} size={19} />
                </span>

                {!collapsed && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13.5px] font-extrabold leading-tight">{label}</span>
                    </div>
                    <p
                      className={`text-[11px] truncate mt-0.5 ${
                        isActive ? 'text-white/90 font-semibold' : 'text-[#9BCBFF]/80'
                      }`}
                    >
                      {isTl ? item.subLabelTl : item.subLabelEn}
                    </p>
                  </div>
                )}
              </div>

              {!collapsed && !isReady && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 bg-white/8 text-[#9BCBFF] border border-white/10">
                  {isTl ? 'Soon' : 'Soon'}
                </span>
              )}
              {!collapsed && isReady && badgeVal !== undefined && badgeVal > 0 && (
                <span
                  aria-hidden="true"
                  className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-extrabold shrink-0 ${
                    isActive
                      ? 'bg-white text-[#1E469B]'
                      : item.badgeKey === 'concerns'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-400/40'
                      : 'bg-white/12 text-[#E4ECFC]'
                  }`}
                >
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Compact Preferences + Staff Profile & Lock Button */}
      <div className="p-3 border-t border-white/10 space-y-2.5 shrink-0">
        {/* Clean 3-Button System Preferences Dock (Moves clutter out of Top Header!) */}
        {!collapsed ? (
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/6 border border-white/10">
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute UI Sounds' : 'Enable UI Sounds'}
              className="btn-press py-1.5 px-2 rounded-lg hover:bg-white/10 text-[11px] font-bold text-[#DCE8FF] flex items-center justify-center gap-1 transition-colors"
            >
              <span>{soundEnabled ? '🔊' : '🔇'}</span>
              <span>{soundEnabled ? 'SFX' : 'Mute'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLocale(isTl ? 'en' : 'tl')}
              title="Switch Language (English / Taglish)"
              className="btn-press py-1.5 px-2 rounded-lg hover:bg-white/10 text-[11px] font-bold text-[#DCE8FF] flex items-center justify-center gap-1 transition-colors"
            >
              <span>🌐</span>
              <span>{isTl ? 'Taglish' : 'English'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => toggleThemeWithAura(e)}
              title="Switch Light / Dark Mode"
              className="btn-press py-1.5 px-2 rounded-lg hover:bg-white/10 text-[11px] font-bold text-[#DCE8FF] flex items-center justify-center gap-1 transition-colors"
            >
              <span>{isDark ? '🌙' : '☀️'}</span>
              <span>{isDark ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => toggleThemeWithAura(e)}
              title="Switch Theme"
              className="w-9 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-xs"
            >
              {isDark ? '🌙' : '☀️'}
            </button>
          </div>
        )}

        {!collapsed && (
          <div
            role="group"
            aria-label={isTl ? 'Laki ng letra' : 'Text size'}
            className="flex items-center gap-1.5 px-1"
          >
            <span className="text-[11px] font-bold text-[#9BCBFF] shrink-0">{isTl ? 'Letra' : 'Text'}</span>
            <div className="grid grid-cols-3 gap-1 flex-1 p-1 rounded-xl bg-white/6 border border-white/10">
              {TEXT_SIZES.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={textSize === t.id}
                  title={`${isTl ? 'Laki ng letra' : 'Text size'}: ${isTl ? t.tl : t.en} (${Math.round(t.zoom * 100)}%)`}
                  onClick={() => {
                    setTextSize(t.id);
                    setTextSizeState(t.id);
                  }}
                  className={`btn-press py-1 rounded-lg font-extrabold transition-colors ${
                    textSize === t.id ? 'bg-white text-[#0B1F4D]' : 'text-[#DCE8FF] hover:bg-white/10'
                  }`}
                  style={{ fontSize: `${11 + i * 2.5}px` }}
                >
                  A{i === 1 ? '+' : i === 2 ? '++' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-2 py-1 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2557BE] flex items-center justify-center font-extrabold text-xs text-white shrink-0">
              GA
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate" title={staffEmail}>{staffEmail}</p>
              <p className="text-[10.5px] text-[#9BCBFF] truncate">Guidance Associate</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            soundFX.playBackspace();
            onLockTerminal();
          }}
          title={isTl ? 'I-lock ang session' : 'Lock session'}
          aria-label={isTl ? 'I-lock ang session' : 'Lock session'}
          className="w-full py-2 px-3 rounded-xl bg-white/8 hover:bg-rose-500/25 border border-white/12 hover:border-rose-400/40 text-[#E4ECFC] hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <DuotoneIcon name="lockKey" size={14} />
          {!collapsed && (
            <span>{isTl ? 'I-lock ang Session' : 'Lock Session'}</span>
          )}
        </button>
      </div>
    </aside>
  );
};
