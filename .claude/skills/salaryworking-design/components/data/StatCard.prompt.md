One-line: tone-coded stat tile for hours and shift counts.

```jsx
<div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'0.5rem'}}>
  <StatCard tone="orange" title="Total Hours" value="182.50 (h)" />
  <StatCard tone="green" title="Day Hours" value="121.25 (h)" />
  <StatCard tone="blue" title="Night Hours" value="61.25 (h)" />
  <StatCard tone="red" title="Late Hours" value="3.75 (h)" />
</div>
```

Hide the night tiles entirely when the workplace has no night shift (`hasNightShift === false`) — the row goes 4→3 and 2→1, it does not show zeros.
