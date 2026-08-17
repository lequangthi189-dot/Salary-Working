# SalaryWorking — design system

A design system for **SalaryWorking**, a one-page web app that lets a shift worker
track their **own** pay: log shifts, split day and night hours, apply their own
rates, add deductions and side income, and check the result against the company
payslip on payday.

It is not an HR system, not a company time clock, not a workforce-management tool.
It stands on the worker's side of the table. Every design decision in here follows
from that.

---

## 1. Product context

| | |
|---|---|
| **Product** | SalaryWorking — personal pay tracker / payslip cross-check |
| **Surface** | One React SPA (no router). Everything is one page + a bottom dock + modals |
| **Primary device** | A phone, one-handed, just off shift — outdoors in glare or in a dim workshop |
| **Users** | Hourly shift workers: factory, retail, F&B, security, nursing, warehouse. Rotating shifts, night shifts, holidays. Not technical, will not read docs, will not sit through onboarding |
| **Languages** | 4 locale codes — `vi` (₫), `en` (£), `us` ($), `au` (A$) — but only **2 dictionaries**: Vietnamese and English. The three English codes differ only in currency and number/date format |
| **Themes** | **3**, and they are three *personalities*, not three palettes: `dark` (default — the agreed Trung tính palette: one graphite ramp, one accent, three hues total), `glass` (frosted, aurora ground), `neumorph` (light room, soft shadows) |
| **Text size** | 3 root scales (sm / md / lg), stored per account |
| **Data** | Supabase + Row Level Security (`auth.uid() = user_id`). The database stores raw times only; every derived number (hours, money) is recomputed on the client, so changing a rate never corrupts history |

### The problem it solves

A shift worker cannot verify their own payslip. SalaryWorking closes the specific
gaps where payslips go wrong:

- shifts crossing midnight — which minutes were night minutes (window 22:00–06:00, boundaries count as night);
- early in / late out is **not** paid, late in / early out **is** a loss — the app pays only the intersection of the roster and the real clock times and names the difference "giờ mất" (lost hours);
- rates are per person (hourly + night % + holiday day/night %), never hard-coded;
- pay periods straddle two months (26 → 25 by default, configurable);
- deductions and non-hourly side income sit outside the hourly maths;
- the roster is a photo of a sheet taped to the wall — it can be read from an image, but a machine-read value must never look like a value the person typed.

### Sources this system was built from

