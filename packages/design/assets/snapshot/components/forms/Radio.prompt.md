**Radio** — single-select control with a sky dot. Use `Radio.Group` to render and manage a set.

```jsx
<Radio.Group
  name="market"
  value={market}
  onChange={setMarket}
  options={['Dental','Veterinary','Production animal']}
/>
```

Individual `<Radio>` is available for custom layouts.
