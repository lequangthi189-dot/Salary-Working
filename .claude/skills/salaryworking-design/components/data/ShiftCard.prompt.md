One-line: the shift row — times, lost hours, pay, edit/delete.

```jsx
<ShiftCard start="21:45" end="06:10" pay={402900} lostHours={0.25} lateInHours={0.25} />
<ShiftCard scheduledStart="14:00" scheduledEnd="22:00" pay={0} state="planned" />
```

Never soften the lost-hours line — showing "late in 0.25h" plainly is the product's core value. Rows are dense on purpose (0.85–1.1rem padding): the user needs many shifts in one glance.
