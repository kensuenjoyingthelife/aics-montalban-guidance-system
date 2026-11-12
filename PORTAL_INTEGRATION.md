# Student Portal ↔ Guidance Desktop — integration rules

For: whoever builds the **student web / mobile portal** in this same repository.
The desktop app (Guidance Office) is built in parallel. Follow these rules so both work together.

## 1. Which files belong to whom

| Owner | Files |
|---|---|
| **Portal** | `src/pages/StudentAuthGate.tsx`, `src/pages/StudentDashboard.tsx`, `src/services/studentAuthService.ts`, `src/services/devicePerformance.ts`, new `src/portal/**` files |
| **Desktop** (do not edit) | `src/pages/DashboardPage.tsx`, `Stage3CasesHub.tsx`, `ParentsHub.tsx`, `ConcernsHub.tsx`, `ReferralQueue.tsx`, `AuditTrail.tsx`, `ReportsHub.tsx`, `SettingsPage.tsx`, `LoginGate.tsx`, `src/components/cases/**`, `src/components/students/**`, `src/services/appConfig.ts`, `concernsDb.ts`, `referralsDb.ts`, `auditDb.ts`, `reportStats.ts`, `printForms.ts`, `scheduling.ts`, `parentComms.ts`, `server/**`, `scripts/*.sql` |
| **Shared** (small, careful edits only; never reformat the whole file) | `src/App.tsx`, `src/index.css`, `src/context/*`, `src/services/supabaseClient.ts` |

Never run code formatters on the whole repo.

**Git: never undo the desktop's work.** Both tools edit this folder at the same time, and desktop changes are often not committed yet.
- Do **not** run `git checkout -- <file>`, `git restore`, `git reset --hard`, `git stash`, or `git clean` on files you do not own (or on the whole repo). On 2026-11-12 22:31 this erased desktop work in `DashboardPage.tsx` and `stage3MockData.ts`.
- Commit only your own files: `git add <your files>`, never `git add -A` / `git commit -a` when desktop files show as changed.
- If a desktop file blocks you, leave it and tell the user.

## 2. A concern sent from the portal must use these tables (already in Supabase)

### `student_concerns`: one row per concern
| column | value from the portal |
|---|---|
| `referral_code` | unique, e.g. `CON-<time-base36>` |
| `student_name`, `grade_section`, `student_number` | from the signed-in student |
| `account_id` | `portal_accounts.id` of the student |
| `submitted_by` | `'Student portal'` |
| `category` **and** `concern_type` | type of concern (same text in both) |
| `summary_en`, `summary_tl` | first 160 letters of what happened |
| `what_happened`, `happened_when`, `happened_where`, `who_involved`, `witnesses` | the guided statement |
| `is_urgent` (bool), `urgency` (`'Urgent'` / `'Normal'`) | "Happening now" toggle |
| `is_confidential` (bool) | Normal / Confidential toggle |
| `truthful` (bool) | Statement of truthfulness (required = true) |
| `status` | always `'Pending'` when sent |

The office sets `status` to `'Approved'` or `'Rejected'` (with `reject_reason`, which the student may see), and sets `chat_status` to `'None'`, `'Open'` or `'Closed'`.

### `concern_messages`: the chat (only when `chat_status = 'Open'`)
`concern_id` (bigint → `student_concerns.id`), `sender` = `'student'` (office messages are `'office'`, shown as "Guidance Office"), `body` (1–2000 letters). Messages cannot be edited or deleted.

### `portal_accounts`: student accounts
`student_number`, `full_name`, `email`, `status` (`'Active'` / `'Deactivated'`). A deactivated account must not be able to sign in or send concerns. The office blocks fake accounts from the desktop app.

## 3. Rules from the manuscript (must hold in the portal)
- A student **never** sees case records, offenses, other students or any office data. Show only **their own** concerns, status and chat.
- No anonymous reports (confidential is allowed). No chat before the office approves the concern.
- No emergency alarm; "Happening now" only marks the concern as urgent.
- **Security before going live:** turn on Row Level Security so a student can read and write only their own `student_concerns`, `concern_messages` and `portal_accounts` rows. Today the anon key can read every table, and the office data must not be reachable from a student device.

- **Storage privacy (fix now):** the `student-ids` bucket is **public**, so anyone with a link can open a student's ID or selfie. Make it **private** (`public = false`) and show the photos only through short-lived **signed URLs**, the way the desktop's `case-evidence` bucket does (`src/services/evidenceDb.ts` → `signedEvidenceUrl`). Delete the photos after the number of days in Settings › Backup & retention (`app_settings.retention.idImageDays`).

## 4. Running both apps
- Desktop app: in Tauri, or in the browser with `?mode=staff`.
- Student portal: default web route.
- Do not change table columns that the desktop uses. Add new columns instead, and tell the desktop side.
