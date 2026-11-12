# AICS Guidance Office Management System — Master Architecture, UI/UX & Security Blueprint (2026 Edition)

> **System Title:** Guidance Office Management System with SMS-based Parent Follow-Up and Student Concern Reporting for Student Discipline  
> **Client / Locale:** Asian Institute of Computer Studies – Montalban (AICS Montalban)  
> **Phase 1 Priority:** Desktop Application (Guidance Associate & Consultant Guidance Counselor)  
> **Future Phases:** Student Portal (Web Application on Vercel + Android Application via Capacitor 8)  

---

## 1. Multi-Disciplinary 8-Role Engineering & Deep QA Squad (Active from Stage 1 to Stage 9)

Sa pagbuo ng **AICS Guidance Office Management System** mula **Stage 1 hanggang matapos ang buong system (Stage 9)**, tayo ay kikilos bilang isang **8-Role Elite SaaS Engineering & Deep QA Team** (5 Core Builders + 3 Specialized Deep QA & Security Auditors):

| Position | Main Responsibility | Deliverable sa AICS System (Stage 1 to Stage 9) |
| :--- | :--- | :--- |
| **1. UI/UX Designer** *(Builder)* | Design, visual hierarchy, contrast, & usability | Bespoke **"AICS Spirit & Crest"** Design System, royal hero banner, glowing `IconTile` system, collapsible sidebar, 6-color status system, at **15-year-old friendly English / Modern Conversational Taglish** microcopy. |
| **2. Senior Frontend Engineer** *(Builder)* | Actual UI implementation & state architecture | Clean React 19 + TypeScript + Tailwind CSS + customized `shadcn/ui` primitives, tactile `Button`, live-validated `Input`/`Select`, Recharts analytics, at 100% end-to-end wiring ng 17 Desktop Pages + 7 Student Portal Pages. |
| **3. Motion UI Engineer** *(Builder)* | Animations & micro-interactions | **Motion (Framer Motion)** + **GSAP** + **View Transitions API** (Circular Dark/Light Mode Reveal, smooth collapsible sidebar rail, `.btn-press` tactile feedback, `.card-lift` hover physics, at staggered `.anim-rise` card entrances). |
| **4. Frontend Performance Engineer** *(Builder)* | Smoothness, 60fps rendering & zero lag | Virtualized tables (`@tanstack/react-virtual`), isolated leaf clocks (`Clock24`), route code-splitting, debounced realtime count refresh (`150ms`), at GPU-only animations (`transform`/`opacity`). |
| **5. Tauri 2 / Rust & Cloud Engineer** *(Builder)* | Desktop, native OS, SMS & Gmail integration | **Tauri 2 (Rust Backend)** + **Supabase + Semaphore SMS + Free Gmail (`aicsmontalbansafeguard@gmail.com`)**, native OS encrypted PIN vault, hardware-locked Kiosk mode para sa *Student Statement Station*, at direct A4/Short Bond silent printing. |
| **6. Lead SDET / Automation QA Architect** *(Deep Tester)* | Deep functional, button, modal & edge-case stress testing | Sinusubukan at pini-pindot ang **bawat button, form, modal, at workflow** gamit ang **Vitest + Playwright**; tine-test ang maling inputs (maling PIN, kulang na number, expired OTP, duplicate ID) at chine-check ang 100% ng **Manuscript §3.6 Test Cases**. |
| **7. UI/UX & Visual QA Inspector** *(Deep Tester)* | Pixel, alignment, Light/Dark contrast & `EN/Taglish` audit | Chine-check ang **bawat screen sa Light Mode at Dark Mode**, sinisiguradong walang sabog na label/input box, pantay ang icons at text (`.icon-text`), at gumagana ang **`EN · Simple English` ↔ `TL · Modern Taglish`** switcher sa lahat ng salita. |
| **8. Security & Data Privacy Auditor** *(Deep Tester)* | DPA 2012, PIN lockout, RLS & Audit Trail verification | Chine-check kung naka-block ang app hangga't walang tamang PIN (`123456`), kung gumagana ang 5-try OTP lockout, kung **walang offense details** sa SMS/Gmail, at kung bawat galaw ay naka-log sa **Audit Trail**. |

---

## 2. 2026 AICS "Crest & Royal Hero" Design System (Better Than Reference Screenshot)

Sinuri natin kung bakit sobrang ganda at **hindi mukhang AI-default** ang in-upload mong reference screenshot (at ang `C:\CAPSTONEWEB\19-clean-2` design system) at **ia-upgrade pa natin ito nang mas maganda at 100% konektado sa Official AICS Logo (`1996 Excellence`)**:

### 2.0 Official AICS Brand Color Palette (Extracted Directly from Official AICS Logo & `facebook.com/aics.edu.ph`)

Hinding-hindi tayo gagamit ng yellow/orange theme ng ibang school—ang buong system natin ay **100% nakatali sa Official AICS Seal (`1996 Excellence`) at Official AICS Facebook Page (`facebook.com/aics.edu.ph`)**:

| AICS Brand Token | Hex Code | Saan Kinuha sa AICS Logo / FB Page | Saan Gagamitin sa System |
| :--- | :---: | :--- | :--- |
| **AICS Deep Oxford Navy** | `#0B1F4D` → `#132E6B` | Outer dark blue wave & crest shadow ng AICS Logo | Sidebar background, Hero Band base, at Login Left Brand Panel |
| **AICS Royal Cobalt Blue** | `#1E469B` → `#2557BE` | Main royal blue ribbon & triangle peak ng AICS Logo | Primary buttons (`--grad-brand`), active PIN boxes, at Header Hero gradient |
| **AICS Sky Azure Wave** | `#4E92DF` → `#7CB8F7` | Upper swooping sky-blue waves sa likod ng AICS Seal | Moving SVG waves (`WavyBackground`), second-line gradient text (`Computer Studies · Montalban`), at active glow rings |
| **AICS Crest Periwinkle Ice** | `#CFD9F2` → `#E4ECFC` | Inner circular ring (`ASIAN INSTITUTE OF COMPUTER STUDIES`) | Card top accent bar, AICS Seal outer halo ring, soft pill backgrounds, at subtle borders |
| **AICS Shield Silver-White** | `#F4F7FC` / `#FFFFFF` | Silver metallic shield & `"Excellence"` banner sa gitna ng logo | Main workspace canvas (`#F4F7FC`), elevated crisp white cards (`#FFFFFF`), at high-contrast typography |

### 2.1 Ang 6 Secret Ingredients na Gagawin Natin (At Paano Pa Mas Gagandahan):

1. **Layered Royal Hero Band + Floating Bento Stat Cards (`AdminLayout` + `AdminHeader` Upgrade):**
   * **Ang Maganda sa Screenshot:** May malalim na Royal/Cobalt Blue Hero Band (`230px` height) sa itaas na may fine dot-matrix pattern (`.pattern-dots`) at radial glow, tapos yung unang hilera ng puting Stat Cards ay **nakapatong/lumulutang sa hati ng blue hero at soft alabaster background (`#F2F5FB`)**.
   * **Paano Mas Gagandahan para sa AICS:** Gagamitin natin ang **Official AICS Crest Blues** (`#0A1938` Deep Oxford → `#163B88` AICS Mountain Royal → `#2563EB` Wave Cobalt) na may subtle **Periwinkle Silver-Ice glow** sa gilid. Sa kaliwa ng Header ay may **Frosted Glass (`backdrop-filter: blur(12px)`) Module Icon Tile** (hal. `56×56px` glass box para sa Dashboard, Cases, o Appointments).
2. **Tactile `IconTile` System + Custom Dual-Tone Icons (Lucide + Phosphor Duotone SVG Engine):**
   * **Bakit Hindi Mukhang AI ang Icons sa Screenshot:** Hindi sila gumamit ng hubad na line icons lang. Bawat icon ay nakalagay sa isang **`IconTile`** (`rounded-[12px]`) na may **2 variants**:
     * **`variant="solid"` (Sidebar & Top Stat Cards):** May sariling rich gradient (`--h-grad`), `1px` top inner shine (`inset 0 1px 0 rgba(255,255,255,0.28)`), colored under-glow (`0 6px 16px -6px var(--h-glow)`), at **soft radial corner aura (`blur-2xl opacity-16`)** sa kanang itaas ng Stat Card!
     * **`variant="soft"` (Action Rows & Lists):** Tinted soft background (`--h-soft`) na may `1px` colored inner border (`inset 0 0 0 1px var(--h-border)`) at crisp colored icon.
   * **9 Module Category Hues (`blue`, `sky`, `violet`, `emerald`, `amber`, `rose`, `teal`, `orange`, `slate`):** Bawat isa sa 17 pages ng AICS Guidance System ay may sariling signature `IconTile` hue para isang sulyap pa lang, alam na agad ng staff kung nasaang module siya.
3. **Interactive Collapsible Sidebar (`264px` Full Menu ↔ `76px` Icon Rail):**
   * May **dedicated Minimize/Expand toggle button (`« Collapse menu` / `»`)** sa Sidebar!
   * Kapag naka-minimize (`76px` rail), nakalutang nang malinis ang mga glowing `IconTile` boxes na may live notification count badges sa kanto (hal. red pill `3` sa *Submitted Reports*) at instant floating tooltips pag tinapatan ng mouse.
   * Sa ibaba ng Sidebar ay ang **AICS Staff Profile Card** (may silver-gold crest ring sa avatar) at malinaw na `Sign out` button.
4. **Bespoke Tactile Buttons (`Button.jsx` Upgrade — Zero Boring Default Buttons):**
   * Lahat ng buttons ay may:
     * **Inner Specular Highlight:** `shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]` + brand-tinted drop shadow (`--shadow-brand`).
     * **Physical Press & Lift Physics:** Pag tinapatan ng mouse ay umaangat nang bahagya (`hover:-translate-y-px hover:brightness-110`), at pag pinindot ay may spring press (`active:scale-[0.97]`).
     * **Fixed Optical Alignment (`.icon-text`):** Hindi kailanman magkakahiwalay o malilihis ng linya ang icon at ang text sa loob ng button.
5. **High-Craft Input Fields & Selects (`Input.jsx` Upgrade — With Live Status Badges):**
   * Bawat input box at dropdown ay may:
     * **Top Label + Live Field Status Pill:** Sa tabi mismo ng label, makikita agad kung `Required`, `✓ Ready` (green), o `Needs check` (amber/red) habang nagta-type pa lang!
     * **Tactile Surface & Halo Focus:** `h-10` (`40px`) crisp box, left-hand contextual icon, `#CDD6E6` border sa Light Mode (`#2C3A63` sa Dark Mode), at `4px` soft focus ring (`focus:ring-4 focus:ring-[var(--accent-soft-2)]`) pag na-click.
     * **Zero-Jump Error Slot:** Ang error message na may icon ay pumapalit nang maayos sa hint line para hindi tumatalon ang layout.
6. **Circular Reveal Dark Mode & Light Mode Toggle (`startViewTransition`):**
   * Sa kanang itaas ng Header (katabi ng frosted `Clock24` live digital clock at Language Switcher), ang Sun/Moon glass button ay nagti-trigger ng **smooth circular clip-path reveal** na lumalaki sa buong screen, habang umiikot nang swabe ang Sun/Moon icon (`.theme-icon-in`).

---

## 3. "Modern 2026 Taglish" vs. Simple English Language Switcher (Inspired by `panelista.vercel.app`, Upgraded UI)

Gaya ng hiniling mo:
1. **Walang malalim o robotikong English** (bawal ang mga salitang *"instantiate"*, *"ameliorate"*, *"subsequent to"*). Dapat **Simple, Everyday English** na kahit 15-year-old Grade 11 student o bagong staff ay maiintindihan agad sa unang basa.
2. **Walang malalim/makatang Tagalog** (bawal ang *"talaksan"*, *"kabatiran"*, *"patnugot"*). Kapag pinili ang Tagalog, ang gagamitin ay **Modern 2026 Conversational Taglish** (gaya ng natural na pananalita sa `panelista.vercel.app`—hal. *"I-check ang mga bagong reports"*, *"Naka-hold pa ang ID"*, *"I-schedule ang parent conference"*).

### 3.1 Ano ang Tawag sa Feature na Ito at Paano Natin Mas Gagandahan ang Button?

Sa UI/UX engineering, ang tawag dito ay **"Segmented Locale Pill Switcher with Instant Context Dictionary (`useLanguage()`)"**.

Sa `panelista.vercel.app`, simpleng text word lang ang pindutan kaya minsan hindi halata na pwedeng pindutin. Sa **AICS Guidance System**, gagawin natin itong isang **Frosted Glass Segmented Pill Switcher** sa Header at Login Screen:

```
┌───────────────────────────────────────────────┐
│  🌐  [ 🇺🇸 English ]   [ 🇵🇭 Taglish (PH) ● ]  │
└───────────────────────────────────────────────┘
```

* **Visual Design ng Button:**
  * Nakalagay sa kanang itaas ng Header (katabi ng Live Clock at Dark Mode button) at sa Login/PIN screen.
  * May **sliding active pill animation (via Framer Motion `layoutId="lang-pill"`)** na lumilipat sa pagitan ng **`EN · English`** at **`TL · Taglish`** sa loob ng `150ms` nang walang page reload!
  * May maliit na tooltip pag tinapatan: *"Switch language: Simple English or Modern Taglish"*.

### 3.2 Sample Comparison ng Ating Copywriting (Simple English vs. Modern 2026 Taglish)

