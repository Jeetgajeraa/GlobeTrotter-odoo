# GlobeTrotter — Screen Specs

Companion to `DESIGN_SYSTEM.md`. Read that file first — every component and
color referenced below (route line, ticket-stub card, mulberry accent, etc.)
is defined there. This file maps the product's 13 screens to layout,
components, and states. Build routes/pages in this order — each one unlocks
the data the next needs (auth → dashboard → create trip → itinerary →
budget/calendar → share).

General rules for every screen:
- Background is always `--color-paper`; header stays flush with it (see
  DESIGN_SYSTEM §4).
- Every screen needs a real empty state and a real loading state (skeleton
  cards using `--color-surface-sunk`, not spinners, wherever content loads
  as a list).
- Max content width 1120px, centered.

---

## 1. Login / Signup

**Layout:** centered single-column card (max-width 420px) on `--color-paper`,
no sidebar, no marketing copy competing for attention — this is a fast door,
not a landing page. Small wordmark above the card.

**Components:** Input (email, password), primary Button ("Log in" /
"Create account"), text link ("Forgot password?"), toggle link between
login/signup ("New here? Create an account").

**Details:**
- Inline validation on blur, not on every keystroke.
- Error copy per §9 of design system: "That email and password don't match
  — try again or reset your password."
- Signup adds a name field above email. No cover-photo or extra fields here
  — keep signup to three fields max.

---

## 2. Dashboard / Home

**Layout:** two-zone page. Top: welcome header ("Welcome back, {name}") +
primary Button "Plan new trip" (top-right, always visible). Below: a
horizontal row of "Upcoming trips" ticket-stub Trip Cards (2–3 visible,
scroll on mobile), then a "Explore destinations" grid of City Cards with
photo + name + cost-index badge, then a slim "Budget at a glance" strip if
the user has active trips.

