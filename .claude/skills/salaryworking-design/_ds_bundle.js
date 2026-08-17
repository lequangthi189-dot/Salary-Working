/* @ds-bundle: {"format":4,"namespace":"SalaryWorkingDesignSystem_f6e8d6","components":[{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"DateGroup","sourcePath":"components/data/DateGroup.jsx"},{"name":"PeriodCard","sourcePath":"components/data/PeriodCard.jsx"},{"name":"SalaryHero","sourcePath":"components/data/SalaryHero.jsx"},{"name":"ShiftCard","sourcePath":"components/data/ShiftCard.jsx"},{"name":"StatCard","sourcePath":"components/data/StatCard.jsx"},{"name":"StatTile","sourcePath":"components/data/StatTile.jsx"},{"name":"TimesheetTable","sourcePath":"components/data/TimesheetTable.jsx"},{"name":"EmptyState","sourcePath":"components/feedback/EmptyState.jsx"},{"name":"Loader","sourcePath":"components/feedback/Loader.jsx"},{"name":"Message","sourcePath":"components/feedback/Message.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"ProgressButton","sourcePath":"components/feedback/ProgressButton.jsx"},{"name":"Skeleton","sourcePath":"components/feedback/Skeleton.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"SearchInput","sourcePath":"components/forms/SearchInput.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"TimeInput","sourcePath":"components/forms/TimeInput.jsx"},{"name":"DOCK_ICONS","sourcePath":"components/navigation/Dock.jsx"},{"name":"Dock","sourcePath":"components/navigation/Dock.jsx"},{"name":"FilterTabs","sourcePath":"components/navigation/FilterTabs.jsx"},{"name":"Flag","sourcePath":"components/navigation/Flag.jsx"},{"name":"LANGUAGES","sourcePath":"components/navigation/Flag.jsx"},{"name":"LANG_NAMES","sourcePath":"components/navigation/Flag.jsx"},{"name":"LANG_CURRENCY","sourcePath":"components/navigation/Flag.jsx"},{"name":"ThemeCycle","sourcePath":"components/navigation/ThemeCycle.jsx"}],"sourceHashes":{"components/data/Avatar.jsx":"522517925744","components/data/Badge.jsx":"65d5ef339fe2","components/data/DateGroup.jsx":"1ac00c29f4e1","components/data/PeriodCard.jsx":"6fc22e9f5014","components/data/SalaryHero.jsx":"415efbb6864a","components/data/ShiftCard.jsx":"1900ea468094","components/data/StatCard.jsx":"4062ef77954f","components/data/StatTile.jsx":"b2be84b0930d","components/data/TimesheetTable.jsx":"a3a942162734","components/feedback/EmptyState.jsx":"cd4e7f1cb52d","components/feedback/Loader.jsx":"8801e941a320","components/feedback/Message.jsx":"57fb3175284f","components/feedback/Modal.jsx":"0bd91f314933","components/feedback/ProgressButton.jsx":"924c3c0d2dfb","components/feedback/Skeleton.jsx":"8d964344cada","components/forms/Button.jsx":"0d58a86a3a1a","components/forms/Checkbox.jsx":"8f7bcfcb5ae0","components/forms/SearchInput.jsx":"893f4caf98b6","components/forms/TextField.jsx":"dc253f7ac48f","components/forms/TimeInput.jsx":"ff80c4bf9311","components/navigation/Dock.jsx":"64a0b60fe8ee","components/navigation/FilterTabs.jsx":"daa2ecc07644","components/navigation/Flag.jsx":"7ed8ff2b5181","components/navigation/ThemeCycle.jsx":"32503a8f075b","ui_kits/salaryworking-app/kit-app.jsx":"07b69cafb6a3","ui_kits/salaryworking-app/kit-data.jsx":"c40e9a4cbc7b","ui_kits/salaryworking-app/kit-period.jsx":"48bdc54ac4e2","ui_kits/salaryworking-app/kit-screens.jsx":"81e37290f8bc","ui_kits/salaryworking-app/kit-tools.jsx":"56510fd6e7d0"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SalaryWorkingDesignSystem_f6e8d6 = window.SalaryWorkingDesignSystem_f6e8d6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/data/Avatar.jsx
try { (() => {
/* Profile photo. Falls back to initials on a raised surface — never to a generic
   person glyph, because in the dock the avatar IS the account button and a stock
   silhouette reads as "not signed in". Upstream: src/components/AvatarUpload.jsx
   and the .dock-avatar rule in NavBar.css (accent border when that item is open). */
function initialsOf(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function Avatar({
  src,
  name = '',
  size = 40,
  active = false,
  alt = 'Profile photo',
  style
}) {
  const border = '1px solid ' + (active ? 'var(--accent)' : 'var(--border)');
  if (src) {
    return /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: alt,
      style: {
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        display: 'block',
        border,
        flex: 'none',
        ...style
      }
    });
  }
  return /*#__PURE__*/React.createElement("span", {
    "aria-label": alt,
    role: "img",
    style: {
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center',
      background: 'var(--panel-2)',
      backgroundImage: 'var(--card-bg-image)',
      border,
      boxShadow: 'var(--card-shadow)',
      color: active ? 'var(--accent)' : 'var(--muted)',
      fontWeight: 'var(--weight-bold)',
      fontSize: Math.max(10, Math.round(size * 0.36)) + 'px',
      letterSpacing: '0.02em',
      flex: 'none',
      ...style
    }
  }, initialsOf(name));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
/* Status chips from the shift list and period list. Each one is a claim about
   truth: planned (amber, from a roster), overdue (red, day passed with no clock-in),
   received (green, user confirmed the money arrived), ocr (machine-read, unverified). */
const KINDS = {
  planned: {
    color: 'var(--status-planned)',
    background: 'var(--status-planned-chip)',
    border: '1px solid var(--status-planned)'
  },
  overdue: {
    color: '#fff',
    background: 'var(--status-overdue)',
    border: 'none'
  },
  received: {
    color: 'var(--status-received)',
    background: 'transparent',
    border: 'none',
    padding: 0
  },
  ocr: {
    color: 'var(--sw-amber-500)',
    background: 'transparent',
    border: '1px dashed var(--sw-amber-500)'
  },
  neutral: {
    color: 'var(--muted)',
    background: 'var(--panel-2)',
    border: '1px solid var(--border)'
  }
};
function Badge({
  kind = 'neutral',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      marginLeft: '0.4rem',
      padding: '0.05rem 0.45rem',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...KINDS[kind],
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/DateGroup.jsx
try { (() => {
/* One day = one card. Header carries date · totals · money, then the shift rows.
   From src/components/Timesheet.jsx + .date-group/.date-header. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0));
const hours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
function DateGroup({
  date,
  totalHours,
  dayHours = 0,
  nightHours = 0,
  lostHours = 0,
  pay,
  currencyLocale = 'vi-VN',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      marginBottom: '1.25rem',
      background: 'var(--card-bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: 'var(--card-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--card-shadow)',
      padding: '0.75rem 0.85rem',
      ...style
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: '1rem',
      padding: '0.4rem 0.25rem',
      borderBottom: '1px solid var(--border)',
      marginBottom: '0.6rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, date), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 'auto',
      color: 'var(--muted)',
      fontSize: 'var(--text-base)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, hours(totalHours), " h", dayHours > 0 && ' · Day ' + hours(dayHours) + 'h', nightHours > 0 && ' · Night ' + hours(nightHours) + 'h', lostHours > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-negative)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, ' · Late ' + hours(lostHours) + 'h')), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-positive)',
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, money(pay, currencyLocale))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem'
    }
  }, children));
}
Object.assign(__ds_scope, { DateGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DateGroup.jsx", error: String((e && e.message) || e) }); }

// components/data/PeriodCard.jsx
try { (() => {
/* A pay period in the list: label, span, hours, money, and whether it landed.
   Whole card is a button — tapping it opens that period's charts and timesheet.
   From src/styles.css .period-card / .period-total / .received-badge. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0));
const hours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
function PeriodCard({
  label,
  dateRange,
  meta,
  pay,
  received = false,
  receivedOn,
  currencyLocale = 'vi-VN',
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.3rem',
      width: '100%',
      textAlign: 'left',
      font: 'inherit',
      background: 'var(--card-bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: 'var(--card-border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--card-shadow)',
      padding: '0.75rem 0.85rem',
      marginBottom: '0.6rem',
      color: 'var(--text)',
      cursor: 'pointer',
      transition: 'var(--transition-surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-md)'
    }
  }, label), received ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--status-received)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      whiteSpace: 'nowrap'
    }
  }, "\u2713 Received") : /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, money(pay, currencyLocale))), meta && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontSize: 'var(--text-base)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, meta), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)',
      fontSize: 'var(--text-sm)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, dateRange, received && receivedOn ? ' · Received on ' + receivedOn : ''));
}
Object.assign(__ds_scope, { PeriodCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/PeriodCard.jsx", error: String((e && e.message) || e) }); }

// components/data/SalaryHero.jsx
try { (() => {
/* The single most important object in the product: "this is what the period owes
   me". Centred, uppercase green label, 2.2rem figure, then the arithmetic that
   produced it in one muted line. From src/components/MonthStats.jsx + MonthStats.css. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0));
const hours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
function SalaryHero({
  label = 'Salary this month:',
  expectedLabel = 'Expected',
  lateLabel = 'Late',
  deductionLabel = 'Compensation',
  net,
  expected,
  latePenalty,
  deduction,
  fxNote,
  currencyLocale = 'vi-VN',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.25rem',
      background: 'var(--hero-fill, var(--sw-slate-900))',
      backgroundImage: 'var(--glass-hero-gradient, none)',
      border: 'var(--border-width-emphasis) solid var(--pay-positive)',
      borderRadius: 'var(--radius-xl)',
      padding: '1.15rem 1.3rem',
      textAlign: 'center',
      boxShadow: 'var(--card-shadow)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-positive)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-sm)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-hero)'
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-value)',
      fontWeight: 'var(--weight-heavy)',
      fontSize: 'var(--text-5xl)',
      lineHeight: 'var(--leading-tight)',
      fontVariantNumeric: 'var(--numeric)',
      overflowWrap: 'anywhere'
    }
  }, money(net, currencyLocale)), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: '0.1rem',
      color: 'var(--sw-slate-350)',
      fontSize: 'var(--text-sm)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "(", expectedLabel, ": ", money(expected, currencyLocale), latePenalty > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.5
    }
  }, " | "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-negative)'
    }
  }, lateLabel, ": \u2212", money(latePenalty, currencyLocale))), deduction > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.5
    }
  }, " | "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-negative)'
    }
  }, deductionLabel, ": \u2212", money(deduction, currencyLocale))), ")"), fxNote && /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: '0.2rem',
      color: 'var(--sw-slate-400)',
      fontSize: 'var(--text-2xs)'
    }
  }, fxNote));
}
Object.assign(__ds_scope, { SalaryHero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/SalaryHero.jsx", error: String((e && e.message) || e) }); }

// components/data/ShiftCard.jsx
try { (() => {
/* One shift row: times · what was lost · pay · actions. Four-column grid so the
   money column always lines up down the list. Three states carry a frame:
   normal, planned (amber, future roster entry), missing (red, day passed with no
   clock-in). From src/components/ShiftCard.jsx + src/styles.css .shift-card. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0));
const hours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
function ShiftCard({
  start,
  end,
  scheduledStart,
  scheduledEnd,
  pay,
  lostHours = 0,
  lateInHours = 0,
  earlyOutHours = 0,
  state = 'normal',
  currencyLocale = 'vi-VN',
  onEdit,
  onDelete,
  style
}) {
  const noActual = !start || !end;
  const frame = state === 'planned' ? {
    borderColor: 'var(--status-planned)',
    background: 'var(--status-planned-fill)'
  } : state === 'missing' ? {
    borderColor: 'var(--status-missing)',
    borderWidth: 'var(--border-width-emphasis)',
    background: 'var(--status-missing-fill)',
    boxShadow: 'var(--shadow-warning-missing)'
  } : null;
  const iconBtn = {
    background: 'none',
    border: 'none',
    color: 'var(--muted)',
    fontSize: '1rem',
    lineHeight: 1,
    padding: '0.25rem 0.35rem',
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--panel-2)',
      backgroundImage: 'var(--card-bg-image)',
      border: '1px solid var(--border)',
      borderLeft: state === 'normal' ? 'var(--shift-card-accent-edge, 1px solid var(--border))' : undefined,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--card-shadow)',
      padding: 'var(--shift-card-padding)',
      display: 'grid',
      gridTemplateColumns: '1.3fr 1.4fr auto auto',
      alignItems: 'center',
      gap: '0.75rem',
      ...frame,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontVariantNumeric: 'var(--numeric)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, noActual ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, scheduledStart || '—'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, " \u2013 "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, scheduledEnd || '—')) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--time-in)'
    }
  }, start), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, " \u2013 "), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--time-out)'
    }
  }, end))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)'
    }
  }, lostHours > 0 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--pay-negative)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Late ", hours(lostHours), "h", (lateInHours > 0 || earlyOutHours > 0) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-medium)',
      fontSize: 'var(--text-sm)',
      opacity: 0.9
    }
  }, lateInHours > 0 && ' · late in ' + hours(lateInHours) + 'h', earlyOutHours > 0 && ' · left early ' + hours(earlyOutHours) + 'h'))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)',
      textAlign: 'right'
    }
  }, money(pay, currencyLocale)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.25rem'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Edit shift",
    onClick: onEdit,
    style: iconBtn
  }, "\u270E"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Delete shift",
    onClick: onDelete,
    style: {
      ...iconBtn,
      fontSize: '1.15rem'
    }
  }, "\xD7")));
}
Object.assign(__ds_scope, { ShiftCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ShiftCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatCard.jsx
try { (() => {
/* Stats tile from the month block: tone-coloured label on top, white figure under.
   Tone is meaning, not decoration — orange totals, green day, blue night, red late.
   From src/components/StatCard.jsx + MonthStats.css. */
const TONE = {
  orange: 'var(--tone-orange)',
  green: 'var(--tone-green)',
  blue: 'var(--tone-blue)',
  red: 'var(--tone-red)',
  none: 'var(--muted)'
};
const FILL = {
  orange: 'var(--tone-orange-fill, var(--sw-slate-900))',
  green: 'var(--tone-green-fill, var(--sw-slate-900))',
  blue: 'var(--tone-blue-fill, var(--sw-slate-900))',
  red: 'var(--tone-red-fill, var(--sw-slate-900))',
  none: 'var(--sw-slate-900)'
};
function StatCard({
  title,
  value,
  tone = 'none',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.3rem',
      minWidth: 0,
      background: FILL[tone],
      border: '1px solid var(--sw-slate-700)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--card-shadow)',
      padding: '0.85rem 0.5rem',
      textAlign: 'center',
      transition: 'var(--transition-surface)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: TONE[tone],
      maxWidth: '100%',
      overflowWrap: 'anywhere'
    }
  }, title, ":"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-value)',
      fontWeight: 'var(--weight-heavy)',
      fontSize: 'var(--text-4xl)',
      lineHeight: 'var(--leading-tight)',
      fontVariantNumeric: 'var(--numeric)',
      maxWidth: '100%',
      overflowWrap: 'anywhere'
    }
  }, value));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatTile.jsx
