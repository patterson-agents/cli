**Button** — the primary call-to-action in the Patterson brand; pill-shaped, navy by default, shifts to sky blue on hover. Use it whenever the user takes a discrete action.

```jsx
<Button variant="primary" size="md">What we do</Button>
<Button variant="outline">Learn more</Button>
<Button variant="sky" iconRight={<span>→</span>}>Join us</Button>
```

Variants: `primary` (solid navy → sky on hover), `sky` (solid sky → navy on hover), `outline`, `ghost`, `onDark` (white pill for navy backgrounds). Sizes: `sm` / `md` / `lg`. Props: `fullWidth`, `disabled`, `iconLeft`, `iconRight`. Buttons are always pill-radius — never square corners.
