One-line: the app's action button — flat, 8px radius, semibold, blue gradient for the main action.

```jsx
<Button variant="primary" fullWidth>Add shift</Button>
<Button variant="received">Salary received</Button>
<Button variant="link">Forgot password?</Button>
```

- `primary` is the only button that may appear more than once per screen.
- `received` carries an animated blue→black gradient and a glow; render it **only** when payday has arrived (`receiveDue`), never as a generic success button.
- `save`/`cancel` are the inline shift-edit pair — accent + danger, 6px radius, always side by side.
- `filter` is a chip; prefer `FilterTabs` for a whole group.
