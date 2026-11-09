# Changelog

## 1.0.1

- Tests: `test/` now loads `client.js` through the same `__ModuleLoader__`
  contract the web client uses and asserts the palette, the stylesheet
  structure and the teardown path (7 checks, no browser required).
- CI: `.github/workflows/ci.yml` runs syntax, manifest and tests on Node 20/22/24
  plus a `npm pack --dry-run` so a broken `files` list cannot ship.
- `scripts/verify-manifest.mjs` checks `dsh.bundle.patch`, the `cordis.patch.yml`
  insert id, every path in `files`, and that no shipped file leaks a local path.
- Palette: the repeated colour literals are now named families (`SURFACE`,
  `FLAT`, `SCROLL`, `SCROLL_HOVER`, `HOVER`, `FLOAT`). Same 72 tokens, byte-identical
  stylesheet — the table can no longer drift by a hand-edited hex.
- Send button rules are anchored on `:where(button, [role="button"])[class*="_primary"]`
  instead of the bare `button` tag.

## 1.0.0

- First release: cool-grey neumorphism (light `#e0e5ec` / dark `#262b31`),
  steel-blue accent (`#4a6b8a`), 72 `--dsw-*` tokens, paired soft shadows.
- Relief is limited to cards, the composer slab, text fields, floating surfaces
  and session rows; buttons are filled objects, never floating plates.
- Every rule is anchored on host CSS-module class names, so third-party plugin UI
  is left untouched.
