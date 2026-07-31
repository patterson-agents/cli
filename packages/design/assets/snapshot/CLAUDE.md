# Project notes

- The Claude Code marketplace lives at `uploads/claude-code-marketplace/` **deliberately**: the design-system compiler scans every other folder (including `scraps/`) and the marketplace's `ds/` snapshots duplicate component exports and break `_ds_bundle.js` if placed anywhere scanned. `uploads/` is excluded. Do not move it to the project root, `scraps/`, or `templates/`.
- The marketplace is generated FROM this project. When tokens/templates/kits change, re-copy the affected files into each plugin's `ds/` snapshot under `uploads/claude-code-marketplace/plugins/<name>/ds/` and bump versions in `plugin.json` + `.claude-plugin/marketplace.json`.
