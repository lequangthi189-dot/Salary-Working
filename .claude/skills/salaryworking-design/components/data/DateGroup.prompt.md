One-line: one day of the timesheet, header totals + its shift rows.

```jsx
<DateGroup date="2026-08-14" totalHours={8.42} nightHours={8} lostHours={0.25} pay={402900}>
  <ShiftCard start="21:45" end="06:10" pay={402900} lostHours={0.25} lateInHours={0.25} />
</DateGroup>
```

On narrow screens the header wraps to two lines: date + money first, hours underneath. Day/Night detail is dropped below 560px; the Late figure never is.
