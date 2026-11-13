# Changelog

## 1.0.2

Fixes from an external read-only review, all with a test behind them.

- **Text fields keep a focus indicator.** The theme used to set `outline: none`
  on `:focus` *and* `:focus-visible` for `input` / `textarea` /
  `[contenteditable]`, which also removed the host's own `:focus-visible` ring,
  and the recessed shadow then hid any replacement. Keyboard users had no way to
  see which field had the caret (WCAG 2.4.7). The ring is now drawn *inside* the
  field as a 1.5px steel-blue rim, so it reads as a pressed-in edge rather than
  an outer halo, and it is tested.
- **The stylesheet cannot leak.** `<style>` was inserted before `ctx.effect()`
  registered, so a host that rejected the token table twice left an orphaned
  sheet in `<head>` and a second `apply()` stacked a second copy. Insertion,
  token override and release now all happen inside the effect; a rejected table
  degrades to "shadows only" instead of throwing out of `apply()`.
- **Class-substring anchors carry a BEM guard.** `[class*="_"]` (buttons) and
  `[class*="_title"]`-style anchors (text) also matched a third-party
  `block__elem`. Every substring anchor now ends with `:not([class*="__"])`,
  since host names use a single underscore and BEM uses a double one.
- Dropped two dead selectors (`[class$="Card"]`, `[class*="Card "]` — host class
  names are lower-case and `<hash>_`-prefixed) and a redundant
  `overflow: hidden` on `[data-menu-material]` that could clip a long menu's own
  scrolling.
- README: the colour-only fallback is 66 tokens, not 58; screenshots use absolute
  `raw.githubusercontent.com` URLs so they also render on npm, which does not
  ship `assets/`.
- Tests: 7 → 11 checks, and the harness no longer lets a broken plugin pass.
  `createElement` returns a real node per call, `appendChild` records it, and
  `overrideTokens` can be told to reject — so "never inserted", "leaked after
  dispose" and "the retry never ran" are now failures instead of silent passes.

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
