# UI kit — SalaryWorking web app

A click-through recreation of the real product (`lequangthi189-dot/Salary-Working`,
React 18 + Vite, no router — one page, dock navigation, everything else a modal).

Open `index.html`. Flow you can walk:

1. **Sign in** — auth card, 360px, language + theme cyclers in the corner (`src/auth/LoginForm.jsx`).
2. **Board** — the home view: shift entry on the left (2fr), month stats on the right (3fr), timesheet below. Add a shift and the totals, the day card and the hero figure all move. Search and the day/night chips narrow the list together.
3. **Pay period** (dock 1) — period cards → charts popup (four hand-drawn SVG donuts) → detailed Excel-style timesheet with week chips.
4. **Tools** (dock 2) → **Import weekly schedule** — drop zone, staged progress, then the review table with the OCR cross-check warning on the cell that disagreed. Confirming creates *planned* shifts, which appear amber in the list.
5. **Account** (dock 3) — rates, payday, and the three themes / four languages / three text sizes, all of which really switch.
6. **Guide** (dock 4) — the eight-step welcome, copy taken from the product's own dictionary.
7. **Salary assistant** — the floating ₫? bubble; canned answers computed from the same data.

## Files

| File | What it holds |
|---|---|
| `kit-data.jsx` | Fake fortnight of shifts + the real pay maths (night window 22:00–06:00, plan ∩ actual, holiday rates), currency + i18n helpers |
| `kit-screens.jsx` | `LoginScreen`, `ShiftEntry`, `MonthStats`, `BoardScreen` |
| `kit-period.jsx` | `PayPeriodScreen`, `Donut`, `DonutBlock` |
| `kit-tools.jsx` | `ToolsSheet`, `ScheduleImportModal`, `ReconcileModal`, `AccountModal`, `GuideModal`, `SalaryChat` |
| `kit-app.jsx` | `App` shell — dock, overlays, theme/lang/text-size wiring |

Everything visible is composed from the design system's own components
(`window.SalaryWorkingDesignSystem_f6e8d6`); the kit adds only layout and fake data.

## Deliberate gaps

- Compensation and Extra income now open real modals (add / delete a deduction with a reason, log a flat-fee side job and mark it received; both keep their own totals out of the hourly maths). Reconcile (`ReconcileModal`) IS recreated: scope chips, image drop, staged progress, then the day-by-day result table (Match / Mismatch / Not logged / Extra) with the OCR marker and the lost-hours total.
- Avatar upload, multi-account switching, password reset and the changelog popup are not recreated.
- The dock is pinned to the viewport and always visible. In the product it is also `position: fixed`, but it hides 5s after scrolling stops and reappears on the next scroll — kept visible here so it can be used in a card preview.
