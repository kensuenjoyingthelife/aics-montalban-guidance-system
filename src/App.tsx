import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { installNoInspect } from './services/noInspect';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SoundProvider } from './services/soundEngine';
import { AicsSplashLoader } from './components/auth/AicsSplashLoader';
import { hasStaffSession, signOutStaff } from './services/staffAuth';
import { ConfirmChangeProvider } from './components/ui/ConfirmChange';
import { LoadingProvider } from './components/ui/LoadingCard';
import { StaffDirectoryAccount } from './services/authSecurityService';
import { StudentAuthGate } from './pages/StudentAuthGate';
import { StudentPortalUser } from './services/studentAuthService';
import { applyAdaptivePerformanceClass, isCapacitorNativeApp } from './services/devicePerformance';
import { InactivityShield } from './components/security/InactivityShield';
import { MotionConfig, MotionGlobalConfig } from 'framer-motion';

/** Phone / tablet / Android app: no Framer Motion animation at all (user, 2026-11-23: no lag on low-end phones). */
const isPhoneView = () =>
  typeof window !== 'undefined' &&
  (window.innerWidth < 1024 || document.body.classList.contains('capacitor-mobile') || isCapacitorNativeApp());
import { recordSecurityAudit } from './services/securityEngine';
import { applyTextSize } from './services/textSize';
import { christmasOn, loadChristmasMode, useChristmasMode } from './config/seasonalTheme';

