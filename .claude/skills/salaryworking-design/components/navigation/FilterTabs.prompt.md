One-line: accent-filled chip row for filtering the timesheet.

```jsx
<FilterTabs
  value={filter}
  onChange={setFilter}
  options={[{value:'all',label:'All'},{value:'day',label:'Day shifts'},{value:'night',label:'Night shifts'}]}
/>
```

Hide the day/night chips when the workplace has no night shift. Week chips read "Week 1", "Week 2" with the real date span in the tooltip.