try { (() => {
/* Compact summary tile (.stat in src/styles.css): uppercase muted label under a
   1.25rem value. Used in the period summary grid, not in the month block. */
const VALUE_COLOR = {
  default: 'var(--text)',
  total: 'var(--accent)',
  pay: 'var(--green)',
  negative: 'var(--danger)'
};
const BORDER = {
  default: 'var(--border)',
  total: 'var(--accent)',
  pay: 'var(--green)',
  negative: 'var(--border)'
};
function StatTile({
  label,
  value,
  variant = 'default',
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.15rem',
      background: 'var(--panel-2)',
      border: '1px solid ' + BORDER[variant],
      borderRadius: 'var(--radius-md)',
      padding: '0.7rem 0.85rem',
      boxShadow: 'var(--card-shadow)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xl)',
      fontWeight: 'var(--weight-bold)',
      lineHeight: 'var(--leading-tight)',
      color: VALUE_COLOR[variant],
      fontVariantNumeric: 'var(--numeric)'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, label));
}
Object.assign(__ds_scope, { StatTile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatTile.jsx", error: String((e && e.message) || e) }); }

// components/data/TimesheetTable.jsx
try { (() => {
/* Excel-shaped read-only view — the metaphor users already know from the roster
   taped to the wall. 0.72rem, hairline grid, sticky header, right-aligned tabular
   money, bold footer totals. From src/components/TimesheetTable.jsx. */
const money = (n, locale = 'vi-VN') => new Intl.NumberFormat(locale).format(Math.round(n || 0));
const hours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
function TimesheetTable({
  rows = [],
  totalHours,
  totalPay,
  currencyLocale = 'vi-VN',
  style
}) {
  const cell = {
    border: '1px solid var(--border)',
    padding: '0.18rem 0.3rem',
    textAlign: 'left',
    whiteSpace: 'nowrap'
  };
  const payCell = {
    ...cell,
    textAlign: 'right',
    fontVariantNumeric: 'var(--numeric)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontSize: 'var(--text-xs)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      ...cell,
      position: 'sticky',
      top: 0,
      background: 'var(--panel)',
      color: 'var(--muted)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Date"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...cell,
      position: 'sticky',
      top: 0,
      background: 'var(--panel)',
      color: 'var(--muted)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Actual (in\u2013out)"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...payCell,
      position: 'sticky',
      top: 0,
      background: 'var(--panel)',
      color: 'var(--muted)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Pay"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: r.id != null ? r.id : i,
    style: i % 2 === 1 ? {
      background: 'rgba(255,255,255,0.03)'
    } : null
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      fontVariantNumeric: 'var(--numeric)'
    }
  }, r.date), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      fontVariantNumeric: 'var(--numeric)'
    }
  }, r.start, "\u2013", r.end || '—'), /*#__PURE__*/React.createElement("td", {
    style: payCell
  }, money(r.pay, currencyLocale))))), /*#__PURE__*/React.createElement("tfoot", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      background: 'var(--panel-2)',
      fontWeight: 'var(--weight-bold)'
    }
  }, "Total"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      background: 'var(--panel-2)',
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, hours(totalHours), " h"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...payCell,
      background: 'var(--panel-2)',
      fontWeight: 'var(--weight-bold)'
    }
  }, money(totalPay, currencyLocale))))));
}
Object.assign(__ds_scope, { TimesheetTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/TimesheetTable.jsx", error: String((e && e.message) || e) }); }

// components/feedback/EmptyState.jsx
try { (() => {
/* Empty states state the next action in one sentence. No illustration, no mascot,
   no "Let's get started!". From src/styles.css .empty. */
function EmptyState({
  children,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--muted)',
      textAlign: 'center',
      padding: '2rem',
      fontSize: 'var(--text-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.85rem',
      ...style
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, children), action);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Loader.jsx
try { (() => {
/* Full-screen boot loader: a bouncing cyan ball with its shadow, plus a plain
   label. The only "personality" animation in the product. From
   src/components/Loader.jsx + Loader.css. */
function Loader({
  label = 'Loading…',
  overlay = false,
  style
}) {
  const inner = /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1.2rem',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 148,
      height: 100
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 0,
      left: '50%',
      marginLeft: '-0.5em',
      width: '1em',
      height: '1em',
      borderRadius: '50%',
      backgroundColor: 'var(--loader-ball)',
      animation: 'sw-ball 1.2s infinite cubic-bezier(0.3,0.06,0.4,1)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: '50%',
      marginLeft: '-0.5em',
      width: '1em',
      height: '0.25em',
      borderRadius: '50%',
      backgroundColor: 'var(--loader-ball)',
      opacity: 0.3,
      animation: 'sw-shadow 1.2s infinite cubic-bezier(0.3,0.06,0.4,1)'
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-md)',
      color: 'var(--muted)',
      letterSpacing: '0.02em'
    }
  }, label));
  if (!overlay) return inner;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10,25,41,0.85)',
      zIndex: 9999
    }
  }, inner);
}
Object.assign(__ds_scope, { Loader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Loader.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Message.jsx
try { (() => {
/* Inline form message: 0.85rem, no icon, no box — danger red for errors, accent
   blue for information. From src/styles.css .msg.error / .msg.info. */
function Message({
  tone = 'error',
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0.75rem 0 0',
      fontSize: 'var(--text-base)',
      color: tone === 'error' ? 'var(--danger)' : 'var(--accent)',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Message });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Message.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
/* Scrim + centred card, 360px (480 wide), scrolls inside itself on small screens.
   Header is title + × ; actions sit at the bottom of the content, not in a
   sticky bar. From src/styles.css .modal-overlay/.modal-card and ConfirmModal. */
function Modal({
  title,
  children,
  onClose,
  width = 'default',
  footer,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      background: 'var(--surface-overlay)',
      display: 'grid',
      placeItems: 'safe center',
      padding: '1rem',
      overflowY: 'auto',
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    role: "dialog",
    "aria-modal": "true",
    style: {
      background: 'var(--card-bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: 'var(--card-border)',
      borderRadius: 'var(--card-radius)',
      boxShadow: 'var(--card-shadow)',
      backdropFilter: 'var(--card-blur)',
      WebkitBackdropFilter: 'var(--card-blur)',
      padding: '1.5rem',
      width: '100%',
      maxWidth: width === 'wide' ? 'var(--modal-max-width-wide)' : 'var(--modal-max-width)',
      maxHeight: 'calc(100dvh - 2rem)',
      overflowY: 'auto',
      color: 'var(--text)',
      ...style
    }
  }, (title || onClose) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '1rem'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-bold)'
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Close",
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--muted)',
      fontSize: '1.35rem',
      lineHeight: 1,
      cursor: 'pointer',
      padding: '0.1rem 0.3rem'
    }
  }, "\xD7")), children, footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.5rem',
      marginTop: '1.25rem'
    }
  }, footer)));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressButton.jsx
try { (() => {
/* Progress indicator shaped like a button (it is disabled — it reports, it does not
   act). Accent fill sweeps to the percentage, a 3px bar tracks it at the bottom,
   and completion turns green. Indeterminate mode hides the number and sweeps.
   From src/components/ProgressButton.jsx + ProgressButton.css. */
function ProgressButton({
  value = 0,
  label,
  indeterminate = false,
  style
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const done = !indeterminate && pct >= 100;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: true,
    role: "status",
    "aria-live": "polite",
    "aria-valuenow": indeterminate ? undefined : pct,
    style: {
      position: 'relative',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 220,
      padding: '0.7rem 1.25rem',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--progress-track)',
      backgroundImage: 'var(--card-bg-image)',
      color: 'var(--text)',
      font: 'inherit',
      fontSize: 'var(--text-md)',
      fontWeight: 'var(--weight-semibold)',
      cursor: 'default',
      opacity: 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      width: (indeterminate ? 45 : pct) + '%',
      background: done ? 'color-mix(in srgb, var(--green) 28%, transparent)' : 'var(--progress-fill)',
      transition: 'width var(--duration-progress) var(--ease-standard)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      lineHeight: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      fontSize: '1rem',
      color: done ? 'var(--green)' : 'inherit'
    }
  }, done ? '✓' : '⟳'), label && /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, label), !indeterminate && !done && /*#__PURE__*/React.createElement("span", {
    style: {
      fontVariantNumeric: 'var(--numeric)',
      opacity: 0.95
    }
  }, pct, "%")), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: 3,
      width: (indeterminate ? 45 : pct) + '%',
      background: done ? 'var(--green)' : 'var(--progress-bar)',
      transition: 'width var(--duration-progress) var(--ease-standard)'
    }
  }));
}
Object.assign(__ds_scope, { ProgressButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Skeleton.jsx
try { (() => {
/* Placeholder block with a slow sheen. Loading here is about NOT moving the
   layout: skeletons copy the exact shape of the content that is about to land,
   and they only appear on the first load of a screen. From
   src/components/Skeleton.jsx + Skeleton.css. */
function Skeleton({
  variant = 'block',
  width = '100%',
  height,
  lines = 1,
  size = 40,
  radius,
  style
}) {
  const base = {
    display: 'block',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'var(--skeleton-base)',
    borderRadius: radius != null ? radius : 'var(--radius-sm)',
    lineHeight: 1
  };
  const sheen = /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, transparent, var(--skeleton-sheen), transparent)',
      animation: 'sw-skeleton-shimmer var(--shimmer-duration) ease-in-out infinite'
    }
  });
  if (variant === 'circle') {
    return /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        ...base,
        width: size,
        height: size,
        borderRadius: '50%',
        flex: 'none',
        ...style
      }
    }, sheen);
  }
  if (variant === 'text' && lines > 1) {
    return /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5em',
        ...style
      }
    }, Array.from({
      length: lines
    }, (_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        ...base,
        height: '0.85em',
        borderRadius: 'var(--radius-xs)',
        width: i === lines - 1 ? '60%' : width
      }
    }, sheen)));
  }
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      ...base,
      width,
      height: variant === 'text' ? '0.85em' : height,
      borderRadius: variant === 'text' ? 'var(--radius-xs)' : base.borderRadius,
      ...style
    }
  }, sheen);
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Buttons in Salary-Working are flat, 8px, semibold, full-bleed inside forms.
   Variants are lifted 1:1 from src/styles.css — do not invent new ones.
     primary   button[type=submit] / .btn-addshift — the blue gradient action
     received  .btn-received — animated blue/black, ONLY on payday
     save      .btn-save (accent) / cancel .btn-cancel (danger) — inline row edit
     link      .link — text button (Forgot password, mode switch)
     filter    .shift-filter-btn — chip, use FilterTabs for the group */
const BASE = {
  font: 'inherit',
  fontWeight: 'var(--weight-semibold)',
  cursor: 'pointer',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-on-accent)',
  transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), opacity var(--duration-base) var(--ease-standard)'
};
const VARIANTS = {
  primary: {
    background: 'linear-gradient(135deg, var(--sw-blue-500), var(--sw-blue-700))',
    padding: '0.7rem 1rem'
  },
  received: {
    background: 'linear-gradient(270deg, #38a0ff, #0a1d38, #1273e6, #0a1d38)',
    backgroundSize: '300% 300%',
    boxShadow: 'var(--shadow-received-glow)',
    padding: '0.7rem 1rem'
  },
  save: {
    background: 'var(--accent)',
    borderRadius: 'var(--radius-xs)',
    padding: '0.4rem 0.9rem'
  },
  cancel: {
    background: 'var(--danger)',
    borderRadius: 'var(--radius-xs)',
    padding: '0.4rem 0.9rem'
  },
  link: {
    background: 'none',
    color: 'var(--accent)',
    padding: 0,
    fontWeight: 'var(--weight-regular)',
    fontSize: 'var(--text-base)'
  },
  filter: {
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '0.4rem 0.85rem',
    fontSize: 'var(--text-base)'
  }
};
function Button({
  variant = 'primary',
  children,
  fullWidth = false,
  active = false,
  disabled = false,
  style,
  ...rest
}) {
  const activeStyle = variant === 'filter' && active ? {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: 'var(--text-on-accent)'
  } : null;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    style: {
      ...BASE,
      ...VARIANTS[variant],
      ...activeStyle,
      ...(fullWidth ? {
        width: '100%'
      } : null),
      ...(disabled ? {
        opacity: variant === 'primary' || variant === 'received' ? 0.45 : 0.6,
        cursor: 'default'
      } : null),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Hidden native input (still tabbable) + drawn 20px box. Ticked = accent fill and
   a white check that scales in over 0.2s. Ported from src/components/Checkbox.jsx
   (.ui-check in src/styles.css). */
function Checkbox({
  checked = false,
  onChange,
  label = null,
  disabled = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: 'var(--text-base)',
      color: 'var(--text)',
      cursor: disabled ? 'default' : 'pointer',
      ...style
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: 'absolute',
      width: 1,
      height: 1,
      opacity: 0,
      margin: 0,
      padding: 0,
      border: 0
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flex: '0 0 auto',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-xs)',
      border: '1px solid ' + (checked ? 'var(--accent)' : 'var(--border)'),
      background: checked ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 8%, transparent)',
      opacity: disabled ? 0.45 : 1,
      transition: 'background var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    style: {
      width: 13,
      height: 13,
      fill: 'none',
      stroke: 'var(--text-on-accent)',
      strokeWidth: 3.4,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: checked ? 1 : 0,
      transform: checked ? 'scale(1)' : 'scale(0.6)',
      transition: 'opacity var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "20 6 9 17 4 12"
  }))), label != null && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/SearchInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Timesheet search: magnifier on the left, clear × on the right, raised surface so
   it matches the filter chips beside it. From src/components/Timesheet.jsx. */