// Split downloads: a student only downloads the portal; the staff desktop app is a separate file.
const LoginGate = lazy(() => import('./pages/LoginGate').then((m) => ({ default: m.LoginGate })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const GuidanceChatHead = lazy(() => import('./components/GuidanceChatHead').then((m) => ({ default: m.GuidanceChatHead })));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const StudentPinLockScreen = lazy(() => import('./components/student/StudentPinLockScreen').then((m) => ({ default: m.StudentPinLockScreen })));
const MonitoringApp = lazy(() => import('./pages/MonitoringApp'));
// while a part loads: the plain app background (no flash, no spinner jump)
const PartLoading = () => <div className="min-h-screen w-full bg-[#05112B]" aria-busy="true" />;

export const App: React.FC = () => {
  // Apply saved text size immediately
  useEffect(() => {
    applyTextSize();
  }, []);
  // Filipino Christmas theme on/off (one switch: src/config/seasonalTheme.ts)
  // the whole app re-draws when the Guidance Office switches the theme (Settings > Student portal look)
  const xmasMode = useChristmasMode();
  useEffect(() => {
    document.documentElement.classList.toggle('xmas-on', christmasOn());
  }, [xmasMode]);
  useEffect(() => {
    void loadChristmasMode();
  }, []);

  // Instant 0ms start: Skip opening splash animation completely on Mobile Site and Mobile App (APK)
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // If running in Capacitor Android/iOS App OR mobile browser viewport/device, NEVER show opening splash animation
    const isMobileDevice =
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      isCapacitorNativeApp();
    if (isMobileDevice) return false;
    // Student portal website: no opening animation either (it blocked the login for ~4 s). Staff desktop app only.
    const staff =
      '__TAURI_INTERNALS__' in window ||
      '__TAURI__' in window ||
      new URLSearchParams(window.location.search).get('mode') === 'staff' ||
      window.location.hash.toLowerCase().includes('staff');
    if (!staff) return false;
    // once per app run: a reload (Ctrl+R) goes straight in
    try {
      if (sessionStorage.getItem('aics_splash_seen') === '1') return false;
      sessionStorage.setItem('aics_splash_seen', '1');
    } catch { /* storage blocked: just show it */ }
    return true;
  });
  // no right-click (except in text boxes) and no inspect shortcuts in real builds
  useEffect(() => installNoInspect(), []);

  // Auto-tune performance class for device (low-end phones vs high-end PC)
  useEffect(() => {
    applyAdaptivePerformanceClass();
  }, []);

  // App Target Mode:
  // - 'staff' is strictly for the Desktop App (Guidance Staff Tauri window or ?mode=staff / #staff)
  // - 'student' is the default for Web and Mobile (100% Student Concern & Reporting Portal)
  const isStaffApp = useMemo<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Tauri runtime presence check
    const isTauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window;
    // URL flag check (?mode=staff or #staff)
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const queryMode = urlParams.get('mode');
    return isTauri || queryMode === 'staff' || hash.includes('staff');
  }, []);

  // Student portal on phone / tablet / Android app: every Framer Motion animation finishes instantly
  // (also the ones with their own spring settings). The desktop staff app is never affected.
  useEffect(() => {
    const sync = () => { MotionGlobalConfig.skipAnimations = !isStaffApp && isPhoneView(); };
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [isStaffApp]);

  // Monitoring Mode check (?mode=monitor or #monitor)
  const isMonitoringApp = useMemo<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const queryMode = urlParams.get('mode');
    return queryMode === 'monitor' || hash.includes('monitor') || queryMode === 'monitoring' || hash.includes('monitoring');
  }, []);

  // Staff Session (Guidance Desktop App only)
  // Staff Desktop Session: Defaults directly to logged-in Guidance Associate in development or if remembered
  const [activeStaffSession, setActiveStaffSession] = useState<StaffDirectoryAccount | null>(() => {
    if (typeof window === 'undefined') return null;
    // Real app (.exe / built site): ALWAYS sign in with PIN + OTP. Never reuse a saved session, never auto-enter.
    // a database session (Supabase Auth) is required everywhere; dev only skips the screens when one is still active
    if (!import.meta.env.DEV || !hasStaffSession()) return null;
    try {
      const saved = localStorage.getItem('aics_staff_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    // dev server only: auto-enter for quick testing
    return {
      email: 'aicsmontalbansafeguard@gmail.com',
      fullName: 'AICS Montalban Guidance Associate',
      role: 'Guidance Associate',
      department: 'Guidance Office',
      badgeCode: 'AICS-GA-001',
    };
  });

  // Student Session (Student Web/Mobile Portal only) with session persistence
  const [activeStudentSession, setActiveStudentSession] = useState<StudentPortalUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('student_portal_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Android app without a quick PIN (Create Account no longer asks for one): on reopen the student
        // signs in again with ID + password + email OTP instead of being stuck on a PIN screen.
        if (isCapacitorNativeApp() && !parsed?.quickPin) {
          localStorage.removeItem('student_portal_user');
          localStorage.removeItem('student_pin_locked');
          return null;
        }
        return parsed;
      }
    } catch {}
    return null;
  });

  // Mobile App Quick PIN Lock State
  // If app is native APK and user is remembered, lock into 5-digit PIN mode by default upon reopen
  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isLocked = localStorage.getItem('student_pin_locked') === 'true';
      const hasUser = !!localStorage.getItem('student_portal_user');
      return hasUser && (isLocked || isCapacitorNativeApp());
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    const end = () => setActiveStaffSession(null);
    window.addEventListener('aics-session-expired', end);
    return () => window.removeEventListener('aics-session-expired', end);
  }, []);

  return (
    <SoundProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ConfirmChangeProvider>
            <LoadingProvider>
            <AicsSplashLoader
              visible={showSplash}
              onComplete={() => setShowSplash(false)}
            />

            <Suspense fallback={<PartLoading />}>
            {/* ROUTING BY APPLICATION TARGET (STRICTLY SEPARATED) */}
            {isMonitoringApp ? (
              /* ====================================================
                 STANDALONE GUIDANCE MONITORING APP (khentandrei)
                 ==================================================== */
              <MonitoringApp onExit={() => {
                window.location.search = '';
                window.location.hash = '';
              }} />
            ) : isStaffApp ? (
              /* ====================================================
                 GUIDANCE OFFICE STAFF DESKTOP APP
                 ==================================================== */
              activeStaffSession ? (
                <>
                  <DashboardPage
                    staffEmail={activeStaffSession.email}
                    staffRole={activeStaffSession.role}
                    onLockTerminal={() => {
                      void signOutStaff();
                      setActiveStaffSession(null);
                    }}
                  />
                  <GuidanceChatHead />
                </>
              ) : (
                <LoginGate
                  onReplaySplash={() => setShowSplash(true)}
                  onEnterDashboard={(staff) => setActiveStaffSession(staff)}
                />
              )
            ) : (
              /* ====================================================
                 STUDENT PORTAL (WEB & MOBILE) — 100% EXCLUSIVE
                 ==================================================== */
              activeStudentSession ? (
                isPinLocked ? (
                  <StudentPinLockScreen
                    user={activeStudentSession}
                    onUnlock={(unlockedUser) => {
                      setIsPinLocked(false);
                      setActiveStudentSession(unlockedUser);
                    }}
                    onSwitchAccount={() => {
                      setIsPinLocked(false);
                      setActiveStudentSession(null);
                    }}
                  />
                ) : (
                  <InactivityShield
                    timeoutMinutes={15}
                    onTimeout={() => {
                      recordSecurityAudit('AUTO_LOGOUT', activeStudentSession.studentNumber);
                      try {
                        localStorage.removeItem('student_portal_user');
                      } catch {}
                      setActiveStudentSession(null);
                    }}
                  >
                    <MotionConfig reducedMotion={isPhoneView() ? 'always' : 'user'} transition={isPhoneView() ? { duration: 0 } : undefined}>
                    <StudentDashboard
                      user={activeStudentSession}
                      onSignOut={() => {
                        try {
                          localStorage.removeItem('student_portal_user');
                          localStorage.removeItem('student_pin_locked');
                        } catch {}
                        setActiveStudentSession(null);
                      }}
                    />
                    </MotionConfig>
                  </InactivityShield>
                )
              ) : (
                <StudentAuthGate
                  onLoginSuccess={(user) => {
                    recordSecurityAudit('STUDENT_LOGIN', user.studentNumber);
                    try {
                      localStorage.setItem('student_portal_user', JSON.stringify(user));
                      localStorage.removeItem('student_pin_locked');
                    } catch {}
                    setIsPinLocked(false);
                    setActiveStudentSession(user);
                  }}
                />
              )
            )}
            </Suspense>
            </LoadingProvider>
          </ConfirmChangeProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SoundProvider>
  );
};

export default App;