**Components:** Trip Card (ticket-stub style), City Card, Badge (trip
status), empty state if no trips yet ("No trips yet — plan your first one
and we'll build the route as you go" + primary Button).

**Details:** This is the screen most likely to be demoed first — it should
read as finished, not a stub. Recommended destinations can be a fixed
curated list for the hackathon (no need for a recommendation engine).

---

## 3. Create Trip

**Layout:** centered form card, same width class as Login (480–560px), NOT
a full-width form — trip creation is a short, focused task.

**Fields:** Trip name (text), Start date / End date (paired date pickers,
mono-styled once selected), Description (textarea, optional), Cover photo
(optional upload with a simple drag/drop well using
`--color-surface-sunk`), primary Button "Create trip."

**Details:** On date selection, show the computed trip length inline in mono
type ("9 days") — small but reinforces the ticket feel. On submit, route
straight into the Itinerary Builder for this trip, not back to the dashboard
— keep momentum.

---

## 4. My Trips (Trip List)

**Layout:** page header "My trips" + primary Button "Plan new trip"
top-right. Below: a filter/tab row (All / Upcoming / Past / Draft) using the
underline Tab style. Grid of Trip Cards, 3 columns desktop / 1 column
mobile.

**Components:** Trip Card showing name, date range (mono), destination
count, status Badge, and a hover-revealed action row (View / Edit / Delete).
Delete requires a confirm step (small inline confirm, not a full modal, to
keep it light).

**Empty state:** per status tab, e.g. "No past trips yet — they'll show up
here once a trip's dates have passed."

---

## 5. Itinerary Builder

**Layout:** the most complex screen — two-pane on desktop. Left pane
(narrow, ~320px): the **route line** (see DESIGN_SYSTEM §4) showing all
stops added so far, vertical on this screen, with "+ Add stop" at the
bottom of the line. Right pane (main): the selected stop's detail —
city, date range for that stop, and a list of assigned activities with an
"Add activity" button that opens City Search / Activity Search inline
(as a slide-over panel, not a full page navigation).

**Components:** Route line (vertical), Stop card (city name, dates, mini
activity list), City Search panel, Activity Search panel, drag-handle icons
for reordering stops (reorder updates the route line immediately).

**Details:** Reordering stops is core to the "construct the plan" purpose
in the brief — make the drag interaction obvious (drag handle icon, not
drag-anywhere) and give a subtle lift shadow (`--shadow-raised`) while
dragging. Autosave on every change; show a small "Saved" mono timestamp
rather than a manual save button.

---

## 6. Itinerary View

**Layout:** read-oriented version of the builder. Header: trip name
(display-xl), date range and total stop count in mono. A view-mode toggle
(underline tabs: "Timeline" / "Grouped by city") controls the body layout.
Timeline mode uses the horizontal **route line** with day-wise blocks
underneath each stop; grouped mode stacks city sections with their
activities listed.

**Components:** Route line (horizontal), Day block (day number in mono
eyebrow + activities with time + cost), view-mode Tabs.

**Details:** This screen is read-only relative to the Builder — edits
redirect back to Itinerary Builder rather than allowing inline edits here,
keeping the two screens' purposes distinct (plan vs. review).

---

## 7. City Search

**Layout:** can be a standalone page or the slide-over panel invoked from
the Builder (reuse the same component either way). Top: search bar +
filter row (country/region as chip Selects). Results: City Card list —
name, country, cost-index Badge (color = horizon/sun/danger based on
budget tier), popularity indicator, "Add to trip" Button.

**Details:** Cost-index badge is the one place the budget-status color
system (§5 of design system) should appear outside the Budget screen —
keeps the meaning consistent across the app (green-ish = cheap, amber =
mid, red = expensive, relative to user's set budget if one exists).

---

## 8. Activity Search

**Layout:** same shell as City Search, scoped to the current stop. Filter
row: type (chips: Sightseeing, Food, Adventure, Culture, Nightlife, …),
cost range, duration. Results as a card grid with a small photo, name,
category tag, cost + duration in mono, "Add" Button.

**Details:** Quick-view on click/tap expands the card in place (accordion,
not a modal) to show description and photos — avoid a full navigation away
from the search results.

---

## 9. Trip Budget & Cost Breakdown

**Layout:** header with the trip's total estimated cost as a
`--text-display-xl` mono figure, with a status Badge (On budget / Near
limit / Over budget). Below: a two-column layout — left, a breakdown chart
(donut or bar, categories: Transport, Stay, Activities, Meals) using the
chart palette order from the design system; right, a scrollable list of
per-day costs with an inline alert row for any day over the daily average.

**Components:** Chart, category legend (color chip + label + amount, all in
mono for the amount), Day cost row, alert Badge.

**Details:** "Average cost per day" sits as a small stat next to the total,
not buried — it's called out explicitly in the brief as a needed figure.

---

## 10. Trip Calendar / Timeline

**Layout:** toggle at top (Calendar / Timeline — underline Tabs). Calendar
mode: a light month/week grid, each day cell showing a small colored dot
per activity (color = category) and a cost figure in `--text-mono-sm` if
space allows. Timeline mode: reuses the horizontal **route line** at full
width with expandable day panels underneath (accordion).

**Components:** Calendar grid, Day cell, expandable Day panel, drag-to-
reorder on activities within Timeline mode (same drag-handle pattern as
Itinerary Builder for consistency).

---

## 11. Shared / Public Itinerary View

**Layout:** stripped-down version of Itinerary View — no app nav, no edit
affordances. Header: trip name, dates, and a small "Shared by {name}" line.
Body: read-only route line + day blocks, same visual language as screen 6
so a viewer immediately recognizes "this is a GlobeTrotter trip." Sticky
footer or top-right: primary Button "Copy this trip," plus small share
icons (link copy, social).

**Details:** This is the one screen a non-user will see — it should be the
best-looking read of the ticket-stub/route-line system in the app, since
it's effectively the product's marketing surface. No login wall to view it;
login is only required for "Copy this trip."

---

## 12. User Profile / Settings

**Layout:** centered form, similar width class to Create Trip. Sections
stacked with `--color-line` dividers: Profile (name, photo, email),
Preferences (language), Saved destinations (a compact City Card list, view-
only with a remove action), Account (Delete account — Destructive Button,
behind a confirm step).

---

## 13. Admin / Analytics Dashboard (optional)

**Layout:** only build if time remains after 1–12. Full-width dashboard:
top row of stat cards (Total trips created, Active users, Top city) using
plain Card style (not ticket-stub — this is an internal tool, not a
traveler-facing surface, so it can look more like a standard admin panel:
denser, table-heavy, still on `--color-paper` with `--color-mulberry`
accents for consistency). Charts below for trips-over-time and top
cities/activities. A simple user table with search.

**Details:** Deliberately less "designed" than the rest of the app — an
admin panel earns its keep by being legible and dense, not by carrying the
route-line/ticket motif, which is a traveler-facing idea.