function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search shifts: date, time…',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: '1 1 15rem',
      minWidth: '11rem',
      display: 'flex',
      alignItems: 'center',
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: '0.72rem',
      width: '1rem',
      height: '1rem',
      color: 'var(--muted)',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "21",
    x2: "16.65",
    y2: "16.65"
  })), /*#__PURE__*/React.createElement("input", _extends({
    type: "text",
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    style: {
      font: 'inherit',
      width: '100%',
      padding: '0.5rem 2.1rem 0.5rem 2.25rem',
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-md)',
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--input-shadow)',
      color: 'var(--text)'
    }
  }, rest)), value !== '' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClear,
    "aria-label": "Clear search",
    style: {
      position: 'absolute',
      right: '0.4rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1.5rem',
      height: '1.5rem',
      padding: 0,
      border: 'none',
      background: 'transparent',
      color: 'var(--muted)',
      fontSize: '1.3rem',
      lineHeight: 1,
      borderRadius: '50%',
      cursor: 'pointer'
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { SearchInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SearchInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Label above, input below, 0.35rem apart — the app's only field pattern
   (src/styles.css `label`). Label is muted 0.85rem; the input takes the page
   background so it reads as a well, not a card. */
function TextField({
  label,
  type = 'text',
  value,
  onChange,
  hint,
  error,
  numeric = false,
  style,
  inputStyle,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      fontSize: 'var(--text-base)',
      color: 'var(--muted)',
      minWidth: 0,
      ...style
    }
  }, label, /*#__PURE__*/React.createElement("input", _extends({
    type: type,
    value: value,
    onChange: onChange,
    style: {
      font: 'inherit',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
      background: 'var(--input-bg)',
      border: error ? '1px solid var(--danger)' : 'var(--input-border)',
      boxShadow: 'var(--input-shadow)',
      borderRadius: 'var(--input-radius)',
      padding: '0.6rem',
      color: 'var(--text)',
      fontVariantNumeric: numeric ? 'var(--numeric)' : 'normal',
      transition: 'var(--transition-surface)',
      ...inputStyle
    }
  }, rest)), (error || hint) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      color: error ? 'var(--danger)' : 'var(--muted)'
    }
  }, error || hint));
}
Object.assign(__ds_scope, { TextField });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/forms/TimeInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* 24-hour text field. Deliberately NOT type="time": the browser/OS would render
   AM/PM for some locales, and this product's users read rosters in 24h. Value is
   always "HH:MM"; typing is masked, blur normalises. Ported from
   src/components/TimeInput.jsx. */
const pad = n => String(n).padStart(2, '0');
function maskTyping(raw) {
  const d = raw.replace(/\D/g, '').slice(0, 4);
  if (d.length === 0) return '';
  if (d.length === 1) return d;
  const hourLen = parseInt(d.slice(0, 2), 10) > 23 ? 1 : 2;
  const h = d.slice(0, hourLen);
  const m = d.slice(hourLen, hourLen + 2);
  return m.length === 0 ? h : h + ':' + m;
}
function normalize(value) {
  if (!value) return '';
  const [hRaw, mRaw] = value.split(':');
  const h = Math.min(23, parseInt(hRaw, 10) || 0);
  const m = Math.min(59, parseInt(mRaw, 10) || 0);
  return pad(h) + ':' + pad(m);
}
const KIND = {
  actual: {
    color: 'var(--text)',
    borderColor: 'var(--border)'
  },
  in: {
    color: 'var(--time-in)',
    borderColor: 'var(--time-in)',
    fontWeight: 'var(--weight-semibold)'
  },
  out: {
    color: 'var(--time-out)',
    borderColor: 'var(--time-out)',
    fontWeight: 'var(--weight-semibold)'
  },
  scheduled: {
    color: 'var(--time-scheduled)',
    borderColor: 'var(--border)',
    borderStyle: 'dashed',
    fontWeight: 'var(--weight-semibold)'
  }
};
function TimeInput({
  value = '',
  onChange,
  kind = 'actual',
  label,
  style,
  ...rest
}) {
  const field = /*#__PURE__*/React.createElement("input", _extends({
    type: "text",
    inputMode: "numeric",
    placeholder: "HH:MM",
    maxLength: 5,
    pattern: "([01][0-9]|2[0-3]):[0-5][0-9]",
    value: value,
    onChange: e => onChange && onChange(maskTyping(e.target.value)),
    onBlur: e => onChange && onChange(normalize(e.target.value)),
    style: {
      font: 'inherit',
      width: '5rem',
      textAlign: 'center',
      fontVariantNumeric: 'var(--numeric)',
      background: 'var(--input-bg)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--input-shadow)',
      borderRadius: 'var(--radius-xs)',
      padding: '0.4rem',
      ...KIND[kind],
      ...style
    }
  }, rest));
  if (!label) return field;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.15rem',
      fontSize: 'var(--text-2xs)',
      color: 'var(--muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), field);
}
Object.assign(__ds_scope, { TimeInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TimeInput.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Dock.jsx
try { (() => {
/* macOS-style dock, fixed to the bottom centre — the app's only navigation. Thumb
   reach is the whole point: 44px targets, pill surface, icons magnify toward the
   pointer/finger, labels sit permanently under the icons on touch devices. The
   real dock auto-hides 5s after scrolling stops. From src/components/NavBar.jsx +
   NavBar.css. */
const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};
const DOCK_ICONS = {
  payPeriod: /*#__PURE__*/React.createElement("svg", ICON_PROPS, /*#__PURE__*/React.createElement("path", {
    d: "M8 2v4M16 2v4M3 10h18"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"
  })),
  tools: /*#__PURE__*/React.createElement("svg", ICON_PROPS, /*#__PURE__*/React.createElement("path", {
    d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
  })),
  account: /*#__PURE__*/React.createElement("svg", ICON_PROPS, /*#__PURE__*/React.createElement("path", {
    d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "4"
  })),
  guide: /*#__PURE__*/React.createElement("svg", ICON_PROPS, /*#__PURE__*/React.createElement("path", {
    d: "M12 7v14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"
  }))
};
function Dock({
  items = [],
  active = 0,
  onSelect,
  fixed = true,
  showLabels = true,
  style
}) {
  const [hover, setHover] = React.useState(null);
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Main",
    style: {
      ...(fixed ? {
        position: 'fixed',
        left: '50%',
        bottom: 0,
        transform: 'translateX(-50%)'
      } : null),
      width: 'max-content',
      maxWidth: 'calc(100vw - 24px)',
      paddingBottom: fixed ? 'max(14px, env(safe-area-inset-bottom))' : 0,
      zIndex: 45,
      ...style
    }
  }, /*#__PURE__*/React.createElement("ul", {
    onMouseLeave: () => setHover(null),
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
      margin: 0,
      padding: '6px 22px',
      listStyle: 'none',
      background: 'linear-gradient(var(--panel), var(--panel)), var(--bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-pill)',
      boxShadow: 'var(--shadow-dock)'
    }
  }, items.map((item, i) => {
    const isActive = active === i;
    const scale = hover === i ? 1.6 : hover != null && Math.abs(hover - i) === 1 ? 1.3 : 1;
    return /*#__PURE__*/React.createElement("li", {
      key: item.key || i,
      style: {
        position: 'relative',
        listStyle: 'none'
      },
      onMouseEnter: () => setHover(i)
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onSelect && onSelect(i),
      title: item.label,
      "aria-current": isActive ? 'page' : undefined,
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        minWidth: 44,
        background: 'none',
        border: 'none',
        padding: '0 6px',
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        color: isActive ? 'var(--accent)' : 'var(--text)',
        transform: 'scale(' + scale + ') translateY(' + (scale - 1) * -14 + 'px)',
        transformOrigin: 'bottom center',
        transition: 'transform var(--duration-fast) var(--ease-out), color var(--duration-base) var(--ease-standard)'
      }
    }, item.avatarUrl || item.initials ? /*#__PURE__*/React.createElement(__ds_scope.Avatar, {
      src: item.avatarUrl,
      name: item.initials,
      size: 26,
      active: isActive,
      alt: item.label
    }) : item.icon && DOCK_ICONS[item.icon] ? DOCK_ICONS[item.icon] : item.icon), showLabels && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 'var(--text-2xs)',
        fontWeight: 'var(--weight-semibold)',
        color: isActive ? 'var(--accent)' : 'var(--muted)',
        whiteSpace: 'nowrap'
      }
    }, item.label)));
  })));
}
Object.assign(__ds_scope, { DOCK_ICONS, Dock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Dock.jsx", error: String((e && e.message) || e) }); }

// components/navigation/FilterTabs.jsx
try { (() => {
/* Chip row that narrows the shift list (All / Day shifts / Night shifts) or picks a
   week in the period timesheet. Selected chip fills with accent. From
   src/styles.css .shift-filter. */
function FilterTabs({
  options = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.4rem',
      ...style
    }
  }, options.map(opt => {
    const val = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    const active = val === value;
    return /*#__PURE__*/React.createElement("button", {
      key: val,
      type: "button",
      onClick: () => onChange && onChange(val),
      style: {
        font: 'inherit',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-semibold)',
        padding: '0.4rem 0.85rem',
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        background: active ? 'var(--accent)' : 'var(--panel-2)',
        border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border)'),
        color: active ? 'var(--text-on-accent)' : 'var(--text)',
        transition: 'var(--transition-surface)'
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { FilterTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/FilterTabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Flag.jsx
try { (() => {
/* Country flags drawn as SVG, not emoji — Windows does not render flag emoji at
   all, and the product must show the same mark on every device. Geometry copied
   verbatim from src/components/LangToggle.jsx: VN, GB, US, AU (the Australian
   canton and Southern Cross are simplified to dots at this size, as upstream). */
const FlagVN = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
  width: "30",
  height: "20",
  fill: "#DA251D"
}), /*#__PURE__*/React.createElement("path", {
  fill: "#FFFF00",
  d: "M15 4l1.76 5.42h5.7l-4.61 3.35 1.76 5.42L15 14.84l-4.61 3.35 1.76-5.42-4.61-3.35h5.7z"
}));
const FlagGB = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
  d: "M0 0v30h60V0z",
  fill: "#012169"
}), /*#__PURE__*/React.createElement("path", {
  d: "M0 0l60 30m0-30L0 30",
  stroke: "#fff",
  strokeWidth: "6"
}), /*#__PURE__*/React.createElement("path", {
  d: "M30 0v30M0 15h60",
  stroke: "#fff",
  strokeWidth: "10"
}), /*#__PURE__*/React.createElement("path", {
  d: "M30 0v30M0 15h60",
  stroke: "#C8102E",
  strokeWidth: "6"
}));
const US_H = 20 / 13;
const FlagUS = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
  width: "38",
  height: "20",
  fill: "#B22234"
}), [1, 3, 5, 7, 9, 11].map(i => /*#__PURE__*/React.createElement("rect", {
  key: i,
  x: "0",
  y: i * US_H,
  width: "38",
  height: US_H,
  fill: "#fff"
})), /*#__PURE__*/React.createElement("rect", {
  width: "16",
  height: US_H * 7,
  fill: "#3C3B6E"
}));
const FlagAU = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
  width: "60",
  height: "30",
  fill: "#012169"
}), /*#__PURE__*/React.createElement("path", {
  d: "M0 0L30 15M30 0L0 15",
  stroke: "#fff",
  strokeWidth: "3"
}), /*#__PURE__*/React.createElement("path", {
  d: "M15 0V15M0 7.5H30",
  stroke: "#fff",
  strokeWidth: "5"
}), /*#__PURE__*/React.createElement("path", {
  d: "M15 0V15M0 7.5H30",
  stroke: "#C8102E",
  strokeWidth: "3"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "15",
  cy: "23",
  r: "3",
  fill: "#fff"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "45",
  cy: "7",
  r: "1.6",
  fill: "#fff"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "52",
  cy: "14",
  r: "1.6",
  fill: "#fff"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "45",
  cy: "21",
  r: "1.6",
  fill: "#fff"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "38",
  cy: "14",
  r: "1.6",
  fill: "#fff"
}), /*#__PURE__*/React.createElement("circle", {
  cx: "46",
  cy: "14",
  r: "1",
  fill: "#fff"
}));
const FLAG_ART = {
  vi: FlagVN,
  en: FlagGB,
  us: FlagUS,
  au: FlagAU
};
const VIEWBOX = {
  vi: '0 0 30 20',
  en: '0 0 60 30',
  us: '0 0 38 20',
  au: '0 0 60 30'
};
const LANG_NAMES = {
  vi: 'Tiếng Việt',
  en: 'English (UK)',
  us: 'English (US)',
  au: 'English (AU)'
};
const LANG_CURRENCY = {
  vi: '₫',
  en: '£',
  us: '$',
  au: 'A$'
};
function Flag({
  code = 'en',
  width = 20,
  style
}) {
  const art = FLAG_ART[code] || FlagGB;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: VIEWBOX[code] || VIEWBOX.en,
    width: width,
    "aria-hidden": "true",
    style: {
      display: 'block',
      flex: 'none',
      height: 'auto',
      borderRadius: 2,
      border: '1px solid rgba(127,127,127,0.35)',
      ...style
    }
  }, art);
}
const LANGUAGES = ['vi', 'en', 'us', 'au'];
Object.assign(__ds_scope, { Flag, LANGUAGES, LANG_NAMES, LANG_CURRENCY });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Flag.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ThemeCycle.jsx
try { (() => {
/* One-knob cycler used for both the theme (dark → glass → neumorph) and the
   language (vi → en → us → au): swatch/flag + the name, tap to advance. Theme
   names are always in English, whatever the app language. From
   src/components/ThemeToggle.jsx / LangCycle.jsx. */
const SWATCH = {
  dark: {
    background: 'linear-gradient(135deg, #14293c, #0a1929)'
  },
  glass: {
    background: 'linear-gradient(135deg, #a855f7, #22d3ee 55%, #ec4899)'
  },
  neumorph: {
    background: '#e0e5ec',
    boxShadow: 'inset 2px 2px 3px #bcc3ce, inset -2px -2px 3px #ffffff'
  }
};
const THEME_NAMES = {
  dark: 'Sleek Dark',
  glass: 'Glassmorphism',
  neumorph: 'Soft UI'
};
function ThemeCycle({
  value = 'dark',
  onChange,
  order = ['dark', 'glass', 'neumorph'],
  label,
  swatch,
  icon,
  showLabel = true,
  style
}) {
  const next = () => onChange && onChange(order[(order.indexOf(value) + 1) % order.length]);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: next,
    title: label || THEME_NAMES[value] || value,
    "aria-label": label || THEME_NAMES[value] || value,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      font: 'inherit',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text)',
      background: 'var(--panel-2)',
      backgroundImage: 'var(--card-bg-image)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--button-shadow)',
      padding: showLabel ? '0.4rem 0.7rem' : '0.4rem',
      cursor: 'pointer',
      ...style
    }
  }, icon || /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-block',
      width: 20,
      height: 20,
      borderRadius: 'var(--radius-xs)',
      border: '1px solid rgba(127,127,127,0.3)',
      flex: 'none',
      ...(swatch || SWATCH[value] || null)
    }
  }), showLabel && /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap'
    }
  }, label || THEME_NAMES[value] || value));
}
Object.assign(__ds_scope, { ThemeCycle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ThemeCycle.jsx", error: String((e && e.message) || e) }); }

// ui_kits/salaryworking-app/kit-app.jsx
try { (() => {
/* App shell: content column (max 980px, 7rem bottom clearance for the dock), the
   dock itself, and the floating assistant button. Theme / language / text-size are
   applied to the root element exactly as src/lib/theme.js + appearance.js do. */
const NS_A = window.SalaryWorkingDesignSystem_f6e8d6;
function App() {
  const {
    Dock,
    ThemeCycle,
    Flag
  } = NS_A;
  const THEME_LABEL = {
    dark: 'Sleek Dark',
    glass: 'Glassmorphism',
    neumorph: 'Soft UI'
  };
  const THEME_SWATCH = {
    dark: {
      background: 'linear-gradient(135deg, #23272c 55%, #6aa9c9 55%)'
    }
  };
  const [signedIn, setSignedIn] = React.useState(false);
  const [view, setView] = React.useState('board');
  const [overlay, setOverlay] = React.useState(null);
  const [chat, setChat] = React.useState(false);
  const [lang, setLang] = React.useState('en');
  const [theme, setTheme] = React.useState('dark');
  const [fontScale, setFontScale] = React.useState('md');
  const [shifts, setShifts] = React.useState(SHIFTS);
  const [avatar, setAvatar] = React.useState(null);
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font', fontScale);
  }, [theme, fontScale]);
  const schedByDate = new Map(shifts.filter(s => s.scheduled_start).map(s => [s.work_date, {
    start: s.scheduled_start,
    end: s.scheduled_end
  }]));
  const stats = periodStats(shifts);
  const dedTotal = DEDUCTIONS.reduce((a, d) => a + d.amount, 0);
  function addShift(data) {
    setShifts(list => [{
      id: Date.now(),
      ...data
    }, ...list.filter(s => !(s.work_date === data.work_date && !s.start_time))].sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))));
  }
  function importWeek() {
    setShifts(list => [...IMPORT_ROWS.filter(r => !r.off).map((r, i) => ({
      id: 900 + i,
      work_date: r.date,
      scheduled_start: r.in,
      scheduled_end: r.out
    })), ...list].sort((a, b) => String(b.work_date).localeCompare(String(a.work_date))));
    setOverlay(null);
  }
  if (!signedIn) {
    return /*#__PURE__*/React.createElement(LoginScreen, {
      lang: lang,
      onLang: setLang,
      theme: theme,
      onTheme: setTheme,
      onSignIn: () => setSignedIn(true)
    });
  }
  const dockItems = [{
    key: 'period',
    label: tr(lang, 'payPeriod'),
    icon: 'payPeriod'
  }, {
    key: 'tools',
    label: tr(lang, 'tools'),
    icon: 'tools'
  }, {
    key: 'account',
    label: tr(lang, 'account'),
    icon: 'account',
    avatarUrl: avatar,
    initials: avatar ? undefined : PROFILE.name
  }, {
    key: 'guide',
    label: tr(lang, 'guide'),
    icon: 'guide'
  }];
  const activeIndex = view === 'period' ? 0 : ['tools', 'import', 'reconcile', 'deductions', 'extra'].includes(overlay) ? 1 : overlay === 'account' ? 2 : overlay === 'guide' ? 3 : -1;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minHeight: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 'var(--app-max-width)',
      margin: '0 auto',
      padding: '1.5rem 1rem 7rem'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.75rem',
      marginBottom: '1.25rem'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setView('board'),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      background: 'none',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      color: 'var(--text)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: window.__resources && window.__resources.logoMark || '../../assets/logo/a-bangkep-icon-light.svg',
    alt: "",
    width: "28",
    height: "28"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-lg)',
      letterSpacing: '0.01em'
    }
  }, "Salary Working")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--muted)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, view === 'board' ? '26/7 → 25/8 · payday day ' + PROFILE.payday : tr(lang, 'payPeriod')), /*#__PURE__*/React.createElement(ThemeCycle, {
    value: lang,
    order: ['vi', 'en', 'us', 'au'],
    label: {
      vi: 'Tiếng Việt',
      en: 'English (UK)',
      us: 'English (US)',
      au: 'English (AU)'
    }[lang],
    onChange: setLang,
    icon: Flag ? /*#__PURE__*/React.createElement(Flag, {
      code: lang
    }) : null,
    showLabel: false
  }), /*#__PURE__*/React.createElement(ThemeCycle, {
    value: theme,
    onChange: setTheme,
    order: ['dark', 'glass', 'neumorph'],
    label: THEME_LABEL[theme],
    swatch: THEME_SWATCH[theme],
    showLabel: false
  }))), view === 'board' ? /*#__PURE__*/React.createElement(BoardScreen, {
    lang: lang,
    shifts: shifts,
    stats: stats,
    deductionTotal: dedTotal,
    schedByDate: schedByDate,
    onAdd: addShift,
    onDelete: id => setShifts(l => l.filter(s => s.id !== id))
  }) : /*#__PURE__*/React.createElement(PayPeriodScreen, {
    lang: lang,
    shifts: shifts,
    deductions: DEDUCTIONS,
    extraIncome: EXTRA_INCOME
  })), /*#__PURE__*/React.createElement(Dock, {
    items: dockItems,
    active: activeIndex,
    onSelect: i => {
      if (i === 0) {
        setView('period');
        setOverlay(null);
      } else if (i === 1) setOverlay('tools');else if (i === 2) setOverlay('account');else setOverlay('guide');
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setChat(!chat),
    "aria-label": "Salary assistant",
    style: {
      position: 'fixed',
      right: '1rem',
      bottom: '5.5rem',
      zIndex: 55,
      width: 52,
      height: 52,
      borderRadius: '50%',
      border: '1px solid var(--border)',
      background: 'var(--panel)',
      backgroundImage: 'var(--card-bg-image)',
      boxShadow: 'var(--shadow-dock)',
      color: 'var(--accent)',
      font: 'inherit',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-md)',
      cursor: 'pointer',
      display: chat ? 'none' : 'block'
    }
  }, "\u20AB?"), chat && /*#__PURE__*/React.createElement(SalaryChat, {
    lang: lang,
    onClose: () => setChat(false)
  }), overlay === 'tools' && /*#__PURE__*/React.createElement(ToolsSheet, {
    lang: lang,
    onClose: () => setOverlay(null),
    onImport: () => setOverlay('import'),
    onReconcile: () => setOverlay('reconcile'),
    onDeductions: () => setOverlay('deductions'),
    onExtra: () => setOverlay('extra')
  }), overlay === 'import' && /*#__PURE__*/React.createElement(ScheduleImportModal, {
    lang: lang,
    onClose: () => setOverlay(null),
    onCreate: importWeek
  }), overlay === 'reconcile' && /*#__PURE__*/React.createElement(ReconcileModal, {
    lang: lang,
    onClose: () => setOverlay(null)
  }), overlay === 'deductions' && /*#__PURE__*/React.createElement(DeductionsModal, {
    lang: lang,
    onClose: () => setOverlay(null)
  }), overlay === 'extra' && /*#__PURE__*/React.createElement(ExtraIncomeModal, {
    lang: lang,
    onClose: () => setOverlay(null)
  }), overlay === 'account' && /*#__PURE__*/React.createElement(AccountModal, {
    lang: lang,
    theme: theme,
    onTheme: setTheme,
    onLang: setLang,
    fontScale: fontScale,
    onFont: setFontScale,
    avatar: avatar,
    onAvatar: setAvatar,
    onClose: () => setOverlay(null),
    onSignOut: () => {
      setOverlay(null);
      setSignedIn(false);
    }
  }), overlay === 'guide' && /*#__PURE__*/React.createElement(GuideModal, {
    onClose: () => setOverlay(null)
  }));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/salaryworking-app/kit-app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/salaryworking-app/kit-data.jsx
