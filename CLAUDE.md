# AICS Guidance Office Management System — rules for anyone coding here

Capstone: *Guidance Office Management System with SMS-based Parent Follow-Up and Student Concern
Reporting for Student Discipline* (AICS Montalban). Desktop app for the Guidance Office + student
portal (website + Android). Stack today: React + TypeScript + Vite + Tailwind, Supabase.

## UX Golden Rules (check every one before finishing any change)

The office has one non-technical guidance associate. A first-time user must never need to *study*
the system.

1. **One main action per screen.** The most common task gets the single primary button
   (e.g. "+ New Case"). Rare actions go in secondary buttons/menus.
2. **No dead ends.** Never show developer text ("Stage 5 module", "zero layout shift"). Unfinished
   parts show a calm "Coming soon" or are hidden.
3. **Plain words, same word everywhere.** Simple English / modern Taglish a 15-year-old understands.
   One term per concept across the app (always "Attended / Did not attend"). No unexplained codes.
4. **What needs attention comes first.** Pending/urgent on top; finished items collapsed or last.
   Every number/badge says what it counts.
5. **Looks clickable → is clickable.** KPI cards and badges open the list behind them. Icon-only
   buttons need a visible label or a clear tooltip.
6. **Say what happened and what is next.** Confirmation after an action plus the obvious next step.
   Errors say what is wrong **and how to fix it**.
7. **Prevent mistakes, allow undo.** Before→After confirm for changes that leave the system or cannot
   be undone; Undo for quick reversible actions; live validation (mobile = 09 + 11 digits).
8. **Fits 1366×768, nothing cut off** (manuscript minimum display). No truncated labels or wrapped
   buttons.
9. **No lag.** Animate transform/opacity only, heavy work off the main thread, paginate long lists,
   test on a throttled CPU.
10. **Guide the first visit.** Quick Guide and empty states tell the user what to do first.
11. **Stay inside the manuscript scope** (below).

Workflow: say which files will change before editing; list what changed afterwards; self-QA the
rules at 1366×768 in light and dark mode and report any rule not yet met. If only a document/PDF
update is requested, do not change code without asking.

## Out of scope (manuscript §1.6) — never build

- Access for principal, teachers, advisers, or parents (parents get SMS + optional email only)
- Separate bullying module, anonymous reporting (confidential is allowed), emergency alarm
- Counseling notes, psychological testing, career guidance
- Import of the office's *old Excel case records* (the student masterlist import is required)
- SMS replies from parents, DepEd LIS link, iOS app, offline mode
- Offense details in any SMS/email; the Priority Follow-Up mark in SMS
- Students or parents seeing any case record; concern chat before approval
- Removed FOREVER by the user (2026-11-12, crossed out = never build, never in the manuscript): Community Service page, Clearance page/badges, refer-out safeguard,
  ID image view log, ID Holds (page, alert, Settings rule — removed by the user 2026-11-12). (Manual add/edit student was crossed out but RESTORED on 2026-11-12 at the Guidance Office's request.)

## Required anchors (manuscript)

6-digit PIN + 6-character email OTP, lockout, auto sign-out, audit trail that cannot be edited,
SMS in Filipino, reminder one day before, desktop pages as in
`AICS-SYSTEM-FEATURES-FLOWCHART-UPDATED.pdf`.

## Hardware & software requirements LOCK (manuscript Ch. 3, set by the user 2026-11-17)

The system must stay inside this list. **Before building anything that needs hardware or software NOT on it
(new library, service, cloud feature, device, OS), STOP and tell the user first: "Lagpas ito sa requirements
ng manuscript, bawal na." Do not build it unless the user says to and the manuscript list is updated too.**

- Hardware: Windows 10/11 64-bit PC (Core i3, 4 GB RAM, 500 MB free), statement station (same PC or a 2nd
  Windows PC/tablet with keyboard), 1366×768 display, keyboard + mouse, printer (A4/short bond), student's
  Android 7.0+ (API 24) phone with camera (or a browser device with camera), internet.
- Software: Windows 10/11, Tauri 2 + WebView2, React + TypeScript, Vite, Tailwind CSS, Framer Motion + Lucide,
  read-excel-file (CSV = own parser), jsPDF + html2canvas, Supabase (PostgreSQL, Auth, RLS, Storage, Edge Functions),
  PhilSMS API, Gmail SMTP (via Edge Function), Vercel (portal website), Capacitor 8, Chrome/Edge/Firefox/Safari,
  Android 7.0 (API 24)+, Node.js 22.12+, Rust + MS C++ Build Tools, Android Studio + JDK 21, Git + GitHub.
- Supabase Auth ADDED by the user on 2026-11-17 (security #1). The manuscript must be updated too (see
  memory supabase-auth-manuscript). Still NOT in the list: Supabase Realtime, Supabase Cron (pg_cron).
