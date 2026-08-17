One-line: shape-matching loading placeholder with a slow sheen.

```jsx
<Skeleton width="11rem" height="2.2rem" />
<Skeleton variant="text" lines={2} width="70%" />
<Skeleton variant="circle" size={40} />
```

Requires the `sw-skeleton-shimmer` keyframes (shipped in the card/kit stylesheets). Only on the first load of a screen — refreshes keep the old numbers on screen instead of flashing grey.
