# Form components

Specimen card: [`forms.card.html`](forms.card.html).

| Component | Notes |
| --- | --- |
| [`Input`](Input.jsx) | 2px radius, **warm taupe `#AFA593`** border — production's field border, and the brand's one non-cool gray. Focus adds the 3px sky ring. |
| [`Select`](Select.jsx) | Matches input geometry with a chevron in body gray. |
| [`Checkbox`](Checkbox.jsx) | 20px, 4px radius. Checked fills navy with a white check. |
| [`Radio`](Radio.jsx) | 20px pill; checked shows a navy border and navy center dot. |
| [`Switch`](Switch.jsx) | 44×24px track. Off gray-400, on **sky** — the one control where sky is the resting on-state fill. |

Labels sit above fields at 14px/600 in navy; helper text below at 12px in muted gray. Error
state swaps the border to `--pat-danger` with `--ring-error`.

See [`../../DESIGN.md`](../../DESIGN.md).
