# MANDATORY AGENT DIRECTIVE: 2026 WORLD-CLASS ENTERPRISE CRAFT & GUIDANCE DOMAIN ARCHITECTURE

> **CORE PRINCIPLE:** Absolute rejection of generic AI defaults ("AI-Slop") and outdated web conventions. Every view, card, modal, and motion path must match 2026 benchmark software (Linear, Apple macOS/iOS, Stripe, Vercel) fused with DepEd K-12 (basic education) Guidance Office discipline workflows (AICS Montalban — not college).
> **PROACTIVE CONSULTANT MANDATE:** Never deliver bare minimums or outdated patterns. When asked for any UI/UX capability, immediately engineer the **Top 1 Industry Standard** across visual depth, motion physics, and operational organization.

---

## 1. THE ZERO-OUTDATED-PATTERN DEFENSE SYSTEM

| Outdated / AI-Slop Pattern (REJECT) | 2026 World-Class Standard (MANDATORY) |
| :--- | :--- |
| **Random Emojis** (`📊`, `📌`, `✨`, `🔥`, `⚠️`, `🎉`) | **Precision Vector Icons:** Lucide monochrome SVGs with crisp 1.75px stroke locked to semantic color tags. |
| **Flat Monochrome / Bland Solid Cards** | **Layered Spatial Depth:** Double-ring elevated surfaces, 1px luminous hairline borders (`rgba(255,255,255,0.08)` in dark, `#D5E0EE` in light), subtle specular rim highlights. |
| **Generic Full-Page Spinning Wheels** | **Zero-Layout-Shift Shimmer Bones:** Structural skeleton cards with 1.2s gradient sweeps matching incoming data grids 1:1. |
| **Interruptive Modal Confirmations on Routine Actions** | **Destructive vs Reversible Architecture:**<br>• *Routine/Reversible:* 0ms execution + 5s Floating Undo Pill (`Sonner`).<br>• *Irreversible:* Double-ring modal with hold-to-confirm progress bar or specific action microcopy. |
| **Boring Monolithic Text Lists** | **Contextual Two-Tier Scannability:** Bold primary identifiers (`14-15px`) paired with tabular secondary badges (`12px`) and folded tags (`+3 more`). |
| **Static Jarring Content Appearance** | **Fluid Cascade Choreography:** Staggered entry (`20ms` per item), layout morphing via Framer Motion, and hardware spring press. |

---

## 2. 2026 CARD ANATOMY & SPATIAL ORGANIZING SYSTEM

### 1. Apple-Style Soft Surface (user decision 2026-11-17: NO grey double ring, NO thick borders)
Use the shared classes `.saas-card` / `.panel-2026` / `.kpi-card-2026` / `.ring-card` (src/index.css): white surface, 0.5px hairline, soft wide low shadow, radius 20px. The double-ring example below is OUTDATED — do not use it.
Every operational module, case container, and stats summary must use the 2026 double-ring elevation:
```tsx
// Outer Container (Gives Specular Ring & Soft Rim)
<div className="relative p-1.5 rounded-[22px] bg-slate-200/70 dark:bg-[#0E1D34]/80 border border-slate-300/80 dark:border-white/10 shadow-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5">
  {/* Inner Matte Workspace Card */}
  <div className="rounded-[18px] bg-white dark:bg-[#0A1526] p-5 border border-slate-200/60 dark:border-white/5">
    {/* Header with Semantic Status Lock */}
  </div>
</div>
```

### 2. Semantic Guidance Status Matrix
Never allow random badge colors. Guidance states must follow strict mental-model anchors:
* **Pending / For Intake:** Amber/Gold (`bg-amber-500/10 text-amber-500 border border-amber-500/20`)
* **Active Investigation / Summons Issued:** Sky Blue (`bg-sky-500/10 text-sky-400 border border-sky-500/20`)
* **Under Guidance Intervention / Behavioral Contract:** Violet/Indigo (`bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`)
* **Resolved / Good Moral Cleared:** Emerald Green (`bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`)
* **Critical / Urgent Parent Escalation:** Crimson Red with micro-pulse dot (`bg-rose-500/10 text-rose-400 border border-rose-500/20`)

