---
name: "SmartCare ICU"
description: "Paperless intensive care management and AI decision-support dashboard"
colors:
  surface-dark: "oklch(18% 0.015 250)"
  surface-dark-card: "oklch(22% 0.02 250)"
  surface-dark-elevated: "oklch(26% 0.025 250)"
  surface-light: "oklch(97% 0.005 230)"
  surface-light-card: "oklch(99% 0.002 230)"
  surface-light-elevated: "oklch(95% 0.008 230)"
  ink-dark: "oklch(95% 0.01 240)"
  ink-dark-muted: "oklch(76% 0.015 240)"
  ink-light: "oklch(20% 0.02 250)"
  ink-light-muted: "oklch(42% 0.02 250)"
  cyan-base: "oklch(72% 0.14 200)"
  cyan-hover: "oklch(65% 0.14 200)"
  cyan-subtle: "oklch(72% 0.14 200 / 15%)"
  emergency-base: "oklch(60% 0.22 28)"
  emergency-hover: "oklch(53% 0.22 28)"
  emergency-subtle: "oklch(60% 0.22 28 / 18%)"
  warning-base: "oklch(78% 0.18 70)"
  warning-subtle: "oklch(78% 0.18 70 / 15%)"
  stable-base: "oklch(72% 0.17 155)"
  stable-subtle: "oklch(72% 0.17 155 / 15%)"
  border-dark: "oklch(32% 0.02 250)"
  border-light: "oklch(88% 0.01 230)"
typography:
  display:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.04em"
  vital-number:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  btn-primary:
    backgroundColor: "{colors.cyan-base}"
    textColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  btn-emergency:
    backgroundColor: "{colors.emergency-base}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  btn-secondary:
    backgroundColor: "{colors.surface-dark-card}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
---

# Design System: SmartCare ICU

## 1. Overview

**Creative North Star: "Clean, High-Precision & Minimalist UI"**

SmartCare ICU operates under a **Clean, Minimalist, and Highly Structured** aesthetic philosophy (`product` + `adaptive` registers). Drawing ergonomic inspiration from modern high-precision tools (like Raycast and Linear), the interface functions as an effortless extension of clinical thought. Every screen must feel calm, breathable, and uncluttered. The interface prioritizes clarity and generous whitespace over data density. Every pixel must serve clinical clarity, speed, and precision without visual fatigue.

Our motion energy is **Restrained (State Changes & Feedback Only)**. Transitions execute within `150–200ms` using exponential ease-out curves (`ease-out-quart`) to provide instant tactile confirmation for vital entries, modal drawers, and alert popovers without ever making a doctor or nurse wait for decorative choreography. The interface explicitly rejects **Generic SaaS AI Marketing Templates** (`violet/pink gradient glows, decorative frosted glass cards, 01 / 02 / 03 numbered section eyebrows, and low-contrast muted text`) alongside **Legacy 1990s Hospital EHR Screens** and **Consumer Crypto/Web3 Trading Apps**.

**Key Characteristics:**
- **Zero Visual Noise:** No decorative blurs, frosted glass (`backdrop-blur`), gradient headings, or non-functional background card styling.
- **Tabular Precision:** Tabular numbers (`tnum`) across all numerical metrics, vital signs, fluid balances, and timestamps to ensure fixed-width column alignment.
- **Uncompromised Contrast (`≥4.5:1` Strict):** Every body text string, table cell, and form label exceeds WCAG AA (`≥4.5:1`), with display telemetry hitting `≥3:1` under both night-shift dark/slate mode and day-shift light mode.
- **Adaptive Ergonomics:** Minimum `48×48px` touch targets for bedside iPad/tablet carts, paired with high-speed keyboard tabbing (`Enter` / `Tab` progression) for desktop hospital terminals.

## 2. Colors

Our color strategy follows a **Full Palette (Deliberate Roles)** approach anchored by deep slate/charcoal neutral backgrounds with 4 rigorous clinical roles (`Medical Cyan/Teal` for primary telemetry, `Emergency Oxblood/Red` for P0 emergency alerts, `Amber` for P1 warnings, and `Emerald` for stable physiological status). Canonical values are defined using OKLCH inside `client/src/index.css`.

### Primary
- **Medical Cyan/Teal (`oklch(72% 0.14 200)`)**: Primary interactive telemetry, active navigation states, and baseline sparkline paths. Used deliberately (`bg-cyan-base`, `border-cyan-base`, `text-cyan-base`) to signal interactive focus without visual fatigue.

### Secondary
- **Emergency Oxblood/Red (`oklch(60% 0.22 28)`)**: Reserved strictly for `P0 Emergency` notifications (`badge-p0`), critical vital sign violations, and destructive/archival actions (`btn-emergency`).
- **Clinical Amber (`oklch(78% 0.18 70)`)**: Reserved strictly for `P1 Clinical Warnings` (`badge-p1`), out-of-range physiological shifts, and pending diagnostic verifications.
- **Stable Emerald (`oklch(72% 0.17 155)`)**: Reserved strictly for normal physiological ranges (`badge-stable`), confirmed AI reasoning verifications, and successful vital persistence.