- **GitHub — [lequangthi189-dot/Salary-Working](https://github.com/lequangthi189-dot/Salary-Working)** (branch `master`), the production app. Read for tokens, components and screens: `src/styles.css` (3,446 lines — the real stylesheet), `src/styles/themes.css`, `src/components/*` (49 files), `src/auth/*`, `src/lib/shiftMath.js`, `src/lib/translations.js`, `.claude/docs/{architecture,pay_logic,data_model,state_management}.md`, `public/logo.svg`.
- **The product brief supplied by the owner**, including the "avoid the AI productivity app look" design constraint, which is treated here as a rule, not a suggestion.
- **`uploads/sw-29-bangkep-icon.svg`** — the clipboard mark the owner drew and edited. It is the brand mark, kept rather than replaced.

You may not have access to the repository; nothing here depends on it, but reading
it will make anything you build far more accurate. Related repos by the same owner
(`Money-Wise`, `QuanLyKho`) were **not** used.

---

## 2. Content fundamentals

**Voice: a ledger, not an assistant.** Flat declarative statements. No first
person, no personality, no congratulation, no emoji anywhere in product UI.

| Do | Don't |
|---|---|
| "No shifts yet. Add your first one above." | "Let's get started! ✨" |
| "Overdue — not checked in" | "Oops, looks like we missed a day!" |
| "Wrong email or password." | "Something went wrong (error 401)" |
| "Reading schedule…" | "AI is thinking…" |
| "Delete this shift? This action cannot be undone." | "Are you sure you really want to delete?" |
| "Salary received" | "Nice, you got paid! 🎉" |

Rules taken from the product's own dictionary (`src/lib/translations.js`):

- **Labels are Title Case, short, and end in a colon when a value follows**: `Total Hours:`, `Day Hours:`, `Salary this month:`.
- **Sentences are sentences** — a real full stop, no exclamation marks: "Enter your email above first."
- **Numbers carry their unit inline**: `182.50 (h)`, `8.13 h`, `−320.000`, `£1 = 31.000 VND · updated 08:20`.
- **A middot separates facts on one line**: `8.20 h · Day 4.00h · Night 4.20h · Late 0.25h`.
- **Never claim certainty the app doesn't have.** Machine-read values are labelled and confirmed: "read from image", "AI read differs from OCR — please verify", "{count} cell(s) where AI and OCR differ — check carefully before saving."
- **Nothing is called AI in the UI.** The photo import is "Import weekly schedule"; the chatbot is the "Salary assistant".
- **Empty states name the next action**, never apologise: "No deductions in this period yet.", "No checked-in shifts in this period.", "No period marked as received yet."
- **Vietnamese and English are peers.** Vietnamese is not a translation afterthought — write both, keep both short; Vietnamese sentence case, no ALL CAPS shouting.
- One documented exception to the no-emoji rule exists upstream: the welcome modal title "Welcome to Salary Working 👋". Do not extend it.

---

## 3. Visual foundations

### Colour

Flat fields, one accent, contrast from **weight and value** — never from glow.
Default (`dark`) theme: near-black navy `#0a1929` ground, two panel steps
(`#0f2334`, `#14293c`), hairline border `#1a2d40`, near-white text `#f3f8fd`,
muted `#8696aa`, accent `#5b9ec6`. Meaning is fixed and must not be re-mapped:
green = earned/received, red = lost/deducted, amber = check-in, blue = check-out,
dashed grey = the planned reference. Stat tones are bound to metrics (orange
totals, green day, blue night, red late). One or two background colours per
screen, maximum.

### Type

**No webfont.** The product runs on `system-ui, -apple-system, Segoe UI, Roboto,
sans-serif` on purpose: instant first paint on a cheap Android handset, and it
looks like a tool the phone already had. There is therefore **no font
substitution to flag and no font file to request** — if a brand typeface is ever
licensed, add it as a `@font-face` in `tokens/typography.css` and keep the OS
stack as the fallback.

Numbers are the protagonists: money and hours are set in
`font-variant-numeric: tabular-nums` at 700–800 weight, `line-height: 1.1`, and
are the largest thing on any screen (2.2rem for the period total). Labels retreat:
0.72–0.85rem, muted, uppercase with 0.03–0.08em tracking for section and tile
labels. Everything is sized in **rem** because the user's text-size setting scales
the root — px text would ignore it.

### Space, density and layout

This is a timesheet, not a dashboard. Rows are 0.85–1.1rem of padding with 0.6rem
between them, so many shifts are visible at once. Content column is 980px max;
the board splits `minmax(0,2fr)` shift entry / `minmax(0,3fr)` stats and collapses
to one column at 760px. The page reserves 7rem (9rem + safe-area on mobile) at the
bottom so the fixed dock never covers the last row. Primary actions sit at the
bottom of the screen, within thumb reach; hit targets are 44px.

### Surfaces, borders, radii, shadow

Cards are flat: background + 1px hairline + 10–14px radius, **no shadow at all**
in the dark theme. Radius grows with the surface — 6px inline controls, 8px inputs
and buttons, 10px shift rows, 12px day cards and modals, 14px the salary hero,
999px the dock and status chips. Elevation exists only for the dock
(`0 8px 16px / 0 16px 40px` black) and popovers. Two emphatic frames break the
flatness on purpose: the 2px green border of the salary hero, and the 2px red
frame + glow of a day that was never clocked in. Glass adds 18px radii, a
translucent white gradient, `blur(18px) saturate(150%)`, a masked gradient hairline
and a 4px hover lift. Soft UI removes borders entirely and works only in shadow:
raised idle, deeper on hover, inset when pressed or for inputs.

### Backgrounds and imagery

No photography, no illustration, no mascots, no patterns, no texture. `dark` and
`neumorph` are flat fields; `glass` is the one gradient in the system — five soft
radial "aurora" blobs over a `#1a2050 → #1d2358` base, `background-attachment:
fixed`, drifting over 28s (and off entirely under `prefers-reduced-motion`). The
only "image" a user ever sees is their own photo of a roster.

### Motion, hover, press

Motion explains state. Hover in the dark theme is a border-colour change only
(`0.2s ease`) — no lift, no glow. Press is a scale of 0.985–0.99. The dock icons
scale to 1.6× toward the pointer (`0.15s ease-out`) and the dock hides 5s after
scrolling stops. The shift list dims cards away from the viewport centre by
opacity/scale/saturation (`90ms linear`) so the row you are reading is the crisp
one. Glass lifts cards 4px on `cubic-bezier(0.22,1,0.36,1)`; Soft UI deepens its
shadow. Skeletons shimmer once per 1.4s; loading keeps the layout still, and only
the first load of a screen shows skeletons at all. Everything above is disabled
under `prefers-reduced-motion`.

### Transparency and blur

Only in the `glass` theme, and always with a painted translucent gradient
underneath so a surface still reads as frosted when the browser drops
`backdrop-filter`. The modal scrim is `rgba(0,0,0,0.6)` in every theme. Scrollbars
are hidden everywhere (scrolling still works).

---

## 4. Iconography

- **Icon set:** [Lucide](https://lucide.dev), inlined in the app, not loaded from a CDN. Exactly **seven glyphs** exist across the whole product; they are copied verbatim (same path data) into `assets/icons/`: `calendar-days` (Pay period), `wrench` (Tools), `user` (Account), `book-open` (Guide), `search` (shift search), `check` (checkbox tick), `chevron-down` (glass `<select>` arrow, embedded as a data-URI upstream).
- **Uniform spec:** `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`, round caps and joins, rendered at 26px in the dock and 16px inline. Colour comes from `currentColor`, so icons follow theme and active state.
- **Deliberately few.** Where a word is clearer than a glyph, the product uses the word — the design brief bans a decorative icon set sprayed across the UI.
- **Unicode characters do the work of small icons:** `✎` edit, `×` delete/close, `✓` received/done, `⟳` in progress, `›` sheet row, `–` between two times, `·` between facts, `−` before a negative amount, `₫` in the assistant bubble.
- **Emoji: no** (see Content fundamentals for the single upstream exception).
- **No PNG icons and no icon font** exist in the source. If you need a glyph that isn't in the seven, take it from Lucide at the same spec and note the addition.
- **Logo:** the repository ships `public/logo.svg` (blue tile, clock, ₫ badge), kept for reference at `assets/logo/legacy-app-icon.svg`. It is superseded by the owner's own mark (§5); nothing was reconstructed from memory.

---

## 5. Logo

One mark, supplied by the product owner and kept as drawn: **Bảng kẹp** — a clipboard
ledger. A hairline frame holds a solid header row, three tick boxes and three
half-opacity data rows (the anatomy of the app's shift list); one maroon check
crosses the last rows — the reconcile stroke, drawn by the worker, not by the
system. Additive, orthogonal, one stroke weight of 9 for the structure, the check
heavier at 16 as the only diagonal. Ink navy `#0a1929` · paper `#f3f8fd` · ledger
maroon `#B03A55`.

Open **`guidelines/logo.html`** for the mark at size, on both grounds, with clear
space, minimum size and don'ts.

| File | Use |
|---|---|
| `assets/logo/a-bangkep-icon.svg` | The mark as supplied — draws with `currentColor`, for light grounds or inlined HTML |
| `assets/logo/a-bangkep-icon-light.svg` | Same geometry with explicit light ink, for dark UI and `<img>` tags |
| `assets/logo/a-bangkep-lockup.svg` | Mark + wordmark; the wordmark is live OS-stack text, outline it before print |
| `assets/logo/legacy-app-icon.svg` | The old in-repo app icon, reference only |

No alternative logo directions are proposed; earlier explorations were removed at
the owner's request.

## 6. Components

React primitives, one file each, styled entirely through the CSS custom properties
in `styles.css` so all three themes work without a second implementation. The
inventory is the one the source defines — nothing was invented to round out a
"standard" set.

**Forms** (`components/forms/`) — `Button`, `TextField`, `TimeInput`, `Checkbox`, `SearchInput`
**Data display** (`components/data/`) — `SalaryHero`, `StatCard`, `StatTile`, `ShiftCard`, `DateGroup`, `TimesheetTable`, `PeriodCard`, `Badge`, `Avatar`
**Navigation** (`components/navigation/`) — `Dock`, `FilterTabs`, `ThemeCycle`, `Flag`
**Feedback** (`components/feedback/`) — `Modal`, `ProgressButton`, `Skeleton`, `EmptyState`, `Message`, `Loader`

Each directory carries a specimen card; each component has a `.d.ts` props
contract and a `.prompt.md` with a usage example and the rules that matter.

### Intentional additions

- **The `dark` theme carries the agreed Trung tính palette** rather than the upstream navy: one graphite ramp for every surface, one accent, three hues total (accent / earned / lost), with the amber–blue time colours dropped so check-in and check-out separate by weight instead of hue. Same three theme names as the app, same contract — only `dark`'s values differ from `src/styles/themes.css`, and `handoff/` carries the paste-ready patch.
- **Surface-recipe tokens** (`--card-bg`, `--card-bg-image`, `--card-border`, `--card-radius`, `--card-shadow`, `--card-blur`, `--input-*`, `--button-*`). Upstream, theme differences are expressed as CSS overrides on component class names; a component library cannot rely on those, so each theme now also publishes its surface recipe as tokens. Same values, addressable.
- **`Badge`** consolidates the upstream `.planned-badge`, `.overdue-badge`, `.received-badge` and the OCR warning marker into one component with four kinds.
- **`ThemeCycle`** is one component for the upstream `ThemeToggle` and `LangCycle`, which are the same control with a different swatch.
- **`StatTile`** is the upstream `.stat` block from the summary grids, which had no component of its own.
- **`Flag`** extracts the four SVG flags from upstream `LangToggle.jsx` (drawn, never emoji — Windows renders flag emoji as nothing) so any language control can reuse them; `ThemeCycle` takes them through its `icon` prop.

### Not recreated

`SalaryChat` (45KB of intent parsing), `ReconcileModal` (35KB), `ProfileModal`,
`EmployeeInfoForm`, the file-picking half of `AvatarUpload`, `ExtraIncomeModal`, `DeductionsCard`,
`ManualScheduleModal`, `ErrorBoundary`, multi-account switching, the changelog
popup. Their *screens* are represented in the UI kit where useful; they are
feature modules, not reusable primitives.

---

## 7. UI kit

**`ui_kits/salaryworking-app/index.html`** — an interactive recreation of the real
product: sign in → board (add a shift and watch the totals move; search and filter
the list) → pay period (period cards → four SVG donuts → Excel-style timesheet) →
Tools → import a roster from an image, complete with the OCR cross-check warning →
Account (switch all three themes, all four languages, three text sizes) → Guide →
the floating salary assistant. See its README for the file map and the deliberate
gaps.

---

## 8. Index

| Path | What it is |
|---|---|
| `styles.css` | The only file a consumer links — `@import` list, nothing else |
| `tokens/palette.css` | Raw values lifted from the app, all three themes |
| `tokens/colors.css` | The product's live token contract + semantic aliases |
| `tokens/themes.css` | `[data-theme]` scopes (`dark`, `glass`, `neumorph`): colour swap + surface recipes |
| `tokens/typography.css` | OS font stacks, tabular numerals, rem scale, weights, tracking |
| `tokens/spacing.css` | Density ladder, layout widths, touch sizes |
| `tokens/shape.css` | Radii, the two shadows, focus ring, warning glow, border widths |
| `tokens/motion.css` | Durations, easings, transition recipes |
| `assets/logo/` | The mark (light + currentColor), the lockup, the legacy app icon |
| `assets/icons/` | The seven Lucide glyphs used by the product |
| `components/{forms,data,navigation,feedback}/` | 24 primitives + specimen cards |
| `guidelines/logo.html` | The mark at size, on both grounds, with usage rules |
| `guidelines/*.card.html` | 19 foundation specimens (Brand, Colors, Type, Spacing, Surfaces, Motion) |
| `ui_kits/salaryworking-app/` | Interactive app recreation |
| `SKILL.md` | Agent-skill entry point |
| `github.md` | Source-repository association and sync record |
| `thumbnail.html` | Homepage tile |

---

## 9. Caveats

- **No webfont, by design** — see §3. Nothing to substitute; flag it only if the brand later licenses a typeface.
- **The logo is the owner's own mark**, used in the UI kit header and available in both ink and light versions. The live app still ships the legacy icon until it is swapped in.
- Pay figures, names and dates in the cards and the kit are **fabricated** samples built on the real formulas (rates 25,500 ₫/h day, +30% night, 200%/260% holiday) — they are not anyone's real pay.
- Donut charts, the reconcile flow and the assistant are visual recreations; the real intent parsing and Gemini edge functions are out of scope.