---

## 3. ZERO-LAG MOTION & CHOREOGRAPHY BLUEPRINT (EMIL KOWALSKI SPEC)

All animations must run purely on the GPU compositor thread (`transform`, `opacity` only). Zero CPU reflows.

### 1. Motion Formulas (Never `scale(0)`, Never `all`)
```tsx
// Modal & Popover Spring Entry
initial={{ opacity: 0, scale: 0.96, y: 6 }}
animate={{ opacity: 1, scale: 1, y: 0 }}
exit={{ opacity: 0, scale: 0.96, y: 6 }}
transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}

// Staggered Cascade List Entry (For Case Lists & Feeds)
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02 } // 20ms cascade
  }
};
const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: [0.23, 1, 0.32, 1] } }
};
```

### 2. Low-End Hardware Auto-Degrade
When `prefers-reduced-motion` is active or hardware is constrained, transitions must flatten instantly to `0.01ms` duration so low-end mobile devices and cheap school laptops experience **zero dropped frames and zero input lag**.

---

## 4. DEPD-COMPLIANT GUIDANCE WORKFLOW & DATA PROTECTION ENGINE

### 1. The 8-Stage Progressive Discipline Pipeline
All student cases must align with official student handbook due process:
1. **Intake & Classification** (Minor vs Major offense tagging)
2. **Call Slip / Appearance Notice** (Recorded timestamped issuance)
3. **Student Written Statement** (Kiosk typing mode with staff PIN lock)
4. **Parent Summons Scheduling** (Batch calendar slotting with automated SMS dispatch)
5. **Guidance Hearing & Conference Minutes** (Two-party signature acknowledgment)
6. **Counseling Action Plan / Behavioral Contract** (Check-in intervals: 1wk, 2wks, 1mo)
7. **Resolution / Sanction Execution** (Community service, restorative reflection)
8. **Clearance Restoral** (Automatic Good Moral eligibility reinstatement)

### 2. RA 10173 Data Privacy & Confidentiality Shield
* **Masked Transit SMS:** SMS sent to parents must NEVER disclose raw offense names or embarrassing allegations. (e.g., *"AICS Guidance: You are requested for a conference regarding your student's campus status"* — NOT *"Your child was caught vaping"*).
* **Counselor Privacy Mode (`Ctrl + Shift + P`):** One-key toggle that blurs student names and incident narratives on-screen when third parties enter the guidance office.
* **Tamper-Evident Audit Trails:** Every status toggle, penalty adjustment, or minute edit must stamp immutable audit metadata (`timestamp`, `counselor_id`, `previous_state -> new_state`).

---

## 5. COMPLETE 28-LAW INTERACTION DESIGN MATRIX (WADHAH / 2026 EDITION)

