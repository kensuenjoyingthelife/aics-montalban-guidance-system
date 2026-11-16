# MANDATORY AGENT DIRECTIVE: EMIL KOWALSKI CRAFT, IMPECCABLE TASTE & AICS COLLEGIATE EDITORIAL ARCHITECTURE (CDM-GRADE)

Every single task, turn, prompt, and UI implementation in this project MUST strictly follow the design engineering philosophy, physical motion rules, and visual craft of **Emil Kowalski** (Linear, Vercel, animations.dev) fused with the **AICS Collegiate Editorial Architecture** (modeled 1:1 on the `cdm-portal.pages.dev` institutional standard, translated into AICS Montalban's Deep Obsidian Navy, Royal Blue, Sky Azure, and Academic Gold palette).

---

## PART 1: EMIL KOWALSKI NON-NEGOTIABLE CRAFT STANDARDS

1. **Zero Emojis Everywhere:**
   - NEVER output emojis (`📝`, `📁`, `💬`, `🕊️`, `⏰`, `🔒`, `📷`, `🖼️`, etc.) in buttons, headers, navigation items, cards, badges, or dialogs.
   - ALWAYS use standard, high-precision SVG vector icons (Lucide icons: `FileText`, `MessageSquare`, `FolderArchive`, `Clock`, `User`, `Download`, `AlertTriangle`).

2. **Physical Scale Rules (Never `scale(0)`):**
   - Nothing appears from a singularity in the physical world.
   - Elements (modals, toasts, tooltips, popovers, dropdowns) MUST enter from `scale(0.95)` or `scale(0.96)` with `opacity: 0` to `scale(1)` with `opacity: 1`.

3. **Responsive Spring & Cubic-Bezier Timing:**
   - Every interactive button and pressable surface MUST have an active press state: `active:scale-[0.97]` or `active:scale-[0.98]`.
   - Transitions must use strong ease-out curves: `cubic-bezier(0.23, 1, 0.32, 1)` (`--ease-out`).
   - Never use `ease-in` on entering UI elements.
   - Animation duration for UI controls MUST stay under `300ms` (`160ms - 220ms`).
   - Do NOT use `transition: all`. Explicitly specify hardware-accelerated properties: `transform`, `opacity`, `border-color`, `box-shadow`, `background-color`.

4. **Compact, Native Mobile Spacing:**
   - Never push cards to the extreme top with huge bottom voids on mobile phones or APK screens.
   - Keep padding compact (`p-3` or `p-4` on mobile), vertically centered or top-flow balanced with natural scrolling.
   - Notification clicks MUST deep-link directly into the target active chat or concern.

---

## PART 2: AICS COLLEGIATE EDITORIAL DESIGN SYSTEM (1:1 CDM-PORTAL STRUCTURAL TRANSLATION)

We replicate the exact architectural anatomy, typography hierarchy, card geometry, hairline borders, and surface elevation of `cdm-portal.pages.dev`, while strictly preserving the **AICS Institutional Color Palette** (replacing Forest Green `#042017` / `#064e3b` with AICS Deep Navy `#040E20` / `#0B1F4D`).

### 1. Core Brand & Surface Tokens (`:root` & `.dark`)
```css
:root {
  /* Core AICS Brand Colors (Replaces CDM Forest/Emerald) */
  --aics-obsidian: #040E20;       /* Deepest dark navy hero & container background (CDM: #042017) */
  --aics-deep-navy: #0B1F4D;      /* Rich institutional navy (CDM: #064e3b) */
  --aics-royal: #1E469B;          /* Mid royal blue accent (CDM: #059669) */
  --aics-sky: #38BDF8;            /* Bright sky highlight (CDM: #10b981) */
  --aics-gold: #D9A93E;           /* Primary institutional academic gold (CDM: #d9a93e) */
  --aics-gold-light: #F2CE70;     /* Highlighted serif italic/span gold */

  /* Light Mode Surface & Canvas Tokens */
  --portal-canvas: #F8FAFC;       /* Main light background canvas */
  --portal-surface: #FFFFFF;      /* Elevated card background */
  --portal-surface-soft: #EEF3F9; /* Section contrast background (CDM: #f0f5f2) */
  --portal-ink: #0B192C;          /* Primary dark typography (CDM: #10251a) */
  --portal-muted: #52637A;        /* Subdued secondary text (CDM: #607067) */
  --portal-border: #D5E0EE;       /* Crisp 1px card/section border (CDM: #dce6df) */
  --portal-shadow: 0 22px 55px rgba(4, 14, 32, 0.09);

  /* Typography Families */
  --font-serif: "Newsreader", "Playfair Display", Georgia, "Times New Roman", serif;
  --font-sans: "Inter", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

.dark,
html[data-theme="dark"] {
  /* Dark Mode Obsidian Navy Surfaces (1:1 with CDM Dark Mode #07100c / #0d1913 / #263a2f) */
  --portal-canvas: #050C18;       /* Deep obsidian midnight canvas (CDM: #07100c) */
  --portal-surface: #0A1526;      /* Matte dark navy card surface (CDM: #0d1913) */
  --portal-surface-soft: #0E1D34; /* Elevated secondary dark surface (CDM: #11231a) */
  --portal-ink: #EDF4FC;          /* Crisp alabaster-ice white text (CDM: #edf7f0) */
  --portal-muted: #94A8C4;        /* Muted slate-sky secondary copy (CDM: #a9baaf) */
  --portal-border: #1E3250;       /* Crisp 1px structural navy hairline border (CDM: #263a2f) */
  --portal-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
}
```

### 2. Editorial Typography Hierarchy
- **Hero Display Heading (`h1`):**
  - `font-family: var(--font-serif); font-size: clamp(2.75rem, 5.2vw, 5.2rem); font-weight: 500; line-height: 0.94; letter-spacing: -0.045em; color: #FFFFFF;`
  - Gold accent spans inside `h1` use `color: var(--aics-gold-light) (#F2CE70)`.
- **Section Display Heading (`h2`):**
  - `font-family: var(--font-serif); font-size: clamp(2rem, 3.8vw, 3.6rem); font-weight: 500; line-height: 1.04; letter-spacing: -0.035em;`
- **Section Eyebrow / Kicker (`.portal-kicker`):**
  - `font-family: var(--font-sans); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--aics-sky)` (or `var(--aics-gold)` on dark hero/featured surfaces).
- **Card Heading (`h3`):**
  - `font-family: var(--font-sans); font-size: 1.02rem; font-weight: 700; line-height: 1.25; color: var(--portal-ink);`
- **Card Body Copy (`p`):**
  - `font-family: var(--font-sans); font-size: 0.78rem; line-height: 1.6; color: var(--portal-muted);`

### 3. Card & Surface Architecture (Applied System-Wide)
1. **Standard Matte Card (`.portal-card` / Class Schedules Style):**
   - `border: 1px solid var(--portal-border);` (`#D5E0EE` in Light, `#1E3250` in Dark)
   - `border-radius: 20px;`
   - `padding: 22px;`
   - `background: var(--portal-surface);` (`#FFFFFF` in Light, `#0A1526` in Dark)
   - Hover interaction: `transform: translateY(-3px); border-color: color-mix(in srgb, var(--aics-sky) 42%, var(--portal-border)); box-shadow: var(--portal-shadow);`
2. **Featured Surface-Wash Card (`.portal-card-featured` / Admission & Document Requests Style):**
   - Spans 2 columns in 4-column Bento Grids (`grid-column: span 2`).
   - `background: linear-gradient(135deg, #0D2857 0%, #051126 100%);`
   - `border: 1px solid rgba(96, 165, 250, 0.24);`
   - `border-radius: 20px; color: #FFFFFF;`
   - Eyebrow label in `color: #EFCA69;` (`--aics-gold-light`).
   - Squircle Icon Box (`48px × 48px`, `border-radius: 14px`): `background: rgba(255, 255, 255, 0.1); color: #EFCA69;`.
3. **Login / Auth Card with Signature Gold Top Accent Bar (`.portal-login-card`):**
   - `border: 1px solid var(--portal-border); border-radius: 20px; padding: 28px 29px 24px;`
   - `background: color-mix(in srgb, var(--portal-surface) 96%, transparent); backdrop-filter: blur(15px);`
   - `box-shadow: 0 32px 75px rgba(2, 8, 22, 0.45);`
   - **Signature Gold Top Bar (`::before`):** `position: absolute; top: 0; left: 29px; width: 72px; height: 3px; background: var(--aics-gold); border-radius: 2px;`.
4. **Directional Accent Cards (`.portal-card-gold-left` / `.portal-card-blue-left`):**
   - `border: 1px solid var(--portal-border); border-left: 4px solid var(--aics-gold)` (or `var(--aics-royal)`).
5. **Squircle Icon Badge (`.portal-icon-box`):**
   - `width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center;`
   - `background: color-mix(in srgb, var(--aics-royal) 12%, var(--portal-surface)); color: var(--aics-sky); border: 1px solid rgba(56, 189, 248, 0.16);`

### 4. Sticky Institutional Header & Controls
- **Header Bar:** `background: rgba(4, 14, 32, 0.94); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(217, 169, 62, 0.20); min-height: 76px;`
- **Brand Title:** `font-family: var(--font-serif); font-size: 0.95rem; font-weight: 700; color: #FFFFFF;`
- **Brand Subtitle:** `font-size: 0.59rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255, 255, 255, 0.62);`
- **Ghost Button (`Log In` style):** `border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 10px; padding: 0 17px; min-height: 42px; color: #FFFFFF;`
- **Gold CTA Button (`Admission / Action` style):** `background: var(--aics-gold); color: #040E20; border-radius: 10px; padding: 0 17px; min-height: 42px; font-weight: 800;`
- **Input Fields:** `height: 48px; border-radius: 11px; background: var(--portal-canvas); border: 1px solid var(--portal-border);` with focus ring `border-color: var(--aics-royal); box-shadow: 0 0 0 3px rgba(30, 70, 155, 0.18);`.
