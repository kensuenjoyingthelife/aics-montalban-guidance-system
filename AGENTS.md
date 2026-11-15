# MANDATORY AGENT DIRECTIVE: EMIL KOWALSKI CRAFT & IMPECCABLE TASTE

Every single task, turn, prompt, and UI implementation in this project MUST strictly follow the design engineering philosophy, physical motion rules, and visual craft of **Emil Kowalski** (Linear, Vercel, animations.dev).

## Non-Negotiable Standards on EVERY Prompt:

1. **Zero Emojis Everywhere:**
   - NEVER output emojis (`📝`, `📁`, `💬`, `🕊️`, `⏰`, `🔒`, `📷`, `🖼️`, etc.) in buttons, headers, navigation items, cards, badges, or dialogs.
   - ALWAYS use standard, high-precision SVG vector icons (e.g. Lucide icons: `FileText`, `MessageSquare`, `FolderArchive`, `Clock`, `User`, `Download`, `AlertTriangle`).

2. **Physical Scale Rules (Never scale(0)):**
   - Nothing appears from a singularity in the physical world.
   - Elements (modals, toasts, tooltips, popovers, dropdowns) MUST enter from `scale(0.95)` or `scale(0.96)` with `opacity: 0` to `scale(1)` with `opacity: 1`.

3. **Responsive Spring & Cubic-Bezier Timing:**
   - Every interactive button and pressable surface MUST have an active press state: `active:scale-[0.97]` or `active:scale-[0.98]`.
   - Transitions must use strong ease-out curves: `cubic-bezier(0.23, 1, 0.32, 1)` or `--ease-out`.
   - Never use `ease-in` on entering UI elements.
   - Animation duration for UI controls MUST stay under `300ms` (ideally `160ms - 220ms`).
   - Do NOT use `transition: all`. Explicitly specify hardware-accelerated properties: `transform`, `opacity`, `filter`.

4. **Flawless Light & Dark Mode Contrast (WCAG AAA):**
   - In Light Mode: Solid backgrounds with distinct, visible slate borders (`border: 1.5px solid #94A3B8` / `#CBD5E1`) and deep black-navy text (`#0F172A` / `#0B1F4D`). Never use pale, washed-out blue borders or faint text that blends into the white canvas.
   - In Dark Mode: Deep obsidian-navy surfaces with delicate luminous borders (`rgba(147, 197, 253, 0.25)`) and crisp white text (`#FFFFFF`).

5. **Compact, Native Mobile Spacing:**
   - Never push cards to the extreme top with huge bottom voids on mobile phones or APK screens.
   - Keep padding compact (`p-3` or `p-4` on mobile), vertically centered or top-flow balanced with natural scrolling.
   - Notification clicks MUST deep-link directly into the target active chat or concern.


## Anti-AI-Slop & Human-Grade Taste Directive:
1. **Zero AI Clichés:** Ban generic dark-mode radial gradients, monotonous purple-cyan blobs, raw emojis, screaming uppercase labels, and redundant cards.
2. **Deterministic Archetype:** Use Archetype A/B (Institutional Deep Navy #040E20, Academic Amber #F59E0B, Precision Emerald #10B981) with crisp 1px hairline borders (rgba(255,255,255,0.08) in dark, #CBD5E1 in light).
3. **1-to-3 Rule:** Exactly 1 primary action per viewport/card, max 3 supporting logics.
4. **8-State Interactive Feedback:** Default, hover, focus-visible, active (:scale-[0.97]), disabled, loading, error, success.
5. **Human Restraint:** Strip decorative ballast. Every element must provide tangible utility.