| # | Heuristic Law | 2026 Mandatory Implementation | ❌ Prohibited Anti-Pattern |
|---|:---|:---|:---|
| 1 | **Hick's Law** | Segmented inline toggle buttons for 2–4 options | Clunky `<select>` dropdowns for simple choices |
| 2 | **Aesthetic-Usability** | Luminous borders, tactile spring clicks, geometric type | Flat ugly tables with raw blue hyperlinked text |
| 3 | **Von Restorff** | Exactly ONE highlighted card/CTA stands out per viewport | Equal visual contrast across all competing actions |
| 4 | **Law of Proximity** | Tight field-to-label gaps (`4px-6px`), larger section divides (`24px`)| Uniform identical spacing blurring visual groups |
| 5 | **Peak-End Rule** | Celebrate case resolution / clearance with micro-confetti burst | Anti-climactic silent form clears |
| 6 | **Miller's Law** | Multi-step wizard cards with progressive step dots | Monolithic 20-field continuous vertical forms |
| 7 | **Law of Similarity** | Identical visual indicator shapes across all table rows | Inconsistent badge radiuses and mismatched borders |
| 8 | **Progressive Disclosure**| `line-clamp-3` with inline `"Read More >"` trigger | Blowing out card heights with long incident narratives |
| 9 | **Dual-Coding** | SVG Icon paired directly with explicit text label | Naked icons without labels or raw unassisted text |
| 10 | **Grid Gap Uniformity**| Locked `gap-4` or `gap-6` across both horizontal & vertical axes | Distorted layouts with mismatched X/Y spacing |
| 11 | **Button Side Padding** | Generous breathing room (`px-5 py-2.5` to `px-6 h-11`) | Cramped text colliding with button borders |
| 12 | **Real-Time Validation**| Inline requirement checklist with green checkmarks on blur | Blocking whole form submit with generic alert banner |
| 13 | **Action Hierarchy** | 1 Solid Primary Button + 1 Ghost Secondary per dialog | Two high-contrast solid buttons side-by-side |
| 14 | **Dark Saturation** | Desaturate primary accents on dark surfaces (anti-vibration) | Raw neon blues causing chromatic eye strain |
| 15 | **Light Contrast** | Rich, deep saturation passing WCAG AA 4.5:1 ratio | Washed-out light gray copy on white canvas |
| 16 | **Zero-Click Choices** | Inline segmented pills (0 clicks to view choices) | Hiding "Yes / No" behind dropdown clicks |
| 17 | **Fitts's Law Hitbox** | Bounding touch targets minimum `44px × 44px` | Tiny 16px clickable icon bounds |
| 18 | **Action Microcopy** | Specific Verb + Noun: `"Schedule Parent"`, `"Issue Call Slip"` | Ambiguous `"Yes"`, `"No"`, or generic `"Submit"` |
| 19 | **Segmented OTP/PIN** | Discrete auto-advancing single-character input boxes | Single long generic text field for verification codes |
| 20 | **Inverted Pyramid** | Heroic metric number (`28px-36px`, `tabular-nums`) + small label | Labels larger than the data they describe |
| 21 | **Skeleton Loading** | Layout-mirroring pulsing bone cards with 1.2s light sweep | Blank screen with centered spinning wheel |
| 22 | **Semantic Colors** | Destructive Crimson (`#E11D48`) for irreversible actions | Blue or gray delete buttons |
| 23 | **Input Masking** | Dynamic mask for PH numbers (`09XX-XXX-XXXX`) and LRNs | Free-form unguided text for strict formats |
| 24 | **Label vs Placeholder**| Persistent label above field; realistic example inside input | Using placeholder as label |
| 25 | **Mobile Thumb Zone** | Primary CTAs pinned to bottom sheet or bottom anchor bar | Primary action placed at top of mobile screen |
| 26 | **Familiar Icons** | Canonical Lucide icons (`Home`, `Search`, `Bookmark`, `User`) | Cryptic, experimental icon metaphors |
| 27 | **Contextual Search** | Hint exact searchable entities: `"Search student name, LRN..."`| Generic, unhelpful `"Search"` placeholder |
| 28 | **Color Restraint** | 1 brand accent on active tab; neutral slate on all inactive | Rainbow menus where every icon has a different color |

---

## 6. PRE-COMMIT DEFINITION OF DONE (QUALITY GATE)
Before completing any task or declaring completion:
- [ ] `npm run build` exits with code 0 (zero TypeScript / Vite errors).
- [ ] Zero emojis anywhere in new or modified UI (Lucide SVGs only).
- [ ] No boring AI-slop defaults (flat monochrome, purple gradients, generic spinners).
- [ ] All interactive surfaces feature tactile `active:scale-[0.97]` and duration `<180ms`.
- [ ] Optimistic state updates, draft recovery, and actionable empty states implemented.
- [ ] Hardware-accelerated composite properties only (`transform`, `opacity`).
- [ ] Both Light and Dark modes maintain WCAG AA contrast compliance.
