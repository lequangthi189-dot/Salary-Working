---
name: salaryworking-design
description: Use this skill to generate well-branded interfaces and assets for SalaryWorking, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for protoyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

Vendored into this repo from the Claude Design handoff bundle on 2026-08-17. Two
notes on this copy:

- `SalaryWorking App.html` (a 1.3 MB single-file export of the UI kit) was **not**
  copied in — it is a generated snapshot, it predates the holiday-night rate fix,
  and it does not belong in git. Re-export it from Claude Design if you want it.
- `handoff/full/README.md` and `ui_kits/salaryworking-app/kit-data.jsx` carry
  corrections made while implementing this handoff against the real repo. Prefer
  this copy over any older download. The corrections are marked inline.

**The app is the source of truth for pay maths and for the CSS class/theme system.**
Where this design system disagrees with `src/lib/*.js` or `src/styles.css`, the app
wins — fix the system, not the app.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Non-negotiables for this brand, before you draw anything:

- Numbers are the protagonists — money and hours in tabular figures, 700–800 weight, the largest thing on the screen.
- No gradients, no glow, no sparkle, no robot, no "Powered by AI" — the photo import is "Import weekly schedule", the chatbot is the "Salary assistant".
- Dense, not airy: this is a timesheet. Many rows visible at once beats generous whitespace.
- Flat cards, hairline borders, no shadow in the dark theme. One accent colour.
- Copy is declarative and short, no first person, no emoji, no cheerfulness.
- A number the machine read must never look like a number the person typed.
- Anything new has to look right in all three themes (dark / glass / neumorph) and in Vietnamese as well as English.
