---
name: "SmartCare ICU"
description: "Paperless intensive care management and AI decision-support dashboard"
colors:
  background: "oklch(1.0000 0 0)"
  foreground: "oklch(0.3211 0 0)"
  card: "oklch(1.0000 0 0)"
  popover: "oklch(1.0000 0 0)"
  primary: "oklch(0.6225 0.2041 259.9027)"
  secondary: "oklch(0.9665 0.0045 258.3247)"
  muted: "oklch(0.9846 0.0017 247.8389)"
  accent: "oklch(0.9510 0.0267 237.5723)"
  destructive: "oklch(0.6496 0.2362 26.9032)"
  border: "oklch(0.9271 0.0075 260.7315)"
typography:
  display:
    fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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
  use-shadcn: true
  shadcn-preset: "https://tweakcn.com/r/themes/cmn5czngq000204l4hydwhlao"
---

## 0. AI Code Generation Rules (READ THIS FIRST — MANDATORY)

> **This section is not optional.** Every AI model and every developer generating UI for SmartCare ICU must read and pass this checklist before emitting a single line of JSX. Violations will be rejected in code review.

---

### 0.1 The Shadcn Component Mandate (Non-Negotiable)

This project uses **Shadcn UI** as the **exclusive component foundation**. All components are pre-installed in `client/src/components/ui/`. You must import from there.

#### Canonical Component Map

Every UI need maps to exactly one source. Check this table before writing any JSX.

