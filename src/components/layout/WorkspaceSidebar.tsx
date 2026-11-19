import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { soundFX, useSound } from '../../services/soundEngine';
import { DuotoneIcon } from '../ui/icons';
import { TEXT_SIZES, TextSize, getTextSize, setTextSize, TEXT_SIZE_EVENT } from '../../services/textSize';
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

  const [currentSize, setCurrentSize] = React.useState<TextSize>(() => getTextSize());

  React.useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<TextSize>;
      if (custom.detail) setCurrentSize(custom.detail);
    };
    window.addEventListener(TEXT_SIZE_EVENT, handler);
    return () => window.removeEventListener(TEXT_SIZE_EVENT, handler);
  }, []);

  const cycleTextSize = () => {
    const idx = TEXT_SIZES.findIndex((s) => s.id === currentSize);
    const next = TEXT_SIZES[(idx + 1) % TEXT_SIZES.length];
    setTextSize(next.id);
    setCurrentSize(next.id);
    soundFX.playKeyClick();
  };

  const getBadgeStyle = (count: number) => {
    if (count >= 5) {
      return 'bg-[#FF3B30] text-white';
    }
    if (count >= 3) {
      return 'bg-[#FF9500] text-white font-semibold';
    }
    return 'bg-black/[0.08] dark:bg-white/15 text-[#1D1D1F] dark:text-white font-semibold';
  };

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
      } bg-[#F5F5F7] dark:bg-[#1C1C1E] border-r border-[#E5E5EA] dark:border-[#38383A] text-[#1D1D1F] dark:text-white`}
    >
      {/* 1. Official Institutional Brand Header */}
      <div className={`h-16 border-b border-[#E5E5EA] dark:border-[#38383A] flex items-center shrink-0 ${
        collapsed ? 'justify-center px-2' : 'justify-between px-4 gap-3'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="/aics-logo.jpg"
            alt="AICS Montalban Seal"
            className="w-10 h-10 rounded-full object-cover bg-white p-0.5 ring-1 ring-black/10 shrink-0 shadow-sm"
          />
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold tracking-tight text-[#1D1D1F] dark:text-white truncate leading-tight">
                AICS Montalban
              </h2>
              <p className="text-[12px] font-medium text-[#6E6E73] dark:text-[#A1A1A6] truncate">
                Guidance Office
              </p>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            title={isTl ? 'Itago ang sidebar' : 'Collapse sidebar'}
            onClick={() => {
              soundFX.playToggleSwitch(!collapsed);
              onToggleCollapse();
            }}
            className="w-7 h-7 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/10 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white shrink-0 transition-colors"
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
            title={isTl ? 'Ipakita ang sidebar' : 'Expand sidebar'}
            onClick={() => {
              soundFX.playToggleSwitch(!collapsed);
              onToggleCollapse();
            }}
            className="w-8 h-8 rounded-full bg-black/[0.05] hover:bg-black/[0.09] dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors"
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
            <div className="px-3 pt-1 pb-1.5 text-[12px] font-semibold text-[#8E8E93] flex items-center justify-between">
              <span>{isTl ? 'Araw-araw na gawain' : 'Daily operations'}</span>
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
                  } rounded-[10px] text-left transition-[transform,background-color,color] duration-150 active:scale-[0.98] ${
                    isActive
                      ? 'bg-[#007AFF] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                      : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#007AFF] dark:text-[#409CFF]'
                      }`}
                    >
                      <DuotoneIcon name={item.icon} size={18} />
                    </span>

                    {!collapsed && (
                      <span className="text-[14px] tracking-tight truncate">
                        {label}
                      </span>
                    )}
                  </div>

                  {!collapsed && badgeVal !== undefined && badgeVal > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-md text-xs font-semibold shrink-0 transition-colors ${getBadgeStyle(
                        badgeVal
                      )}`}
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
        <div className="pt-2 border-t border-[#E5E5EA] dark:border-[#38383A]">
          {!collapsed && (
            <div className="px-3 pt-1 pb-1.5 text-[12px] font-semibold text-[#8E8E93]">
              {isTl ? 'Rekord at pamamahala' : 'Management & records'}
            </div>
          )}

          <div className="space-y-1">
            {MAIN_SIDEBAR_CATEGORIES.filter((item) =>
              // Temporarily hidden 'referrals-hub' (Counselor) per user instruction
              ['records-hub', 'audit-hub', 'settings-hub'].includes(item.id)
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
                  } rounded-[10px] text-left transition-all duration-150 ${
                    isActive
                      ? 'bg-[#007AFF] text-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.12)]'
                      : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-[#007AFF] dark:text-[#409CFF]'
                      }`}
                    >
                      <DuotoneIcon name={item.icon} size={18} />
                    </span>

                    {!collapsed && (
                      <span className="text-[14px] tracking-tight truncate">
                        {label}
                      </span>
                    )}
                  </div>

                  {!collapsed && badgeVal !== undefined && badgeVal > 0 && (
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 transition-colors ${getBadgeStyle(
                        badgeVal
                      )}`}
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
      <div className="p-3 border-t border-[#E5E5EA] dark:border-[#38383A] space-y-1 shrink-0">
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
          } rounded-[10px] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-5 h-5 rounded-[6px] bg-black/[0.06] dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-[#007AFF] dark:text-[#409CFF] shrink-0">
              {isTl ? 'TL' : 'EN'}
            </span>
            {!collapsed && (
              <span className="truncate">
                {isTl ? 'Wika: Tagalog' : 'Language: English'}
              </span>
            )}
          </div>
        </button>

        {/* 5-Tier Font Size Adjuster */}
        <button
          type="button"
          onClick={cycleTextSize}
          title={isTl ? 'Baguhin ang laki ng letra (5 antas)' : 'Adjust Font Size (5 levels)'}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } rounded-[10px] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="w-5 h-5 rounded-[6px] bg-black/[0.06] dark:bg-white/10 flex items-center justify-center text-[10px] font-bold text-[#007AFF] dark:text-[#409CFF] shrink-0">
              {TEXT_SIZES.find((s) => s.id === currentSize)?.short ?? 'S'}
            </span>
            {!collapsed && (
              <span className="truncate flex items-center justify-between gap-2 flex-1">
                <span>{isTl ? 'Sukat ng Letra' : 'Font Size'}</span>
                <span className="text-[12px] text-[#8E8E93] font-semibold">
                  {isTl
                    ? TEXT_SIZES.find((s) => s.id === currentSize)?.tl
                    : TEXT_SIZES.find((s) => s.id === currentSize)?.en}
                </span>
              </span>
            )}
          </div>
        </button>

        {/* Switch Theme Action */}
        <button
          type="button"
          onClick={(e) => toggleThemeWithAura(e)}
          title={isTl ? 'Palitan ang dark / light mode' : 'Switch dark / light mode'}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'px-3 py-2'
          } rounded-[10px] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="w-4 h-4 text-[#8E8E93] shrink-0"
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
                {isDark ? (isTl ? 'Gawing light mode' : 'Switch to Light Mode') : (isTl ? 'Gawing dark mode' : 'Switch to Dark Mode')}
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
          } rounded-[10px] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] transition-colors`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <svg
              className="w-4 h-4 text-[#8E8E93] shrink-0"
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