| Screen / Element | ❌ AI-Made / Deep Wording (BAWAL) | ✅ Simple English (`EN` Mode) | ✅ Modern 2026 Taglish (`TL` Mode) |
| :--- | :--- | :--- | :--- |
| **Dashboard Subtitle** | *Comprehensive disciplinary metric aggregation and longitudinal tracking* | **Today's work at a glance. Click any item to open it.** | **Mga kailangang asikasuhin ngayong araw. I-click lang para buksan.** |
| **Needs Attention Card** | *Pending parental summonses requiring immediate telephonic follow-up* | **Parents to call or text today** *(Missed an earlier meeting or SMS failed)* | **Mga magulang na kailangang tawagan o i-text ngayon** *(Hindi nakapunta o nag-fail ang SMS)* |
| **Early Intervention Alert** | *Threshold proximity warning: Subsequent minor infraction escalates to severe* | **Heads up: 1 minor offense on record. The next one counts as a serious offense.** | **Paalala: May 1 minor offense na. Magiging serious offense na kapag nasundan pa.** |
| **Masterlist Import** | *Execute schema normalization and deduplication prior to database ingestion* | **Upload the Excel enrollment list. We'll highlight any missing info or duplicate IDs so you can fix them before saving.** | **I-upload ang Excel masterlist. Ipapakita muna ng system kung may kulang na info o dobleng Student ID para ma-check mo bago i-save.** |
| **Student Statement Station** | *Initiate restricted kiosk environment for student deposition entry* | **Open locked screen for the student's written statement (*Malayang Salaysay*). Other records stay hidden.** | **Buksan ang locked screen para makapag-type ng *Malayang Salaysay* ang estudyante. Nakatago ang ibang records.** |
| **Refer-Out Safeguard** | *Suppress automated outbound communications for sensitive external referrals* | **Sensitive case safeguard: Stops all automatic parent texts and hides case details.** | **Sensitive case protection: Kusang ititigil ang automatic SMS sa magulang at itatago ang detalye ng case.** |

*(Note: Ang mga opisyal na Status Badges na nasa Manuscript gaya ng `Reported`, `Attended`, `Pending`, `Cleared`, at `Urgent` ay mananatiling consistent para 100% tugma sa Chapters I–III at sa Test Cases, habang ang lahat ng paliwanag, buttons, guides, at helper texts ay sumusunod sa `EN / Taglish` switcher!)*

---

## 4. Recommended & Validated Technology Stack (Tauri 2 + Rust + React 19 + Motion + GSAP)

Pinagsama natin ang iyong **Recommended Tauri 2 Stack** at ang mga requirements sa **Manuscript (§3.9)** at **Verification Document (Item V12)**:

| Category | Selected Technology | Role sa AICS Guidance Desktop System |
| :--- | :--- | :--- |
| **Desktop Framework** | **Tauri 2** | Ultra-fast, lightweight (~15MB installer vs ~150MB sa Electron), mababa sa RAM (kayang-kaya ang 4GB RAM minimum requirement sa §3.8), at native Windows WebView2 rendering. *(Kasama sa plano ang exact 4-line update list para sa Manuscript V12 kung papalitan ang salitang Electron ng Tauri 2).* |
| **Native Backend** | **Rust (`src-tauri`)** | Nagha-handle ng: <br>1. **Local 6-Digit PIN Argon2/SHA-256 Vault** <br>2. **True OS-Level Kiosk Lock** para sa *Student Statement Station* <br>3. **Fast Local Backup Encryption & File Export** <br>4. **Native Window Controls & Zoom (`set_zoom`)** |
| **Frontend Framework** | **React 19 + TypeScript + Vite** | Instant HMR, strict types para sa lahat ng 17 pages at database models. |
| **Styling & Tokens** | **Tailwind CSS + CSS Custom Properties (`index.css`)** | Dual-theme (`[data-theme="light"]` at `[data-theme="dark"]`) AICS tokens, `.bg-hero`, `.bg-shell`, `.glass`, at `.hue-*` category scopes. |
| **UI Components** | **Customized `shadcn/ui` (Radix Primitives) + Bespoke AICS Components** | Accessible dialogs, popovers, command palette (`Ctrl+K`), slide-over drawers, at custom `IconTile`, `StatCard`, `Button`, at `Input`. |
| **UI Animations** | **Motion (`framer-motion`)** | Smooth sidebar collapse (`264px ↔ 76px`), segmented `EN / Taglish` pill slide, modal/drawer spring transitions, at optimistic list reordering. |
| **Advanced Animations** | **GSAP (GreenSock)** | Para sa **AICS Crest Initial Boot Splash Screen** (orbital ring + crest reveal) at smooth number counter roll-ups sa Dashboard KPI cards. |
| **Icons** | **Lucide Icons + Custom Phosphor Duotone SVG Engine** | `Lucide` para sa crisp UI controls at **Custom Duotone SVGs** sa loob ng glowing `IconTile` boxes (gaya ng nasa screenshot mo). |
| **Charts & Visuals** | **Recharts + Custom Conic/Progress Rings** | Para sa Dashboard review/attendance rings at **Page 14 (Reports and Statistics)**—Offense trends, Recidivism rate, at Monthly summaries. |
| **Cloud & Services** | **Supabase (PostgreSQL, Auth, RLS, Storage, Realtime, Edge Functions, `pg_cron`) + Semaphore SMS + Resend Email + SheetJS** | Ang shared online backend para sa Desktop App, Student Web Portal (Vercel), at Android App (Capacitor 8). |
| **QA & Testing** | **Vitest + Playwright** | Automated testing para sa lahat ng Section 3.6 Functional Test Cases. |

---

### 4.1 World-Class Zero-Lag Micro-Interaction & Animation Matrix (Top 1–5 Best Animations per System Part!)

Alinsunod sa ating **Golden Rule (100% Zero Lag, 60fps GPU-Only `transform` & `opacity`, 4GB RAM friendly)**, pinili ng ating **Motion UI Engineer** at **Frontend Performance Engineer** ang **Top 5 Pinaka-Aesthetic na Micro-Animations (Apple macOS / Linear / Stripe / Vercel Design Standard)** para sa **bawat parte ng system**:

