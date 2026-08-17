repo: lequangthi189-dot/Salary-Working
branch: master

## Last sync

date: 2026-08-16T02:03:28Z

### Updated in this project

- Tokens written from `src/styles.css` and `src/styles/themes.css` (all three themes).
- 22 components ported from `src/components/` and `src/auth/`.
- Interactive app UI kit recreating board, pay period, roster import, account, guide, assistant.
- Seven Lucide glyphs and the legacy app icon copied into `assets/`.

## Screen map

| Screen / artifact | Built from |
|---|---|
| `tokens/*.css` | `src/styles.css`, `src/styles/themes.css`, `src/components/MonthStats.css`, `NavBar.css`, `Skeleton.css`, `ProgressButton.css`, `Loader.css` |
| `components/forms/*` | `src/components/TimeInput.jsx`, `Checkbox.jsx`, `src/styles.css` (`label`, `.btn-*`, `.shift-filter-btn`, `.shift-search`) |
| `components/data/*` | `src/components/StatCard.jsx`, `MonthStats.jsx`, `ShiftCard.jsx`, `Timesheet.jsx`, `TimesheetTable.jsx`, `src/styles.css` (`.period-*`, `.stat`, `*-badge`) |
| `components/navigation/*` | `src/components/NavBar.jsx`, `NavBar.css`, `ThemeToggle.jsx`, `LangCycle.jsx` |
| `components/feedback/*` | `src/components/Skeleton.jsx`, `ProgressButton.jsx`, `Loader.jsx`, `ConfirmModal.jsx`, `src/styles.css` (`.modal-*`, `.empty`, `.msg`) |
| `ui_kits/salaryworking-app/kit-data.jsx` | `src/lib/shiftMath.js`, `rates.js`, `payPeriod.js`, `currency.jsx`, `i18n.jsx`, `translations.js` |
| `ui_kits/salaryworking-app/kit-screens.jsx` | `src/App.jsx`, `src/auth/LoginForm.jsx`, `src/components/ShiftForm.jsx`, `MonthStats.jsx`, `Timesheet.jsx` |
| `ui_kits/salaryworking-app/kit-period.jsx` | `src/components/PayPeriodPage.jsx`, `PayPeriodPanel.jsx`, `TimesheetTable.jsx` |
| `ui_kits/salaryworking-app/kit-tools.jsx` | `src/components/ToolsSheet.jsx`, `ScheduleImportModal.jsx`, `ProfileModal.jsx`, `WelcomeGuide.jsx`, `SalaryChat.jsx`, `src/lib/ocrCrosscheck.js` |
| `assets/icons/*` | Inline Lucide glyphs in `src/components/NavBar.jsx`, `Timesheet.jsx`, `Checkbox.jsx`, `src/styles/themes.css` |
| `assets/logo/legacy-app-icon.svg` | `public/logo.svg` |
| `readme.md` | `CLAUDE.md`, `AGENTS.md`, `.claude/docs/architecture.md`, `src/lib/translations.js` |
