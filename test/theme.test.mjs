import assert from 'node:assert/strict';
import test from 'node:test';

import { loadTheme } from './harness.mjs';

/** Rules that a theme must not contain: they reach into markup it does not own. */
const FORBIDDEN_SELECTOR_PATTERNS = [
  // Bare-tag rules: `body span`, `body button`, `body div` - a span is not text
  // and a button is not a control until the host says so. These are what once
  // erased a switch thumb and a widget's icon bars.
  // A bare tag with no class/attribute qualifier: `body span {`, `body button {`.
  /(^|[\s,{])body\s+(span|button|div|a|p|label|svg|img)\s*[,{]\s*$/m,
  // Third-party namespaces. The theme ships for the harness only.
  /\bdshwv[-_]/,
];

/**
 * Class-substring anchors that also match the parts *inside* a card or a panel
 * (`_cardContent`, `_panelRow`). A whole-class anchor (`[class$="_card"]`) is the
 * only form that is allowed to carry relief.
 */
const FORBIDDEN_SUBSTRING_ANCHORS = ['[class*="_card"]', '[class*="_panel"]'];

test('registers under its package id and asks only for the theme service', async () => {
  const theme = await loadTheme();
  assert.equal(theme.id, 'dsh-theme-neumorph');
  assert.deepEqual(theme.inject, ['theme']);
});

test('overrides a full palette, every entry a light/dark pair', async () => {
  const { tokens } = await loadTheme();
  const names = Object.keys(tokens);

  assert.ok(names.length >= 70, `expected the full palette, got ${names.length} tokens`);
  for (const name of names) {
    assert.match(name, /^--dsw-[a-z0-9-]+$/, `${name} is not a --dsw-* token`);
    const pair = tokens[name];
    assert.equal(typeof pair, 'object', `${name} must be { light, dark }, not a bare string`);
    for (const mode of /** @type {const} */ (['light', 'dark'])) {
      assert.equal(typeof pair[mode], 'string', `${name}.${mode} is missing`);
      assert.ok(pair[mode].length > 0, `${name}.${mode} is empty`);
    }
  }
});

test('collapses every surface token onto one colour per mode', async () => {
  const { tokens } = await loadTheme();
  const surfaces = [
    '--dsw-alias-bg-base',
    '--dsw-alias-bg-layer-1',
    '--dsw-alias-bg-layer-2',
    '--dsw-alias-bg-layer-3',
    '--dsw-alias-bg-overlay',
    '--dsw-alias-bg-module-platform',
  ];

  for (const mode of /** @type {const} */ (['light', 'dark'])) {
    const distinct = new Set(surfaces.map((name) => tokens[name][mode]));
    assert.equal(distinct.size, 1, `${mode} surfaces disagree: ${[...distinct].join(', ')}`);
  }

  assert.equal(tokens['--dsw-alias-bg-base'].light, '#e0e5ec');
  assert.equal(tokens['--dsw-alias-bg-base'].dark, '#262b31');
});

test('keeps the steel-blue accent and leaves checkable controls alone', async () => {
  const { tokens } = await loadTheme();
  assert.equal(tokens['--dsw-alias-brand-primary'].light, '#4a6b8a');
  // The switch thumb is host-owned; overriding it would hide the knob.
  assert.equal(tokens['--dsw-alias-switch-thumb'].light, '#f2f5f9');
});

test('ships a stylesheet that is balanced and free of host-external selectors', async () => {
  const { css } = await loadTheme();
  // Comments are prose, not selectors: drop them before the structural checks.
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

  assert.ok(css.length > 3000, 'the shadow layer looks empty');
  assert.equal((rules.match(/\{/g) ?? []).length, (rules.match(/\}/g) ?? []).length, 'unbalanced braces');
  assert.equal((rules.match(/\(/g) ?? []).length, (rules.match(/\)/g) ?? []).length, 'unbalanced parentheses');

  for (const pattern of FORBIDDEN_SELECTOR_PATTERNS) {
    assert.doesNotMatch(rules, pattern, `stylesheet contains a forbidden selector: ${pattern}`);
  }
  for (const anchor of FORBIDDEN_SUBSTRING_ANCHORS) {
    assert.ok(!rules.includes(anchor), `substring anchor ${anchor} also matches nested parts`);
  }
});

test('leaves relief on surfaces only, never on transparent full-width rows', async () => {
  const { css } = await loadTheme();
  assert.match(css, /\[class\*="_composerSeat"\]/, 'the composer slab lost its relief');
  assert.match(css, /\[data-menu-material\]/, 'floating surfaces lost their relief');
  assert.match(css, /_sessionRow/, 'session rows lost their relief');
});

test('tearing the plugin down removes the stylesheet and the token layer', async () => {
  const theme = await loadTheme();
  assert.equal(theme.styleEl.dataset.dshTheme, 'dsh-theme-neumorph');
  assert.equal(theme.styleEl.removed, false);

  theme.dispose();

  assert.equal(theme.styleEl.removed, true, 'the stylesheet outlived the plugin');
  assert.equal(theme.tokens, null, 'the token layer outlived the plugin');
});
