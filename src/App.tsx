import React, { useState, useMemo, useEffect } from 'react';
import { installNoInspect } from './services/noInspect';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SoundProvider } from './services/soundEngine';
import { AicsSplashLoader } from './components/auth/AicsSplashLoader';
import { LoginGate } from './pages/LoginGate';
import { ConfirmChangeProvider } from './components/ui/ConfirmChange';
import { DashboardPage } from './pages/DashboardPage';
import { StaffDirectoryAccount } from './services/authSecurityService';
import { StudentAuthGate } from './pages/StudentAuthGate';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentPortalUser } from './services/studentAuthService';
import { applyAdaptivePerformanceClass } from './services/devicePerformance';

export const App: React.FC = () => {
  // Opening sequence plays every time the app starts
  const [showSplash, setShowSplash] = useState<boolean>(true);
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

  // Staff Session (Guidance Desktop App only)
  // DEV ONLY: `?devskip` opens the desktop straight to the Dashboard while developing.
  // import.meta.env.DEV is false in every build (installer), so this can never skip the login there.
  const [activeStaffSession, setActiveStaffSession] = useState<StaffDirectoryAccount | null>(() =>
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('devskip')
      ? {
          email: 'aicsmontalbansafeguard@gmail.com',
          fullName: 'AICS Montalban Guidance Associate',
          role: 'Guidance Associate',
          department: 'Guidance Office',
          badgeCode: 'AICS-GA-001',
        }
      : null,
  );

  // Student Session (Student Web/Mobile Portal only)
  const [activeStudentSession, setActiveStudentSession] = useState<StudentPortalUser | null>(null);

  return (
    <SoundProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ConfirmChangeProvider>
            <AicsSplashLoader
              visible={showSplash}
              onComplete={() => setShowSplash(false)}
            />

            {/* ROUTING BY APPLICATION TARGET (STRICTLY SEPARATED) */}
            {isStaffApp ? (
              /* ====================================================
                 GUIDANCE OFFICE STAFF DESKTOP APP
                 ==================================================== */
              activeStaffSession ? (
                <DashboardPage
                  staffEmail={activeStaffSession.email}
                  staffRole={activeStaffSession.role}
                  onLockTerminal={() => setActiveStaffSession(null)}
                />
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
                <StudentDashboard
                  user={activeStudentSession}
                  onSignOut={() => setActiveStudentSession(null)}
                />
              ) : (
                <StudentAuthGate
                  onLoginSuccess={(user) => setActiveStudentSession(user)}
                />
              )
            )}
          </ConfirmChangeProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SoundProvider>
  );
};

export default App;
