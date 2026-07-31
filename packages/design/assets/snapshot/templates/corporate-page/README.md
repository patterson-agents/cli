# Corporate Page

Generic Patterson brand page shell: sticky nav, navy hero with the wave watermark, content
band, footer. Composed from the design system's own components.

Use it for any one-off corporate or marketing page. For a full site recreation, start from
[`../corporate-website`](../corporate-website) instead — this is the single-page subset.

## Structure

```
sticky nav  ->  navy hero (eyebrow, display headline, lead, button row)
            ->  content band (white)
            ->  navy footer
```

Alternate white and `--surface-subtle` bands for pacing, ~96px apart. Cap content at
`--container-max`. Buttons inside the navy hero use the `onDark` variant.

See [`../../DESIGN.md`](../../DESIGN.md) for the verified rules.
