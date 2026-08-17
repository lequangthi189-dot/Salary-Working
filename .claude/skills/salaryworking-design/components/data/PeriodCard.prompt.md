One-line: one pay period in the list, tappable, with a received mark.

```jsx
<PeriodCard label="26/7 → 25/8" dateRange="26/07 – 25/08" meta="21 shifts · 182.50 h" pay={7480000} />
<PeriodCard label="26/6 → 25/7" dateRange="26/06 – 25/07" pay={7120000} received receivedOn="03/08" />
```

The period boundary is user-configurable (26 → 25 by default); never hard-code calendar months in the label.
