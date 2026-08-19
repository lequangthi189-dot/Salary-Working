One-line: the 24h clock field every shift time is entered through.

```jsx
<TimeInput kind="in" value={start} onChange={setStart} label="In" />
<TimeInput kind="scheduled" value={schedStart} onChange={setSchedStart} label="Sched in" />
```

Colour is meaning: amber = check-in, blue = check-out, dashed grey = the planned time used as the late reference. `end <= start` is legal — it means the shift ends the next day.
