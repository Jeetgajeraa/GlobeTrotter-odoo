# GlobeTrotter — Design System

This is the visual and interaction language for GlobeTrotter, a multi-city trip
planner built for the Odoo hackathon. Follow this file exactly when building any
screen, component, or page. Do not substitute generic UI-kit defaults (no stock
"blue gradient travel app" look, no unstyled shadcn defaults left as-is).

## 0. Concept

GlobeTrotter turns a trip into something you can *see*: a route, a set of stops,
a budget that adds up in front of you. The product's signature idea is the
**route line** — a dashed, connected line with a marker at every stop, used
anywhere a trip is shown as a sequence (itinerary builder, itinerary view,
calendar/timeline). Alongside it, a light **boarding-pass motif** (rounded
ticket corners, a perforated divider, a monospaced "ticket" typeface for
dates/prices/codes) gives trip cards and summary panels a sense of "this is
your actual ticket," not a generic dashboard card.

Odoo's brand purple (mulberry) is carried through as the primary accent color
— it ties the hackathon submission to its host without reskinning the whole
app in Odoo's enterprise-software chrome. Everything else (type, layout,
motion) is built for a consumer travel product, not a back-office tool. See
§11 for the full reasoning if a teammate asks "why isn't this just Odoo's
site theme."

Overall feel: **light, airy, uncluttered, warm-white paper background, one
confident accent color, generous whitespace.**

---

## 1. Color tokens

Use these as CSS custom properties (see §12 for the exact block). Do not
introduce new colors outside this palette without adding them here first.

| Token | Hex | Usage |
|---|---|---|
| `--color-paper` | `#FAF8F5` | App background (warm off-white, not pure white) |
| `--color-surface` | `#FFFFFF` | Cards, modals, inputs — raised surfaces |
| `--color-surface-sunk` | `#F1EDE6` | Recessed areas: input wells, code/mono blocks |
| `--color-ink` | `#241B2F` | Primary text, headings |
| `--color-ink-soft` | `#5C5468` | Secondary text, captions, placeholder |
| `--color-ink-faint` | `#9A93A6` | Disabled text, hints |
| `--color-mulberry` | `#714B67` | Primary brand/accent — primary buttons, links, active nav, selected states |
| `--color-mulberry-dark` | `#4E3347` | Hover/active state of primary accent |
| `--color-mulberry-tint` | `#F1E7EE` | Primary accent at 10% — selected row bg, badge bg |
| `--color-route` | `#E0663D` | Route line, "in progress" trip stops, secondary CTA on light cards |
| `--color-horizon` | `#2F7A6F` | Success, "within budget," confirmed states, water/map elements |
| `--color-sun` | `#EFA928` | Warnings, "approaching budget," highlights |
| `--color-danger` | `#C0392B` | Errors, "over budget," destructive actions |
| `--color-line` | `#E7E0D4` | Borders, dividers, dashed route line, card outlines |
| `--color-line-strong` | `#D6CCBC` | Hover borders, focus outline fallback |

Rules:
- Never place body text lighter than `--color-ink-soft` on `--color-paper`.
- `--color-route` and `--color-sun` are **accents, not backgrounds** — use for
  lines, icons, small badges, chart series. Don't fill large surfaces with them.
- One primary accent per screen. Mulberry leads; route/horizon/sun are
  supporting cast, used for meaning (route = path, horizon = good, sun = caution).

---

## 2. Typography

Three roles, three families — this is the ticket/journal feel, not a single
generic sans stack.

| Role | Font | Weights | Where |
|---|---|---|---|
| Display | **Space Grotesk** | 500, 600, 700 | H1–H3, trip names, big numbers (total budget) |
| Body | **Inter** | 400, 500, 600 | Paragraphs, labels, buttons, nav, form fields |
| Ticket / Mono | **IBM Plex Mono** | 500 | Dates, times, prices, city codes, day numbers — anything "printed on a ticket" |