### Neutral
- **Deep Slate/Charcoal Surface (`oklch(18% 0.015 250)`)**: Primary background (`bg-surface-dark`) and surface containers (`bg-surface-dark-card` / `bg-surface-dark-elevated`) for dark mode, providing calm contrast without OLED black eye-strain.
- **Clinical Paper Surface (`oklch(97% 0.005 230)`)**: Primary background and surface containers (`bg-surface-light` / `bg-surface-light-card`) for day-shift light mode.
- **High-Contrast Ink (`oklch(95% 0.01 240)`)**: Primary body text (`text-ink-dark` / `text-ink-dark-muted`), guaranteeing `≥4.5:1` WCAG AA contrast.

### Named Rules
**The Full Palette Rule.** Each color role (`Cyan`, `Oxblood`, `Amber`, `Emerald`) carries exact clinical semantic meaning. Colors are never used decoratively to make a card "look interesting." If a metric is colored `Oxblood/Red`, it must represent a genuine P0 clinical emergency or destructive action.

**The No-Contrast-Compromise Rule.** Gray or muted text on tinted backgrounds that falls below `4.5:1` contrast (`3:1` for large bold text `≥18px`) is treated as a P0 clinical safety defect. Readability at 4:00 AM under dim ICU lighting is non-negotiable.

## 3. Typography

