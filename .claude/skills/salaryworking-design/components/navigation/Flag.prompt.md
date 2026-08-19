One-line: the SVG flag shown next to a language, for the four locale codes.

```jsx
<Flag code="vi" />
<ThemeCycle value={lang} order={LANGUAGES} label={LANG_NAMES[lang]} icon={<Flag code={lang} />} onChange={setLang} />
```

Pair the flag with the language name, never the flag alone — `en`/`us`/`au` are the same words with a different currency, so the flag is the only thing that distinguishes them.
