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
  referralsWaitingCount,
}) => {
  const { locale, setLocale } = useLanguage();
  const { theme, toggleThemeWithAura } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const isTl = locale === 'tl';
  const isDark = theme === 'dark';

  const getBadgeCount = (item: MainCategoryNavItem): number | undefined => {
    if (item.badgeKey === 'cases') return openCasesCount;
    if (item.badgeKey === 'parents') return todayAppointmentsCount;
    if (item.badgeKey === 'concerns') return pendingConcernsCount;
    if (item.badgeKey === 'referrals') return referralsWaitingCount;
    return undefined;
  };

  return (
    <aside
      className={`relative z-30 shrink-0 h-screen sticky top-0 flex flex-col justify-between transition-[width] duration-200 select-none ${
        collapsed ? 'w-[76px]' : 'w-[264px]'
      } bg-[#0B1F4D] dark:bg-[#070E1C] border-r border-[#1C366E] dark:border-[#14233C] text-white`}
    >
      {/* 1. Official Institutional Brand Header */}
      <div className={`h-16 border-b border-white/10 flex items-center shrink-0 ${
        collapsed ? 'justify-center px-2' : 'justify-between px-4 gap-3'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/aics-logo.jpg"
            alt="AICS Montalban Seal"
            className="w-10 h-10 rounded-full object-cover bg-white p-0.5 ring-1 ring-white/30 shrink-0 shadow-sm"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-[14px] font-extrabold tracking-tight text-white truncate leading-snug">
                AICS GUIDANCE
              </h2>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            title="Collapse Sidebar"
            onClick={() => {
              soundFX.playToggleSwitch(!collapsed);
              onToggleCollapse();
            }}
            className="w-7 h-7 rounded-md hover:bg-white/10 flex items-center justify-center text-[#9BCBFF] hover:text-white shrink-0 transition-colors"
          >
            <svg
              className="w-4 h-4"
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
        )}
      </div>

      {/* When collapsed: Dedicated expand toggle button right below the logo */}
      {collapsed && (
        <div className="pt-2 px-2 flex justify-center">
          <button
            type="button"
            title="Expand Sidebar"
            onClick={() => {
              soundFX.playToggleSwitch(!collapsed);
              onToggleCollapse();
            }}
            className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-[#9BCBFF] hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4 rotate-180"
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
      )}

      {/* 2. Primary Navigation Menu (Organized into Daily Operations vs Management) */}
      <nav className="flex-1 px-3 py-3 space-y-3 overflow-y-auto clean-scroll">
        {/* GROUP 1: DAILY CORE OPERATIONS */}
        <div>
          {!collapsed && (
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-black tracking-[0.14em] text-[#7CB8F7] uppercase flex items-center justify-between">
              <span>{isTl ? 'Araw-araw na Gawain' : 'Daily Operations'}</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-extrabold">CORE</span>
            </div>
          )}

          <div className="space-y-1">
            {MAIN_SIDEBAR_CATEGORIES.filter((item) =>
              ['dashboard', 'cases-hub', 'support-hub', 'parents-hub'].includes(item.id)
            ).map((item, idx) => {
              const isActive = item.id === activeCategoryId;
              const badgeVal = getBadgeCount(item);
              const label = isTl ? item.labelTl : item.labelEn;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundFX.playKeyClick(idx);
                    onSelectCategory(item);
                  }}
                  title={label}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } rounded-[8px] text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-white/15 text-white font-bold border-l-[3.5px] border-[#7CB8F7] shadow-sm'
                      : 'text-[#DCE8FF]/85 hover:bg-white/8 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-[#7CB8F7]' : 'text-[#9BCBFF]/75'
                      }`}
                    >
                      <DuotoneIcon name={item.icon} size={18} />
                    </span>

                    {!collapsed && (
                      <span className="text-[13.5px] tracking-tight truncate">
                        {label}
                      </span>
                    )}
                  </div>

                  {!collapsed && badgeVal !== undefined && badgeVal > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#7CB8F7] text-[#0B1F4D]'
                          : 'bg-white/15 text-[#E4ECFC]'
                      }`}
                    >
                      {badgeVal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* GROUP 2: RECORDS & SETTINGS */}
        <div className="pt-2 border-t border-white/10">
          {!collapsed && (
            <div className="px-3 pt-1 pb-1.5 text-[10px] font-black tracking-[0.14em] text-slate-400 dark:text-slate-400 uppercase">
              {isTl ? 'Rekord at Pamamahala' : 'Management & Records'}
            </div>
          )}

          <div className="space-y-1">
            {MAIN_SIDEBAR_CATEGORIES.filter((item) =>
              ['referrals-hub', 'records-hub', 'audit-hub', 'settings-hub'].includes(item.id)
            ).map((item, idx) => {
              const isActive = item.id === activeCategoryId;
              const badgeVal = getBadgeCount(item);
              const label = isTl ? item.labelTl : item.labelEn;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    soundFX.playKeyClick(idx + 4);
                    onSelectCategory(item);
                  }}
                  title={label}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
                  } rounded-[8px] text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-white/15 text-white font-bold border-l-[3.5px] border-[#7CB8F7] shadow-sm'
                      : 'text-[#DCE8FF]/75 hover:bg-white/8 hover:text-white font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-[#7CB8F7]' : 'text-[#9BCBFF]/70'
                      }`}
                    >
                      <DuotoneIcon name={item.icon} size={18} />
                    </span>

                    {!collapsed && (
                      <span className="text-[13.5px] tracking-tight truncate">
                        {label}
                      </span>
                    )}
                  </div>

                  {!collapsed && badgeVal !== undefined && badgeVal > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-[#7CB8F7] text-[#0B1F4D]'
                          : 'bg-white/15 text-[#E4ECFC]'
                      }`}
                    >
                      {badgeVal}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 3. Bottom Controls Section */}
      <div className="p-3 border-t border-white/10 space-y-1.5 shrink-0">
        {/* Language Switcher (TL / EN) */}
        <button
          type="button"
          onClick={() => {
            const next = isTl ? 'en' : 'tl';
            soundFX.playToggleSwitch(next === 'tl');
            setLocale(next);
          }}
          title={isTl ? 'Lumipat sa English' : 'Switch to Tagalog'}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } rounded-[8px] text-[13px] font-medium text-[#DCE8FF]/80 hover:bg-white/6 hover:text-white transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-5 h-5 rounded-[4px] bg-white/10 flex items-center justify-center text-[10px] font-black text-[#9BCBFF] shrink-0 border border-white/15">
              {isTl ? 'TL' : 'EN'}
            </span>
            {!collapsed && (
              <span className="truncate">
                {isTl ? 'Tagalog (Piliin: EN)' : 'English (Select: TL)'}
              </span>
            )}
          </div>
        </button>

        {/* Switch Theme Action */}
        <button
          type="button"
          onClick={(e) => toggleThemeWithAura(e)}
          title="Switch Dark / Light Mode"
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } rounded-[8px] text-[13px] font-medium text-[#DCE8FF]/80 hover:bg-white/6 hover:text-white transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="w-4 h-4 text-[#9BCBFF]/70 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            {!collapsed && (
              <span className="truncate">
                {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </span>
            )}
          </div>
        </button>

        {/* Lock / Sign out Terminal */}
        <button
          type="button"
          onClick={() => {
            soundFX.playBackspace();
            onLockTerminal();
          }}
          title={isTl ? 'I-lock ang Session' : 'Lock Session'}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } rounded-[8px] text-[13px] font-medium text-[#DCE8FF]/80 hover:bg-rose-500/15 hover:text-rose-200 transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="w-4 h-4 text-[#9BCBFF]/70 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!collapsed && (
              <span className="truncate">
                {isTl ? 'I-lock ang Terminal' : 'Lock Terminal'}
              </span>
            )}
          </div>
        </button>
      </div>
    </aside>
  );
};
