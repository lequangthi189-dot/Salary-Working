One-line: shift-list search box with magnifier and clear button.

```jsx
<div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:'0.5rem 0.75rem'}}>
  <SearchInput value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} />
  <FilterTabs value={filter} onChange={setFilter} />
</div>
```

Search matches date, time and shift type. Empty result copy is "No shifts match your search." — a statement, not an apology.