try { (() => {
/* Fake data + the real pay maths, ported from src/lib/shiftMath.js and rates.js.
   Night window 22:00–06:00 (boundary counts as 100% night); end <= start means the
   shift ends the next day; a shift with a planned time is only paid for the
   INTERSECTION of plan and actual. Rates are per-profile, never hard-coded in UI. */
const RATES = {
  hourly: 25500,
  nightPct: 30,
  holidayDayPct: 200,
  holidayNightPct: 260
};
const NIGHT_START = 22 * 60;
const NIGHT_END = 6 * 60;
const dayRate = () => RATES.hourly;
const nightRate = () => Math.round(RATES.hourly * (1 + RATES.nightPct / 100));
const holidayDayRate = () => Math.round(RATES.hourly * (RATES.holidayDayPct / 100));
const holidayNightRate = () => Math.round(RATES.hourly * (RATES.holidayNightPct / 100));
function toMin(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function overlap(a1, a2, b1, b2) {
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}
// Night minutes inside [start, end) where end may exceed 1440 (crosses midnight).
function nightMinutes(start, end) {
  let n = 0;
  for (let day = 0; day <= 1; day++) {
    const off = day * 1440;
    n += overlap(start, end, off + NIGHT_START, off + 1440);
    n += overlap(start, end, off, off + NIGHT_END);
  }
  return n;
}
function span(startHHMM, endHHMM) {
  const s = toMin(startHHMM);
  let e = toMin(endHHMM);
  if (s == null || e == null) return null;
  if (e <= s) e += 1440;
  return [s, e];
}
function computeShift(startHHMM, endHHMM, isHoliday) {
  const sp = span(startHHMM, endHHMM);
  if (!sp) return {
    dayHours: 0,
    nightHours: 0,
    decimalHours: 0,
    pay: 0
  };
  const [s, e] = sp;
  const night = nightMinutes(s, e);
  const day = e - s - night;
  const dRate = isHoliday ? holidayDayRate() : dayRate();
  const nRate = isHoliday ? holidayNightRate() : nightRate();
  return {
    dayHours: day / 60,
    nightHours: night / 60,
    decimalHours: (e - s) / 60,
    pay: day / 60 * dRate + night / 60 * nRate
  };
}
// Paid = intersection of plan and actual. Early in / late out is never a bonus;
// late in / early out becomes "lost hours" the user can see.
function computeEffective(schedStart, schedEnd, start, end, isHoliday) {
  const actual = span(start, end);
  const plan = span(schedStart, schedEnd);
  if (!actual) return {
    dayHours: 0,
    nightHours: 0,
    decimalHours: 0,
    pay: 0,
    lostHours: 0,
    lostPay: 0,
    lateIn: 0,
    earlyOut: 0
  };
  if (!plan) return {
    ...computeShift(start, end, isHoliday),
    lostHours: 0,
    lostPay: 0,
    lateIn: 0,
    earlyOut: 0
  };
  const [ps, pe] = plan;
  const [as, ae] = actual;
  const from = Math.max(ps, as);
  const to = Math.min(pe, ae);
  const paidNight = to > from ? nightMinutes(from, to) : 0;
  const paidDay = to > from ? to - from - paidNight : 0;
  const dRate = isHoliday ? holidayDayRate() : dayRate();
  const nRate = isHoliday ? holidayNightRate() : nightRate();
  const ideal = computeShift(schedStart, schedEnd, isHoliday);
  const pay = paidDay / 60 * dRate + paidNight / 60 * nRate;
  const lateIn = Math.max(0, Math.min(as, pe) - ps) / 60;
  const earlyOut = Math.max(0, pe - Math.max(ae, ps)) / 60;
  return {
    dayHours: paidDay / 60,
    nightHours: paidNight / 60,
    decimalHours: (paidDay + paidNight) / 60,
    pay,
    idealPay: ideal.pay,
    lostHours: Math.max(0, ideal.decimalHours - (paidDay + paidNight) / 60),
    lostPay: Math.max(0, ideal.pay - pay),
    lateIn,
    earlyOut
  };
}
const LOCALES = {
  vi: 'vi-VN',
  en: 'en-GB',
  us: 'en-US',
  au: 'en-AU'
};
const SYMBOLS = {
  vi: '₫',
  en: '£',
  us: '$',
  au: 'A$'
};
const FX = {
  vi: 1,
  en: 1 / 31000,
  us: 1 / 25000,
  au: 1 / 16500
};
function fmtMoney(vnd, lang) {
  if (lang === 'vi') return new Intl.NumberFormat('vi-VN').format(Math.round(vnd || 0));
  const v = (vnd || 0) * FX[lang];
  return SYMBOLS[lang] + new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(v);
}
const fmtHours = n => (Math.round((n || 0) * 100) / 100).toFixed(2).replace(/\.00$/, '');
const fmtHours2 = n => (Math.round((n || 0) * 100) / 100).toFixed(2);
const dm = iso => {
  const [, m, d] = iso.split('-');
  return Number(d) + '/' + Number(m);
};
const PROFILE = {
  name: 'Lê Quang Thi',
  code: 'NV-2481',
  phone: '+84 901 234 567',
  payday: 5,
  hourly: 25500,
  nightPct: 30
};

// A real fortnight of a rotating roster: nights, days, a holiday, a late clock-in,
// a future planned shift, and one past day that was never clocked in.
const SHIFTS = [{
  id: 1,
  work_date: '2026-08-16',
  scheduled_start: '14:00',
  scheduled_end: '22:00'
}, {
  id: 2,
  work_date: '2026-08-15',
  scheduled_start: '14:00',
  scheduled_end: '22:00'
}, {
  id: 3,
  work_date: '2026-08-14',
  start_time: '21:52',
  end_time: '06:04',
  scheduled_start: '22:00',
  scheduled_end: '06:00'
}, {
  id: 4,
  work_date: '2026-08-13',
  start_time: '22:06',
  end_time: '06:02',
  scheduled_start: '22:00',
  scheduled_end: '06:00'
}, {
  id: 5,
  work_date: '2026-08-12',
  start_time: '22:00',
  end_time: '06:00',
  scheduled_start: '22:00',
  scheduled_end: '06:00'
}, {
  id: 6,
  work_date: '2026-08-11',
  scheduled_start: '22:00',
  scheduled_end: '06:00'
}, {
  id: 7,
  work_date: '2026-08-10',
  start_time: '06:00',
  end_time: '14:12',
  scheduled_start: '06:00',
  scheduled_end: '14:00'
}, {
  id: 8,
  work_date: '2026-08-09',
  start_time: '06:00',
  end_time: '14:00',
  scheduled_start: '06:00',
  scheduled_end: '14:00',
  is_holiday: true
}, {
  id: 9,
  work_date: '2026-08-08',
  start_time: '06:14',
  end_time: '13:48',
  scheduled_start: '06:00',
  scheduled_end: '14:00'
}, {
  id: 10,
  work_date: '2026-08-07',
  start_time: '14:00',
  end_time: '22:05',
  scheduled_start: '14:00',
  scheduled_end: '22:00'
}];
const DEDUCTIONS = [{
  id: 1,
  amount: 120000,
  reason: 'Late 3 times',
  deduct_date: '2026-08-10'
}, {
  id: 2,
  amount: 80000,
  reason: 'Broken tote',
  deduct_date: '2026-08-04'
}];
const EXTRA_INCOME = [{
  id: 1,
  date: '2026-08-09',
  desc: 'Phone repair, cousin',
  amount: 500000,
  received: true
}, {
  id: 2,
  date: '2026-08-13',
  desc: 'Sunday warehouse help',
  amount: 350000,
  received: false
}];
const TODAY = '2026-08-15';
function enrich(s) {
  const eff = computeEffective(s.scheduled_start, s.scheduled_end, s.start_time, s.end_time, !!s.is_holiday);
  const noActual = !s.start_time || !s.end_time;
  const state = noActual ? s.work_date > TODAY ? 'planned' : 'missing' : 'normal';
  return {
    ...s,
    eff,
    state,
    noActual
  };
}
function periodStats(list) {
  return list.reduce((acc, s) => {
    const e = enrich(s).eff;
    const kind = e.nightHours > 0 ? 'night' : 'day';
    return {
      hours: acc.hours + e.decimalHours,
      dayHours: acc.dayHours + e.dayHours,
      nightHours: acc.nightHours + e.nightHours,
      lostHours: acc.lostHours + (e.lostHours || 0),
      pay: acc.pay + e.pay,
      idealPay: acc.idealPay + (e.idealPay != null ? e.idealPay : e.pay),
      lostPay: acc.lostPay + (e.lostPay || 0),
      dayShiftCount: acc.dayShiftCount + (kind === 'day' && !enrich(s).noActual ? 1 : 0),
      nightShiftCount: acc.nightShiftCount + (kind === 'night' && !enrich(s).noActual ? 1 : 0)
    };
  }, {
    hours: 0,
    dayHours: 0,
    nightHours: 0,
    lostHours: 0,
    pay: 0,
    idealPay: 0,
    lostPay: 0,
    dayShiftCount: 0,
    nightShiftCount: 0
  });
}
const T = {
  en: {
    addShift: 'Add shift',
    adding: 'Adding…',
    date: 'Date',
    checkin: 'Check-in',
    checkout: 'Check-out',
    holiday: 'Holiday',
    salaryLabel: 'Salary this month:',
    expected: 'Expected',
    late: 'Late',
    compensation: 'Compensation',
    totalHours: 'Total Hours',
    dayHours: 'Day Hours',
    nightHours: 'Night Hours',
    lateHours: 'Late Hours',
    dayShifts: 'Day Shifts',
    nightShifts: 'Night Shifts',
    all: 'All',
    dayFilter: 'Day shifts',
    nightFilter: 'Night shifts',
    search: 'Search shifts: date, time…',
    emptyShifts: 'No shifts yet. Add your first one above.',
    payPeriod: 'Pay period',
    tools: 'Tools',
    account: 'Account',
    guide: 'Guide',
    scopeHint: 'Tap a period to see its charts and full timesheet.',
    allPeriods: 'All periods',
    receivedPeriods: 'Received periods',
    detail: 'Detailed timesheet',
    signIn: 'Sign in',
    signInSub: 'Sign in to your timesheet',
    email: 'Email',
    password: 'Password',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account? Sign up",
    importWeek: 'Import weekly schedule',
    deductions: 'Compensation',
    extra: 'Extra income',
    received: 'Salary received',
    currentShift: 'Current shift',
    lateIn: 'Late in',
    day: 'day',
    night: 'night',
    reconcile: 'Verify timesheet'
  },
  vi: {
    addShift: 'Thêm ca',
    adding: 'Đang thêm…',
    date: 'Ngày làm',
    checkin: 'Giờ vào',
    checkout: 'Giờ ra',
    holiday: 'Ngày lễ',
    salaryLabel: 'Lương tháng này:',
    expected: 'Dự kiến',
    late: 'Trễ',
    compensation: 'Tiền bồi thường',
    totalHours: 'Tổng Giờ',
    dayHours: 'Giờ Ngày',
    nightHours: 'Giờ Đêm',
    lateHours: 'Giờ Trễ',
    dayShifts: 'Ca Ngày',
    nightShifts: 'Ca Đêm',
    all: 'Tất cả',
    dayFilter: 'Ca ngày',
    nightFilter: 'Ca đêm',
    search: 'Tìm ca: ngày, giờ…',
    emptyShifts: 'Chưa có ca nào. Thêm ca đầu tiên ở trên.',
    payPeriod: 'Kỳ lương',
    tools: 'Công cụ',
    account: 'Tài khoản',
    guide: 'Hướng dẫn',
    scopeHint: 'Bấm vào một kỳ để xem biểu đồ và bảng công đầy đủ.',
    allPeriods: 'Tất cả các kỳ',
    receivedPeriods: 'Kỳ đã nhận lương',
    detail: 'Bảng công chi tiết',
    signIn: 'Đăng nhập',
    signInSub: 'Đăng nhập vào bảng công của bạn',
    email: 'Email',
    password: 'Mật khẩu',
    forgot: 'Quên mật khẩu?',
    noAccount: 'Chưa có tài khoản? Đăng ký',
    importWeek: 'Nhập lịch tuần',
    deductions: 'Tiền bồi thường',
    extra: 'Thu nhập việc ngoài',
    received: 'Đã nhận lương',
    currentShift: 'Ca đang nhập',
    lateIn: 'Vào trễ',
    day: 'ngày',
    night: 'đêm',
    reconcile: 'Đối chiếu công'
  }
};
const tr = (lang, key) => T[lang === 'vi' ? 'vi' : 'en'][key] || T.en[key] || key;
Object.assign(window, {
  RATES,
  computeShift,
  computeEffective,
  fmtMoney,
  fmtHours,
  fmtHours2,
  dm,
  enrich,
  periodStats,
  PROFILE,
  SHIFTS,
  DEDUCTIONS,
  EXTRA_INCOME,
  TODAY,
  tr,
  LOCALES,
  SYMBOLS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/salaryworking-app/kit-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/salaryworking-app/kit-period.jsx
try { (() => {
/* Pay period screen — period cards → charts popup → detailed timesheet popup.
   Donut is hand-drawn SVG with stroke-dasharray exactly as in
   src/components/PayPeriodPage.jsx; slices carry no labels, the legend does. */
const NS_P = window.SalaryWorkingDesignSystem_f6e8d6;
function Donut({
  segments,
  centerValue,
  centerLabel,
  size = 104,
  stroke = 18
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  let acc = 0;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: '0 0 ' + size + ' ' + size,
    style: {
      maxWidth: '100%',
      height: 'auto'
    }
  }, /*#__PURE__*/React.createElement("g", {
    transform: 'rotate(-90 ' + cx + ' ' + cx + ')'
  }, total > 0 ? segments.map(seg => {
    const len = seg.value / total * circ;
    const el = /*#__PURE__*/React.createElement("circle", {
      key: seg.label,
      cx: cx,
      cy: cx,
      r: r,
      fill: "none",
      stroke: seg.color,
      strokeWidth: stroke,
      strokeDasharray: len + ' ' + (circ - len),
      strokeDashoffset: -acc
    });
    acc += len;
    return el;
  }) : /*#__PURE__*/React.createElement("circle", {
    cx: cx,
    cy: cx,
    r: r,
    fill: "none",
    stroke: "var(--panel-2)",
    strokeWidth: stroke
  })), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cx,
    dy: "-2",
    textAnchor: "middle",
    dominantBaseline: "middle",
    style: {
      fill: 'var(--text)',
      fontSize: 14,
      fontWeight: 700
    }
  }, centerValue), /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cx,
    dy: "11",
    textAnchor: "middle",
    dominantBaseline: "middle",
    style: {
      fill: 'var(--muted)',
      fontSize: 9,
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }
  }, centerLabel));
}
function DonutBlock({
  title,
  segments,
  centerValue,
  centerLabel
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 1 150px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.78rem',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--muted)',
      marginBottom: '0.2rem'
    }
  }, title), /*#__PURE__*/React.createElement(Donut, {
    segments: segments,
    centerValue: centerValue,
    centerLabel: centerLabel
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.12rem',
      marginTop: '0.25rem',
      fontSize: '0.7rem',
      color: 'var(--muted)'
    }
  }, segments.map(s => /*#__PURE__*/React.createElement("span", {
    key: s.label,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '0.7rem',
      height: '0.7rem',
      borderRadius: 3,
      background: s.color,
      flex: '0 0 auto'
    }
  }), s.label, ": ", /*#__PURE__*/React.createElement("strong", {
    style: {
      fontVariantNumeric: 'var(--numeric)'
    }
  }, s.display)))));
}
function PayPeriodScreen({
  lang,
  shifts,
  deductions,
  extraIncome
}) {
  const {
    Modal,
    TimesheetTable,
    PeriodCard,
    FilterTabs,
    Button
  } = NS_P;
  const [scope, setScope] = React.useState(null);
  const [sheet, setSheet] = React.useState(false);
  const [week, setWeek] = React.useState('all');
  const periods = [{
    key: '2026-08',
    label: '26/7 → 25/8',
    range: '26/07 – 25/08',
    shifts: shifts
  }, {
    key: '2026-07',
    label: '26/6 → 25/7',
    range: '26/06 – 25/07',
    shifts: [],
    received: true,
    receivedOn: '03/08',
    pay: 7126500
  }];
  const dedTotal = deductions.reduce((a, d) => a + d.amount, 0);
  const extraTotal = extraIncome.filter(x => x.received).reduce((a, x) => a + x.amount, 0);
  const st = periodStats(shifts);
  const net = st.pay - dedTotal;
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) + '%' : '—';
  const money = v => fmtMoney(v, lang);
  const rows = shifts.filter(s => s.start_time).map(s => {
    const e = enrich(s);
    return {
      id: s.id,
      date: dm(s.work_date),
      start: s.start_time,
      end: s.end_time,
      pay: e.eff.pay
    };
  }).reverse();
  const card = {
    background: 'var(--card-bg)',
    backgroundImage: 'var(--card-bg-image)',
    border: 'var(--card-border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--card-shadow)',
    padding: '0.5rem 0.75rem',
    color: 'var(--text)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.1rem',
    textAlign: 'left',
    font: 'inherit',
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 0.75rem',
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, tr(lang, 'scopeHint')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))',
      gap: '0.75rem'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setScope('all'),
    style: {
      ...card,
      borderColor: 'var(--green)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, tr(lang, 'allPeriods')), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--green)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, fmtHours(st.hours), " h \xB7 ", money(st.pay)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--danger)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "Lost to late \u2212", money(st.lostPay))), periods.map(p => /*#__PURE__*/React.createElement("button", {
    key: p.key,
    type: "button",
    onClick: () => setScope(p.key),
    style: card
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, p.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--green)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, p.key === '2026-08' ? fmtHours(st.hours) + ' h · ' + money(st.pay) : '176 h · ' + money(p.pay)), p.key === '2026-08' && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--danger)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "Lost to late \u2212", money(st.lostPay))))), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '1.75rem 0 0.75rem',
      fontSize: '1rem'
    }
  }, tr(lang, 'receivedPeriods')), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.75rem 0.9rem',
      marginBottom: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.2rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--muted)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-label)'
    }
  }, "Total net received (after deductions)"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-3xl)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--green)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, money(7126500)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--muted)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "Before deductions ", money(7326500), " \xB7 deducted \u2212", money(200000))), /*#__PURE__*/React.createElement(PeriodCard, {
    label: "26/6 \u2192 25/7",
    dateRange: "26/06 \u2013 25/07",
    meta: '22 shifts · 176.00 h',
    pay: 7126500,
    received: true,
    receivedOn: "03/08",
    currencyLocale: LOCALES[lang],
    onClick: () => setScope('2026-07')
  }), /*#__PURE__*/React.createElement(PeriodCard, {
    label: "26/5 \u2192 25/6",
    dateRange: "26/05 \u2013 25/06",
    meta: '21 shifts · 168.50 h',
    pay: 6842000,
    received: true,
    receivedOn: "04/07",
    currencyLocale: LOCALES[lang],
    onClick: () => setScope('2026-06')
  }), scope && !sheet && /*#__PURE__*/React.createElement(Modal, {
    width: "wide",
    title: scope === 'all' ? tr(lang, 'allPeriods') : '26/7 → 25/8',
    onClose: () => setScope(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: '0.6rem 1rem'
    }
  }, /*#__PURE__*/React.createElement(DonutBlock, {
    title: "Salary",
    centerValue: pct(net, st.idealPay),
    centerLabel: "net",
    segments: [{
      label: 'Net',
      value: Math.max(0, net),
      color: 'var(--green)',
      display: money(net)
    }, {
      label: 'Compensation',
      value: dedTotal,
      color: 'var(--checkin)',
      display: money(dedTotal)
    }, {
      label: 'Lost to late',
      value: st.lostPay,
      color: 'var(--danger)',
      display: money(st.lostPay)
    }]
  }), /*#__PURE__*/React.createElement(DonutBlock, {
    title: "Total income",
    centerValue: money(st.pay + extraTotal),
    centerLabel: "total",
    segments: [{
      label: 'Shift pay',
      value: st.pay,
      color: 'var(--green)',
      display: money(st.pay)
    }, {
      label: 'Extra income',
      value: extraTotal,
      color: 'var(--checkin)',
      display: money(extraTotal)
    }]
  }), /*#__PURE__*/React.createElement(DonutBlock, {
    title: "Day / night hours",
    centerValue: fmtHours(st.hours) + 'h',
    centerLabel: "total hours",
    segments: [{
      label: 'Day hours',
      value: st.dayHours,
      color: 'var(--checkin)',
      display: fmtHours(st.dayHours) + ' h'
    }, {
      label: 'Night hours',
      value: st.nightHours,
      color: 'var(--accent)',
      display: fmtHours(st.nightHours) + ' h'
    }, {
      label: 'Late hours',
      value: st.lostHours,
      color: 'var(--danger)',
      display: fmtHours(st.lostHours) + ' h'
    }]
  }), /*#__PURE__*/React.createElement(DonutBlock, {
    title: "Day / night shifts",
    centerValue: String(st.dayShiftCount + st.nightShiftCount),
    centerLabel: "total shifts",
    segments: [{
      label: 'Day shifts',
      value: st.dayShiftCount,
      color: 'var(--checkin)',
      display: st.dayShiftCount + ' shifts'
    }, {
      label: 'Night shifts',
      value: st.nightShiftCount,
      color: 'var(--accent)',
      display: st.nightShiftCount + ' shifts'
    }]
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setSheet(true),
    style: {
      width: '100%',
      marginTop: '1rem',
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text)',
      font: 'inherit',
      fontWeight: 'var(--weight-semibold)',
      padding: '0.6rem',
      cursor: 'pointer'
    }
  }, tr(lang, 'detail'))), sheet && /*#__PURE__*/React.createElement(Modal, {
    width: "wide",
    title: '26/7 → 25/8 · ' + tr(lang, 'detail'),
    onClose: () => setSheet(false)
  }, /*#__PURE__*/React.createElement(FilterTabs, {
    value: week,
    onChange: setWeek,
    options: [{
      value: 'all',
      label: 'All'
    }, {
      value: 'w1',
      label: 'Week 1'
    }, {
      value: 'w2',
      label: 'Week 2'
    }],
    style: {
      marginBottom: '0.85rem'
    }
  }), /*#__PURE__*/React.createElement(TimesheetTable, {
    rows: week === 'all' ? rows : rows.slice(0, 3),
    totalHours: st.hours,
    totalPay: st.pay,
    currencyLocale: LOCALES[lang]
  })));
}
Object.assign(window, {
  PayPeriodScreen,
  Donut,
  DonutBlock
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/salaryworking-app/kit-period.jsx", error: String((e && e.message) || e) }); }

// ui_kits/salaryworking-app/kit-screens.jsx
try { (() => {
/* Login + Board (the app's home): shift entry, month stats, timesheet.
   Layout copies src/App.jsx — .board-grid is 2fr/3fr on desktop and one column
   under 760px, which is how nearly every real user sees it. */
const NS = window.SalaryWorkingDesignSystem_f6e8d6;
function LoginScreen({
  lang,
  onLang,
  theme,
  onTheme,
  onSignIn
}) {
  const {
    TextField,
    Button,
    Message,
    ThemeCycle,
    Flag
  } = NS;
  const [email, setEmail] = React.useState('cong@xuong.vn');
  const [pw, setPw] = React.useState('••••••••');
  const [showPw, setShowPw] = React.useState(false);
  const [err, setErr] = React.useState(null);
  const LANGS = {
    vi: 'Tiếng Việt',
    en: 'English (UK)',
    us: 'English (US)',
    au: 'English (AU)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'safe center',
      padding: '1rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--card-bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: 'var(--card-border)',
      borderRadius: 'var(--card-radius)',
      boxShadow: 'var(--card-shadow)',
      padding: '2rem',
      width: '100%',
      maxWidth: 'var(--auth-max-width)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '0.4rem',
      marginBottom: '0.75rem'
    }
  }, /*#__PURE__*/React.createElement(ThemeCycle, {
    value: lang,
    order: ['vi', 'en', 'us', 'au'],
    label: LANGS[lang],
    onChange: onLang,
    icon: Flag ? /*#__PURE__*/React.createElement(Flag, {
      code: lang
    }) : null,
    showLabel: false
  }), /*#__PURE__*/React.createElement(ThemeCycle, {
    value: theme,
    onChange: onTheme,
    showLabel: false
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 0.25rem',
      fontSize: '1.5rem'
    }
  }, "Salary Working"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--muted)',
      margin: '0 0 1.5rem',
      fontSize: 'var(--text-md)'
    }
  }, tr(lang, 'signInSub')), /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (!email) {
        setErr('Wrong email or password.');
        return;
      }
      onSignIn();
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: tr(lang, 'email'),
    type: "email",
    value: email,
    onChange: e => setEmail(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: tr(lang, 'password'),
    type: showPw ? 'text' : 'password',
    value: pw,
    onChange: e => setPw(e.target.value),
    inputStyle: {
      paddingRight: '3.5rem'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setShowPw(!showPw),
    style: {
      position: 'absolute',
      right: '0.4rem',
      bottom: '0.55rem',
      background: 'none',
      border: 'none',
      color: 'var(--accent)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      cursor: 'pointer'
    }
  }, showPw ? 'Hide' : 'Show')), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    type: "submit"
  }, tr(lang, 'signIn')), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    style: {
      color: 'var(--danger)',
      alignSelf: 'flex-start'
    }
  }, tr(lang, 'forgot'))), err && /*#__PURE__*/React.createElement(Message, {
    tone: "error"
  }, err), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    style: {
      marginTop: '1rem'
    }
  }, tr(lang, 'noAccount'))));
}
function ShiftEntry({
  lang,
  schedByDate,
  onAdd,
  receiveDue
}) {
  const {
    TextField,
    TimeInput,
    Checkbox,
    Button
  } = NS;
  const [date, setDate] = React.useState(TODAY);
  const [start, setStart] = React.useState('21:58');
  const [end, setEnd] = React.useState('06:05');
  const [holiday, setHoliday] = React.useState(false);
  const sched = schedByDate.get(date);
  const preview = computeEffective(sched && sched.start, sched && sched.end, start, end, holiday);
  const lost = preview.lostHours > 0;
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      onAdd({
        work_date: date,
        start_time: start,
        end_time: end,
        is_holiday: holiday,
        scheduled_start: sched && sched.start,
        scheduled_end: sched && sched.end
      });
    },
    style: {
      background: 'var(--panel-2)',
      backgroundImage: 'var(--card-bg-image)',
      border: '1px solid rgba(91,158,198,0.45)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--card-shadow)',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.7rem'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 0.15rem',
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--weight-bold)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-title)',
      color: 'var(--accent)',
      display: 'inline-block',
      paddingBottom: '0.3rem',
      borderBottom: '2px solid var(--accent)',
      alignSelf: 'flex-start'
    }
  }, tr(lang, 'addShift')), /*#__PURE__*/React.createElement(TextField, {
    label: tr(lang, 'date'),
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr auto',
      gap: '0.75rem',
      alignItems: 'end'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, tr(lang, 'checkin'), /*#__PURE__*/React.createElement(TimeInput, {
    kind: "in",
    value: start,
    onChange: setStart,
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.35rem',
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, tr(lang, 'checkout'), /*#__PURE__*/React.createElement(TimeInput, {
    kind: "out",
    value: end,
    onChange: setEnd,
    style: {
      width: '100%'
    }
  })), /*#__PURE__*/React.createElement(Checkbox, {
    checked: holiday,
    onChange: e => setHoliday(e.target.checked),
    label: tr(lang, 'holiday'),
    style: {
      paddingBottom: '0.6rem'
    }
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--weight-bold)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, tr(lang, 'currentShift'), " (", preview.nightHours > preview.dayHours ? tr(lang, 'night') : tr(lang, 'day'), "): ", fmtHours(preview.decimalHours), " h \xB7 ", fmtMoney(preview.pay, lang)), lost && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      color: 'var(--pay-negative)',
      fontWeight: 'var(--weight-semibold)',
      fontSize: 'var(--text-base)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, tr(lang, 'lateIn'), " ", fmtHours(preview.lateIn), "h \xB7 \u2212", fmtMoney(preview.lostPay, lang)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '0.75rem',
      marginTop: 'auto',
      paddingTop: '0.25rem'
    }
  }, receiveDue && /*#__PURE__*/React.createElement(Button, {
    variant: "received",
    style: {
      flex: 1
    }
  }, tr(lang, 'received')), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    style: {
      flex: 1
    }
  }, tr(lang, 'addShift'))));
}
function MonthStats({
  lang,
  stats,
  deductionTotal
}) {
  const {
    SalaryHero,
    StatCard
  } = NS;
  const net = stats.pay - deductionTotal;
  const fxNote = lang === 'vi' ? null : SYMBOLS[lang] + '1 = ' + new Intl.NumberFormat('vi-VN').format(lang === 'en' ? 31000 : lang === 'us' ? 25000 : 16500) + ' VND · updated 08:20';
  return /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(SalaryHero, {
    label: tr(lang, 'salaryLabel'),
    expectedLabel: tr(lang, 'expected'),
    lateLabel: tr(lang, 'late'),
    deductionLabel: tr(lang, 'compensation'),
    net: net,
    expected: stats.idealPay,
    latePenalty: stats.lostPay,
    deduction: deductionTotal,
    currencyLocale: LOCALES[lang],
    fxNote: fxNote
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,minmax(0,1fr))',
      gap: '0.5rem',
      flex: '1 1 0'
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    tone: "orange",
    title: tr(lang, 'totalHours'),
    value: fmtHours2(stats.hours) + ' (h)'
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "green",
    title: tr(lang, 'dayHours'),
    value: fmtHours2(stats.dayHours) + ' (h)'
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "blue",
    title: tr(lang, 'nightHours'),
    value: fmtHours2(stats.nightHours) + ' (h)'
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "red",
    title: tr(lang, 'lateHours'),
    value: fmtHours2(stats.lostHours) + ' (h)'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: '0.5rem',
      flex: '1 1 0'
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    tone: "orange",
    title: tr(lang, 'dayShifts'),
    value: stats.dayShiftCount
  }), /*#__PURE__*/React.createElement(StatCard, {
    tone: "blue",
    title: tr(lang, 'nightShifts'),
    value: stats.nightShiftCount
  })));
}
function BoardScreen({
  lang,
  shifts,
  stats,
  deductionTotal,
  schedByDate,
  onAdd,
  onDelete
}) {
  const {
    SearchInput,
    FilterTabs,
    DateGroup,
    ShiftCard,
    EmptyState,
    Modal,
    Button
  } = NS;
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  // Deleting a shift always asks first — the row is the user's evidence of a day worked.
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const rows = shifts.map(enrich).filter(s => {
    const kind = s.eff.nightHours > 0 ? 'night' : 'day';
    if (filter !== 'all' && kind !== filter) return false;
    if (q.trim() && !(s.work_date + ' ' + dm(s.work_date) + ' ' + (s.start_time || '') + ' ' + (s.end_time || '') + ' ' + kind).includes(q.trim())) return false;
    return true;
  });
  const groups = [];
  const byDate = new Map();
  for (const s of rows) {
    if (!byDate.has(s.work_date)) {
      const g = {
        date: s.work_date,
        items: []
      };
      byDate.set(s.work_date, g);
      groups.push(g);
    }
    byDate.get(s.work_date).items.push(s);
  }
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'var(--board-columns)',
      gap: 'var(--board-gap)',
      alignItems: 'stretch'
    },
    className: "board-grid"
  }, /*#__PURE__*/React.createElement(ShiftEntry, {
    lang: lang,
    schedByDate: schedByDate,
    onAdd: onAdd,
    receiveDue: true
  }), /*#__PURE__*/React.createElement(MonthStats, {
    lang: lang,
    stats: stats,
    deductionTotal: deductionTotal
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: '1.25rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '0.5rem 0.75rem',
      marginBottom: '0.85rem'
    }
  }, /*#__PURE__*/React.createElement(SearchInput, {
    value: q,
    onChange: e => setQ(e.target.value),
    onClear: () => setQ(''),
    placeholder: tr(lang, 'search')
  }), /*#__PURE__*/React.createElement(FilterTabs, {
    value: filter,
    onChange: setFilter,
    options: [{
      value: 'all',
      label: tr(lang, 'all')
    }, {
      value: 'day',
      label: tr(lang, 'dayFilter')
    }, {
      value: 'night',
      label: tr(lang, 'nightFilter')
    }]
  })), groups.length === 0 && /*#__PURE__*/React.createElement(EmptyState, null, q ? 'No shifts match your search.' : tr(lang, 'emptyShifts')), groups.map(g => {
    const t = g.items.reduce((a, s) => ({
      hours: a.hours + s.eff.decimalHours,
      dayHours: a.dayHours + s.eff.dayHours,
      nightHours: a.nightHours + s.eff.nightHours,
      lostHours: a.lostHours + (s.eff.lostHours || 0),
      pay: a.pay + s.eff.pay
    }), {
      hours: 0,
      dayHours: 0,
      nightHours: 0,
      lostHours: 0,
      pay: 0
    });
    return /*#__PURE__*/React.createElement(DateGroup, {
      key: g.date,
      date: g.date,
      totalHours: t.hours,
      dayHours: t.dayHours,
      nightHours: t.nightHours,
      lostHours: t.lostHours,
      pay: t.pay,
      currencyLocale: LOCALES[lang]
    }, g.items.map(s => /*#__PURE__*/React.createElement(ShiftCard, {
      key: s.id,
      start: s.start_time,
      end: s.end_time,
      scheduledStart: s.scheduled_start,
      scheduledEnd: s.scheduled_end,
      pay: s.eff.pay,
      lostHours: s.eff.lostHours,
      lateInHours: s.eff.lateIn,
      earlyOutHours: s.eff.earlyOut,
      state: s.state,
      currencyLocale: LOCALES[lang],
      onDelete: () => setPendingDelete(s)
    })));
  })), pendingDelete && /*#__PURE__*/React.createElement(Modal, {
    title: "Delete this shift?",
    onClose: () => setPendingDelete(null),
    footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      variant: "save",
      style: {
        flex: 1
      },
      onClick: () => {
        onDelete(pendingDelete.id);
        setPendingDelete(null);
      }
    }, "Yes"), /*#__PURE__*/React.createElement(Button, {
      variant: "cancel",
      style: {
        flex: 1
      },
      onClick: () => setPendingDelete(null)
    }, "No"))
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, "This action cannot be undone."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0.6rem 0 0',
      fontSize: 'var(--text-base)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, pendingDelete.work_date, " \xB7 ", pendingDelete.start_time || pendingDelete.scheduled_start || '—', " \u2013 ", pendingDelete.end_time || pendingDelete.scheduled_end || '—', pendingDelete.eff && pendingDelete.eff.pay > 0 ? ' · ' + fmtMoney(pendingDelete.eff.pay, lang) : '')));
}
Object.assign(window, {
  LoginScreen,
  BoardScreen,
  ShiftEntry,
  MonthStats
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/salaryworking-app/kit-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/salaryworking-app/kit-tools.jsx
try { (() => {
/* Tools sheet, weekly-schedule image import (with the OCR cross-check layer),
   account sheet, guide, and the floating salary assistant. Copy is taken from
   src/lib/translations.js so the tone is the product's own. */
const NS_T = window.SalaryWorkingDesignSystem_f6e8d6;

// Stand-in for an uploaded profile photo (the real flow crops and uploads to Supabase).
const SAMPLE_AVATAR = window.__resources && window.__resources.logoMark || '../../assets/logo/a-bangkep-icon-light.svg';
function ToolsSheet({
  lang,
  onClose,
  onImport,
  onReconcile,
  onDeductions,
  onExtra
}) {
  const {
    Modal
  } = NS_T;
  const item = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    font: 'inherit',
    fontWeight: 'var(--weight-semibold)',
    padding: '0.7rem 0.85rem',
    cursor: 'pointer'
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: tr(lang, 'tools'),
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: item,
    onClick: onImport
  }, tr(lang, 'importWeek'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "\u203A")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: item,
    onClick: onReconcile
  }, tr(lang, 'reconcile'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "\u203A")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: item,
    onClick: onDeductions
  }, tr(lang, 'deductions'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "\u203A")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: item,
    onClick: onExtra
  }, tr(lang, 'extra'), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--muted)'
    }
  }, "\u203A"))));
}
const IMPORT_ROWS = [{
  day: 'Mon',
  date: '2026-08-17',
  in: '14:00',
  out: '22:00',
  ocr: 'ok'
}, {
  day: 'Tue',
  date: '2026-08-18',
  in: '14:00',
  out: '22:00',
  ocr: 'ok'
}, {
  day: 'Wed',
  date: '2026-08-19',
  in: '22:00',
  out: '06:00',
  ocr: 'mismatch'
}, {
  day: 'Thu',
  date: '2026-08-20',
  in: '22:00',
  out: '06:00',
  ocr: 'ok'
}, {
  day: 'Fri',
  date: '2026-08-21',
  in: '',
  out: '',
  off: true,
  ocr: 'ok'
}, {
  day: 'Sat',
  date: '2026-08-22',
  in: '06:00',
  out: '14:00',
  ocr: 'unchecked'
}];
function ScheduleImportModal({
  lang,
  onClose,
  onCreate
}) {
  const {
    Modal,
    Button,
    ProgressButton,
    Badge,
    Checkbox
  } = NS_T;
  const [stage, setStage] = React.useState('pick');
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    if (stage !== 'reading') return undefined;
    setPct(0);
    const id = setInterval(() => setPct(p => {
      if (p >= 100) {
        clearInterval(id);
        setStage('review');
        return 100;
      }
      return p + 8;
    }), 130);
    return () => clearInterval(id);
  }, [stage]);
  const mismatches = IMPORT_ROWS.filter(r => r.ocr === 'mismatch').length;
  const cell = {
    border: '1px solid var(--border)',
    padding: '0.25rem 0.35rem',
    fontSize: 'var(--text-xs)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'var(--numeric)'
  };
  return /*#__PURE__*/React.createElement(Modal, {
    width: "wide",
    title: "Import weekly schedule from image",
    onClose: onClose
  }, stage === 'pick' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      textAlign: 'center',
      color: 'var(--muted)',
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 0.35rem',
      color: 'var(--text)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Drop images here"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "or ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "browse images"), " \xB7 one image")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, "Employee code (from profile): ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, PROFILE.code)), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: () => setStage('reading')
  }, "Read schedule"), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    onClick: () => setStage('review')
  }, "Enter manually")), stage === 'reading' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(ProgressButton, {
    value: pct,
    label: pct < 40 ? 'Uploading image…' : pct < 90 ? 'Reading schedule…' : 'Processing…'
  }), /*#__PURE__*/React.createElement(ProgressButton, {
    indeterminate: true,
    label: "Cross-checking with OCR\u2026"
  })), stage === 'review' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }
  }, mismatches > 0 && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-base)',
      color: 'var(--sw-amber-500)'
    }
  }, mismatches, " cell(s) where the reading and OCR differ \u2014 check carefully before saving."), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['Day', 'Date', 'In', 'Out', 'Off'].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      ...cell,
      color: 'var(--muted)',
      textAlign: 'left',
      fontWeight: 'var(--weight-semibold)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, IMPORT_ROWS.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.date
  }, /*#__PURE__*/React.createElement("td", {
    style: cell
  }, r.day), /*#__PURE__*/React.createElement("td", {
    style: cell
  }, dm(r.date)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      color: r.ocr === 'mismatch' ? 'var(--sw-amber-500)' : 'var(--time-in)'
    }
  }, r.in || '—', r.ocr === 'mismatch' && /*#__PURE__*/React.createElement(Badge, {
    kind: "ocr"
  }, "check")), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      color: 'var(--time-out)'
    }
  }, r.out || '—'), /*#__PURE__*/React.createElement("td", {
    style: cell
  }, /*#__PURE__*/React.createElement(Checkbox, {
    checked: !!r.off,
    onChange: () => {}
  })))))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--muted)'
    }
  }, "Values read from the image are never written straight in \u2014 confirm them and they become planned shifts."), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: onCreate
  }, "Create whole week")));
}
const RECONCILE_ROWS = [{
  date: '2026-08-10',
  image: '06:00 – 14:00',
  actual: '06:00 – 14:12',
  sched: '06:00 – 14:00',
  result: 'match'
}, {
  date: '2026-08-11',
  image: '22:00 – 06:00',
  actual: null,
  sched: '22:00 – 06:00',
  result: 'missing'
}, {
  date: '2026-08-12',
  image: '22:00 – 06:00',
  actual: '22:00 – 06:00',
  sched: '22:00 – 06:00',
  result: 'match'
}, {
  date: '2026-08-13',
  image: '22:00 – 06:00',
  actual: '22:06 – 06:02',
  sched: '22:00 – 06:00',
  result: 'diff'
}, {
  date: '2026-08-14',
  image: 'Off',
  actual: '21:52 – 06:04',
  sched: '22:00 – 06:00',
  result: 'extra'
}];

