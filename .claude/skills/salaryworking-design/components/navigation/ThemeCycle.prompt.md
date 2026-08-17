One-line: tap-to-advance switch for the three themes (and, with `label`, the four languages).

```jsx
<ThemeCycle value={theme} onChange={setTheme} />
<ThemeCycle value={lang} order={['vi','en','us','au']} label="Tiếng Việt" onChange={setLang} />
<ThemeCycle value={theme} onChange={setTheme} showLabel={false} />   {/* icon-only, for tight headers */}
```

Theme and font-scale choices are stored per account and applied to `<html>` before render, so they never flash. All three themes must look correct for any new feature — treat that as acceptance criteria, not polish.
