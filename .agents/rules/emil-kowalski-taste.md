---
description: Emil Kowalski design engineering principles, impeccable taste, and fluid micro-interactions
globs: **/*
---

# Emil Kowalski Craft & Impeccable Taste Guidelines

Apply Emil Kowalski's craft sensibility and design engineering standards to all UI and animation work in this workspace:

1. **Physical Scale Rules:** Never enter an element from `scale(0)`. Animate entry from `scale(0.95)` with `opacity: 0`.
2. **Snappy Timing & Easing:** Entry animations must use quick `ease-out` (e.g. `cubic-bezier(0.16, 1, 0.3, 1)` or `duration-200`) under 300ms. Never use `ease-in` on entering UI elements.
3. **Explicit Transitions:** Do not use `transition: all`. Specify exact transform and opacity transitions.
4. **Haptic & Tactile Feedback:** All buttons and interactive surfaces must have active press states (`active:scale-[0.98]`) and clean hover feedback.
5. **Popover & Dialog Origins:** Scaling must originate from triggers or logical spatial sources rather than arbitrary centers.
6. **Subtle Craft:** Hairline borders, multi-layered soft ambient shadows, and zero clunky UI gimmicks.
