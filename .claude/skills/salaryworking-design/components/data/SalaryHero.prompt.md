One-line: the big "what I am owed this period" number, with the maths that made it.

```jsx
<SalaryHero net={7480000} expected={7900000} latePenalty={320000} deduction={100000} />
```

Rules: never round the figure for looks, never hide the late/deduction terms, and never show two heroes on one screen. Currency is integer VND formatted `vi-VN`; the other three locales only change the separators and symbol.