#### 🖱️ A. Sa Pag-Click at Buttons (Tactile Click & Hover Physics)
1. **Top 1 — Spring Tactile Press (`.btn-press`):** Pag pinindot ang kahit anong button o keypad, lumulubog nang `scale(0.97)` sa loob ng `90ms` at bumabalik nang may spring physics (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
2. **Top 2 — Specular Top-Edge Shine & Hover Lift:** Bawat primary button ay may `1px` inner glass highlight sa itaas at umaangat ng `translateY(-1.5px)` na may AICS Royal Blue under-glow pag tinapatan ng mouse.
3. **Top 3 — Morphing Action Button (`Idle → Sending → ✓ Sent`):** Imbes na mag-freeze ang button pag nag-click ng *Send SMS/Gmail* o *Save*, ang label sa loob mismo ng button ay dumudulas pataas at nagiging **animated checkmark (`✓ Sent!`)** nang hindi nagbabago ang lapad ng button!
4. **Top 4 — Sliding Pill Indicator (`layoutId` Magnetic Pill):** Kapag naglilipat ng tab (`EN ↔ Taglish`, `Weekly ↔ Monthly ↔ Yearly`, o Sidebar menu), yung active highlight pill ay **dumudulas nang parang magnet** papunta sa pinindot mong button!
5. **Top 5 — Keypad Ripple & Glow Pop:** Sa 6-Digit PIN pad, bawat pindot ng numero ay nagpapa-pop (`scale-105`) sa PIN box at umiilaw ng AICS Royal Cobalt gradient.

#### 🚀 B. Sa Loading & Booting (Zero Heavy Spinners!)
1. **Top 1 — GSAP Official AICS Seal Orbital Boot Splash (`< 550ms`):** Pagbukas ng Desktop App, ang Official AICS Seal (`1996 Excellence`) ay may manipis na **rotating Sky-Azure orbital ring (`SVG stroke-dashoffset`)** at smooth crest reveal na natatapos agad sa loob ng kalahating segundo!
2. **Top 2 — Instant Optimistic UI (`0ms` Perceived Loading):** Kapag nag-click ng `Attended` o `Did not attend`, **walang loading spinner**—agad-agad nagpapalit ng kulay ang row habang nagse-save sa background!
3. **Top 3 — Shimmering Glass Skeleton (`.skeleton`):** Kung may binubuksang malaking report, malinis na pearlescent shimmer (`translateX` GPU gradient) ang dadaan sa hugis ng card—walang nakakahilong umiikot na bilog.
4. **Top 4 — Staggered Cascade Card Entrance (`.anim-rise`):** Pagbukas ng page, ang 4 KPI Stat Cards at widgets ay umaangat nang sunod-sunod (`0ms, 50ms, 100ms, 150ms` delay) sa loob lang ng `380ms`.
5. **Top 5 — Smooth GSAP Number Counter Roll-Up:** Ang mga numero sa Dashboard (`24`, `17`, `38%`) ay swabeng umaakyat mula `0` sa unang bukas.

#### ✅ C. Sa Verification & Security (PIN, Email, OTP & Kiosk Lock)
1. **Top 1 — Active Focus Halo Ring (`box-shadow` transition):** Ang kasalukuyang PIN o OTP box na tina-type-an mo ay may malambot na AICS Sky-Azure halo ring na lumilipat nang kusa sa susunod na box bawat keystroke.
2. **Top 2 — Elastic Error Shake + Crimson Flash (`.anim-shake`):** Kapag mali ang 6-Digit PIN o OTP, umiiling nang pahalang (`-6px ↔ +6px` sa loob ng `350ms`) ang mga kahon at nagiging Rose Red ang border kasama ang malinaw na dahilan sa ibaba.
3. **Top 3 — SVG Checkmark Stroke Draw (`stroke-dashoffset`):** Pag tama ang PIN (`123456`) o OTP, isang malinis na emerald green checkmark ang iguguhit nang live (`250ms`) bago bumukas ang susunod na step.
4. **Top 4 — Horizontal Step Morph (`PIN → Email → OTP`):** Hindi nagre-reload ang buong screen—tanging ang laman lang sa loob ng kanang card ang dumudulas nang swabe (`translateX(16px)` + `opacity`).
5. **Top 5 — Security Shield Pulse (`Student Statement Station`):** Pag binuksan ang Locked Kiosk Mode para sa *Malayang Salaysay*, may sleek lock-shield animation sa header na nagpapaalalang protektado ang ibang records.

#### 🎨 D. Sa Status Changes, SMS/Gmail Sending & Alerts
1. **Top 1 — Live Pulse Beacon Dot (`URGENT` & `Happening Now`):** Ang red/emerald dot sa tabi ng *Urgent Concern* at *SMS & Gmail Ready* ay may malambot na radar pulse (`scale(1 → 1.8)` + `opacity(0.7 → 0)`).
2. **Top 2 — Interactive 6-Dot Case Stepper Fill:** Kapag umusad ang Case mula `Reported` papuntang `Parent Notified` hanggang `Closed`, ang progreso bar at mga bilog na step dots ay umiilaw nang sunod-sunod!
3. **Top 3 — Auto-Task Fly-In (Framer Motion `layout`):** Kapag minarkahan mo ng `Did not attend` ang magulang sa *Today's Appointments*, makikita mong **kusang mag-i-slide papasok ang bagong follow-up task** sa *Follow-Up Tasks Due* card nang real-time!
4. **Top 4 — Top-Center Floating Glass Toast (`.toast-in`):** Ang mga status messages (*"🟢 SMS & Gmail Sent Successfully!"* na may `Undo` button) ay bumababa nang swabe mula sa itaas-gitna ng screen (`translateY(-16px → 0)`).
5. **Top 5 — Animated Conic Donut & Bar Growth:** Ang Multi-Color Parent Attendance Donut Ring (`38% → 42%`) at ang `Weekly / Monthly / Yearly` graphs ay swabeng nag-a-adjust ng sukat kapag nagbago ang data o nagpalit ng timeframe!

#### 🌓 E. Sa Background, Sidebar & Theme Switching
1. **Top 1 — Luminous AICS Aura Ring + Interactive Day/Night Sky Pill (`startViewTransition`):** Ang ☀️ Light (may clouds) ↔ 🌙 Dark (may stars `✦`) pill switcher na nagti-trigger ng GPU circular/aura reveal sa buong screen nang **zero flicker**.
2. **Top 2 — 3-Layer GPU Sky-Azure Waves (`WavyBackground`):** Tatlong translucent waves sa Login screen na gumagalaw via `translate3d(-50%, 0, 0)` (0% CPU usage).
3. **Top 3 — Rotating AICS Guidance Shimmer Headlines (`HeadlineCarousel`):** Umiikot na Simple English / Modern Taglish phrases sa Login Brand Panel na may `.title-flow` white-to-azure shimmer.
4. **Top 4 — Smooth Collapsible Sidebar Rail (`264px ↔ 76px`):** Swabeng nagre-resize ang Navy Sidebar habang nananatiling nakasentro ang mga glowing `IconTile` boxes at lumalabas ang instant floating tooltips.
#### 🧭 F. Ang 5 "Human-First & Joyful UX" Rules Natin (Para Masarap Gamitin at Hindi Nakakahilo!)
Para siguradong **hindi nakakasira sa mata o sa bilis ng trabaho** ang mga animations at aesthetics natin, mahigpit na ipapatupad ng **UI/UX Designer** at **Visual QA Inspector** ang 5 batas na ito:
1. **Sub-200ms Micro-Feedback Rule:** Lahat ng button clicks, hover lifts, at tab switches ay nasa **`100ms hanggang 220ms` lang**—sapat para maramdaman ng user na *"buhay at responsive"* ang app, pero **hinding-hindi niya kailangang hintayin matapos ang animation bago makapag-click ulit**!
2. **Guided Eye-Flow (Hindi Sabog sa Mata):** Ang kulay at galaw ay ginagamit lang para **ituro sa mata ng user kung ano ang importante** (hal. umiilaw lang ang susunod na PIN box na ita-type mo, o nagpa-pulse lang ang 🔴 `Urgent` badge kapag may kailangang aksyunan). Walang umiikot o kumukurap na walang dahilan.
3. **Warm, Tactile Surfaces (Zero Flat/Patay na AI Cards):** Imbes na patay na puti at kulay-abo na parang default AI template, bawat card ay may malambot na depth (`--shadow-1`), `1px` crisp border, glowing `IconTile`, at malinaw na spacing para presko sa mata kahit 8 oras gamitin sa Guidance Office.
4. **Forgiving & Helpful UX (Walang Nakakakabang Dead-Ends):** Pag nagkamali ng pindot ang user, may **`Undo`** sa toast; pag kulang ang tinype sa input box, may malumanay na `Needs check` pill at malinaw na paliwanag kung paano ayusin.
5. **1-Click Self-Explanatory Controls:** Lahat ng icons sa Sidebar at Login ay may kasamang malinaw na label sa **Simple English / Modern 2026 Taglish** para kahit unang beses pa lang gumamit ng system (kahit 15-year-old student o bagong staff), alam agad kung ano ang pipindutin at mag-e-enjoy sa paggamit!

---

## 5. Complete Pre-Login & 17-Page Desktop Architecture

### Phase 0: Pre-Workspace Security & Authentication Flow (Figures 1–3 & 6)
1. **Screen 0A — GSAP AICS Crest Boot Splash (`< 600ms`):**
   * Official AICS Seal (`1996 Excellence`) sa gitna ng Deep Navy radial backdrop habang chine-check ng Rust backend ang local PIN vault.
2. **Screen 0B — 6-Digit Application PIN Gate (`/pin-lock`):**
   * **First-Install Default PIN:** **`123456`** (naka-hash sa Rust backend; pagpasok sa Dashboard ay may friendly reminder toast para palitan ito sa *Settings → Accounts & Security*).
   * May `EN / Taglish` toggle at Dark/Light mode button sa kanang itaas.
3. **Screen 0C — Staff Email Sign-In (`/login-email`):**
   * **Pre-Seeded Primary Admin/Associate Account:** **`aicsmontalbansafeguard@gmail.com`** (active `Guidance Associate + Admin` sa database para **100% makakapasok agad sa unang bukas**).
   * Nagpapadala ng **6-Character Alphanumeric OTP** via Supabase Edge Function + Resend API.
4. **Screen 0D — 6-Character OTP Verification (`/login-otp`):**
   * 6 tactile monospace boxes (`JetBrains Mono`), 5-minute expiry, single-use, 5-try lockout protection, at automatic Audit Trail logging pagpasok sa Dashboard.

---

### Phase 1 to 4: Ang 17 Desktop Pages (Grouped in Collapsible Navy Sidebar)

| Group | # | Page Name | Signature `IconTile` Hue | Key Features & Simple English / Taglish UX |
| :--- | :-: | :--- | :--- | :--- |
| **OVERVIEW** | **1** | **Dashboard** | `blue` (SquaresFour) | Royal Hero Header + `Clock24` + `EN/Taglish` pill + Top Red Urgent Banner + 4 Glowing Stat Cards (*Open Cases, Offenses This Month, Parent Attendance %, Pending Reports*) + *Needs Your Attention* interactive list + *Today's Appointments* quick `Attended` / `Did not attend` buttons. |
| **CASES** | **2** | **Add Report (New Case)** | `violet` (PlusCircle) | Record 1 incident for 1 or more students; auto-fills student details from Masterlist; auto-counts offenses; shows **Early Intervention Alert**; suggests Handbook sanction. |
| **CASES** | **3** | **Cases** | `indigo` (FolderOpen) | Master case list with visual status stepper (`Reported → Closed`), one-click **Print Forms** (*Call Slip, Conference Form, Behavioral Contract, Kasunduan, Suspension Letter*), at **Open Student Statement Station** (Rust Kiosk Lock). |
| **CASES** | **4** | **Students** | `sky` (Student) | Student directory, full offense history, repeat offense count, at live Clearance status badge. |
| **PARENTS** | **5** | **Appointments (Parent Summons)** | `teal` (CalendarCheck) | **Smart Scheduling** (suggests open slots based on office days, counselor schedule, at parent preferred days), sends Filipino SMS + optional Email (zero offense details), Day/Week/Month calendar. |
| **PARENTS** | **6** | **Follow-Ups** | `amber` (PhoneCall) | Mark *Attended* / *Did not attend* (with reason), auto-creates follow-up tasks, logs every call/text/call-slip, flags **Priority Follow-Up** at **Escalation**. |
| **PARENTS** | **7** | **SMS Log** | `emerald` (ChatText) | Live delivery status (*Sent, Delivered, Failed*). Pag *Failed*, kusang gumagawa ng *"Call parent"* task sa Dashboard. |
| **PARENTS** | **8** | **ID Holds & Pending Sanctions** | `orange` (IdentificationBadge) | Tracks held student IDs (*Held / Returned*) at sanctions waiting for parent attendance, with overdue alerts. |
| **STUDENT SUPPORT** | **9** | **Community Service** | `teal` (ClockCountdown) | Progress bars para sa *Required, Completed, at Remaining hours* bawat estudyante. |
| **STUDENT SUPPORT** | **10** | **Counselor Referral Queue** | `violet` (UserGear) | Ordered queue ng severe/repeated cases para sa Consultant Counselor + **Refer-Out Safeguard** toggle (auto-stops parent SMS & masks details). |
| **STUDENT SUPPORT** | **11** | **Submitted Reports** | `rose` (Inbox) | Concerns mula sa Student Web/Android Portal; Masterlist match badge; side-by-side ID & Selfie viewer (auto-logged sa Audit Trail); *Approve* (links to Case + opens Chat) o *Reject* (with reason); *Deactivate Fake Account*. |
| **STUDENT SUPPORT** | **12** | **Concern Chats** | `blue` (ChatsCircle) | Real-time two-way chat para sa approved concerns (shown as *"Guidance Office"*), office-hours notice, at *Close Chat* button. |
| **STUDENT SUPPORT** | **13** | **Clearance** | `emerald` (SealCheck) | Graduating Grade 12 list & checker (*Cleared / Not Cleared* with reason) + one-click **Print Guidance Clearance** (status only, zero offense details). |
| **RECORDS** | **14** | **Reports and Statistics** | `amber` (ChartBar) | 4-Step Visual Report Wizard, Recharts offense analytics, **Recidivism tracker**, **Automated Monthly Report**, at **Handover Notes**. |
| **RECORDS** | **15** | **Masterlist** | `sky` (Table) | SheetJS Excel/CSV uploader na may **Preview & Fix** table (auto-flags missing fields & duplicate IDs before saving) + manual Add/Edit. |
| **RECORDS** | **16** | **Audit Trail** | `rose` (ShieldCheck) | Tamper-proof timeline ng bawat case change (before & after), bawat ID photo view, at bawat sign-in/account event. |
| **RECORDS** | **17** | **Settings (PIN-Protected)** | `slate` (GearSix) | Requires 6-digit PIN; manages Office hours, Counselor days, Filipino SMS templates (with character & confidentiality checker), Handbook rules, Staff Accounts (`aicsmontalbansafeguard@gmail.com` + Counselor), Backup export, Photo retention, at Evaluation Dummy Data Seeder. |

---

## 6. Execution Roadmap & Role-by-Role Task Breakdown (Sprint 1A Check: Login + First 3 Dashboard Features)

Para siguradong **100% malinaw ang trabaho ng bawat isa sa 6 Roles** at ma-check mo agad ang kalidad ng UI, UX, animations, at logic, hahatiin natin ang unang deliverable (**Sprint 1A**) sa **Login Flow + Unang 3 Core Features ng Dashboard**:

---

### 6.1 Feature 0: Complete Desktop Login & Security Gate (Upgraded from Reference PIN Screenshot!)
*(AICS Boot Splash → 6-Digit PIN Pad Screen → Staff Email Screen → 6-Char Alphanumeric OTP Screen → Dashboard)*

Sinuri natin ang in-upload mong PIN Gate screenshot (`Southville 8C NHS` split-screen PIN pad) at gagawin nating **eksaktong ganito ka-moderno pero mas maganda pa para sa AICS Montalban**:

| Role | Eksaktong Task para sa Feature 0 (Login & Security Gate) |
| :--- | :--- |
| **1. UI/UX Designer** | • **Left Brand Panel (100% Official AICS Theme: `#0B1F4D → #1E469B → #4E92DF` + `.pattern-dots` + `WavyBackground` Azure SVG waves + Periwinkle Ice Glows):**<br>  1. **Top Frosted Glass Badge:** `● OFFICIAL GUIDANCE SYSTEM OF AICS MONTALBAN` (may `#7CB8F7` Sky Azure pulsing dot)<br>  2. **Animated AICS Gradient Title (`.title-flow`):** **`ASIAN INSTITUTE OF`** (Crisp White-Silver Shimmer) + **`Computer Studies · Montalban`** (AICS Sky-Azure to Periwinkle Ice Shimmer `#7CB8F7 → #CFD9F2`)<br>  3. **Campus Location Line (with Duotone Azure MapPin):** `Montalban Town Center, E. Rodriguez Highway, Rodriguez, Rizal`<br>  4. **4 Frosted Glass `IconTile` Feature Pillars (Gaya ng nasa Screenshot mo!):**<br>     - 🔵 `blue` (`FolderOpen`): **Case Flow**<br>     - 🟢 `teal` (`PhoneCall`): **Parent SMS**<br>     - 🟣 `violet` (`ChatCircleText`): **Concerns**<br>     - 🟢 `emerald` (`SealCheck`): **Clearance**<br>  5. **Footer Tagline:** `Rodriguez, Rizal · Est. 1996 · Excellence` + Rotating Simple English / Modern Taglish Headline Carousel sa Email/OTP steps.<br>• **Right Elevated Card (`rounded-[24px]` + AICS Azure-Royal Top Accent Bar `h-1.5` + `88x88px` Glowing Silver-Periwinkle Ringed Official AICS Logo):**<br>  1. **Top Floating Bar:** `EN · English` / `TL · Taglish` Segmented Pill Switcher + Circular Reveal Dark/Light Mode button.<br>  2. **3-Step Progress Pill (`Step 1 of 3 · App PIN` → `Step 2 of 3 · Staff Email` → `Step 3 of 3 · 6-Char OTP`)**.<br>  3. **Step 1 (6-Digit Tactile PIN Pad):** 6 glowing PIN boxes (`scale-105` + `--grad-brand` AICS Royal Blue fill kapag may laman, active azure halo ring sa kasalukuyang box) + `Show PIN / Hide PIN` toggle + **3×4 Interactive On-Screen Tactile Keypad (`1–9, Clear, 0, Red Delete ⌫`)** na gumagana sa **Mouse Click AT Physical Keyboard**! |
| **2. Senior Frontend Engineer** | • Buuin ang **3-Step Auth State Machine**:<br>  1. **Step 1 (6-Digit PIN Screen):** 6 PIN boxes + On-Screen Numeric Keypad (`KEYS` grid) + Keyboard listener (`0–9`, `Backspace`). Default initial PIN: **`123456`**.<br>  2. **Step 2 (Staff Email Screen):** High-craft `Input` na may live status badge (`✓ Ready`), pre-configured one-click chip para sa **`aicsmontalbansafeguard@gmail.com`**, at request rate-limit cooldown timer.<br>  3. **Step 3 (6-Character OTP Screen):** 6 alphanumeric boxes (`A-Z, 2-9`), paste support, 5-minute countdown timer, single-use check, at 5-try lockout counter.<br>• Maglagay ng **Live OTP Preview & Gmail Diagnostic Banner** para makita at ma-copy agad ang 6-character code sa 1 click habang nagte-test! |
| **3. Motion UI Engineer** | • **Zero-Lag GPU Background & Guidance Animation Suite (0% CPU / 60fps Compositor-Only):**<br>  1. **GSAP Boot Splash (`AicsSplashLoader`):** `< 600ms` orbital ring pulse + Official AICS Crest scale-in pagbukas ng app.<br>  2. **3-Layer AICS Sky-Azure SVG Waves (`WavyBackground.tsx`):** Gumagamit lang ng `transform: translate3d(-50%, 0, 0)` (`28s, 19s, 36s` linear infinite) sa GPU compositor—**zero repaint, zero blur lag**.<br>  3. **Rotating Guidance Headline Carousel (`HeadlineCarousel.tsx`):** Gaya ng nasa `southville8cnhs.vercel.app/auth` pero **100% tungkol sa AICS Guidance Office** (umiikot bawat `3.2s` na may `.title-flow-aics` shimmer at `EN / Taglish` support):<br>     - *EN:* `"One record from report to closure."` → `"Direct Filipino SMS to parents."` → `"Student records kept 100% private."` → `"Early care before offenses repeat."`<br>     - *TL:* `"Isang record mula report hanggang ma-close."` → `"Direktang SMS at Gmail notice sa magulang."` → `"100% private at ligtas ang student records."` → `"Maagang gabay bago pa maulit ang offense."`<br>  4. **Floating Guidance Shield & Notification Orbit (`GuidanceHeroVisual.tsx`):** Subtle GPU-floating glass cards (`translate3d` float) sa Brand Panel na nagpapakita ng live mini-preview: `✓ Parent SMS Sent`, `🔒 DPA 2012 Protected`, at `🟢 Student Cleared`.<br>  5. **Framer Motion Step Transitions + `.anim-shake` + Circular Theme Reveal:** Smooth card morph sa pagitan ng PIN Pad → Email → OTP at circular clip-path reveal mula sa Sun/Moon button. |
| **4. Frontend Performance Engineer** | • Siguraduhing `< 16ms` (60fps) ang bawat pindot sa on-screen keypad at keyboard, at GPU-accelerated (`transform` only) ang `.waves` at `.title-flow`. |
| **5. Tauri 2 / Rust & Cloud Engineer** | • I-implement ang Rust commands: `verify_app_pin`, `set_app_pin`, at `get_lockout_status` gamit ang salted hash at progressive wait time (`30s → 2m → 5m`) pag mali ang PIN, + Audit Trail logging. |
| **6–8. Deep QA Squad (SDET + Visual QA + Security Auditor)** | • **Deep Verification Check:**<br>  ✅ Gumagana pareho ang On-Screen Keypad click at Physical Keyboard typing sa 6-Digit PIN (`123456`).<br>  ✅ Gumagana ang `Show PIN / Hide PIN`, error shake, at progressive lockout.<br>  ✅ Pareho ang mensahe sa registered (`aicsmontalbansafeguard@gmail.com`) at unknown email.<br>  ✅ Nagla-lock pagkatapos ng 5 maling OTP tries.<br>  ✅ 100% working ang `EN · Simple English` ↔ `TL · Modern Taglish` switcher at Circular Dark/Light mode sa buong Login screen! |

---

### 6.2 Dashboard Shell + Unang 3 Core Features sa Dashboard (Para Ma-Check Agad)

Pagpasok mula sa Login, bubukas ang **AICS Workspace Shell** (Collapsible Sidebar `264px ↔ 76px` + Royal Blue Hero Header + Live `Clock24` + `EN/Taglish` Pill + Dark/Light Toggle) kasama ang **Unang 3 Features ng Dashboard**:

#### Feature 1: Top Urgent Concern Alert Banner + 4 Glowing KPI Summary Cards
*(Mula sa Dashboard Mockup & Pages Chart Page 1: Open Cases, Offenses This Month, Parent Attendance %, at Submitted Reports Waiting)*

| Role | Eksaktong Task para sa Dashboard Feature 1 |
| :--- | :--- |
| **1. UI/UX Designer** | • **Top Urgent Banner:** High-contrast red card sa pinakataas kapag may *Urgent Concern ("Happening now")* na may pulsing `URGENT` pill, plain English/Taglish summary, at tactile **`Review now`** button.<br>• **4 Floating Bento Stat Cards:** Nakapatong sa Royal Hero Band, bawat isa ay may glowing `IconTile` (`blue` para sa Open Cases, `amber` para sa Offenses This Month, `emerald` para sa Parent Attendance %, at `rose` para sa Submitted Reports), malaking tabular number (`24`, `17`, `38%`, `3`), at plain helper text (*"Click to see the list"* / *"I-click para makita ang listahan"*). |
| **2. Senior Frontend Engineer** | • Gawing **interactive at clickable** ang bawat Stat Card at ang `Review now` button: pag-click sa card, magbubukas ng filtered quick-view drawer o lilipat sa kaukulang listahan.<br>• I-connect sa live state para kapag may binago sa appointments o reports, nag-a-update agad ang bilang sa 4 Stat Cards. |
| **3. Motion UI Engineer** | • **GSAP Number Roll-Up:** Pagbukas ng Dashboard, swabeng aakyat ang bilang (`0 → 24`, `0 → 17`, `0 → 38%`) sa loob ng `450ms`.<br>• **Card Lift Physics (`.card-lift`):** `translateY(-3px)` + glowing shadow pag tinapatan ng mouse, at staggered `.anim-rise` entrance (`0ms, 60ms, 120ms, 180ms`). |
| **4. Frontend Performance Engineer** | • Siguraduhing ang `Clock24` sa Header ay isolated leaf component para hindi nagre-rerender ang 4 Stat Cards bawat segundo. |
| **5. Tauri 2 / Rust Engineer** | • Mag-provide ng instant local/cached summary counts at WebAudio chime trigger para sa Urgent Concern. |
| **6. QA Engineer** | • I-verify na eksaktong tugma ang bilang sa Stat Cards sa listahan ng cases at conferences, at nagpapalit ang labels kapag pinindot ang `EN / Taglish` button. |

---

#### Feature 2: "Today's Appointments" Widget (With Instant `Attended` / `Did not attend` Action Flow)
*(Mula sa Dashboard Mockup: Parent conferences scheduled today, with quick buttons)*

| Role | Eksaktong Task para sa Dashboard Feature 2 |
| :--- | :--- |
| **1. UI/UX Designer** | • Disenyuhan ang **Today's Appointments Card** na may `IconTile` (`teal`), live count badge (`3`), oras ng conference (`9:00 AM`, `10:30 AM`, `1:30 PM`), pangalan ng magulang/estudyante, Grade & Section (`Grade 11 · Section STEM-1`), at dalawang malinaw na tactile buttons: **`Attended`** (emerald pill) at **`Did not attend`** (clean outline pill).<br>• Kapag pinindot ang **`Did not attend`**, magbubukas ng malinis na **Quick Reason Popover/Modal** (*Work schedule / May pasok sa trabaho*, *Student did not tell parent / Hindi nasabi ng estudyante*, *Reschedule requested / Nagpa-reschedule*, atbp.) alinsunod sa Manuscript §1.8 #3. |
| **2. Senior Frontend Engineer** | • **End-to-End Business Logic:**<br>  1. Pag-click ng **`Attended`**: Minamarkahan ang conference bilang `Attended`, ina-update agad ang **Parent Attendance %** sa Top Stat Card (hal. `38% → 42%`), at nagsusulat sa Audit Trail.<br>  2. Pag-click ng **`Did not attend`** + Reason: Minamarkahan bilang `Did not attend`, **awtomatikong gumagawa ng bagong row sa "Follow-up tasks due" (Feature 3)**, minamarkahan ang magulang ng **`Priority Follow-Up`**, at nagsusulat sa Audit Trail.<br>  3. May **`Undo`** button sa toast notification kung sakaling napindot nang hindi sinasadya. |
| **3. Motion UI Engineer** | • **Optimistic Row Transition:** Smooth green checkmark morph kapag `Attended`, at smooth slide-in ng bagong task papunta sa *Follow-up tasks due* card kapag `Did not attend`. |
| **4. Frontend Performance Engineer** | • `0ms` optimistic UI update—walang loading spinner habang nagpapa-mark ng attendance. |
| **5. Tauri 2 / Rust Engineer** | • I-persist ang attendance status change, reason, at audit log entry. |
| **6. QA Engineer** | • **Test Case Check (§3.6):** Kapag minarkahan ng `Did not attend`, dapat: (a) ma-save ang dahilan, (b) lumabas agad ang follow-up task sa Dashboard, at (c) tumaas/bumaba nang tama ang Parent Attendance %. |

---

#### Feature 3: "Follow-Up Tasks Due & Priority Follow-Up Calls" Widget (With Interactive `Log Call` & Task Completion)
*(Mula sa Dashboard Mockup: Who to call or text today, created automatically + Priority Follow-Up calls)*

| Role | Eksaktong Task para sa Dashboard Feature 3 |
| :--- | :--- |
| **1. UI/UX Designer** | • Disenyuhan ang **Follow-Up Tasks Due & Priority Calls Card** na may `IconTile` (`amber`), task type filter tabs (`All Due Today`, `Missed Conferences`, `Failed SMS`, `Priority Calls`), status pills (`Due today`, `1st no-show`, `Near escalation`), at tactile **`Log call / Done`** button sa bawat row.<br>• Kapag pinindot ang **`Log call`**, lalabas ang **Quick Contact Attempt Modal** kung saan pipili lang ang staff ng resulta (*Answered - Confirmed new date*, *No answer - Will call again*, *Cannot attend - Sent call slip*) na eksaktong hinihingi sa Manuscript §1.8 #3. |
| **2. Senior Frontend Engineer** | • I-connect ang widget na ito sa **Feature 2 (Today's Appointments)**: kapag nag-mark ng `Did not attend` sa Feature 2, **kusang madadagdagan ang listahan dito sa Feature 3 nang real-time**!<br>• Kapag nag-log ng call ang staff, mare-record ito sa `contact_logs` (who, when, result), ma-a-update ang task status sa `Completed`, at kung naka-2+ missed conferences na ay awtomatikong maglalabas ng **`Escalation`** badge. |
| **3. Motion UI Engineer** | • Staggered list item animation (`layout` prop sa Framer Motion) kapag may bagong auto-generated task o kapag natapos na ang isang tawag. |
| **4. Frontend Performance Engineer** | • Instant filter switching sa pagitan ng *Due Today* at *Priority Calls* nang walang delay. |
| **5. Tauri 2 / Rust Engineer** | • I-save ang contact attempt log at i-trigger ang escalation check rule. |
| **6. QA Engineer** | • **Test Case Check (§3.6):** I-verify na bawat contact attempt ay nare-record (who, when, result), lumalabas ang failed SMS call tasks, at gumagana ang Priority Follow-Up marking. |

---

---

## 7. Semantic Color Status System & Visual Micro-Components (Para Isang Sulyap, Gets Agad!)

Gaya ng nasa reference screenshot mo (`Approved` = Emerald Green, `Pending` = Amber Gold, `Rejected` = Rose Red), gagawa tayo ng **Universal Semantic Status & Micro-Indicator System** para sa buong **AICS Guidance System**—para kahit hindi pa binabasa nang buo ang text, **kulay at icon pa lang ay alam na agad ng staff kung ano ang uunahin**:

### 7.1 Ang 6 Semantic Status Colors (Dual-Theme: Light Mode & Dark Mode Adaptive)

Bawat status pill (`StatusBadge`) ay may:
1. **Tinted Soft Pill Background (`--status-bg`)** + **`1px` Inner Colored Border (`--status-border`)**
2. **Contextual Status Icon o Pulsing Dot** (hindi lang basta bilog—may `✓` pag tapos na, `⏱` pag naghihintay, `!` pag kailangang aksyunan, at pulsing red dot pag urgent)
3. **Simple English / Modern Taglish Hover Tooltip** na nagpapaliwanag kung ano ang susunod na gagawin.

| Color Family | Light Mode (`BG / Text / Border`) | Dark Mode (`BG / Text / Border`) | Mga Status sa AICS Guidance System na Gumagamit Nito | Simple Meaning (Sa Isang Tingin) |
| :--- | :--- | :--- | :--- | :--- |
| **🟢 Emerald (Success / Done / Safe)** | `#ECFDF5` / `#047857` / `#A7F3D0` | `rgba(16,185,129,0.14)` / `#34D399` / `rgba(52,211,153,0.30)` | • **`Attended`** (Parent Conference)<br>• **`Cleared`** (Grade 12 Clearance)<br>• **`Delivered`** (SMS Log)<br>• **`Resolved` / `Closed`** (Case Status)<br>• **`ID Returned`** (ID Holds)<br>• **`Masterlist Matched`** (Submitted Report) | **Tapos na / Okay na.** Walang problema o tapos na ang aksyon. |
| **🟡 Amber (Pending / Waiting / Early Warning)** | `#FFFBEB` / `#B45309` / `#FDE68A` | `rgba(245,158,11,0.14)` / `#FBBF24` / `rgba(251,191,36,0.30)` | • **`Pending` / `Waiting for Review`**<br>• **`Under Review`** (Case Status)<br>• **`Parent Contacted` / `Sent`** (SMS)<br>• **`Early Intervention (1st Minor)`**<br>• **`ID Held`** (Waiting for parent)<br>• **`Due Today`** (Follow-up task) | **Naghihintay / Bantayan.** Kailangan i-check o binabantayan ngayong araw. |
| **🔴 Rose / Crimson (Urgent / Failed / Action Required)** | `#FFF1F2` / `#BE123C` / `#FECDD3` | `rgba(244,63,94,0.16)` / `#FB7185` / `rgba(251,113,133,0.32)` | • **`URGENT · Happening Now`** *(with pulsing dot)*<br>• **`Did Not Attend`** (Missed Conference)<br>• **`Failed SMS`** (Need to call parent)<br>• **`Not Cleared`** (Grade 12 Clearance)<br>• **`Escalation (2+ Missed)`**<br>• **`Rejected`** (Submitted Report) | **Kailangan Aksyunan Agad!** May hindi nakapunta, nag-fail na text, o urgent report. |
| **🔵 Royal / Sky Blue (Active / Scheduled / In Progress)** | `#EFF6FF` / `#1D4ED8` / `#BFDBFE` | `rgba(59,130,246,0.15)` / `#60A5FA` / `rgba(96,165,250,0.30)` | • **`Scheduled Today`** (Appointments)<br>• **`Conference Scheduled`** (Case Status)<br>• **`Sanction In Progress`** (Community Service)<br>• **`Chat Open`** (Concern Chats)<br>• **`Reported`** (New Case) | **Kasalukuyang Umaandar.** May schedule na o ginagawa na ang sanction. |
| **🟣 Violet / Indigo (Counselor / Priority / Sensitive)** | `#F5F3FF` / `#6D28D9` / `#DDD6FE` | `rgba(139,92,246,0.15)` / `#A78BFA` / `rgba(167,139,250,0.30)` | • **`Priority Follow-Up`** (Parent Call)<br>• **`Counselor Queue`** (For Consultant Counselor)<br>• **`Refer-Out Safeguard 🔒`** (Sensitive Case)<br>• **`2nd / 3rd Offense`** (Repeat Offense Tag) | **Espesyal na Atensyon.** Para sa Counselor, repeat offense, o may privacy lock. |
| **⚪ Slate / Neutral (Archived / Closed / Offline)** | `#F1F5F9` / `#475569` / `#CBD5E1` | `rgba(148,163,184,0.12)` / `#94A3B8` / `rgba(148,163,184,0.24)` | • **`Chat Closed`**<br>• **`Cancelled / Rescheduled`**<br>• **`Deactivated Account`**<br>• **`Optional / No Action Needed`** | **Naisara na / Inactive.** Nasa record na lang para sa history. |

---

### 7.2 Ano Pa ang Pwedeng Idagdag na Visual Micro-Features (Tulad sa Reference Screenshot Mo)?

Bukod sa status colors, heto ang **7 High-Craft Visual Upgrades** na idadagdag natin sa Dashboard at sa buong system (inspirado ng mga nagpaganda sa screenshot mo):

1. **Multi-Color Donut / Conic Progress Ring Card (Gaya ng *"17% approved"* sa Screenshot Mo):**
   * Sa Dashboard, maglalagay tayo ng **"Parent Conference & Case Progress Ring"** card sa kanan!
   * Sa gitna ng multi-color ring (🟢 Emerald = `Attended`, 🟡 Amber = `Scheduled / Waiting`, 🔴 Rose = `Did Not Attend / Needs Follow-up`), makikita ang malaking **`38% Attended`** kasama ang 3 clean breakdown bars sa tabi na pwedeng i-click para i-filter ang listahan.
2. **Section & Strand Pill Grid + Progress Bar (Gaya ng *"AMBER 0/0, AMETHYST 0/0"* sa Screenshot Mo):**
   * Magagamit natin ang eksaktong disenyong ito para sa **AICS Strands & Sections (`STEM`, `ABM`, `HUMSS`, `ICT`, `GAS`)**—halimbawa sa **Grade 12 Clearance Progress by Section** o **Cases & Attendance by Section**, kung saan bawat section pill ay nagiging 🟢 Green pag 100% cleared/complete na!
3. **Interactive Case Stepper Pill (`Step 3 of 6 · Conference Scheduled`):**
   * Imbes na plain text lang ang status ng Case, may **6-dot mini progress bar** sa ilalim ng badge (`Reported → Under Review → Parent Contacted → Conference Scheduled → Sanction In Progress → Resolved`) para kita agad kung gaano na kalapit matapos ang case.
4. **Offense Severity & Frequency Micro-Pills (`1st Minor` vs `2nd Minor · Next is Major` vs `Major Offense`):**
   * Sa tabi ng pangalan ng estudyante, may maliit na color-coded chip para hindi na kailangang buksan ang profile para lang malaman kung pang-ilang offense na niya.
5. **Live Relative Time & Urgency Countdown Pills (`in 25 mins`, `2h overdue`, `just now`):**
   * Sa *Today's Appointments* at *Recent Activity*, makikita kung **`Starts in 20 mins`** (🔵 Blue), **`Happening now`** (🟢 Pulsing Green), o **`1 day overdue`** (🔴 Rose).
6. **Student & Parent Avatar Badges with Status Ring:**
   * Bawat row ng estudyante o magulang ay may malinis na **Initials Avatar** (`JD` para kay Juan Dela Cruz) na may kulay ang border depende sa status niya (🟢 Green ring = Cleared, 🟡 Amber ring = Has active case, 🔴 Red ring = ID Held / Urgent).
7. **Live Activity Feed Mini-Timeline (Gaya ng *"Recent activity"* sa Kanang Ibaba ng Screenshot Mo):**
   * Sa ibaba ng Dashboard, may malinis na **Recent Office Activity** card na may colored timeline dots (*"Marked parent of J. Santos as Attended · just now"*, *"Sent Filipino SMS reminder · 5m ago"*) at `View all` link papunta sa Audit Trail.

---

---

## 8. Easy-to-Read Visual Analytics & Interactive Graphs (Weekly · Monthly · Semestral · Yearly)

Para **hindi mahirap basahin ang mga numero** at isang tingin pa lang ay gets na agad ng Guidance Associate, Consultant Counselor, at School Admin ang sitwasyon sa AICS Montalban, gagawa tayo ng **Interactive Recharts + Conic Analytics Suite** sa **Dashboard (Quick Overview)** at sa **Page 14: Reports and Statistics (Full Analytics Hub)**.

### 8.1 Ang 1-Click Timeframe Pill Switcher (`This Week` · `This Month` · `This Semester` · `School Year`)
Sa itaas ng mga graphs, may **Segmented Timeframe Pill Switcher** (katulad ng `EN / Taglish` pill natin):
* **`This Week (Mon–Sat)`** — Ipinapakita ang araw-araw na pasok ng cases at parent attendance ngayong linggo.
* **`This Month (Weekly Breakdown)`** — Hinahati sa `Week 1, Week 2, Week 3, Week 4` + comparison badge (*`↓ 18% fewer cases than last month`*).
* **`This Semester (1st Sem / 2nd Sem)`** — Buwan-buwan na trend para makita kung anong buwan pinakamaraming insidente.
* **`Yearly (School Year 2025–2026)`** — Buong taon na summary para sa Annual Guidance Accomplishment Report.

---

### 8.2 Ang 7 Easy-to-Understand Graphs & Visual Trackers (Zero Boring Charts!)

Bawat graph ay may **"Plain Takeaway Pill"** sa ibabaw na nagsasabi sa Simple English / Modern Taglish kung ano ang ibig sabihin ng graph (hal. *"💡 Takeaway: Cutting classes dropped by 24% this month, while uniform violations are highest on Mondays."*):

| # | Pangalan ng Graph / Visual | Uri ng Graph (`Recharts` + Custom UI) | Ano ang Ipinapakita Nito (At Paano Ito Nakakatulong sa User) |
| :-: | :--- | :--- | :--- |
| **1** | **Case Volume & Resolution Trend** *(Weekly / Monthly / Yearly)* | **Smooth Gradient Area & Stacked Bar Chart** (🔵 Blue = *Reported Cases*, 🟢 Emerald = *Resolved/Closed*, 🟡 Amber = *Still Open*) | • **Isang tingin lang:** Kita agad kung gaano karami ang pumapasok na cases bawat linggo, buwan, o taon, at kung ilang porsyento na ang **nasolusyunan (`Resolved`)** kumpara sa nakabinbin pa.<br>• May hover tooltip na nagpapakita ng eksaktong bilang bawat araw/buwan. |
| **2** | **Parent Attendance & Follow-Up Donut Ring** *(Gaya ng "17% approved" sa Screenshot Mo)* | **Multi-Color Conic Donut Ring + 3 Clickable Status Bars** (🟢 `Attended`, 🟡 `Scheduled / Rescheduled`, 🔴 `Did Not Attend`) | • **Sa Dashboard at Reports:** Kita agad ang **Parent Attendance Rate (hal. `38% → 64%`)**.<br>• Kapag pinindot ang 🔴 `Did Not Attend` bar sa tabi ng donut, kusang ifi-filter ang listahan ng mga magulang na kailangang tawagan! |
| **3** | **Top Offenses Breakdown (Minor vs. Serious)** | **Horizontal Ranked Progress Bars with Icons & Color Severity Chips** | • Imbes na nakakalitong pie chart na maraming hiwa, **Horizontal Ranked Bars** ito mula pinakamarami hanggang pinakakaunti (hal. *1. Tardiness / Cutting Classes — 42%*, *2. Uniform / ID Violation — 28%*, *3. Disrespect / Classroom Disruption — 18%*).<br>• May kulay kung 🟡 `Minor Offense` o 🔴 `Serious Offense`. |
| **4** | **Cases & Clearance Progress by Grade & Section/Strand** *(Gaya ng Section Pills sa Ibaba ng Screenshot Mo)* | **Section Progress Bar + Color-Coded Section Pill Grid** (`STEM`, `ABM`, `HUMSS`, `ICT`, `GAS`) | • Gaya ng *"AMBER 0/0, AMETHYST 0/0"* sa screenshot mo, makikita rito ang bawat section ng **Grade 11 at Grade 12**.<br>• Sa **Dashboard / Clearance**: 🟢 Green pill kapag `0 active cases / 100% cleared`, 🟡 Amber kapag may pending conference, at 🔴 Red kapag may urgent case o held ID. |
| **5** | **First-Time vs. Repeat Offenders (Recidivism Tracker)** | **Dual Comparison Gauge + Early Intervention Funnel** (🟢 *Did Not Re-Offend after Conference* vs. 🟣 *Repeat Offender*) | • Eksaktong hinihingi sa **Manuscript §1.8 #8**: Sinusukat kung epektibo ba ang parent conference at counseling!<br>• Ipinapakita: *"84% of students did not commit a 2nd offense after their parent attended a conference."* |
| **6** | **Reasons Why Parents Miss Conferences** | **Clean Horizontal Pill Breakdown Chart** | • Kinukuha mula sa Quick Reason Modal kapag nag-mark ng `Did not attend` (*Work schedule — 55%*, *Student did not tell parent — 25%*, *Out of town / Health — 20%*).<br>• Nakakatulong sa Guidance Office para malaman kung anong araw/oras pinakamagandang mag-schedule. |
| **7** | **Peak Day & Time Heatmap ("Busiest Office Hours")** | **5-Day (Mon–Fri) × Morning/Afternoon Color Grid** | • Ipinapakita kung anong araw (hal. *Monday Morning* o *Friday Afternoon*) pinakamaraming nare-report na insidente at kung kailan pinakamaraming pumupuntang magulang para mas maayos ang schedule ng Counselor. |

---

### 8.3 Paano Natin Ilalagay Ito sa Sprint 1A (Dashboard) at Page 14 (Reports)?

1. **Sa Dashboard (Sprint 1A Check):**
   * Ilalagay na natin agad sa Dashboard ang:
     1. **4 Top KPI Stat Cards** na may mini trend badges (`+4 this week`, `38% attended`).
     2. **Multi-Color Parent Attendance & Case Status Donut Ring Card** (gaya ng *"17% approved"* sa screenshot mo).
     3. **Interactive Case & Attendance Trend Mini-Chart (`Weekly` / `Monthly` / `Yearly` pill toggle)** + **AICS Section Status Pill Grid** (`STEM-1`, `ABM-1`, `ICT-1`, `HUMSS-1`, `GAS-1`) para makita mo agad kung gaano kaganda at kadaling intindihin ang graphs!
2. **Sa Page 14 — Reports and Statistics (Sprint 4):**
   * Ang kumpletong **7-Chart Analytics Hub** kasama ang **4-Step Visual Report Wizard**, **Automated Monthly Summary**, at **1-Click Print / Export to PDF & Excel**.

---

---

## 9. End-to-End Case Lifecycle & The 4 Smart Flow Safeguards (Mula Report Hanggang `Case Done`)

Sinuri natin ang buong workflow mula sa unang pag-report sa estudyante hanggang sa maging **`Resolved / Closed`** at **`Cleared`**, at isinama natin ang **4 Smart Flow Safeguards** para siguradong walang mai-stuck na proseso sa totoong operasyon ng AICS Montalban Guidance Office:

### 9.1 Complete 9-Step System Flow (Walk-In o Online Report → Parent Conference → Sanction → `Case Done`)

1. **Step 1 — Pagpasok ng Report (2 Entry Points):**
   * **Paraan A (Walk-In / Teacher / Guard Report sa Page 2: Add Report):** Pipiliin ang estudyante mula sa Masterlist (pwedeng 1 o higit pang estudyante sa iisang insidente).
   * **Paraan B (Online Student Concern sa Page 11: Submitted Reports):** Kapag in-approve ng Guidance Associate ang concern mula sa Web/Android Portal, kusang gagawa ng Case at magbubukas ng two-way Concern Chat.
2. **Step 2 — Auto-Check, Offense Counter & Early Intervention (`Status: 🔵 Reported`):**
   * Kusang binibilang ng system kung pang-ilang offense na ito ng estudyante base sa Student Handbook rules.
   * Kapag may **1 minor offense** na sa record, lalabas agad ang **🟡 Early Intervention Alert** (*"Heads up: 1 minor offense on record. The next one counts as a serious offense."*).
3. **Step 3 — Student Written Statement & Initial Review (`Status: 🟡 Under Review`):**
   * Bubuksan ang **Locked Student Statement Station** (Tauri/Rust Kiosk Mode) para makapag-type ang estudyante ng kanyang *Malayang Salaysay* nang hindi nakikita ang ibang records.
   * Kung kinuha ang ID ng estudyante, ila-log ito sa **Page 8 (ID Holds)** bilang `🟡 ID Held`.
4. **Step 4 — Decision Point (Kailangan ba ng Parent Conference o 1st Minor Warning lang?):**
   * Kung **1st Minor Offense** lang at sapat na ang written warning / *Kasunduan*, gagamitin ang **Smart Flow #1 (`Fast-Track Minor Resolution`)**.
   * Kung **2nd Minor Offense, Serious Offense, o Held ID**, tutuloy sa Step 5.
5. **Step 5 — Smart Scheduling & Filipino SMS Summons (`Status: 🔵 Conference Scheduled`):**
   * Sa **Page 5 (Appointments)**, magsu-suggest ang system ng open slots base sa office hours, araw ng Consultant Counselor, at preferred days ng magulang.
   * Magpapadala ng **Filipino SMS + optional Email** sa magulang (petsa, oras, at opisina lang—**walang offense details** alinsunod sa Data Privacy Act of 2012).
6. **Step 6 — Conference Day Attendance Check (Sa Dashboard Feature 2 o Page 6: Follow-Ups):**
   * **Kapag `🟢 Attended` (o Walk-In via Smart Flow #3):** Tutuloy sa Step 7 para sa Conference Form at Sanction.
   * **Kapag `🔴 Did Not Attend`:** Pipili ng dahilan (*Work schedule*, *Student did not tell parent*, *Reschedule*), **kusang gagawa ng Follow-Up Call Task sa Dashboard Feature 3**, mamarkahan bilang **`🟣 Priority Follow-Up`**, at kapag naka-2+ missed conferences na ay maglalabas ng **`🔴 Escalation`** alert.
7. **Step 7 — Parent Conference, Printable Forms & Sanction (`Status: 🔵 Sanction In Progress`):**
   * One-click print ng *Parent Conference Form*, *Behavioral Contract*, *Kasunduan*, o *Suspension Letter* (auto-filled na ang detalye).
   * Ita-track ang sanction sa **Page 8 (ID Holds)**, **Page 9 (Community Service Hours)**, o **Page 10 (Counselor Referral Queue)**.
8. **Step 8 — Sanction Completion Check (With Smart Flow #4 Auto-Close Prompt):**
   * Kapag `0 hours remaining` na sa Community Service at `🟢 ID Returned` na ang ID, kusang magtatanong ang system kung isasara na ang case.
9. **Step 9 — `🟢 Case Done` (`Status: 🟢 Resolved → Closed` & Auto-Clearance Update):**
   * Pagka-close ng case, kusang mag-a-update ang **Page 13 (Clearance)** ng Grade 12 student sa **`🟢 Cleared`**, tataas ang Resolved count sa Dashboard Graphs, at ire-record sa **Page 16 (Audit Trail)** ang buong history (`who, when, before & after`).

---

### 9.2 Ang 4 Smart Flow Safeguards na Idinagdag Natin (Para Walang Stuck o Nakalimutang Case!)

| # | Smart Flow Feature | Anong Problema ang Sinosolusyunan Nito? | Paano Ito Gumagana sa AICS UI/UX (`EN / Taglish`) |
| :-: | :--- | :--- | :--- |
| **1** | **Fast-Track Minor Resolution** (`Resolve without Parent Conference`) | Sa default linear flow, parang kailangan laging dumaan sa Parent Summons kahit 1st minor warning lang (hal. unang beses na-late o nakalimot ng necktie). | Sa `Under Review` step, may **`✓ Resolve as 1st Minor Warning`** button: pagkatapos mag-type ng *Malayang Salaysay* at mag-print ng *Kasunduan*, pwede nang i-mark bilang `Resolved / Closed` habang naka-record pa rin sa offense history. |
| **2** | **Failed SMS Instant Fallback & Inline Number Fix** | Kapag nag-fail ang SMS (mali ang number o walang signal), baka maghintay sa wala ang Guidance Office sa araw ng meeting. | Pag nag-status ng 🔴 **`Failed SMS`**, **agad-agad** gagawa ng task sa Dashboard (*"SMS Failed — Call parent or give Printed Call Slip today"*) at may **`Edit Number & Resend SMS`** mismo sa Follow-Up modal! |
| **3** | **1-Click "Walk-In Parent Conference" Logger** | Minsan biglang pumupunta ang magulang sa opisina kinabukasan kahit wala pang naka-schedule na slot (lalo na pag nakuha ang ID ng anak). | Sa loob ng Case at Appointments, may **`⚡ Log Walk-In Parent Conference`** button na agad nagre-record ng `Attended Today`, nagbubukas ng *Conference Form*, at nagpapahintulot na maibalik agad ang Held ID. |
| **4** | **Smart Auto-Close & Auto-Clearance Prompt** | Baka makalimutan ng staff na bumalik sa *Cases* page para isara ang case pagkatapos maibalik ang ID o matapos ang Community Service hours—kaya maiiwang `Not Cleared` ang estudyante. | Kapag nakumpleto na ang Community Service (`0 hrs left`) o binalik na ang ID (`ID Returned`), lalabas ang sleek banner: ***"🎉 All requirements for Case #2026-014 are complete! Close this case now and mark student as Cleared?"*** → **`[ ✓ Close Case & Clear Student ]`**. |

---

---

## 10. Full Manuscript, Flowchart & Test Case Audit Matrix (100% Zero-Gap Verification)

In-audit natin nang linya-por-linya ang **57-Page Capstone Manuscript (Chapters I–III)**, ang **6-Page System Pages & Flowcharts PDF**, at ang **Login & Dashboard Verification Document** laban sa MD file na ito.

Narito ang **13 Critical Sub-Features & Rules** na nakita sa malalalim na bahagi ng Manuscript (`§1.6`, `§1.8`, `§1.9`, at `§3.6 Test Cases`) na ngayon ay **100% nakalagay at naka-specify na sa ating Master Plan**:

### 10.1 Ang 13 Na-Audit na Sub-Features na Kailangang Makitang Gumagana sa Defense:

| # | Kung Saan Nakasulat sa Manuscript / Flowchart | Eksaktong Requirement na Baka Makalimutan | Paano Ito Gagana sa AICS System Natin |
| :-: | :--- | :--- | :--- |
| **1** | **Page 1 & 2 ng Flowchart PDF (Case Status Flow)** | Ang eksaktong 7-step Case Status labels sa Flowchart PDF ay: **`Reported → Student Called → Explanation → Parent Notified → Decision → Follow-Up → Closed`**. | Gagamitin natin ang **eksaktong 7 step labels na ito** sa Case Stepper (`Page 3: Cases`), at bawat step ay may kulay mula sa 6-Color Semantic System! |
| **2** | **Manuscript §1.8 #1 & §1.9 (Offense Classification — 4 Levels)** | Hindi lang *Minor* at *Serious*—ang opisyal na 4 levels sa §1.9 Definition of Terms (p. 21) ay: **`Minor`**, **`Less Serious`**, **`Serious`**, at **`Grave`**. At sa §1.1 (p. 5): *"Two or more consecutive minor offenses count as a serious offense."* | Sa **Page 2 (Add Report)** at **Page 17 (Handbook Rules)**, 4 ang classification levels (`Minor`, `Less Serious`, `Serious`, `Grave`) + automatic escalation kapag 2 consecutive minor offenses na! |
| **3** | **Flowchart PDF Page 1 (Page 3: Cases — Decision and Sanction Rule)** | *"Record the final decision; **sanction stays pending until parents are informed**."* | Kapag naglagay ng sanction sa Case pero hindi pa nakakausap/na-notify ang magulang, kusang mamarkahan ito bilang **`🟡 Pending Sanction (Waiting for Parent)`** at lalabas sa **Page 8 (`ID Holds & Pending Sanctions`)**! |
| **4** | **Flowchart PDF Page 3 (Step 3: Student Statement — Paper Option)** | *"Student types own statement at the locked Statement Station **(or writes on paper)**"* at sa §1.6 (p. 15): *"students may still write their statements on paper."* | Sa **Page 3 (Cases)**, dalawa ang button sa Statement step: **`🔒 Open Locked Statement Station (Type on Screen)`** AT **`📄 Attach Scanned / Photo of Handwritten Salaysay`**! |
| **5** | **Flowchart PDF Page 1 (Page 6: Follow-Ups — Parent's Preferred Schedule & Notice Received)** | Dalawang sub-box sa Page 6 ng Flowchart PDF:<br>1. **`Parent's preferred schedule`** (*Days and times the parent can come, used by Smart Scheduling*)<br>2. **`Notice received`** (*Confirms the parent got the notice*). | Sa **Page 6 (Follow-Ups)** at **Page 4 (Students)**, pwedeng i-save ang *Preferred Days/Times* ng magulang (hal. *Friday Afternoon only*) na awtomatikong binabasa ng **Smart Scheduling** sa Page 5, at may **`✓ Notice Received`** toggle! |
| **6** | **Manuscript §3.6 Test Cases (p. 40 — Reschedule Cancels Old Reminder & Optional Email Rule)** | *"check that the reminder for the old date is cancelled when a conference is rescheduled... and that a failed email does not stop the SMS."* | Sa **Page 5 (Appointments)**:<br>• Pag nag-reschedule, awtomatikong `Cancelled` ang lumang reminder at pwedeng pumili kung magse-send ng bagong SMS o hindi.<br>• Ang Optional Email ay naka-try/catch nang hiwalay para kahit mag-fail ang email, **tuloy pa rin ang SMS**. |
| **7** | **Manuscript §1.8 #5 & Page 14 (Monthly Report: "Time to Close")** | Sa Flowchart PDF Page 2 (Page 14): *"Monthly report — Automatic: offenses, parent attendance, reasons, overdue cases, **time to close**."* | Kusang kukwentahin ng system ang **Average Time to Close Cases (in days)** mula `Reported` hanggang `Closed` (para maipakita na mas mabilis na kaysa sa dating 2 weeks)! |
| **8** | **Manuscript §3.6 Test Cases (p. 40 — Inactivity Auto Sign-Out)** | *"signed out after inactivity"* at sa Page 17 (Settings): *"Accounts and security: Staff accounts, PIN, **sign-out time**."* | May **Idle Inactivity Timer** (configurable sa Settings: hal. `15 mins` o `30 mins`) na may 60-second warning countdown bago kusang mag-lock balik sa PIN/Sign-in screen. |
| **9** | **Flowchart PDF Page 2 (Page 11: Submitted Reports — Deactivate Fake Account & Confidential Mode)** | • **`Deactivate fake account`** (*Block accounts that are not real students*)<br>• **`Normal or confidential`** (*Choose how private the report is*)<br>• **`Statement of truthfulness`** checkbox. | Sa **Page 11 (Submitted Reports)**, makikita kung `Matched` o `Not in Masterlist`, may **`🚫 Deactivate Fake Account`** button, at ipinapakita ang `Confidential Concern` badge. |
| **10** | **Flowchart PDF Page 4 (Page 7 ng Student Portal: Password Reset by Guidance Office)** | *"Change password — **Password reset is done by the Guidance Office after checking the ID**."* | Sa **Page 4 (Students)** at **Page 17 (Settings)** ng Desktop App, may **`🔑 Assist Student Password Reset (After ID Check)`** button para sa mga estudyanteng nakalimot ng password! |
| **11** | **Manuscript §1.6 (p. 14–15 — Strict Scope Boundaries / Bawal Ilagay)** | Eksaktong sinabi sa Scope & Limitations na **HINDI kasama**:<br>• Walang login/app para sa Principal, Teachers, Advisers, o Parents<br>• Walang two-way SMS reply mula sa magulang<br>• Walang import ng lumang Excel *case* files (Masterlist lang ang ini-import)<br>• Walang counseling session notes / psychological testing<br>• Walang emergency alarm siren (visual red banner lang habang office hours). | **100% Susundin Natin Ito:** Hindi tayo maglalagay ng teacher/parent login o emergency alarm na lalabag sa §1.6 Scope and Limitations. Ang ilalagay lang natin sa Urgent Concern ay **Top Red Visual Banner** habang signed in ang staff! |
| **12** | **Manuscript §3.6 & §3.10 (p. 40 & 42 — Evaluation Dummy Data Seeder & Photo Retention)** | *"Testing and evaluation will use dummy data only... identification images of dummy accounts are deleted after the set retention period."* | Sa **Page 17 (Settings)**, may **1-Click "Load Evaluation Dummy Dataset"** (para sa 2 Guidance Staff at 305 Student testers) at **Photo Retention Auto-Delete Rule** (`30 / 60 / 90 days` o `Delete Now after Evaluation`). |
| **13** | **Flowchart PDF Page 1 & 2 (Complete 17 Desktop Pages + 7 Student Portal Pages Breakdown)** | Kailangan ang **lahat ng 17 Desktop Pages** at **7 Student Portal Pages** ay may malinaw na task breakdown para sa 6 Engineering Roles. | Tingnan ang **Section 10.2** sa ibaba para sa kumpletong Feature-by-Feature at Role-by-Role Matrix ng buong system! |

---

### 10.2 Complete 17-Page Desktop + 7-Page Student Portal Role-by-Role Engineering Matrix

Bukod sa **Sprint 1A (Feature 0 Login + Unang 3 Features ng Dashboard)** na nasa Section 6, heto ang kumpletong gabay ng **6-Role Engineering Squad** para sa **Sprint 1B hanggang Sprint 5** para **walang kahit isang sub-feature na maiiwan**:

#### 📌 Sprint 1B: Remaining Dashboard Widgets (Page 1 Completion)
* **Feature 4 — Submitted Reports Waiting Widget:** Top red highlight para sa *Urgent ("Happening now")* concerns + quick preview + 1-click jump papunta sa Page 11 (`Submitted Reports`).
* **Feature 5 — Alerts Widget (Overdue Sanctions, Held IDs & Overdue Cases):** Kumukuha ng threshold mula sa Settings (hal. ID held `> 3 days` o Sanction pending `> 5 days`) at nagpapakita ng 🔴 Rose alert pills.
* **Feature 6 — Early Intervention List Widget:** Listahan ng mga estudyanteng may **1 minor offense** na magiging **Serious Offense** na kapag nasundan pa, para makausap na nang maaga.

#### 📌 Sprint 2: Masterlist, Offense Recording, Case Flow, Statement Station & Printable Forms (Pages 2, 3, 4, 15)
* **Page 15 — Masterlist (`Import Enrollment List` + `Preview & Fix` + `Add/Edit Student`):**
  * **Senior Frontend & Rust:** SheetJS Excel/CSV parser na tumatanggap ng iba't ibang column headers, nagpapakita ng **Preview & Fix Table** (fina-flag ng 🔴 Red ang duplicate Student IDs at 🟡 Amber ang missing fields bago i-save), at nagre-record ng manual edits sa Audit Trail.
* **Page 2 — Add Report (`New Case`):**
  * **UI/UX & Frontend:** Multi-student tag selector (1 incident para sa 1 o higit pang estudyante), auto-fill ng Grade/Section/Adviser/Emergency Contact mula sa Masterlist, incident details + private evidence upload, auto-count at auto-classify (`Minor`, `Less Serious`, `Serious`, `Grave`), **Early Intervention Alert banner**, at **Suggested Handbook Sanction** (kung saan staff pa rin ang may final decision).
* **Page 3 — Cases (`Case List` + `7-Step Status Flow` + `Locked Student Statement Station` + `5 Printable Forms` + `Timeline`):**
  * **Tauri/Rust & Frontend:**
    1. **7-Step Status Flow:** `Reported → Student Called → Explanation → Parent Notified → Decision → Follow-Up → Closed` (+ Smart Flow #1 `Fast-Track 1st Minor Warning`).
    2. **Locked Student Statement Station:** Tauri fullscreen/kiosk lock mode kung saan tanging ang *Malayang Salaysay* form lang ang nakikita ng estudyante, at kailangan ng **6-Digit Staff PIN** para makabalik sa Guidance workspace (+ option na mag-attach ng scanned handwritten paper statement).
    3. **1-Click Print Forms (A4 / Short Bond):** Auto-filled na *Parent Call Slip*, *Parent Conference Form*, *Behavioral Contract*, *Kasunduan (Agreement)*, at *Suspension Letter*.
    4. **Pending Sanction Rule:** Ang sanction ay awtomatikong `Pending Sanction` hangga't hindi pa nakakausap ang magulang.
* **Page 4 — Students (`Student Profile` + `Offense History` + `Clearance Status` + `Password Reset Assist`):**
  * Kumpletong profile, offense count, repeat offense indicator, parent's preferred schedule, live clearance badge (`Cleared / Not Cleared` with reason), at `Assist Student Password Reset (After ID Check)`.

#### 📌 Sprint 3: Parent Summons, Smart Scheduling, SMS Log, Follow-Ups, ID Holds, Community Service & Counselor Queue (Pages 5, 6, 7, 8, 9, 10)
* **Page 5 — Appointments (`Parent Summons`):**
  * **Smart Scheduling Engine:** Nagsu-suggest ng libreng oras sa loob ng office days (4 days/week), schedule ng Consultant Counselor, at *Parent's Preferred Schedule* nang walang double booking.
  * **Filipino SMS + Optional Email:** Nagpapadala ng Filipino SMS (petsa, oras, opisina—**walang offense details**) + 1-day-before automatic reminder (`pg_cron`) + optional email (kung may email ang magulang; kahit mag-fail ang email ay tuloy ang SMS).
  * **Reschedule Logic:** Pag nag-reschedule, awtomatikong kanselado ang lumang reminder.
  * **Calendar View:** Day, Week, at Month view + Smart Flow #3 (`⚡ Log Walk-In Parent Conference`).
* **Page 6 — Follow-Ups:**
  * Attendance marking (`Attended` / `Did not attend` with reason), auto-generated follow-up tasks, **Contact Log** (`who, when, method: call/text/call-slip, result`), **Notice Received** confirmation toggle, **Parent's Preferred Schedule** editor, **Priority Follow-Up** badge, at **Escalation** flag pagkatapos ng paulit-ulit na no-show.
* **Page 7 — SMS Log:**
  * Live status (`Sent`, `Delivered`, `Failed`). Kapag `Failed`, kusang gumagawa ng *"Call parent"* task sa Dashboard (Smart Flow #2).
* **Page 8 — ID Holds and Pending Sanctions:**
  * Log kung kailan kinuha (`ID Held`) at ibinalik (`ID Returned`) ang ID + listahan ng `Pending Sanctions` + overdue alerts + Smart Flow #4 (`Auto-Close Case Prompt` pag binalik na ang ID).
* **Page 9 — Community Service:**
  * Progress tracker ng `Required`, `Completed`, at `Remaining hours` bawat estudyante + `Unfinished list` + Smart Flow #4 (`Auto-Close Case Prompt` pag `0 hours remaining` na).
* **Page 10 — Counselor Referral Queue:**
  * Priority-ordered queue ng severe/repeated cases para sa Consultant Guidance Counselor + **Refer-Out Safeguard 🔒** toggle (awtomatikong itinitigil ang lahat ng parent SMS/reminders at itinatago ang detalye ng case).

#### 📌 Sprint 4: Student Concern Review, Concern Chats, Clearance, Reports & Statistics, Audit Trail & PIN Settings (Pages 11, 12, 13, 14, 16, 17)
* **Page 11 — Submitted Reports:**
  * Review ng concerns mula sa Web/Android Portal, `Matched / Not in Masterlist` badge, side-by-side ID Photo & Live Selfie verification (bawat bukas ng larawan ay naka-log sa Audit Trail!), `Approve` (pwedeng i-link sa Case at nagbubukas ng Concern Chat) o `Reject` (may reason na makikita ng estudyante), `Urgent ("Happening now")` highlight, at `Deactivate Fake Account`.
* **Page 12 — Concern Chats:**
  * One-on-one text thread bawat approved concern (nakapangalan bilang *"Guidance Office"*), office-hours notice banner, at `Close Chat` button (nananatili sa history ang messages).
* **Page 13 — Clearance:**
  * Graduating Grade 12 list at individual checker (`Cleared` o `Not Cleared` kasama ang eksaktong dahilan: *open case, pending sanction, unfinished service hours, o held ID*) + **1-Click Print Guidance Clearance** (status lang ang nakasulat, **walang offense details**).
* **Page 14 — Reports and Statistics:**
  * Ang **7 Visual Analytics Graphs** (`Weekly / Monthly / Semestral / Yearly`), **Recidivism Tracker** (estudyanteng umulit ng offense matapos mabigyan ng sanction), **Automated Monthly Report** (offenses, parent attendance %, no-show reasons, overdue cases, at **average time to close**), at **Case Summaries & Handover Notes** (para madaling maipasa ang case sa ibang staff).
* **Page 16 — Audit Trail:**
  * Read-only, tamper-proof log ng bawat pagbabago sa case (`before` at `after` values, sino ang nagbago, at kailan), bawat bukas ng ID/Selfie image, at bawat sign-in/lockout event.
* **Page 17 — Settings (PIN-Protected):**
  * Kailangan ng 6-Digit PIN bago bumukas; sine-set ang Office Days & Hours, Counselor Schedule, Filipino SMS Templates (may live character counter at confidentiality keyword guard), Student Handbook Rules (offenses, 4 classifications, sanctions, escalation count), Staff Accounts & Inactivity Sign-Out Time, Encrypted Backup Export, ID Photo Retention Schedule, at **Evaluation Dummy Data Seeder**.

#### 📌 Sprint 5: Student Portal — Website (Vercel) & Android App (Capacitor 8) (7 Student Pages)
* **Shared Security & Privacy Rule:** Ang estudyante ay **HINDI kailanman makakakita** ng case records, offenses, alerts, clearance records, o data ng ibang estudyante (enforced via Supabase Row-Level Security).
* **Page S1 — Sign Up & Sign In:** Sign up gamit ang Student Number, Name, Grade, Section, Adviser + upload/capture ng ID Photo at Live Personal Selfie + Data Privacy Act consent + automatic Masterlist match check. Sign in gamit ang **Student ID + Password + 6-Character Email OTP**.
* **Page S2 — Home:** Latest submitted concerns status, new chat reply badge, at Office Hours & Emergency Notice.
* **Page S3 — Submit a Concern:** Guided statement (*Type of concern, What happened, When, Where, Who was involved, Witnesses*), optional photo/screenshot evidence, `Normal` o `Confidential` toggle, `Urgent ("Happening now")` toggle, at required **Statement of Truthfulness** checkbox.
* **Page S4 — My Concerns:** Status tracker ng sariling reports (`Submitted → Approved` o `Rejected with reason`).
* **Page S5 — Notifications:** In-app at Android push/local notifications kapag na-approve/reject ang concern o may bagong reply sa Concern Chat.
* **Page S6 — Concern Chat:** Text-only chat kasama ang *"Guidance Office"* kapag `Approved` na ang concern (may malinaw na notice ng office days at hours).
* **Page S7 — Profile and Privacy:** View account details at instructions para sa password reset sa Guidance Office.

---

---

## 11. Plug-and-Play SMS & Gmail Notification Engine + Live System Diagnostics

Para **wala ka nang poproblemahin sa pag-connect ng SMS at Gmail**, ako na mismo ang gagawa ng buong backend/frontend integration, diagnostic testers, at fallback modes!

### 11.1 Flexible 3-Mode Parent Notification Selector (`SMS + Gmail Both`, `SMS Only`, o `Gmail Only`)
Sa **Page 5 (Appointments / Parent Summons)** at **Page 6 (Follow-Ups)**, maglalagay tayo ng **3-Mode Notification Channel Selector** para kung inactive ang SIM card ng magulang pero active ang kanyang Gmail (o vice versa), makakapili agad ang Guidance Staff:

| Mode Button sa UI | Kailan Gagamitin | Paano Gumagana |
| :--- | :--- | :--- |
| **🟢 `Send Both (SMS + Gmail)`** *(Default kapag may cellphone # at Gmail)* | Kapag parehong merong mobile number at Gmail address ang magulang para 100% siguradong matatanggap. | Sabay na ipapadala ang Filipino SMS at ang Gmail notice (naka-hiwalay ang proseso para kahit mag-fail ang isa, **tuloy pa rin yung isa**). |
| **📱 `SMS Only (Cellphone Text)`** | Kapag walang binigay na Gmail ang magulang o mas gusto lang i-text. | Ipapadala via **Semaphore SMS API** (o Local SMS Simulator habang nagte-test). |
| **✉️ `Gmail / Email Only`** | **Kapag inactive/out-of-coverage ang cellphone number ng magulang** pero active ang kanyang Gmail! | Ipapadala agad mula sa **`aicsmontalbansafeguard@gmail.com`** papunta sa Gmail ng magulang (walang offense details alinsunod sa Data Privacy Act). |

---

### 11.2 Ano ang Kailangan sa `aicsmontalbansafeguard@gmail.com` Para Makapag-Send sa Kahit Anong Gmail?

Para makapagpadala ang **`aicsmontalbansafeguard@gmail.com`** ng **6-Character Login OTP** at **Parent Conference Email Notices** sa kahit kaninong Gmail address (`@gmail.com`, `@yahoo.com`, atbp.) nang libre at walang kailangang bilhing custom domain:

1. **Google 16-Character App Password (Pinakamadali at 100% Free — Walang Domain Needed!):**
   * Buksan ang Google Account Settings ng **`aicsmontalbansafeguard@gmail.com`** (`myaccount.google.com/security`).
   * I-on ang **2-Step Verification**.
   * Hanapin sa search bar ang **"App passwords"**, gumawa ng pangalan na `AICS Guidance System`, at bibigyan ka ni Google ng **16-letter App Password** (hal. `abcd efgh ijkl mnop`).
   * **Bakit ito ang the best?** Kapag nilagay natin ang 16-letter App Password na iyan sa ating Tauri/Rust Backend o Supabase Edge Function (kasama ng **Resend API**), **makakapag-send na agad ang `aicsmontalbansafeguard@gmail.com` sa KAHIT ANONG email address ng magulang o estudyante nang walang restriction!**
2. **Built-In Settings Connection Wizard (`Page 17: Settings → SMS & Gmail Connection`):**
   * Hindi mo kailangang mag-edit ng code! Maglalagay ako sa **Settings** ng malinaw na input box para sa:
     * **Gmail Sender Address:** `aicsmontalbansafeguard@gmail.com`
     * **Gmail 16-Char App Password / Resend API Key** + **`[ ✉️ Send Test Gmail Now ]`** button
     * **Semaphore SMS API Key & Sender Name** + **`[ 📱 Send Test SMS Now ]`** button
   * At kahit **wala ka pang API key o App Password habang nagde-develop tayo**, may **Built-In Live SMS & Gmail Inbox Simulator Drawer** sa loob mismo ng app para makita mo agad ang aktwal na text message at email na matatanggap ng magulang!

---

### 11.3 Plain-Language Action Status Banners & Error Diagnostics ("Sabihin Agad Kung Bakit Hindi Na-Send at Paano Ayusin!")

Alinsunod sa hiniling mo, **bawat button, form, SMS, at Gmail action sa buong system ay may Live Status Feedback at Plain Error Explanation** sa **Simple English** at **Modern 2026 Taglish**—walang nakakalitong technical error codes:

| Sitwasyon / Error | ❌ Default Technical Error (BAWAL) | ✅ Ang Ipapakita ng AICS System Natin (`Status + Bakit + Paano Ayusin`) |
| :--- | :--- | :--- |
| **Successful SMS + Gmail** | `200 OK` | **🟢 Sent Successfully!**<br>*EN:* Text message sent to `0917-123-4567` and email sent to `parent@gmail.com`.<br>*TL:* Na-send na ang text sa `0917-123-4567` at email sa `parent@gmail.com`. |
| **Maling Cellphone Number Format** | `Error 422: Invalid recipient` | **🔴 SMS Not Sent — Incomplete Mobile Number**<br>*Bakit:* Kulang ng 1 digit ang number (`0917123456` — 10 digits lang imbes na 11).<br>*Paano ayusin:* I-click ang **`[ ✏️ Fix Number Now ]`** sa ibaba o piliin muna ang **`✉️ Send via Gmail Only`**. |
| **Inactive SIM / Failed SMS Delivery** | `Gateway Delivery Failed` | **🔴 SMS Failed to Deliver to Parent's Phone**<br>*Bakit:* Baka patay ang phone, walang signal, o inactive na ang SIM card ng magulang.<br>*Automatic Action:* Gumawa na ang system ng **"Call Parent / Switch to Gmail"** task sa Dashboard. Pindutin ang **`[ ✉️ Send to Parent's Gmail Instead ]`**. |
| **Kulang ng Load / Credits sa Semaphore SMS** | `Insufficient balance` | **🟡 SMS Paused — Low SMS Credits**<br>*Bakit:* Ubos na ang SMS load sa Semaphore account.<br>*Paano ayusin:* Mag-top up sa Semaphore o gamitin muna ang **`✉️ Send via Gmail`** at **`🖨️ Print Parent Call Slip`**. |
| **Mali o Kulang ang Gmail App Password** | `SMTP Auth Error 535` | **🔴 Gmail Not Connected Yet**<br>*Bakit:* Hindi pa nailalagay o mali ang 16-letter Google App Password ng `aicsmontalbansafeguard@gmail.com`.<br>*Paano ayusin:* Pumunta sa **`Settings → SMS & Gmail Connection`** at i-paste ang 16-letter App Password, o pindutin ang **`[ Test Connection ]`**. |
| **Walang Internet Connection** | `NetworkError: Failed to fetch` | **🔴 No Internet Connection Detected**<br>*Bakit:* Nawalan ng internet ang computer kaya hindi ma-send ang online SMS/Email.<br>*Paano ayusin:* Naka-save na ang schedule sa queue. I-check ang Wi-Fi/LAN cable at pindutin ang **`[ 🔄 Retry Sending ]`**. |

---

### 11.4 User-Editable Message Composer + Smart Tag Pills + Data Privacy Guard
*(Ang Guidance Staff/User Mismo ang Gagawa o Mag-e-edit ng Message Bago I-Send!)*

Alinsunod sa gusto mo, **hindi naka-lock ang message**: ang user (Guidance Associate / Counselor) mismo ang **pwedeng mag-type, magbago, o mag-customize ng laman ng SMS at Gmail message** bago pindutin ang Send!

1. **Live Editable Message Box (Sa Appointments, Follow-Ups, at Settings):**
   * Pag nag-schedule ng conference o nag-follow up, may **Editable Message Box** kung saan naka-load na ang default Filipino/Taglish template para mabilis, **PERO pwedeng burahin, dagdagan, o baguhin ng user ang kahit anong salita** depende sa sitwasyon!
2. **1-Click Smart Tag Pills (Para Hindi Na Magta-Type nang Paulit-Ulit):**
   * Sa itaas ng message box, may mga clickable pills:
     * **`[ + Parent Name ]`** · **`[ + Student Name ]`** · **`[ + Date ]`** · **`[ + Time ]`** · **`[ + Office Room ]`** · **`[ + Staff Name ]`**
   * Pag pinindot ng user ang pill, kusang ilalagay ang pangalan ng magulang/estudyante at schedule sa message box, at may **Live Preview Card** sa kanan para makita ang eksaktong itsura ng text at Gmail bago i-send.
3. **Save Custom Templates (`Page 17: Settings → SMS & Gmail Templates`):**
   * Pwedeng gumawa ang user ng sariling templates (hal. *Initial Invitation*, *1-Day Reminder*, *Missed Conference Follow-Up*, *ID Hold Notice*) at i-save para magamit ulit.
4. **Built-In Data Privacy & Character Counter Guard (Manuscript §1.8 #3 & §3.6):**
   * Habang nagta-type ang user ng sariling message:
     * Ipinapakita ang **Live Character Counter** (hal. `138 / 160 chars · 1 SMS`) para hindi maputol ang text.
     * May **Live Confidentiality Checker** na magbibigay ng friendly reminder (**`🟡 Privacy Reminder: Avoid typing specific offense details in SMS/Email per Data Privacy Act`**) kung sakaling mai-type ng user ang pangalan ng offense sa message box!

---

## 12. Step-by-Step Guide: Paano I-Set Up ang Gmail (`aicsmontalbansafeguard@gmail.com`) at Semaphore SMS Account

Heto ang **pinakamadaling step-by-step guide** na susundin natin (pwede rin kitang tulungan i-set up ito kapag kailangan mo na ng live sending, dahil **habang nagko-code tayo ngayon ay gagana na agad ang system kahit wala pa ito** via Built-in Sandbox Simulator):

### 12.1 Step-by-Step: Ano ang Kailangan sa `aicsmontalbansafeguard@gmail.com`? (100% FREE)
Para makapag-send ang **`aicsmontalbansafeguard@gmail.com`** ng **6-Character Login OTP** at **Parent Conference Email Notices** sa kahit anong Gmail address (`@gmail.com`, `@yahoo.com`, atbp.):

1. **Step 1:** Mag-sign in sa Google Account ng **`aicsmontalbansafeguard@gmail.com`** sa browser: `https://myaccount.google.com/security`
2. **Step 2:** I-click ang **2-Step Verification** at siguraduhing naka-**ON** ito.
3. **Step 3:** Pumunta sa **Google App Passwords**: `https://myaccount.google.com/apppasswords` (o i-search ang *"App passwords"* sa itaas ng Google Account page).
4. **Step 4:** Sa **App name**, i-type ang: `AICS Guidance System` at pindutin ang **Create**.
5. **Step 5:** Lalabas ang **16-letter App Password** sa yellow/gray box (halimbawa: `abcd efgh ijkl mnop`).
6. **Step 6:** I-copy lang ang 16-letter code na iyan! Ipe-paste natin iyan sa **`Settings → SMS & Gmail Connection`** ng ating AICS Desktop App at **100% live na agad ang Gmail sending!**

---

### 12.2 Step-by-Step: Paano Gumawa ng Semaphore SMS Account? (`semaphore.co`)
1. **Step 1 (Libre ang Sign-Up):** Buksan ang `https://semaphore.co` at pindutin ang **Sign Up / Register**.
2. **Step 2:** Gamitin ang **`aicsmontalbansafeguard@gmail.com`** sa pag-register at i-verify ang email at mobile number.
3. **Step 3 (Kunin ang API Key):** Pagkapasok sa Semaphore Dashboard, makikita mo agad sa itaas ang iyong **API Key** (32-character code).
4. **Step 4 (I-Paste sa System Natin):** Ilalagay natin ang API Key na iyan sa **`Settings → SMS & Gmail Connection`** ng ating AICS Desktop App.
5. **Step 5 (Top-Up lang kapag magla-live test / Defense na):**
   * Habang binubuo at chine-check natin ang bawat module: naka-**Sandbox / Simulator Mode** muna tayo para **₱0 ang bawas**.
   * Kapag ready ka nang mag-send sa totoong cellphone para sa Defense: pindutin lang ang **Add Credits** sa Semaphore Dashboard → piliin ang **GCash / Maya** (₱500 minimum = ~500–625 texts) → at i-switch ang toggle sa ating app sa **`🟢 Live Semaphore SMS`**.

---

## 13. Strict "One-Stage-at-a-Time" Development, 8-Role Execution & Deep QA Gate Protocol

Alinsunod sa utos mo: **mula Stage 1 hanggang matapos ang buong system sa Stage 9**, bawat Stage ay dadaan sa **8-Role Workflow**:
1. **STEP A — Build Phase (Roles 1 to 5):** Ang *UI/UX Designer*, *Senior Frontend Engineer*, *Motion UI Engineer*, *Frontend Performance Engineer*, at *Tauri 2 / Rust & Cloud Engineer* ang magko-code ng Stage.
2. **STEP B — Deep QA & Verification Gate (Roles 6, 7, at 8):** Bago ko pa man ipakita sa'yo, ang **Lead SDET (Role 6)**, **Visual QA Inspector (Role 7)**, at **Security/DPA Auditor (Role 8)** ay magpapatakbo ng **Live Browser & Automated Stress Test** sa bawat button, input box, modal, `EN / Taglish` switcher, at Dark/Light mode, at maglalabas ng **Official Deep QA Pass Report Card**.
3. **STEP C — User Inspection & Sign-Off:** Saka mo lang iche-check, at **hindi tayo magpo-proceed sa susunod na Stage hangga't hindi ka 100% satisfied!**

| Stage # | Ano ang Bubuuin Natin sa Stage na Ito | Ano ang Iche-Check Mo Bago Tayo Mag-Proceed sa Next Stage | Status |
| :---: | :--- | :--- | :---: |
| **STAGE 1** | **Login & Security Gate (`Feature 0`)**<br>• GSAP Official AICS Logo Boot Splash<br>• Step 1: 6-Digit App PIN Gate (`123456`)<br>• Step 2: Staff Email Sign-In (`aicsmontalbansafeguard@gmail.com`)<br>• Step 3: 6-Character Alphanumeric OTP Verification + Dev OTP Preview<br>• `EN · Simple English` ↔ `TL · Modern Taglish` Pill Switcher<br>• Circular Reveal Dark Mode / Light Mode Toggle | ✅ Gumagana ang AICS Logo splash<br>✅ Gumagana ang PIN `123456`, lockout, at shake animation<br>✅ Gumagana ang `aicsmontalbansafeguard@gmail.com` + 6-char OTP<br>✅ Gumagana ang `EN / Taglish` switcher at Circular Dark/Light mode | ⏳ **NEXT UP (Unang Gagawin!)** |
| **STAGE 2** | **Workspace Shell + Dashboard (`Page 1 — All 6 Widgets & Graphs`)**<br>• Collapsible Navy Sidebar (`264px ↔ 76px`) + `230px` AICS Royal Hero Header + `Clock24`<br>• Top Urgent Banner + 4 Floating Bento KPI Stat Cards<br>• Today's Appointments (`Attended` / `Did not attend` + Reason Modal + Walk-In Logger)<br>• Follow-Up Tasks Due & Priority Calls (`Log Call` + `Failed SMS` Diagnostic + User-Editable SMS/Gmail Composer)<br>• Multi-Color Parent Attendance Donut Ring + `Weekly / Monthly / Yearly` Case Trend Graph + Section Pill Grid<br>• Submitted Reports Waiting + Overdue Alerts + Early Intervention List | ✅ Lahat ng buttons, modals, graphs, at status colors sa Dashboard ay 100% working at walang lag | 🔒 *Maghihintay ng "Approved Stage 1" mo* |
| **STAGE 3** | **Masterlist (`Page 15`) + Add Report (`Page 2`) + Students (`Page 4`)**<br>• Excel/CSV Import with `Preview & Fix` table<br>• Multi-student incident report + Auto-classification (`Minor, Less Serious, Serious, Grave`) + Early Intervention Alert<br>• Student Profile, Offense History, Clearance Badge & Password Reset Assist | ✅ Makakapag-import ng Masterlist at makakapag-add ng bagong Case nang live | 🔒 *Maghihintay ng "Approved Stage 2" mo* |
| **STAGE 4** | **Cases (`Page 3`) + Locked Student Statement Station + 5 Printable Forms**<br>• 7-Step Case Flow (`Reported → Closed`) + Smart Flow #1 (`Fast-Track Minor Warning`)<br>• Rust Kiosk-Locked *Malayang Salaysay* Statement Station (+ Paper upload option)<br>• 1-Click Print: *Call Slip, Conference Form, Behavioral Contract, Kasunduan, Suspension Letter* | ✅ Gumagana ang buong Case progression, Locked Statement Station, at Print Forms | 🔒 *Maghihintay ng "Approved Stage 3" mo* |
| **STAGE 5** | **Appointments (`Page 5`) + Follow-Ups (`Page 6`) + SMS & Gmail Log (`Page 7`)**<br>• Smart Scheduling + Calendar View (`Day/Week/Month`)<br>• User-Editable Message Composer (`Send Both SMS + Gmail`, `SMS Only`, `Gmail Only`) + Live Error Diagnostics<br>• Reschedule (cancels old reminder), Contact Log, Notice Received, Priority Follow-Up & Escalation | ✅ Gumagana ang pag-schedule, pag-type ng custom message, pag-send sa SMS/Gmail, at follow-up tracking | 🔒 *Maghihintay ng "Approved Stage 4" mo* |
| **STAGE 6** | **ID Holds & Pending Sanctions (`Page 8`) + Community Service (`Page 9`) + Counselor Referral Queue (`Page 10`)**<br>• ID Hold/Return tracker + Pending Sanction rule<br>• Community Service hours progress bar + Smart Flow #4 (`Auto-Close Case Prompt`)<br>• Counselor Queue + `Refer-Out Safeguard 🔒` (auto-stops parent SMS & masks details) | ✅ Gumagana ang sanction tracking, auto-close prompt, at Refer-Out Safeguard | 🔒 *Maghihintay ng "Approved Stage 5" mo* |
| **STAGE 7** | **Submitted Reports (`Page 11`) + Concern Chats (`Page 12`) + Clearance (`Page 13`)**<br>• Student concern review + ID/Selfie viewer (logged sa Audit Trail) + Approve/Reject + Fake Account Deactivation<br>• Two-way Concern Chat + Close Chat<br>• Grade 12 Clearance Checker (`Cleared / Not Cleared` with reason) + 1-Click Print Clearance | ✅ Gumagana ang pag-approve ng report, Concern Chat, at pag-print ng Grade 12 Clearance | 🔒 *Maghihintay ng "Approved Stage 6" mo* |
| **STAGE 8** | **Reports & Statistics (`Page 14`) + Audit Trail (`Page 16`) + PIN Settings (`Page 17`)**<br>• Full 7-Graph Analytics Hub + Recidivism Tracker + Automated Monthly Report (`Time to Close`) + Handover Notes<br>• Tamper-proof Audit Trail<br>• PIN-Protected Settings (Office hours, Handbook rules, SMS/Gmail Connection Wizard, Backup, Retention, Evaluation Dummy Data Seeder) | ✅ Kumpleto na ang buong 17-Page Desktop Application! | 🔒 *Maghihintay ng "Approved Stage 7" mo* |
| **STAGE 9** | **Student Portal — Website & Android App (`Pages S1–S7`) + Automated Test Suite**<br>• Sign Up (with ID & Live Selfie), Sign In (ID + Password + 6-Char Email OTP), Submit Guided Concern, My Concerns, Notifications, Concern Chat, Profile<br>• Full Vitest + Playwright Functional Test Verification | ✅ Kumpleto ang buong Capstone System (Desktop + Web + Android)! | 🔒 *Maghihintay ng "Approved Stage 8" mo* |
