One-line: the Excel-looking period timesheet, borrowed metaphor on purpose.

```jsx
<TimesheetTable rows={[{date:'14/8',start:'21:45',end:'06:10',pay:402900}]} totalHours={8.42} totalPay={402900} />
```

Only clocked-in shifts appear here — roster-only days are excluded, not shown as blanks. Pair it with week filter chips (`FilterTabs`) when the period spans several weeks.
