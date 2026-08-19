# Add the whole design system to Salary-Working

Four pull requests, in this order. Each one ships on its own and can be reverted on
its own. Do not do them in one branch.

Repo: `lequangthi189-dot/Salary-Working` (`master`)

---

## PR 1 — Tokens (the whole foundation, one file)

This is the only PR that changes how the app looks.

```bash
git checkout -b design/tokens
mkdir -p src/styles
cp handoff/full/salaryworking-tokens.css src/styles/salaryworking-tokens.css
```

`src/main.jsx` — the token import must be **first**, so `styles.css` can still
override anything:

```js
import './styles/salaryworking-tokens.css'
import './styles.css'
```

Then delete the two sources of the old values, or they win:

1. `src/styles/themes.css` — delete **only the three variable-declaration blocks**
   (`[data-theme='dark']`, `[data-theme='glass']`, `[data-theme='neumorph']`,
   ~90 lines total). **KEEP THE FILE AND ITS IMPORT.**

   > ⚠️ **Corrected 2026-08-17.** This step used to say "delete the file and its
   > import". That is wrong and destructive. The file is 768 lines; only its three
   > leading var blocks are tokens. Everything else is per-theme **component CSS** —
   > the glass aurora keyframes and frosted surface recipe, the neumorph
   > shadow/convex recipes, the `.theme-swatch` picker chips, the
   > `prefers-reduced-motion` block. Deleting the file removes the glass and
   > neumorph themes entirely.

2. The `:root { --bg … --danger … }` token block at the top of `src/styles.css`.
   Delete only that block. **Keep every other rule** — they all reference these
   same variable names, which is why nothing else has to change.

   Verified name-by-name against the app's current `:root` — all 13 exist in the
   bundle, so the block can be deleted whole: `--bg`, `--panel`, `--panel-2`,
   `--text`, `--muted`, `--accent`, `--green`, `--danger`, `--border`, `--checkin`,
   `--checkout`, `--skeleton-base`, `--skeleton-sheen`.

3. `--ok` is **not** in the app's `:root` but `src/styles.css` reads it in 7 places
   (`.recv-badge.received`, `.recv-toggle`, `.recv-on`, `.extra-bulk-mark`) and
   nothing has ever defined it — so the "received" green was hardcoded to
   `#16a34a` and never themed. The bundle now defines `--ok`, `--text-on-ok` and
   `--ok-fill` per theme. Point those four rules at the tokens.

4. Eight rules pair `background: var(--accent)` with `color: #fff`
   (`button[type='submit']`, `.chat-user`, `.chat-input button`, `.seg-btn.active`,
   `.shift-filter-btn.active`, `.extra-add-btn`, `.avatar-pct`, `.row-btn.primary`).
   White on the accent fails AA in all three themes (2.58 / 1.88 / 2.22 measured).
   Switch them to `color: var(--text-on-accent)` → 7.18 / 9.63 / 5.44.

### One thing that must be true before PR 1 merges

The neutral palette lives in `[data-theme='dark']`, not in `:root`. The app's `:root`
today *is* the dark theme, so if `<html>` ever renders without a `data-theme`
attribute (first visit, before `localStorage` is read), it falls back to the
bundle's `:root` — the older navy values, not Trung tính. Fix it in
`index.html` so the attribute exists before first paint:

```html
<html lang="en" data-theme="dark" data-font="md">
```

and keep the existing JS that overwrites it from `localStorage` / the account
setting. Check in DevTools that `document.documentElement.dataset.theme` is never
empty.

> ⚠️ **Corrected 2026-08-17.** This snippet used to read
> `<html lang="vi" … data-size="md">`. Both were wrong:
> - The text-size attribute is **`data-font`** (`src/lib/appearance.js`,
>   `html[data-font='sm'|'md'|'lg']` in `styles.css`). Nothing reads `data-size`.
> - The app's default language is **`en`**, not `vi` (`initialLang()` in
>   `src/lib/i18n.jsx`). Setting `lang="vi"` mislabels the document for
>   screen readers and hyphenation.

What you get in one step: the Trung tính palette as `dark`, the glass and neumorph
recipes, the rem type scale that respects the user's text-size setting, tabular
figures on money and hours, the density ladder, radii, the two shadows, and the
motion durations/easings.

**Check before merging** — 3 themes × 2 languages × 3 text sizes:

- [ ] Money and hours are still the biggest thing on every screen
- [ ] Check-in vs check-out are distinguishable in all three themes (Soft UI was the weak one; fixed here)
- [ ] Planned shift = dashed grey, not-clocked-in day = red frame, received = green
- [ ] Dock does not cover the last row (bottom padding + safe-area)
- [ ] Vietnamese dock labels do not touch each other
- [ ] `prefers-reduced-motion` kills the aurora drift and the dock magnify

Rollback: `git revert`. Nothing is persisted, no database change, no user migration.

---

## PR 2 — Rates and formulas stay where they are

Nothing to do **in the app**. Listed so nobody "tidies" it: `src/lib/shiftMath.js`,
`rates.js`, `payPeriod.js` are the source of truth and the design system copied
them, not the reverse. If a number in the design system disagrees with the app,
the app wins.

