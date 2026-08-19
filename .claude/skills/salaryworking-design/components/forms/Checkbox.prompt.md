One-line: the app's only checkbox — 20px, accent fill, animated tick.

```jsx
<Checkbox checked={isHoliday} onChange={e => setIsHoliday(e.target.checked)} label="Holiday" />
```

The hit area is the whole label, which matters: users tap it one-handed straight off shift. Bottom-align it with the time fields when it sits in the check-in row.
