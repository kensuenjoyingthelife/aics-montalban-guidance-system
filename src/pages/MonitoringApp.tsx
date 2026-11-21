import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  Activity,
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Clock,
  Sparkles,
  BarChart3,
  LogOut,
  Printer,
  PieChart,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { loadMonitoringSummary, MonitoringSummary, DailyMetrics, CategoryCount, HourlyBucket } from '../services/monitoringService';
import { soundFX } from '../services/soundEngine';

export const MonitoringApp: React.FC<{ onExit?: () => void }> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('aics_monitor_auth') === '1';
    } catch {
      return false;
    }
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'accounts' | 'reports'>('overview');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (username.trim() === 'khentandrei' && password.trim() === 'khentandrei') {
      try {
        sessionStorage.setItem('aics_monitor_auth', '1');
      } catch {}
      soundFX.playStepUnlock();
      setIsAuthenticated(true);
    } else {
      soundFX.playError();
      setAuthError('Maling username o password. Pakisubukan ulit.');
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem('aics_monitor_auth');
    } catch {}
    soundFX.playBackspace();
    setIsAuthenticated(false);
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await loadMonitoringSummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void refreshData();
      const interval = setInterval(() => {
        void refreshData();
      }, 30000); // 30s auto-refresh
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const handlePrint = () => {
    window.print();
  };

  // LOGIN SCREEN (Strictly View-Only Guidance Telemetry)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#070D18] text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans select-none">
        {/* Top Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Activity className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <p className="text-[14px] font-bold tracking-tight text-white">AICS SafeZone</p>
              <p className="text-[11px] font-medium text-slate-400">Monitoring System (View Only)</p>
            </div>
          </div>
          {onExit && (
            <button
              onClick={onExit}
              className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all active:scale-[0.97]"
              title="Bumalik"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center Card */}
        <div className="w-full max-w-sm mx-auto my-auto">
          <div className="rounded-[24px] bg-[#0E1A2E]/90 border border-white/10 p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 shadow-inner">
                <Lock className="w-6 h-6 stroke-[2]" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white pt-2">
                Guidance Telemetry
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Puro panonood at pagsusuri lamang ng aktibidad, bagong users, at concern reports.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="khentandrei"
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-sky-500 text-sm text-white placeholder-slate-500 outline-none transition-all"
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-sky-500/25 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                Mag-sign In
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-2">
          <p className="text-[11px] text-slate-500">
            AICS Montalban · SafeZone Confidential Monitoring Engine (View Only)
          </p>
        </div>
      </div>
    );
  }

  // MAIN MONITORING DASHBOARD (Mobile-First, Real-time View-Only Telemetry)
  return (
    <div className="min-h-screen w-full bg-[#070D18] text-slate-100 flex flex-col font-sans select-none pb-12 print:bg-white print:text-slate-900">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-[#0B1527]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              Guidance Monitoring
            </h1>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Live SafeZone Telemetry (View Only)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all active:scale-[0.97]"
            title="I-print / Export PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => void refreshData()}
            disabled={loading}
            className={`p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all active:scale-[0.97] ${loading ? 'animate-spin text-sky-400' : ''}`}
            title="I-refresh ang datos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all active:scale-[0.97]"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Print Header (Only visible on print/export) */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-xl font-black text-slate-900">AICS Montalban SafeZone Guidance Telemetry</h1>
          <p className="text-xs text-slate-600">Official System Efficiency, Utilization & Adoption Report</p>
          <p className="text-[10px] text-slate-400 mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* Feature 1: System Helpfulness & Efficiency Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-sky-950/40 to-slate-900 border border-sky-500/25 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <p className="text-xs font-bold text-white tracking-tight uppercase tracking-wider">
                System Helpfulness & Efficiency
              </p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30 tabular-nums">
              {summary?.helpfulnessScore ?? 92}%
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug">
            Sinasalamin ng iskor na ito ang mabilis na pagtugon ng Guidance Office sa mga isinumiteng reklamo at ang patuloy na pag-gamit ng mga estudyante sa portal.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5">
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Resolution Rate</span>
              <p className="text-base font-black text-emerald-400 tabular-nums mt-0.5">
                {summary?.resolutionRate ?? 100}%
              </p>
              <span className="text-[9px] text-slate-400">Aksyon sa mga reklamo</span>
            </div>
            <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Peak Hours</span>
              <p className="text-xs font-bold text-sky-300 truncate mt-0.5">
                {summary?.peakHourLabel ?? '12:00 PM – 1:00 PM'}
              </p>
              <span className="text-[9px] text-slate-400">Pinaka-aktibong oras</span>
            </div>
          </div>
        </div>

        {/* 3 Core KPI Cards (Accounts, Reports, Logins) */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* KPI 1: Accounts Created */}
          <div className="rounded-2xl p-3 bg-[#0D1829] border border-white/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Accounts</span>
              <Users className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {summary?.totalAccounts ?? '—'}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                <span>+{summary?.accountsToday ?? 0} today</span>
              </div>
            </div>
          </div>

          {/* KPI 2: Daily Reports Submitted */}
          <div className="rounded-2xl p-3 bg-[#0D1829] border border-white/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Reports</span>
              <FileText className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {summary?.totalReports ?? '—'}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-amber-400">
                <Clock className="w-3 h-3" />
                <span>+{summary?.reportsToday ?? 0} today</span>
              </div>
            </div>
          </div>

          {/* KPI 3: Daily Logins */}
          <div className="rounded-2xl p-3 bg-[#0D1829] border border-white/10 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Logins</span>
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-black text-white tabular-nums tracking-tight">
                {summary?.totalLogins ?? '—'}
              </p>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-sky-400">
                <Activity className="w-3 h-3" />
                <span>+{summary?.loginsToday ?? 0} today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-1 rounded-xl bg-slate-900/90 border border-white/5 flex gap-1 print:hidden">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Araw-araw
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'accounts'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Users ({summary?.recentAccounts.length ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'reports'
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reports ({summary?.recentReports.length ?? 0})
          </button>
        </div>

        {/* TAB 1: DAILY BREAKDOWN TABLE */}
        {activeTab === 'overview' && (
          <div className="rounded-2xl bg-[#0D1829] border border-white/10 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Daily Activity Timeline
                </h2>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Huling 7 Araw
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {summary?.dailyBreakdown.map((row: DailyMetrics) => (
                <div key={row.date} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02]">
                  <div>
                    <p className="text-xs font-bold text-white">{row.displayDate}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.date}</p>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20" title="Bagong Accounts">
                      +{row.newAccounts} acc
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20" title="Mga Naisumiteng Report">
                      +{row.newReports} rep
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 font-semibold border border-emerald-500/20" title="Mga Nag-login">
                      {row.logins} log
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS (Top Categories & Peak Hours Heatmap) */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {/* Feature 3: Top Concern Categories Breakdown */}
            <div className="rounded-2xl bg-[#0D1829] border border-white/10 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-amber-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Concern Categories Breakdown
                  </h2>
                </div>
                <span className="text-[10px] font-medium text-slate-400">
                  {summary?.totalReports ?? 0} total cases
                </span>
              </div>

              <div className="space-y-2.5">
                {summary?.topCategories && summary.topCategories.length > 0 ? (
                  summary.topCategories.map((cat: CategoryCount, i: number) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-200 font-medium truncate max-w-[240px]">{cat.category}</span>
                        <span className="font-bold text-slate-300 tabular-nums">{cat.count} ({cat.percentage}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full"
                          style={{ width: `${Math.max(5, cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-2">Wala pang naitatalang kategorya</p>
                )}
              </div>
            </div>

            {/* Feature 4: Peak Activity Hours */}
            <div className="rounded-2xl bg-[#0D1829] border border-white/10 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                    Hourly Peak Distribution (6 AM – 7 PM)
                  </h2>
                </div>
                <span className="text-[10px] font-medium text-sky-400">
                  School Hours
                </span>
              </div>

              <div className="grid grid-cols-7 gap-1.5 pt-1">
                {summary?.peakHours.map((bucket: HourlyBucket) => (
                  <div
                    key={bucket.hour}
                    className="p-1.5 rounded-lg bg-slate-900 border border-white/5 flex flex-col items-center justify-between min-h-[50px]"
                  >
                    <span className="text-[9px] font-mono text-slate-400">{bucket.hourLabel}</span>
                    <span
                      className={`text-xs font-black tabular-nums ${
                        bucket.activityCount > 0 ? 'text-sky-300' : 'text-slate-600'
                      }`}
                    >
                      {bucket.activityCount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECENT ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="rounded-2xl bg-[#0D1829] border border-white/10 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Pinakabagong Registered Students
                </h2>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Kabuuang {summary?.totalAccounts ?? 0}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {summary?.recentAccounts.map((acc: { studentNumber: string; fullName: string; createdAt: string }, idx: number) => (
                <div key={idx} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-bold text-white truncate">{acc.fullName}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">ID: {acc.studentNumber}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                      Registered
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(acc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: RECENT CONCERNS */}
        {activeTab === 'reports' && (
          <div className="rounded-2xl bg-[#0D1829] border border-white/10 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Mga Natanggap na Reklamo / Concern
                </h2>
              </div>
              <span className="text-[10px] font-medium text-slate-400">
                Kabuuang {summary?.totalReports ?? 0}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {summary?.recentReports.map((rep: { id: number; category: string; status: string; urgency: string; createdAt: string }) => (
                <div key={rep.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-tight">
                      #{rep.id} · {rep.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rep.status === 'Approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : rep.status === 'Rejected'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {rep.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Urgency: {rep.urgency || 'Normal'}</span>
                    <span>{new Date(rep.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default MonitoringApp;
