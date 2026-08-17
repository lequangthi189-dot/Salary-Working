One-line: dense value-over-label tile for summary rows.

```jsx
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:'0.6rem'}}>
  <StatTile label="Total hours" value="182.50" />
  <StatTile label="Total pay" value="7,900,000" variant="pay" />
  <StatTile label="Lost to late" value="−320,000" variant="negative" />
</div>
```