| UI Need | Required Import | Forbidden Alternative |
|---|---|---|
| Any clickable action | `<Button>` from `@/components/ui/button` | `<button>`, `<a>` styled as button |
| Status pills / labels | `<Badge>` from `@/components/ui/badge` | Raw `<span className="rounded-full ...">` |
| Data containers | `<Card>`, `<CardHeader>`, `<CardContent>` from `@/components/ui/card` | Raw `<div className="border rounded ...">` |
| Any data grid / list | `<Table>`, `<TableHeader>`, `<TableRow>`, `<TableCell>` from `@/components/ui/table` | Raw `<table>`, hand-rolled grid divs |
| Form fields | `<Input>` from `@/components/ui/input` | Raw `<input>` |
| Dropdown selections | `<Select>`, `<SelectTrigger>`, `<SelectContent>` from `@/components/ui/select` | Native `<select>`, custom dropdown divs |
| Multi-line text | `<Textarea>` from `@/components/ui/textarea` | Raw `<textarea>` |
| Field labels | `<Label>` from `@/components/ui/label` | Raw `<label>` |
| Form validation wrapper | `<Form>`, `<FormField>`, `<FormItem>`, `<FormMessage>` from `@/components/ui/form` | Manual error state divs |
| Modal / overlay | `<Dialog>`, `<DialogContent>`, `<DialogHeader>` from `@/components/ui/dialog` | Raw `<div>` with `fixed` positioning |
| Slide-out panel | `<Sheet>`, `<SheetContent>` from `@/components/ui/sheet` | Custom drawer divs |
| Bottom drawer | `<Drawer>` from `@/components/ui/drawer` | Custom slide-up divs |
| Tab navigation | `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from `@/components/ui/tabs` | Custom tab implementations |
| Top-level / mega navigation | `<NavigationMenu>`, `<NavigationMenuItem>`, `<NavigationMenuContent>` from `@/components/ui/navigation-menu` | Custom nav bars, raw `<nav>` |
| Sidebar navigation | `<Sidebar>` from `@/components/ui/sidebar` | Custom sidebar divs |
| Checkbox / toggle | `<Checkbox>` from `@/components/ui/checkbox` | Raw `<input type="checkbox">` |
| On/Off switch | `<Switch>` from `@/components/ui/switch` | Custom toggle divs |
| Loading skeleton | `<Skeleton>` from `@/components/ui/skeleton` | Animated placeholder divs |
| Progress bar | `<Progress>` from `@/components/ui/progress` | Raw `<div>` width trick |
| Alert / banner | `<Alert>`, `<AlertTitle>`, `<AlertDescription>` from `@/components/ui/alert` | Raw `<div className="bg-red-...">` |
| Overflow scrollable area | `<ScrollArea>` from `@/components/ui/scroll-area` | `overflow-y-auto` on a raw div |
| Date picker | `<Calendar>` + `<Popover>` from `@/components/ui/calendar` + `popover` | Third-party date picker libraries |
| Autocomplete / search | `<Command>`, `<CommandInput>`, `<CommandList>` from `@/components/ui/command` | Custom autocomplete implementations |
| Context menu / actions | `<DropdownMenu>` from `@/components/ui/dropdown-menu` | Custom dropdown divs |
| Hover info | `<Tooltip>` from `@/components/ui/tooltip` | `title=""` attribute, custom tooltip divs |
| User avatar | `<Avatar>`, `<AvatarImage>`, `<AvatarFallback>` from `@/components/ui/avatar` | Custom rounded-image divs |
| Expandable section | `<Collapsible>` from `@/components/ui/collapsible` | Raw `show/hide` div logic |
| Page navigation | `<Pagination>` from `@/components/ui/pagination` | Custom page number divs |
| Visual divider | `<Separator>` from `@/components/ui/separator` | Raw `<hr>` or `border-t` div |
| Popover anchored to trigger | `<Popover>`, `<PopoverTrigger>`, `<PopoverContent>` from `@/components/ui/popover` | Custom absolutely-positioned divs |

---

### 0.2 The Composite Component Rule (Shadcn-First for Non-Native Components)

Some UI patterns are not single Shadcn components — they are **compositions**. Even when no single Shadcn component covers the need, **you must compose exclusively from Shadcn primitives**. You never reach for raw HTML or a third-party library when a Shadcn composition works.

#### Required Compositions for SmartCare ICU

**Multi-Step Admission Form** *(Shadcn has no native stepper)*
Compose from: `<Card>` + `<Form>` + `<Progress>` + `<Button>` + `<Separator>`
- Each step lives in its own `<CardContent>`.
- `<Progress>` renders the step indicator (e.g., step 2 of 5 = `value={40}`).
- Navigation uses `<Button variant="outline">` (Back) + `<Button>` (Next / Submit).
- Never use a third-party stepper library.

**Mega Menu** *(Shadcn has no dedicated mega menu)*
Compose from: `<NavigationMenu>` + `<NavigationMenuContent>` + `<Card>` + `<Separator>`
- The trigger is always `<NavigationMenuTrigger>`.
- The expanded panel is `<NavigationMenuContent>` containing a `<Card>` grid of links.
- Never build a mega menu with raw `<nav>` + custom hover state management.

**Data Table with Filters** *(Shadcn Table has no built-in filter row)*
Compose from: `<Table>` + `<Input>` + `<Select>` + `<Button>` + `<Badge>`
- Filter row above the table uses `<Input>` for search and `<Select>` for column filters.
- Row actions use `<DropdownMenu>`.
- Never use third-party table UI components; use headless logic only if needed, rendered into `<Table>` primitives.

**Vital Signs Monitor Card** *(custom clinical display)*
Compose from: `<Card>` + `<Badge>` + `<Progress>` + `<Separator>`
- Numeric vitals use the `font-tnum` utility class only.
- Alert state uses `<Badge variant="destructive">`.
- Never build a custom vital card with raw divs and hardcoded colors.

**Notification / Alert Feed**
Compose from: `<ScrollArea>` + `<Alert>` + `<Badge>` + `<Separator>` + `<Sheet>`
- Individual notifications are `<Alert>` blocks inside a `<ScrollArea>`.
- The feed panel is a `<Sheet>` triggered from the topbar bell icon.

---

### 0.3 The Token Mandate (Zero Exceptions)

**No raw color value may appear anywhere in JSX or CSS outside of `index.css`.**

| Forbidden | Required Replacement |
|---|---|
| `bg-blue-500`, `bg-blue-600`, `text-blue-700` | `bg-primary`, `text-primary` |
| `bg-red-500`, `text-red-600` | `bg-destructive`, `text-destructive` |
| `bg-gray-100`, `bg-slate-50` | `bg-muted`, `bg-secondary` |
| `text-gray-500`, `text-slate-400` | `text-muted-foreground` |
| `bg-white`, `bg-[#ffffff]` | `bg-background` or `bg-card` |
| `border-gray-200` | `border-border` |
| Any `style={{ color: '#...' }}` | Move value to `index.css` as a CSS variable, reference via token class |
| Any inline `oklch(...)` value in JSX | Not permitted. Define in `index.css` `:root {}` block only |

**No raw font-family string may appear in JSX or inline styles.**

| Forbidden | Required Replacement |
|---|---|
| `style={{ fontFamily: 'Outfit' }}` | `className="font-display"` |
| `style={{ fontFamily: 'Inter' }}` | `className="font-sans"` |
| `style={{ fontFamily: 'JetBrains Mono' }}` | `className="font-mono"` |
| `font-family: 'Outfit'` in a `<style>` tag | Not permitted in JSX files |

---

### 0.4 Pre-Emit AI Checklist

Before outputting any JSX, verify every item below. A single `NO` means you must revise before emitting.

```
[ ] Every interactive element uses a Shadcn primitive from §0.1 — no raw HTML equivalents
[ ] Every composite pattern uses only Shadcn primitives per §0.2 — no third-party UI libraries
[ ] No Tailwind literal color class (bg-blue-*, text-red-*, bg-gray-*) appears anywhere
[ ] No inline hex, rgb(), or oklch() color value appears in JSX
[ ] No hardcoded font-family string appears in JSX or inline styles
[ ] All typography uses font-display, font-sans, or font-mono utility classes
[ ] All numeric vitals, lab values, and timestamps use the font-tnum utility class
[ ] Shadows only appear on floating/elevated elements — never as static decoration
[ ] No backdrop-blur, glassmorphism, or gradient text effects appear anywhere
[ ] Every button is <Button> with an explicit variant prop
```

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

Our color strategy strictly follows the Shadcn UI preset theme configured in `client/src/index.css`. We map logical components to Shadcn's semantic color variables to ensure consistency and immediate visual hierarchy.

### Primary
- **Primary (`--primary`)**: Used for primary interactive actions, active navigation states, and highlights. Ensures strong contrast and clear affordance (`bg-primary`, `text-primary`).

### Secondary & Muted
- **Secondary (`--secondary`)**: Used for less prominent buttons, badges, and alternative backgrounds (`bg-secondary`).
- **Muted (`--muted`)**: Used for background panels, disabled states, and secondary text where lower contrast is acceptable but legible (`text-muted-foreground`).

### Status
- **Destructive (`--destructive`)**: Reserved strictly for `P0 Emergency` notifications, critical vital sign violations, and destructive actions.

### Neutral (Surfaces)
- **Background (`--background`)**: The deepest root background layer.
- **Card (`--card`)**: Used for clinical data containers and grouping related information.
- **Foreground (`--foreground`)**: Primary text color ensuring ≥4.5:1 WCAG AA contrast.

### Named Rules
**The No-Contrast-Compromise Rule.** Text on backgrounds must maintain high legibility. Avoid low-contrast color combinations that fail WCAG standards, ensuring readability under ICU lighting conditions.

## 3. Typography

**Display Font:** `'Outfit', sans-serif`
**Body Font:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
**Label/Mono Font:** `'JetBrains Mono', 'SF Mono', monospace`

**Character:** A high-precision, ultra-legible aesthetic where the geometric display face (`Outfit`) pairs with a super-crisp body face (`Inter`) governed by a tight `1.125–1.2` scale ratio.
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

## 5. Anti-Slop Safeguards (Hallmark Rules)

These rules are strictly enforced to avoid common AI-generated template anti-patterns.

### Named Rules
**The No-Pure-Neutrals Rule.** `--background` and surface colors must ALWAYS be tinted slightly towards the primary hue (e.g., `oklch(0.99 0.01 260)`). Never use pure `#ffffff` or `#000000` which reads as flat and synthetic.

**The Typography Pairing Rule.** Never use "Inter-everywhere". Display typography (headings, hero text) must use a dedicated display face (e.g., `Outfit`), paired with `Inter` strictly for body copy.

**The Locked Tokens Rule (No Improvisation).** Never use inline literal color utility classes (e.g., `bg-slate-950`, `text-blue-500`). Every single color class used in the application MUST consume a semantic design token defined in `index.css` (e.g., `bg-primary`, `text-muted-foreground`).

## 6. Components

The SmartCare ICU interface is built strictly using **Shadcn UI** components. We do not use ad-hoc CSS utility classes for complex components. The design tokens (colors, typography, radii) defined in `client/src/index.css` are natively ingested by Shadcn's Tailwind configuration.

### Always Use Shadcn Primitives
- **Buttons (`Button`)**: Use Shadcn's `<Button>` component for all actions. Rely on `variant="default"`, `variant="destructive"`, `variant="outline"`, and `variant="secondary"`. Do not write custom button CSS.
- **Badges (`Badge`)**: Use Shadcn's `<Badge>` for status pills and triage indicators (`variant="default"`, `variant="secondary"`, `variant="destructive"`).
- **Cards (`Card`)**: Use Shadcn's `<Card>`, `<CardHeader>`, `<CardTitle>`, and `<CardContent>` to group clinical data. 
- **Tables (`Table`)**: Use Shadcn's `<Table>` components for dense data views, ensuring tabular numbers (`font-tnum`) are used for vital values.

### Screen-Type Scope Rules & Component Budgeting
- **The Minimal Component Budget:** For simple screens (e.g., Login, Settings, User Profile, Single-Task Forms), keep the UI minimal. Use clean Shadcn Cards, inputs, and primary buttons with generous padding.
- **Whitespace Over Density:** Never cram multiple widgets or decorative borders into a single view. Let whitespace group elements naturally.

## 6. Do's and Don'ts

### Do:
- **Do** maintain strict WCAG AA (`≥4.5:1` contrast for body text, `≥3:1` for large display vitals `≥18px`) across every dashboard screen, table row, and status pill.
- **Do** use tabular numbers (`tnum` / `.font-tnum`) for every vital sign, fluid balance volume, lab test value, and timestamp to ensure stable column alignment.
- **Do** provide generous minimum touch targets (`≥48×48px` for touch tablets, `≥44×44px` on native mobile endpoints) with at least `8px` breathing room between adjacent clinical buttons.
- **Do** support `@media (prefers-reduced-motion: reduce)` on every alert pulse, sparkline render, and modal drawer by instantly switching to crisp, static crossfades.
- **Do** prioritize clean whitespace, simple component hierarchy, and minimal copy. Keep labels and descriptions short and human-readable. Do NOT generate multi-paragraph mock text or verbose explanations unless explicitly requested.
- **Do** apply "Screen-Type Scope Rules": For simple forms, modals, or authentication screens, keep the UI minimal. Use Shadcn components strictly.
- **Do** ensure all critical clinical actions and alert explanations are accessible without requiring mouse hover over hidden triggers (`focus-visible` rings and direct click/touch targets required).
- **Do** strictly use Shadcn components rather than writing custom utility CSS or standard HTML elements. Always build layouts composing `<Card>`, `<Button>`, `<Badge>`, and other primitives from `@/components/ui`.

### Don't:
- **Don't** use low-contrast muted or gray body text on white or tinted backgrounds (`<4.5:1` is prohibited).
- **Don't** use decorative glassmorphism, frosted glass (`backdrop-blur`), or non-functional background gradients (`Generic SaaS AI Marketing Templates`).
- **Don't** use card grid slop, deeply nested containers, or excessive visual borders (no boxed-within-boxes clutter or dark "cyberpunk/telemetry" over-decoration).
- **Don't** generate walls of text, unsolicited clinical reasoning paragraphs, or verbose mock subtitles on buttons, cards, or forms. Keep UI text minimal and scannable.
- **Don't** use decorative gradient text (`background-clip: text`) on headings or tiny all-caps tracked `01 / 02 / 03` eyebrows above every section.
- **Don't** animate `<img>` elements on hover or gate critical clinical data behind hover-only interaction triggers (`<img>` hover animations and hover-only tooltips are strictly banned).
- **Don't** reinvent standard OS or browser affordances (e.g., custom scrollbars, non-standard modals, or web-shaped switches ported onto native tablet layouts).
