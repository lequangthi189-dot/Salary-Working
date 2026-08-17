One-line: the fixed bottom dock with magnifying icons — the app's only nav.

```jsx
<Dock
  active={0}
  onSelect={setView}
  items={[
    { key: 'period', label: 'Pay period', icon: 'payPeriod' },
    { key: 'tools', label: 'Tools', icon: 'tools' },
    { key: 'account', label: 'Account', icon: 'account' },
    { key: 'guide', label: 'Guide', icon: 'guide' }
  ]}
/>
```

Leave 7–9rem of bottom padding on the page so the dock never covers the last shift row. Icons come from the four-glyph set only — if a new destination needs a fifth icon, that is a signal the destination belongs under Tools.
