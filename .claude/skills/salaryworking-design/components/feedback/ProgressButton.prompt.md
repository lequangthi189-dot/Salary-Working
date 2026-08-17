One-line: button-shaped progress readout for the image-import steps.

```jsx
<ProgressButton value={62} label="Reading schedule…" />
<ProgressButton indeterminate label="Cross-checking with OCR…" />
<ProgressButton value={100} label="Done" />
```

Label the step in plain words — never "AI is thinking". Reaching 100 turns the fill and bar green with a ✓.
