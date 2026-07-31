**Alert** — inline message banner with a left accent bar. Tones map to semantic colors, plus a `brand` (navy/sky) variant.

```jsx
<Alert tone="success" title="Order placed" onClose={dismiss}>
  Your essentials ship in 1–2 days.
</Alert>
<Alert tone="warning">Three items are on backorder.</Alert>
```

Tones: `info`, `success`, `warning`, `danger`, `brand`. Pass `icon` and `onClose` as needed.
