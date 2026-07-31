# Components

React primitives that encode the brand. The compiler bundles every `.jsx` here that has a
sibling `.d.ts`, and exposes it on `window.PattersonCompaniesDesignSystem_3534f9`.

```js
const { Button, Card, Stat, Icon } = window.PattersonCompaniesDesignSystem_3534f9;
```

| Group | Components |
| --- | --- |
| [`core/`](core) | Button, IconButton, Icon, Badge, Stat, Card |
| [`forms/`](forms) | Input, Select, Checkbox, Radio, Switch |
| [`feedback/`](feedback) | Alert, Tabs |

## Anatomy of a component

Each lives in its group folder as three files:

- `Name.jsx` — the implementation.
- `Name.d.ts` — typed props. Also carries the `@startingPoint` doc tag.
- `Name.prompt.md` — usage notes for agents building with it.

The group's `*.card.html` renders the specimen shown in the Design System tab.

## The interaction contract

Every component follows the verified brand behaviour — see [`../DESIGN.md`](../DESIGN.md):

- **Buttons** are 5px, 15px/30px padding. Primary is navy `#003767` hovering to a *lighter
  navy* `#315D83`; secondary is a filled light blue `#6DCFF6` with a navy label. Pass
  `pill` to opt into the system's rounder shape — production has no pill radius.
- **Fields** are 2px radius with the warm taupe `#AFA593` border.
- **Focus** is the 3px sky ring, on every focusable thing.
- **Icons** come from the official font via `<Icon name="cart" />`.