**One such disagreement was found and fixed in the system (2026-08-17).**
`ui_kits/salaryworking-app/kit-data.jsx` computed

```js
holidayNightRate = hourly × (holidayNightPct / 100)          // wrong
```

but `getHolidayNightRate()` in `src/lib/rates.js` compounds the ordinary night
supplement first:

```js
holidayNightRate = hourly × (1 + nightPct/100) × (holidayNightPct/100)   // app, correct
```

At the kit's own sample profile (25,500 ₫/h, +30% night, 260% holiday night) the
kit showed **66,300 ₫/h instead of 86,190** — understating holiday-night pay by
23%. Checked by running both implementations over 9 probe shifts: the day/night
**split** already agreed everywhere; pay diverged only on holiday-night shifts
(22:00–06:00 holiday: 530,400 vs the app's 689,520). The kit is now fixed.

Note: the exported `SalaryWorking App.html` snapshot predates this fix — re-export
it before using it as a reference.

---

## PR 3 — Components, one family at a time

The 24 components in `components/` are **cosmetic recreations**, not production
code: no Supabase, no i18n context, no error handling.

> ⚠️ **Read this before touching PR 3 (added 2026-08-17).** "Replaces in app" in
> the table below is aspirational, not an instruction. Measured against the repo,
> a literal swap is a **regression**, for three reasons:
>
> 1. **All 24 components style themselves with inline `style={{…}}` objects and
>    emit zero `className`s.** The app themes its surfaces with per-theme CSS
>    rules keyed on those class names — 119 of them in `styles/themes.css`
>    (`.shift-card` 12, `.shift-form` 13, `.stat-card` 12, `.period-card` 11,
>    `.modal-card` 13, `.info-card` 20, `.salary-hero` 8, `.deduction-card` 12,
>    `.auth-card` 9, `.emp-card` 9). Swapping in a component orphans its theme
>    rules, and because inline styles outrank stylesheet rules, re-adding the
>    class does not bring them back. **Glass and Soft UI lose those surfaces.**
> 2. **They carry the pre-Trung tính palette.** `Button`'s `primary` variant is
>    `linear-gradient(135deg, var(--sw-blue-500), var(--sw-blue-700))` and
>    `received` hardcodes `#38a0ff / #0a1d38 / #1273e6`; `ThemeCycle` hardcodes
>    the old navy `#14293c / #0a1929`. Adopting them re-introduces exactly the
>    navy-blue gradients PR 1 removed — and the palette's own rule is
>    "no gradients, no glow".
> 3. **They drop real behaviour** carried by ~44 base rules on `.shift-card`,
>    `.shift-form`, `.period-card` and `.modal-card` — the `--scroll-focus` depth
>    effect, the `.editing` state, safe-area padding.
>
> So treat PR 3 as a **spec-conformance pass, not a swap**: for each family,
> diff the component's intended values against the app's existing CSS and fix the
> app's CSS where it disagrees, keeping the app's class names and theme system.
> Then the design intent lands with none of the above regressions.

Use them as the spec, in this order (cheapest and safest first):

| Order | Design-system component | Replaces in app | Why this order |
|---|---|---|---|
| 1 | `Button`, `ProgressButton` | `.btn-*` call sites, `ProgressButton.jsx` | Pure cosmetics, no state |
| 2 | `Badge` | `.planned-badge`, `.overdue-badge`, `.received-badge` | One component, four kinds |
| 3 | `StatTile`, `StatCard`, `SalaryHero` | `MonthStats.jsx` blocks | Read-only, easy to eyeball |
| 4 | `TextField`, `TimeInput`, `Checkbox`, `SearchInput` | `ShiftForm.jsx` inputs | Touch targets + focus ring |
| 5 | `ShiftCard`, `DateGroup`, `TimesheetTable` | `Timesheet.jsx`, `TimesheetTable.jsx` | The densest, most-used surface |
| 6 | `Modal`, `EmptyState`, `Message`, `Skeleton`, `Loader` | `ConfirmModal.jsx`, `.empty`, `.msg` | Touches every flow, do last |

Per family: copy the `.jsx` into `src/components/ds/`, read its `.prompt.md` for the
prop contract, wire the app's real data and translations into it, delete the old
markup and its CSS block from `styles.css`. One PR per row. Screenshot all three
themes in the PR.

---

## PR 4 — Keep design and code in sync

```
.claude/skills/salaryworking-design/     ← this whole project, downloaded
```

`SKILL.md` is already a valid Agent Skill, so Claude Code in your repo can read the
brand rules, all 24 component contracts and the UI kit, and design new screens that
match. Add to `CLAUDE.md`:

```md
Before building any new UI, read .claude/skills/salaryworking-design/readme.md.
Numbers are the protagonists. No gradients, no glow, no emoji, no AI labels.
Anything new must look right in dark, glass and neumorph, in Vietnamese and English.
```

---

## What is deliberately NOT in this handoff

- `SalaryChat` intent parsing, the `extract-schedule` edge function, OCR cross-check logic — the design system recreates their *screens*, not their behaviour.
- Multi-account switching, avatar upload to Storage, the changelog popup.
- Any database or RLS change. There are none.