// Đối chiếu công: read a photo of the company timesheet and compare it, day by day,
// with what the user logged. The app never overwrites — it reports.
function ReconcileModal({
  lang,
  onClose
}) {
  const {
    Modal,
    Button,
    ProgressButton,
    Badge,
    FilterTabs,
    StatTile
  } = NS_T;
  const [scope, setScope] = React.useState('week');
  const [stage, setStage] = React.useState('pick');
  const [pct, setPct] = React.useState(0);
  React.useEffect(() => {
    if (stage !== 'reading') return undefined;
    setPct(0);
    const id = setInterval(() => setPct(p => {
      if (p >= 100) {
        clearInterval(id);
        setStage('result');
        return 100;
      }
      return p + 9;
    }), 130);
    return () => clearInterval(id);
  }, [stage]);
  const L = lang === 'vi' ? {
    title: 'Đối chiếu công',
    scope: 'Đối chiếu theo',
    week: 'Tuần',
    weeks: 'Nhiều tuần',
    month: 'Cả kỳ lương',
    first: 'Tuần đầu bắt đầu (Thứ 2)',
    check: 'Đọc & đối chiếu',
    stage: 'Đang đối chiếu công…',
    colDate: 'Ngày',
    colImage: 'Theo ảnh',
    colActual: 'Thực tế',
    colResult: 'Kết quả',
    match: '✓ Khớp',
    diff: '✗ Lệch',
    missing: 'Chưa chấm công',
    extra: 'Dư (ảnh nghỉ)',
    summary: 'Khớp {m}/{t} ngày',
    lost: 'Giờ mất',
    note: 'Số đọc từ ảnh không bao giờ tự ghi đè — chỉ báo lệch để bạn kiểm tra.'
  } : {
    title: 'Verify timesheet',
    scope: 'Reconcile by',
    week: 'Week',
    weeks: 'Multiple weeks',
    month: 'Whole pay period',
    first: 'First week start (Monday)',
    check: 'Read & compare',
    stage: 'Comparing hours…',
    colDate: 'Date',
    colImage: 'From image',
    colActual: 'Actual',
    colResult: 'Result',
    match: '✓ Match',
    diff: '✗ Mismatch',
    missing: 'Not logged',
    extra: 'Extra (off in image)',
    summary: 'Matched {m}/{t} days',
    lost: 'Lost hours',
    note: 'Values read from the image never overwrite yours — mismatches are only flagged.'
  };
  const matched = RECONCILE_ROWS.filter(r => r.result === 'match').length;
  const cell = {
    border: '1px solid var(--border)',
    padding: '0.25rem 0.35rem',
    fontSize: 'var(--text-xs)',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'var(--numeric)'
  };
  const RESULT = {
    match: {
      text: L.match,
      color: 'var(--green)'
    },
    diff: {
      text: L.diff,
      color: 'var(--danger)'
    },
    missing: {
      text: L.missing,
      color: 'var(--status-missing)'
    },
    extra: {
      text: L.extra,
      color: 'var(--checkin)'
    }
  };
  return /*#__PURE__*/React.createElement(Modal, {
    width: "wide",
    title: L.title,
    onClose: onClose
  }, stage === 'pick' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)',
      color: 'var(--muted)'
    }
  }, L.scope), /*#__PURE__*/React.createElement(FilterTabs, {
    value: scope,
    onChange: setScope,
    options: [{
      value: 'week',
      label: L.week
    }, {
      value: 'weeks',
      label: L.weeks
    }, {
      value: 'month',
      label: L.month
    }]
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      color: 'var(--muted)',
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", null, L.first), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "10/08/2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px dashed var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1.5rem',
      textAlign: 'center',
      color: 'var(--muted)',
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 0.35rem',
      color: 'var(--text)',
      fontWeight: 'var(--weight-semibold)'
    }
  }, "Drop images here"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0
    }
  }, "or ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--accent)'
    }
  }, "browse images"), " \xB7 multiple images supported")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: () => setStage('reading')
  }, L.check)), stage === 'reading' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(ProgressButton, {
    value: pct,
    label: L.stage
  }), /*#__PURE__*/React.createElement(ProgressButton, {
    indeterminate: true,
    label: lang === 'vi' ? 'Đang đối chiếu OCR…' : 'Cross-checking with OCR…'
  })), stage === 'result' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: L.summary.replace('{m}', matched).replace('{t}', RECONCILE_ROWS.length),
    value: matched + '/' + RECONCILE_ROWS.length,
    variant: "total"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: L.lost,
    value: "0.53 h",
    variant: "negative"
  })), /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, [L.colDate, L.colImage, L.colActual, L.colResult].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      ...cell,
      color: 'var(--muted)',
      textAlign: 'left',
      fontWeight: 'var(--weight-semibold)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, RECONCILE_ROWS.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.date
  }, /*#__PURE__*/React.createElement("td", {
    style: cell
  }, dm(r.date)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      color: 'var(--muted)'
    }
  }, r.image, /*#__PURE__*/React.createElement(Badge, {
    kind: "ocr"
  }, "OCR")), /*#__PURE__*/React.createElement("td", {
    style: cell
  }, r.actual || '—'), /*#__PURE__*/React.createElement("td", {
    style: {
      ...cell,
      color: RESULT[r.result].color,
      fontWeight: 'var(--weight-semibold)'
    }
  }, RESULT[r.result].text))))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--muted)'
    }
  }, L.note)));
}