Load via `next/font/google` (or local if offline in the hackathon venue —
bundle static weights listed above, don't pull the full variable family).

### Type scale

| Token | Size / Line height | Font | Use |
|---|---|---|---|
| `--text-display-xl` | 40px / 46px | Space Grotesk 700 | Dashboard hero, trip name on Itinerary View |
| `--text-display-lg` | 30px / 36px | Space Grotesk 600 | Screen titles |
| `--text-display-md` | 22px / 28px | Space Grotesk 600 | Section headers, card titles |
| `--text-body-lg` | 17px / 26px | Inter 400 | Intro copy, empty-state text |
| `--text-body` | 15px / 22px | Inter 400 | Default body text |
| `--text-body-sm` | 13px / 18px | Inter 500 | Captions, meta rows, form labels |
| `--text-mono` | 14px / 20px | IBM Plex Mono 500 | Dates, prices, durations, city/day codes |
| `--text-mono-sm` | 12px / 16px | IBM Plex Mono 500 | Timestamps, small ticket details |

Rules:
- Headings are always Space Grotesk, never Inter.
- Any standalone number that represents money, a date, a time, or a duration
  renders in the mono face — this is what makes budget and calendar screens
  feel like tickets rather than spreadsheets.
- Sentence case everywhere (buttons, headers, nav). No ALL CAPS except tiny
  eyebrow labels ≤12px, used sparingly (e.g. "DAY 1" marker on the route line).

---

## 3. Spacing, radius, elevation

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96. Use multiples of this
  only — no arbitrary values.
- Radius: `--radius-sm: 8px` (inputs, chips), `--radius-md: 14px` (cards),
  `--radius-lg: 20px` (modals, hero panels). Nothing sharp-cornered except the
  boarding-pass ticket stub, which uses `--radius-md` with a notch (see §5).
- Shadow is minimal and warm, never a generic gray drop-shadow:
  - `--shadow-card: 0 1px 2px rgba(36,27,47,0.04), 0 8px 24px rgba(36,27,47,0.06)`
  - `--shadow-raised: 0 4px 12px rgba(36,27,47,0.10)` (hover on cards, dropdowns)
- Borders default to `1px solid var(--color-line)`. Use shadow OR border to
  separate a card from the page, rarely both at full strength.

---

## 4. Layout

- Base container: max-width 1120px, centered, 24px side padding on mobile,
  48px on desktop.
- Grid: 12-column, 24px gutter on desktop; single column with 16px gutter
  below 640px.
- Primary nav: light, left-aligned logo, horizontal tabs (Dashboard, My
  Trips, Explore), mulberry underline on active tab — no heavy top bar, no
  dark header. Keep the header the same `--color-paper` as the page, divided
  by a single `--color-line` rule, so the page never feels boxed-in.
- Content density: prefer breathing room over cramming; hackathon demo
  screens should look finished, not dense with placeholder data.

### The route line (signature component)

Used on: Itinerary Builder, Itinerary View, Trip Calendar/Timeline.

```
● City A ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ● City B ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ ○ City C
Day 1–3               Day 4–6                Day 7–9 (planned)
```

- Filled dot (`--color-mulberry`) = confirmed/current stop. Outline dot
  (`--color-ink-faint`) = planned/未-configured stop.
- Line between stops is dashed, `--color-route`, 2px, with a small
  travel-mode glyph at the midpoint if relevant (flight/train/car icon).
- On mobile, the line rotates vertical; stops stack top to bottom.
- This same visual pattern should NOT be reused for unrelated progress bars
  (e.g. signup steps) — it means "trip route," specifically.

---

## 5. Core components

Build these once as shared components; every screen composes them rather than
one-off markup.

**Button**
- Primary: `--color-mulberry` fill, white text, `--radius-sm`, hover
  `--color-mulberry-dark`, 44px height desktop / 48px touch target mobile.
- Secondary: white fill, `--color-line` border, `--color-ink` text.
- Destructive: `--color-danger` text on white, danger fill on hover/confirm.
- Icon-only buttons: 36px square, `--radius-sm`, ghost by default.

**Card (Trip Card, Activity Card, City Card)**
- `--color-surface`, `--shadow-card`, `--radius-md`, 20px padding.
- Trip Card specifically uses the **ticket stub** treatment: a vertical
  dashed divider near the right edge separating "trip info" from "date range
  + status badge," with a small semicircle notch cut top/bottom of that
  divider (CSS: two circles positioned absolutely, `--color-paper` fill, to
  fake a punched ticket edge).

**Input / Select / Date field**
- `--color-surface-sunk` background, no border by default, `--radius-sm`,
  1px `--color-line` on focus becomes `--color-mulberry` with a 3px
  `--color-mulberry-tint` focus ring (also the keyboard-focus style — do not
  remove focus rings anywhere in the app).

**Badge / Status chip**
- Pill shape, `--text-body-sm`, used for trip status (`Planning`,
  `Upcoming`, `Completed`) and budget status (`On budget` horizon,
  `Near limit` sun, `Over budget` danger). Fill = tint of the relevant
  color, text = the solid color.

**Tabs**
- Underline style only (no boxed/pill tabs) — active tab gets a 2px
  `--color-mulberry` underline and Space Grotesk 600 weight; inactive tabs
  are Inter 500, `--color-ink-soft`.

**Empty states**
- Every list/collection screen (My Trips, Itinerary Builder before any stop
  is added, Search results) needs a designed empty state: one line of
  `--text-body-lg` copy in the interface's voice (see §10) + a single primary
  action. Never ship a blank white screen or a stock "no data" icon.

**Charts (Budget Breakdown)**
- Use the palette's accent set as the series colors, in this order:
  mulberry, route, horizon, sun, ink-soft. Thin strokes, no heavy gridlines —
  gridlines at `--color-line`, 1px, no drop shadows on chart elements.

---

## 6. Iconography & imagery

- Icon set: line icons, 1.5px stroke, 20px/24px sizes (Lucide is a good
  match for the geometric feel of Space Grotesk — use it if the stack
  already includes `lucide-react`).
- Destination/city imagery: real or placeholder photos get a subtle
  `--radius-md` crop and a 4% mulberry duotone overlay on hover only (not
  at rest) — keeps photos cohesive without flattening them into a filter.
- No stock airplane/globe/suitcase clipart. If an illustration is needed for
  an empty state, keep it to a simple single-color line drawing in
  `--color-mulberry` on `--color-mulberry-tint`, not a colorful mascot.

---

## 7. Motion

Use sparingly — one orchestrated moment beats many small ones.

- Page-level: content fades + rises 8px on load (200ms, ease-out). Don't
  stagger every card individually; stagger only the route-line stops on the
  Itinerary screens (60ms delay each) since that's the one place sequence is
  the point.
- Micro-interactions: buttons scale 0.98 on press, cards lift to
  `--shadow-raised` on hover (150ms). Nothing else animates by default.
- Respect `prefers-reduced-motion`: fall back to instant state changes.

---

## 8. Accessibility

- Minimum contrast: body text (`--color-ink` / `--color-ink-soft`) against
  `--color-paper` and `--color-surface` must stay ≥ 4.5:1 — verify after any
  color tweak (the tokens above are already checked).
- All interactive elements: visible focus ring (`--color-mulberry-tint`,
  3px), never `outline: none` without a replacement.
- Route-line status must never be color-only — pair filled/outline dot shape
  with the color, and budget status badges pair color with the word
  ("On budget"), not a colored dot alone.
- Touch targets ≥ 44px on mobile.

---

## 9. Voice & microcopy

- Second person, active voice: "Add a stop," not "Stops can be added."
- Buttons name the result: "Save trip," "Add to trip," "Share itinerary" —
  never "Submit" or "OK."
- Empty states are an invitation, not an apology: "No stops yet — add your
  first city to start the route," not "You have no data."
- Errors state what happened and what to do: "That date is before your trip
  starts — pick a later date," not "Invalid input."
- Budget alerts speak plainly: "Day 4 is $120 over your average daily
  budget," not "Budget threshold exceeded."

---

## 10. Odoo theme — compatibility note

Full Odoo website theme (their marketing-site chrome, card styles, and
default type stack) is built for enterprise SaaS marketing pages, not for a
consumer trip planner — reusing it wholesale would fight the route-line/
ticket concept and read as an Odoo module rather than a travel product. What
we're taking from Odoo instead: **the mulberry `#714B67` accent**, a light
background, and the same restraint (no gradients, no heavy shadows) that
Odoo's own site uses. Everything else — typography, the route-line motif,
ticket-stub cards — is built specifically for GlobeTrotter. If a judge asks
"is this using the Odoo theme," the honest answer is: it shares Odoo's
signature color and a similarly restrained light aesthetic, purpose-built
around the travel content.

---

## 11. CSS custom properties (drop-in)

```css
:root {
  /* color */
  --color-paper: #FAF8F5;
  --color-surface: #FFFFFF;
  --color-surface-sunk: #F1EDE6;
  --color-ink: #241B2F;
  --color-ink-soft: #5C5468;
  --color-ink-faint: #9A93A6;
  --color-mulberry: #714B67;
  --color-mulberry-dark: #4E3347;
  --color-mulberry-tint: #F1E7EE;
  --color-route: #E0663D;
  --color-horizon: #2F7A6F;
  --color-sun: #EFA928;
  --color-danger: #C0392B;
  --color-line: #E7E0D4;
  --color-line-strong: #D6CCBC;

  /* radius */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;

  /* shadow */
  --shadow-card: 0 1px 2px rgba(36,27,47,0.04), 0 8px 24px rgba(36,27,47,0.06);
  --shadow-raised: 0 4px 12px rgba(36,27,47,0.10);
}
```

If the stack uses Tailwind, extend `theme.colors` / `theme.borderRadius`
with the tokens above (`mulberry`, `route`, `horizon`, `sun`, `paper`, etc.)
rather than using arbitrary hex values inline in components.