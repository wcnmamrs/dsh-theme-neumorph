import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTheme } from './harness.mjs';

/** The palette is a fixed contract: the README and the market entry quote it. */
const TOKEN_COUNT = 72;
/** Tokens that carry a radius rather than a colour; the retry drops exactly these. */
const RADIUS_TOKENS = [
  '--dsw-radius-xs',
  '--dsw-radius-sm',
  '--dsw-radius-md',
  '--dsw-radius-lg',
  '--dsw-radius-xl',
  '--dsw-radius-panel',
];

/**
 * Tags the stylesheet is allowed to name without a class or attribute
 * qualifier. They are the host's own form and code surfaces, which are exactly
 * what the theme is for. Everything else must be reached through a host class,
 * because a bare tag also reaches into every third-party widget on the page.
 */
const BARE_TAG_ALLOWLIST = new Set(['textarea', 'input', 'select', 'pre']);

/** A class-substring anchor also matches the parts *inside* a card or a panel. */
const FORBIDDEN_SUBSTRING_ANCHORS = ['[class*="_card"]', '[class*="_panel"]'];

const stripComments = (/** @type {string} */ css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Split a flat stylesheet into `{ header, body }` pairs. */
const parseRules = (/** @type {string} */ css) =>
  stripComments(css)
    .split('}')
    .map((block) => {
      const at = block.indexOf('{');
      if (at === -1) return null;
      return { header: block.slice(0, at).trim(), body: block.slice(at + 1).trim() };
    })
    .filter(/** @returns {boolean} */ (rule) => Boolean(rule && rule.header));

test('registers under its package id and asks only for the theme service', async () => {
  const theme = await loadTheme();
  assert.equal(theme.id, 'dsh-theme-neumorph');
  assert.deepEqual(theme.inject, ['theme']);
});

test('overrides the full palette, every entry a light/dark pair', async () => {
  const { tokens } = await loadTheme();
  const names = Object.keys(/** @type {Record<string, unknown>} */ (tokens));

  assert.equal(names.length, TOKEN_COUNT, `the palette drifted: ${names.length} tokens`);
  for (const name of names) {
    assert.match(name, /^--dsw-[a-z0-9-]+$/, `${name} is not a --dsw-* token`);
    const pair = /** @type {Record<string, string>} */ (
      /** @type {Record<string, unknown>} */ (tokens)[name]
    );
    assert.equal(typeof pair, 'object', `${name} must be { light, dark }, not a bare string`);
    for (const mode of /** @type {const} */ (['light', 'dark'])) {
      assert.equal(typeof pair[mode], 'string', `${name}.${mode} is missing`);
      assert.ok(pair[mode].length > 0, `${name}.${mode} is empty`);
    }
  }

  // The retry path quotes this number too, so the two must agree.
  for (const name of RADIUS_TOKENS) assert.ok(names.includes(name), `${name} is missing`);
});

test('collapses every surface token onto one colour per mode', async () => {
  const { tokens } = await loadTheme();
  const table = /** @type {Record<string, { light: string, dark: string }>} */ (tokens);
  const surfaces = [
    '--dsw-alias-bg-base',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-layer-3',
    '--dsw-alias-bg-overlay',
    '--dsw-alias-bg-module-platform',
  ];

  for (const mode of /** @type {const} */ (['light', 'dark'])) {
    const distinct = new Set(surfaces.map((name) => table[name][mode]));
    assert.equal(distinct.size, 1, `${mode} surfaces disagree: ${[...distinct].join(', ')}`);
  }

  assert.equal(table['--dsw-alias-bg-base'].light, '#e0e5ec');
  assert.equal(table['--dsw-alias-bg-base'].dark, '#262b31');
});

test('keeps the steel-blue accent and leaves checkable controls alone', async () => {
  const table = /** @type {Record<string, { light: string, dark: string }>} */ (
    (await loadTheme()).tokens
  );
  assert.equal(table['--dsw-alias-brand-primary'].light, '#4a6b8a');
  // The switch thumb is host-owned; overriding it would hide the knob.
  assert.equal(table['--dsw-alias-switch-thumb'].light, '#f2f5f9');
});

test('inserts its stylesheet into the document root', async () => {
  const theme = await loadTheme();
  assert.ok(theme.appended.includes(theme.styleEl), 'the stylesheet was created but never inserted');
  assert.equal(theme.styleEl.tagName, 'style');
  assert.equal(theme.styleEl.dataset.dshTheme, 'dsh-theme-neumorph');
  assert.equal(theme.styleEl.removed, false);
  assert.ok(theme.css.length > 3000, 'the shadow layer looks empty');
});

test('ships a stylesheet that is balanced and free of host-external selectors', async () => {
  const { css } = await loadTheme();
  const rules = stripComments(css);

  assert.equal((rules.match(/\{/g) ?? []).length, (rules.match(/\}/g) ?? []).length, 'unbalanced braces');
  assert.equal((rules.match(/\(/g) ?? []).length, (rules.match(/\)/g) ?? []).length, 'unbalanced parentheses');

  // Bare-tag selectors, except the host's own form and code surfaces.
  for (const match of rules.matchAll(/\bbody\s+([a-z][a-z0-9-]*)\s*(?=[,{:\s])/g)) {
    const tag = match[1];
    assert.ok(
      BARE_TAG_ALLOWLIST.has(tag),
      `stylesheet styles a bare tag: body ${tag} - a span is not text until the host says so`,
    );
  }

  // Third-party namespaces. The theme ships for the host only.
  assert.doesNotMatch(rules, /\bdshwv[-_]/);

  for (const anchor of FORBIDDEN_SUBSTRING_ANCHORS) {
    assert.ok(!rules.includes(anchor), `substring anchor ${anchor} also matches nested parts`);
  }

  // Class-substring anchors must never reach a BEM namespace: the host names its
  // nodes `<hash>_<local>` (one underscore), a plugin names its own `block__elem`.
  for (const rule of parseRules(css)) {
    if (!rule.header.includes('[class*="_')) continue;
    assert.match(
      rule.header,
      /:not\(\[class\*="__"\]\)/,
      `class-substring anchor without a BEM guard: ${rule.header.slice(0, 90)}`,
    );
  }

  // Host class names are lower-case and carry a `<hash>_` prefix, so a camelCase
  // anchor can never match: it is dead weight that reads as if it did something.
  assert.doesNotMatch(rules, /\[class[$*]="[A-Z]/);
});

test('gives text fields a visible focus indicator, drawn inside the field', async () => {
  const { css } = await loadTheme();
  const field = /textarea|input|\[contenteditable/;
  const fieldRules = parseRules(css).filter((rule) => field.test(rule.header));

  const rims = fieldRules.filter(
    (rule) =>
      rule.header.includes(':focus-visible') &&
      rule.body.includes('inset 0 0 0') &&
      rule.body.includes('--dsw-alias-brand-primary'),
  );
  assert.equal(rims.length, 1, 'the text fields have no focus indicator of their own');

  // The host ring is an outer halo and reads as a stray edge on a soft surface,
  // so it is dropped - but only because the rim above replaces it.
  for (const rule of fieldRules) {
    const outline = rule.body.match(/outline:\s*([^;!]+)/)?.[1]?.trim();
    assert.ok(
      outline === undefined || outline === 'none',
      `a field draws an outer outline again: ${outline}`,
    );
  }
});

test('leaves relief on surfaces only, never on transparent full-width rows', async () => {
  const { css } = await loadTheme();
  assert.match(css, /\[class\*="_composerSeat"\]/, 'the composer slab lost its relief');
  assert.match(css, /\[data-menu-material\]/, 'floating surfaces lost their relief');
  assert.match(css, /_sessionRow/, 'session rows lost their relief');

  // The menu panel already clips its own material layer; a second `overflow`
  // rule here only risks cutting off a long menu's scroll.
  assert.doesNotMatch(css, /\[data-menu-material\]\s*\{[^}]*overflow/, 'the menu material is clipped again');
});

test('tearing the plugin down removes the stylesheet and the token layer', async () => {
  const theme = await loadTheme();
  assert.equal(theme.styleEl.removed, false);

  theme.dispose();

  assert.equal(theme.styleEl.removed, true, 'the stylesheet outlived the plugin');
  assert.equal(theme.tokens, null, 'the token layer outlived the plugin');
});

test('a rejected token table leaves shadows only, and leaves nothing behind', async () => {
  // Both the full table and the colour-only retry reject: the shadows must still
  // apply, apply() must not throw, and the sheet must not leak past dispose.
  const theme = await loadTheme({ rejectTokens: 2 });

  assert.equal(theme.tokenCalls, 2, 'the colour-only retry did not run');
  assert.equal(theme.tokens, null);
  assert.ok(theme.appended.includes(theme.styleEl), 'the shadows were dropped along with the table');

  theme.dispose();
  assert.equal(theme.styleEl.removed, true, 'a rejected table leaked the stylesheet');
});

test('a table rejected for its radius entries retries with the colour-only subset', async () => {
  const theme = await loadTheme({ rejectTokens: 1 });

  assert.equal(theme.tokenCalls, 2, 'the colour-only retry did not run');
  const names = Object.keys(/** @type {Record<string, unknown>} */ (theme.tokens));
  assert.equal(names.length, TOKEN_COUNT - RADIUS_TOKENS.length, 'the retry kept radius tokens');
  for (const name of RADIUS_TOKENS) assert.ok(!names.includes(name), `${name} survived the retry`);
});