// Tiền bồi thường (deductions): amount + reason + date, attached to the pay period.
// A deduction never touches the hourly maths — it is subtracted from the period total.
function DeductionsModal({
  lang,
  onClose
}) {
  const {
    Modal,
    TextField,
    Button,
    EmptyState,
    StatTile
  } = NS_T;
  const [rows, setRows] = React.useState(DEDUCTIONS);
  const [amount, setAmount] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState(TODAY);
  const [err, setErr] = React.useState(null);
  const L = lang === 'vi' ? {
    title: 'Tiền bồi thường',
    amount: 'Số tiền',
    reason: 'Lý do (bắt buộc)',
    date: 'Ngày bị trừ',
    add: '+ Thêm',
    empty: 'Kỳ này chưa có khoản trừ nào.',
    net: 'Thực nhận sau khi trừ',
    total: 'Tổng bị trừ',
    errAmount: 'Nhập số tiền bị trừ (> 0).',
    errReason: 'Phải có lý do.'
  } : {
    title: 'Compensation',
    amount: 'Amount',
    reason: 'Reason (required)',
    date: 'Deduction date',
    add: '+ Add',
    empty: 'No deductions in this period yet.',
    net: 'Net after deductions',
    total: 'Total deducted',
    errAmount: 'Enter a deduction amount (> 0).',
    errReason: 'A reason is required.'
  };
  const total = rows.reduce((a, d) => a + Number(d.amount), 0);
  function add() {
    const n = Number(String(amount).replace(/[^\d]/g, ''));
    if (!n) {
      setErr(L.errAmount);
      return;
    }
    if (!reason.trim()) {
      setErr(L.errReason);
      return;
    }
    setRows(l => [{
      id: Date.now(),
      amount: n,
      reason: reason.trim(),
      deduct_date: date
    }, ...l]);
    setAmount('');
    setReason('');
    setErr(null);
  }
  return /*#__PURE__*/React.createElement(Modal, {
    title: L.title,
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.6rem'
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: L.amount,
    numeric: true,
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: "120000"
  }), /*#__PURE__*/React.createElement(TextField, {
    label: L.date,
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  })), /*#__PURE__*/React.createElement(TextField, {
    label: L.reason,
    value: reason,
    onChange: e => setReason(e.target.value),
    error: err
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: add
  }, L.add), /*#__PURE__*/React.createElement(StatTile, {
    label: L.total,
    value: fmtMoney(total, lang),
    variant: "negative"
  }), rows.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, null, L.empty) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem'
    }
  }, rows.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.id,
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto auto',
      alignItems: 'center',
      gap: '0.6rem',
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.5rem 0.7rem',
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("span", null, d.reason, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--muted)',
      fontSize: 'var(--text-sm)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, dm(d.deduct_date))), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--pay-negative)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "\u2212", fmtMoney(d.amount, lang)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Delete deduction",
    onClick: () => setRows(l => l.filter(x => x.id !== d.id)),
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--muted)',
      fontSize: '1.15rem',
      lineHeight: 1,
      cursor: 'pointer'
    }
  }, "\xD7"))))));
}

