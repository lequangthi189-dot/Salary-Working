One-line: label-over-input field, used for every text/date/password input in the app.

```jsx
<TextField label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
<TextField label="Amount" numeric value={amount} onChange={onAmount} error="Enter a deduction amount (> 0)." />
```

Set `numeric` for anything that is money or hours so the figures stay tabular. For clock times use `TimeInput` instead — never `type="time"` (it drags in AM/PM from the OS locale).