**Display Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif`
**Body Font:** `'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Roboto', sans-serif`
**Label/Mono Font:** `'JetBrains Mono', 'SF Mono', 'Roboto Mono', monospace`

**Character:** A high-precision, ultra-legible technical sans where labels, vital signs, data tables, and body prose share one unified, super-crisp family governed by a tight `1.125–1.2` scale ratio (`product` register standard).

### Hierarchy
- **Display (`2rem / 32px, weight 700`)**: Top-level patient name and bedside monitor callouts inside the Sticky Clinical Context Bar (`text-display`).
- **Headline (`1.5rem / 24px, weight 600`)**: Section headers across the Unified Patient Dashboard (`text-headline`).
- **Title (`1.125rem / 18px, weight 600`)**: Sub-panel titles, modal headers, and AI summary section dividers (`text-title`).
- **Body (`0.9375rem / 15px, weight 400`)**: Clinical progress notes, diagnostic reasoning explanations, and medical histories (`text-body`, `65–75ch` max line length for prose; up to `120ch+` for dense tabular logs).
- **Label (`0.8125rem / 13px, weight 600`)**: Data table column headers, form input labels, and status badge identifiers (`text-label`, uppercase with `letter-spacing: 0.04em`).
- **Vital Number (`1.75rem / 28px, weight 700`)**: High-precision numerical vitals display with tabular nums (`text-vital-number font-tnum`).

### Named Rules
**The Tabular Vitals Rule.** All numerical vital signs, fluid I/O volumes (`mL`), GCS scores, lab values, and timestamps must enable `font-variant-numeric: tabular-nums` (`font-tnum`). Numbers must never jump or shift horizontally when values update dynamically.

**The Fixed Rem Scale Rule.** In accordance with our `product` register, headings and UI elements utilize fixed `rem` scales (`--text-display`, `--text-headline`, etc.) rather than fluid `clamp()` sizing. ICU clinicians view data at fixed terminal and tablet DPIs; consistent spatial geometry is essential for spatial memory during emergencies.

## 4. Elevation

In alignment with our **Restrained** motion and `product` focus, surfaces are **Flat by Default (`The Flat-By-Default Rule`)**. We rely on crisp, high-contrast 1px borders (`border-border-dark` / `border-border-light`) and subtle surface-container tonal layering to establish depth, rather than ambient drop shadows or decorative blurring. Shadows (`box-shadow`) are reserved exclusively for active elevation states: floating popovers, dropdown menus, modal dialogs, and sticky context overlays.

### Shadow Vocabulary
- **Popover (`--shadow-popover`)**: Clean, high-opacity focused shadow (`0 4px 20px -2px rgba(0,0,0,0.45)`) lifting dropdowns and alert popovers.
- **Modal (`--shadow-modal`)**: Deep elevation (`0 12px 36px -4px rgba(0,0,0,0.65)`) lifting active `<dialog>` overlays and patient quick-switchers.
- **Sticky Context Bar (`--shadow-sticky`)**: Subtle bottom anchor shadow (`0 2px 12px -2px rgba(0,0,0,0.35)`) keeping situational awareness anchored at the top of the viewport.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Drop shadows and blurs do not exist as static decoration. Elevation only appears when an element dynamically lifts off the canvas to command immediate, exclusive user interaction.

## 5. Components

The following canonical clinical primitives are pre-configured in `client/src/index.css` via Tailwind `@utility` and `@layer utilities`:

### Buttons
- **Shape:** `border-radius: 6px` (`--radius-md`), minimum target size `48×48px` (`min-h-[48px] min-w-[48px]`) with `gap: 0.5rem`.
- **Primary (`.btn-primary`):** Medical Cyan surface (`bg-cyan-base text-surface-dark font-semibold px-5 py-2.5 rounded-md`), smooth 150ms ease-out hover (`hover:bg-cyan-hover`) and `2px` focus ring (`focus-visible:outline-cyan-base`).
- **Emergency (`.btn-emergency`):** Oxblood P0 destructive/alarm action (`bg-emergency-base text-white font-semibold px-5 py-2.5 rounded-md`), 150ms hover (`hover:bg-emergency-hover`).
- **Secondary (`.btn-secondary`):** Flat high-contrast border button (`bg-surface-dark-card text-ink-dark border border-border-dark font-medium`), hover lift to elevated surface (`hover:bg-surface-dark-elevated`).

### Status Badges & Pills (`.badge-p0`, `.badge-p1`, `.badge-stable`)
- **Style:** Translucent semantic background (`bg-emergency-subtle`, `bg-warning-subtle`, `bg-stable-subtle`) paired with bold uppercase `13px` label (`text-label font-bold uppercase tracking-wider border`).
- **State:** Provides unmistakable, immediate color-coded visual triage without visual clutter.

### Cards / Containers (`.clinical-card`, `.clinical-card-light`)
- **Corner Style:** `border-radius: 6px` (`--radius-md`).
- **Background & Border:** Flat container (`bg-surface-dark-card border border-border-dark` for dark mode, `bg-surface-light-card border border-border-light` for light mode).
- **Shadow Strategy:** Flat at rest (`The Flat-By-Default Rule`).

### Inputs / Fields (`.clinical-input`)
- **Style:** Flat 1px outline (`bg-surface-dark border border-border-dark rounded-md px-3 py-2 text-ink-dark min-h-[48px] font-tnum`).
- **Focus:** Crisp Cyan focus border and ring (`focus:border-cyan-base focus:ring-1 focus:ring-cyan-base`).

### Sticky Context Header (`.sticky-context-bar`)
- **Style:** Top-anchored situational bar (`sticky top-0 z-sticky bg-surface-dark border-b border-border-dark px-5 py-3 box-shadow-sticky flex items-center justify-between`).
- **Scope Rule:** Use ONLY on the main multi-patient or intensive care monitoring views. Do NOT include on simple screens (Login, Settings, single-task forms).

### Screen-Type Scope Rules & Component Budgeting
- **The Minimal Component Budget:** For simple screens (e.g., Login, Settings, User Profile, Single-Task Forms), do NOT use `.sticky-context-bar`, status badges (`.badge-p0/p1`), sparklines, or multi-color accents. Use a clean container (`.clinical-card`), clear labels, primary buttons (`.btn-primary`), and generous padding (`p-8 gap-6`).
- **Whitespace Over Density:** Never cram multiple widgets, secondary data tables, or decorative borders into a single view. Let whitespace group elements naturally.

## 6. Do's and Don'ts

### Do:
- **Do** maintain strict WCAG AA (`≥4.5:1` contrast for body text, `≥3:1` for large display vitals `≥18px`) across every dashboard screen, table row, and status pill.
- **Do** use tabular numbers (`tnum` / `.font-tnum`) for every vital sign, fluid balance volume, lab test value, and timestamp to ensure stable column alignment.
- **Do** provide generous minimum touch targets (`≥48×48px` for touch tablets, `≥44×44px` on native mobile endpoints) with at least `8px` breathing room between adjacent clinical buttons.
- **Do** support `@media (prefers-reduced-motion: reduce)` on every alert pulse, sparkline render, and modal drawer by instantly switching to crisp, static crossfades.
- **Do** prioritize clean whitespace, simple component hierarchy, and minimal copy. Keep labels and descriptions short and human-readable. Do NOT generate multi-paragraph mock text or verbose explanations unless explicitly requested.
- **Do** apply "Screen-Type Scope Rules": For simple forms, modals, or authentication screens, keep the UI minimal (centered layout, clean inputs, zero badges/sparklines, no sticky headers).
- **Do** ensure all critical clinical actions and alert explanations are accessible without requiring mouse hover over hidden triggers (`focus-visible` rings and direct click/touch targets required).

### Don't:
- **Don't** use low-contrast muted or gray body text on white or tinted backgrounds (`<4.5:1` is prohibited).
- **Don't** use decorative glassmorphism, frosted glass (`backdrop-blur`), or non-functional background gradients (`Generic SaaS AI Marketing Templates`).
- **Don't** use card grid slop, deeply nested containers, or excessive visual borders (no boxed-within-boxes clutter or dark "cyberpunk/telemetry" over-decoration).
- **Don't** generate walls of text, unsolicited clinical reasoning paragraphs, or verbose mock subtitles on buttons, cards, or forms. Keep UI text minimal and scannable.
- **Don't** use decorative gradient text (`background-clip: text`) on headings or tiny all-caps tracked `01 / 02 / 03` eyebrows above every section.
- **Don't** animate `<img>` elements on hover or gate critical clinical data behind hover-only interaction triggers (`<img>` hover animations and hover-only tooltips are strictly banned).
- **Don't** reinvent standard OS or browser affordances (e.g., custom scrollbars, non-standard modals, or web-shaped switches ported onto native tablet layouts).
