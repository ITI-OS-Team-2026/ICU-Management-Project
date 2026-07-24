# SmartCare ICU — Workspace Agent Rules

These rules apply automatically to **every AI model working in this repository**.
They are not optional. Read this file completely before doing anything else.

---

## 1. Read the Design System First (Always)

Before generating, modifying, or reviewing any UI file, you **must** read
`docs/DESIGN.md` in full — especially **Section 0 (AI Code Generation Rules)**.
This section contains:

- **§0.1** — The canonical Shadcn component map (what to import for every UI need)
- **§0.2** — Composite component rules (how to build patterns Shadcn does not natively cover)
- **§0.3** — The token mandate (zero raw colors or font strings in JSX)
- **§0.4** — The pre-emit checklist (10 gates to pass before outputting any JSX)

> **If you skip reading `docs/DESIGN.md` before writing UI code, you are violating
> the workspace rules. Stop and read it first.**

---

## 2. Hallmark is a Required Skill for All Page-Level UI

The **Hallmark** design skill is installed at `.agents/skills/hallmark/SKILL.md`.

### When Hallmark MUST be invoked

Invoke Hallmark (by reading its `SKILL.md` and following its full flow) for:

- Building a **new page** or a new full-screen view
- **Redesigning** an existing page
- **Extracting layout DNA** from a screenshot or URL before building
- Any task where a teammate says "build the X page", "design the Y screen", or
  "create the Z view"

### What Hallmark enforces on top of DESIGN.md

Hallmark adds structural enforcement that DESIGN.md does not cover:

- **Pre-flight scan** — reads existing tokens, fonts, and framework before
  touching anything. For this project it will always find `docs/DESIGN.md` and
  defer all picks to it (system-managed project mode).
- **Macrostructure discipline** — forces structural variety between pages so
  teammates building different screens do not accidentally produce the same layout.
- **Pre-emit self-critique** — scores output on Philosophy, Hierarchy, Execution,
  Specificity, Restraint, Variety before returning it.
- **Anti-slop gates** — 58 gates that catch the most common AI-generated UI
  patterns (gradient text, glassmorphism, invented metrics, italic headers, etc.).

### For this project specifically: design.md is already locked

Because `docs/DESIGN.md` exists at the project root (detected by Hallmark's
pre-flight scan), Hallmark operates in **system-managed mode**:

- Theme, font, color, spacing, and motion picks are **already decided** —
  Hallmark reads them from `docs/DESIGN.md` and does not invent new ones.
- Hallmark's job becomes: macrostructure selection, structural variety enforcement,
  and anti-slop gate checks — on top of the already-locked design system.
- The diversification rule **inverts**: pages must share the same design system
  tokens, not differ from each other.

---

## 3. Shadcn Components — Hard Rules

All Shadcn UI components for this project are **pre-installed** at
`client/src/components/ui/`. The full list:

  alert, avatar, badge, button, calendar, card, checkbox, collapsible,
  command, dialog, drawer, dropdown-menu, form, input, input-group, label,
  navigation-menu, pagination, popover, progress, scroll-area, select,
  separator, sheet, sidebar, skeleton, switch, table, tabs, textarea,
  toggle, tooltip

**Rules:**

1. Always import from `@/components/ui/<component>` — never install a
   third-party alternative.
2. Never write raw HTML (`<button>`, `<input>`, `<select>`, `<table>`, etc.)
   when a Shadcn primitive exists for that need. See `docs/DESIGN.md §0.1`.
3. For UI patterns that have no direct Shadcn primitive (multi-step form, mega
   menu, data table with filters, vital signs card, notification feed), compose
   them from Shadcn primitives only. See `docs/DESIGN.md §0.2`.

---

## 4. Token Rules — Hard Rules

1. **No Tailwind literal color class** (`bg-blue-500`, `text-red-600`,
   `bg-gray-100`, `bg-slate-950`, etc.) may appear in any JSX file. Use
   semantic token classes only (`bg-primary`, `text-muted-foreground`,
   `bg-destructive`, `bg-card`, `border-border`).
2. **No inline color values** (hex, `rgb()`, `oklch()`) in JSX or `style={{}}` props.
   Define new colors in `client/src/index.css` `:root {}` only.
3. **No hardcoded font strings** in JSX. Use `font-display` (Outfit),
   `font-sans` (Inter), `font-mono` (JetBrains Mono) Tailwind utilities only.
4. **All numeric vitals, lab values, and timestamps** must use `font-tnum`
   (tabular numbers).

---

## 5. File Safety Rules

1. **Never delete** production files, page components, feature directories, or
   route files unless the user explicitly asks and confirms a file-level list of deletions.
2. **Never overwrite** `client/src/index.css` token values unless the user
   explicitly changes a color in `docs/DESIGN.md` frontmatter first.
3. **Never overwrite** any file in `client/src/components/ui/` with a non-Shadcn
   implementation. These may only be updated via `npx shadcn@latest add --overwrite`.
4. **`docs/DESIGN.md` is the source of truth** for all design decisions. If a user
   request conflicts with it, flag the conflict and ask which should win before proceeding.

---

## 6. Pre-Emit Checklist (Mandatory for Any UI Output)

Before returning any JSX to the user, verify all 10 gates:

  [ ] Every interactive element uses a Shadcn primitive — no raw HTML equivalents
  [ ] Every composite pattern uses only Shadcn primitives — no third-party UI libs
  [ ] No Tailwind literal color class appears anywhere in the output
  [ ] No inline hex, rgb(), or oklch() color value appears in JSX
  [ ] No hardcoded font-family string appears in JSX or inline styles
  [ ] All typography uses font-display, font-sans, or font-mono utility classes
  [ ] All numeric vitals, lab values, and timestamps use font-tnum
  [ ] Shadows only appear on floating/elevated elements — never static decoration
  [ ] No backdrop-blur, glassmorphism, or gradient text effects appear anywhere
  [ ] Every button is <Button> with an explicit variant prop

A single unchecked gate = revise before emitting.