// Thu nhập việc ngoài (extra income): flat-fee side jobs, kept OUT of the hourly
// formula. Unreceived amounts stay pending and roll into the period they land in.
function ExtraIncomeModal({
  lang,
  onClose
}) {
  const {
    Modal,
    TextField,
    Button,
    EmptyState,
    Badge,
    StatTile
  } = NS_T;
  const [rows, setRows] = React.useState(EXTRA_INCOME);
  const [desc, setDesc] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(TODAY);
  const [err, setErr] = React.useState(null);
  const L = lang === 'vi' ? {
    title: 'Thu nhập việc ngoài',
    date: 'Ngày',
    desc: 'Diễn giải',
    amount: 'Số tiền',
    add: '+ Thêm',
    empty: 'Kỳ này chưa có thu nhập việc ngoài.',
    received: 'Đã nhận',
    pending: 'Chưa nhận',
    mark: '✓ Đã nhận',
    undo: 'Hoàn lại',
    sumExtra: 'Thu nhập ngoài',
    sumPending: 'Đang treo',
    errAmount: 'Nhập số tiền (> 0).'
  } : {
    title: 'Extra income',
    date: 'Date',
    desc: 'Description',
    amount: 'Amount',
    add: '+ Add',
    empty: 'No extra income in this period yet.',
    received: 'Received',
    pending: 'Not received',
    mark: '✓ Received',
    undo: 'Undo',
    sumExtra: 'Extra income',
    sumPending: 'Pending (held)',
    errAmount: 'Enter an amount (> 0).'
  };
  const got = rows.filter(x => x.received).reduce((a, x) => a + Number(x.amount), 0);
  const pending = rows.filter(x => !x.received).reduce((a, x) => a + Number(x.amount), 0);
  function add() {
    const n = Number(String(amount).replace(/[^\d]/g, ''));
    if (!n) {
      setErr(L.errAmount);
      return;
    }
    setRows(l => [{
      id: Date.now(),
      date,
      desc: desc.trim() || '—',
      amount: n,
      received: false
    }, ...l]);
    setDesc('');
    setAmount('');
    setErr(null);
  }
  return /*#__PURE__*/React.createElement(Modal, {
    title: L.title,
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.6rem'
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: L.date,
    type: "date",
    value: date,
    onChange: e => setDate(e.target.value)
  }), /*#__PURE__*/React.createElement(TextField, {
    label: L.amount,
    numeric: true,
    value: amount,
    onChange: e => setAmount(e.target.value),
    placeholder: "500000",
    error: err
  })), /*#__PURE__*/React.createElement(TextField, {
    label: L.desc,
    value: desc,
    onChange: e => setDesc(e.target.value)
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: add
  }, L.add), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement(StatTile, {
    label: L.sumExtra,
    value: fmtMoney(got, lang),
    variant: "pay"
  }), /*#__PURE__*/React.createElement(StatTile, {
    label: L.sumPending,
    value: fmtMoney(pending, lang)
  })), rows.length === 0 ? /*#__PURE__*/React.createElement(EmptyState, null, L.empty) : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem'
    }
  }, rows.map(x => /*#__PURE__*/React.createElement("div", {
    key: x.id,
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      gap: '0.6rem',
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.5rem 0.7rem',
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("span", null, x.desc, x.received ? /*#__PURE__*/React.createElement(Badge, {
    kind: "received"
  }, L.received) : /*#__PURE__*/React.createElement(Badge, {
    kind: "planned"
  }, L.pending), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--muted)',
      fontSize: 'var(--text-sm)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, dm(x.date))), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: x.received ? 'var(--pay-positive)' : 'var(--text)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, fmtMoney(x.amount, lang)), /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    onClick: () => setRows(l => l.map(y => y.id === x.id ? {
      ...y,
      received: !y.received
    } : y))
  }, x.received ? L.undo : L.mark)))))));
}
function AccountModal({
  lang,
  theme,
  onTheme,
  onLang,
  fontScale,
  onFont,
  avatar,
  onAvatar,
  onClose,
  onSignOut
}) {
  const {
    Modal,
    ThemeCycle,
    FilterTabs,
    Button,
    Flag,
    Avatar,
    Message
  } = NS_T;
  const LANGS = {
    vi: 'Tiếng Việt',
    en: 'English (UK)',
    us: 'English (US)',
    au: 'English (AU)'
  };
  const row = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    fontSize: 'var(--text-base)',
    color: 'var(--muted)'
  };
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Account info",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    }
  }, Avatar ? /*#__PURE__*/React.createElement(Avatar, {
    src: avatar,
    name: PROFILE.name,
    size: 48
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--weight-bold)'
    }
  }, PROFILE.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--muted)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, PROFILE.code, " \xB7 ", PROFILE.phone), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '0.35rem'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "link",
    onClick: () => onAvatar(avatar ? null : SAMPLE_AVATAR)
  }, avatar ? 'Remove photo' : 'Choose photo'), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--muted)'
    }
  }, "JPG, PNG, WEBP \u2014 up to 5MB")))), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Hourly rate"), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, fmtMoney(PROFILE.hourly, lang))), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Night supplement"), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, "+", PROFILE.nightPct, "%")), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Payday"), /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text)'
    }
  }, "Day ", PROFILE.payday)), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Theme"), /*#__PURE__*/React.createElement(ThemeCycle, {
    value: theme,
    onChange: onTheme,
    order: ['dark', 'glass', 'neumorph']
  })), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Language"), /*#__PURE__*/React.createElement(ThemeCycle, {
    value: lang,
    order: ['vi', 'en', 'us', 'au'],
    label: LANGS[lang],
    onChange: onLang,
    icon: Flag ? /*#__PURE__*/React.createElement(Flag, {
      code: lang
    }) : null,
    showLabel: false
  })), /*#__PURE__*/React.createElement("div", {
    style: row
  }, /*#__PURE__*/React.createElement("span", null, "Text size"), /*#__PURE__*/React.createElement(FilterTabs, {
    value: fontScale,
    onChange: onFont,
    options: [{
      value: 'sm',
      label: 'S'
    }, {
      value: 'md',
      label: 'M'
    }, {
      value: 'lg',
      label: 'L'
    }]
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "cancel",
    fullWidth: true,
    onClick: onSignOut
  }, "Sign out")));
}
const GUIDE_STEPS = [['Add a shift', 'Pick a date, enter Check-in / Check-out, then press "Add shift".'], ['Planned schedule', 'Tools → Import weekly schedule reads a roster from a photo or lets you type it. Future shifts get an amber "Planned" badge; a past day never clocked in shows a red warning.'], ['Automatic salary', 'Day hours (06–22h) and night hours (22–06h) use different rates. The month total is in the stats block.'], ['Compensation', 'Tools → Compensation adds a period deduction, with a reason.'], ['Extra income', 'Tools → Extra income logs side jobs paid as a flat amount, kept out of the hourly maths.'], ['Pay period & timesheet', 'Pay period: charts per month, a detailed Excel-style timesheet, and marking salary as received.'], ['Salary assistant', 'A draggable bubble. Ask about your pay, or record a shift by chatting; a confirmation card appears before anything is saved.'], ['Account & language', 'Account holds your employee code and payday. Language and theme are saved to your account.']];
function GuideModal({
  onClose
}) {
  const {
    Modal,
    Button
  } = NS_T;
  return /*#__PURE__*/React.createElement(Modal, {
    title: "Welcome to Salary Working",
    onClose: onClose
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 0.5rem',
      color: 'var(--muted)',
      fontSize: 'var(--text-base)'
    }
  }, "A few quick steps to get started:"), /*#__PURE__*/React.createElement("ol", {
    style: {
      listStyle: 'none',
      margin: '0.5rem 0 1.1rem',
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.7rem'
    }
  }, GUIDE_STEPS.map(([t, d], i) => /*#__PURE__*/React.createElement("li", {
    key: t,
    style: {
      display: 'flex',
      gap: '0.7rem',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: '0 0 auto',
      width: '1.4rem',
      height: '1.4rem',
      borderRadius: '50%',
      background: 'var(--panel-2)',
      border: '1px solid var(--border)',
      display: 'grid',
      placeItems: 'center',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      color: 'var(--accent)',
      fontVariantNumeric: 'var(--numeric)'
    }
  }, i + 1), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("strong", null, t), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--muted)',
      lineHeight: 'var(--leading-normal)'
    }
  }, d))))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: onClose
  }, "Get started"));
}
const CHAT_REPLIES = [['3 triệu', 'At your rates, 3,000,000 ₫ needs about 9 night shifts (8h at 33,150 ₫/h) or 12 day shifts. You are 4 night shifts short this period.'], ['tuần', 'This week: 24.13 h · 795,900 ₫. One late clock-in on 13/8 cost you 0.10 h (−3,315 ₫).'], ['default', 'This period so far: 58.30 h · 1,932,000 ₫ before deductions, 1,732,000 ₫ after. Ask about a week, a date, or how many shifts you need for an amount.']];
function SalaryChat({
  lang,
  onClose
}) {
  const [log, setLog] = React.useState([{
    who: 'bot',
    text: 'Salary assistant. Ask about your hours, or record a shift by typing it.'
  }, {
    who: 'user',
    text: 'tuần này tôi được bao nhiêu?'
  }, {
    who: 'bot',
    text: CHAT_REPLIES[1][1]
  }]);
  const [text, setText] = React.useState('');
  function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    const q = text.trim();
    const hit = CHAT_REPLIES.find(([k]) => k !== 'default' && q.includes(k)) || CHAT_REPLIES[2];
    setLog(l => [...l, {
      who: 'user',
      text: q
    }, {
      who: 'bot',
      text: hit[1]
    }]);
    setText('');
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      right: '1rem',
      bottom: '5.5rem',
      zIndex: 60,
      width: 'min(88%, 320px)',
      height: 'min(62%, 420px)',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--card-bg)',
      backgroundImage: 'var(--card-bg-image)',
      border: 'var(--card-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem',
      boxShadow: '0 14px 44px rgba(0,0,0,0.5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.5rem'
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      fontSize: 'var(--text-md)'
    }
  }, "Salary assistant"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClose,
    "aria-label": "Close",
    style: {
      background: 'none',
      border: 'none',
      color: 'var(--muted)',
      fontSize: '1.3rem',
      lineHeight: 1,
      cursor: 'pointer'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.25rem 0.1rem'
    }
  }, log.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      maxWidth: '85%',
      padding: '0.55rem 0.75rem',
      borderRadius: 'var(--radius-lg)',
      fontSize: 'var(--text-md)',
      lineHeight: 1.4,
      fontVariantNumeric: 'var(--numeric)',
      alignSelf: m.who === 'bot' ? 'flex-start' : 'flex-end',
      background: m.who === 'bot' ? 'var(--panel-2)' : 'var(--accent)',
      border: m.who === 'bot' ? '1px solid var(--border)' : 'none',
      color: m.who === 'bot' ? 'var(--text)' : '#fff',
      borderBottomLeftRadius: m.who === 'bot' ? 4 : undefined,
      borderBottomRightRadius: m.who === 'bot' ? undefined : 4
    }
  }, m.text))), /*#__PURE__*/React.createElement("form", {
    onSubmit: send,
    style: {
      display: 'flex',
      gap: '0.45rem',
      marginTop: '0.6rem'
    }
  }, /*#__PURE__*/React.createElement("input", {
    value: text,
    onChange: e => setText(e.target.value),
    placeholder: "Ask about your pay\u2026",
    style: {
      flex: 1,
      minWidth: 0,
      font: 'inherit',
      background: 'var(--input-bg)',
      border: 'var(--input-border)',
      boxShadow: 'var(--input-shadow)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.5rem 0.6rem',
      color: 'var(--text)'
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    style: {
      flex: '0 0 auto',
      background: 'var(--accent)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      color: '#fff',
      font: 'inherit',
      fontWeight: 'var(--weight-semibold)',
      padding: '0.5rem 0.8rem',
      cursor: 'pointer'
    }
  }, "Send")));
}
Object.assign(window, {
  ToolsSheet,
  ScheduleImportModal,
  ReconcileModal,
  DeductionsModal,
  ExtraIncomeModal,
  AccountModal,
  GuideModal,
  SalaryChat,
  IMPORT_ROWS,
  GUIDE_STEPS,
  RECONCILE_ROWS
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/salaryworking-app/kit-tools.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.DateGroup = __ds_scope.DateGroup;

__ds_ns.PeriodCard = __ds_scope.PeriodCard;

__ds_ns.SalaryHero = __ds_scope.SalaryHero;

__ds_ns.ShiftCard = __ds_scope.ShiftCard;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.StatTile = __ds_scope.StatTile;

__ds_ns.TimesheetTable = __ds_scope.TimesheetTable;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.Loader = __ds_scope.Loader;

__ds_ns.Message = __ds_scope.Message;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.ProgressButton = __ds_scope.ProgressButton;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.SearchInput = __ds_scope.SearchInput;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.TimeInput = __ds_scope.TimeInput;

__ds_ns.DOCK_ICONS = __ds_scope.DOCK_ICONS;

__ds_ns.Dock = __ds_scope.Dock;

__ds_ns.FilterTabs = __ds_scope.FilterTabs;

__ds_ns.Flag = __ds_scope.Flag;

__ds_ns.LANGUAGES = __ds_scope.LANGUAGES;

__ds_ns.LANG_NAMES = __ds_scope.LANG_NAMES;

__ds_ns.LANG_CURRENCY = __ds_scope.LANG_CURRENCY;

__ds_ns.ThemeCycle = __ds_scope.ThemeCycle;

})();
