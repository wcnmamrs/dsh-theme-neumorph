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
 * Tags the stylesheet may name without a class or attribute qualifier. They are
 * the host's own form and code surfaces, plus the control tags whose focus ring
 * is drawn at tag level on purpose. Everything else must be reached through a
 * host class, because a bare tag also reaches into every third-party widget.
 */
const BARE_TAG_ALLOWLIST = new Set(['body', 'button', 'textarea', 'input', 'select', 'pre', 'a']);

/**
 * Class anchors that are *fragments* rather than complete host local names.
 * The host names its nodes with two conventions at once:
 *
 *   `<hash>_<local>`  ->  `wSkVaW_card`   (matched by `[class$="_card"]`)
 *   `_<local>_<hash>_<line>` -> `_card_7gxqk_107` (matched by `[class*="_card_"]`)
 *
 * so a complete local is always anchored twice, and a fragment anchor exists
 * only where the rule is deliberately broad (the BEM guard keeps it host-only).
 * Anything not listed here must be underscore-delimited.
 */
const FREE_FRAGMENTS = new Set([
  '_',
  '_label',
  '_title',
  '_value',
  '_text',
  '_name',
  '_desc',
  '_caption',
  '_hint',
  '_meta',
  '_timestamp',
  '_primary',
  // Exclusions inside the button selector: over-broad here is the safe
  // direction, because each one only subtracts a rule.
  '_row',
  '_tab',
  '_option',
  '_cell',
  '_switcher',
  '_segmented',
  '_tabs',
  '_groups',
  '_menu',
  '_callRow',
  '_panelRow',
  '_cardContent',
]);

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

/** Names of the functional pseudo-classes enclosing a position, innermost first. */
const enclosingFunctions = (/** @type {string} */ text, /** @type {number} */ index) => {
  const names = [];
  let depth = 0;
  for (let at = index - 1; at >= 0; at -= 1) {
    const character = text[at];
    if (character === ')') depth += 1;
    else if (character === '(') {
      if (depth === 0) names.push(text.slice(Math.max(0, at - 5), at));
      else depth -= 1;
    } else if (character === '{' || character === '}') break;
  }
  return names;
};

/** Every `[class*=…]` / `[class$=…]` anchor in the sheet, guard internals excluded. */
const classAnchors = (/** @type {string} */ css) =>
  [...stripComments(css).matchAll(/\[class([*$])="([^"]*)"\]/g)]
    .map((match) => ({ kind: match[1], value: match[2], index: match.index ?? 0 }))
    .filter((anchor) => anchor.value !== '__');

/** Bare type selectors in one rule header. */
const typeSelectors = (/** @type {string} */ header) => {
  const found = [];
  for (const match of header.matchAll(/(?:^|[\s,()>+~])([a-z][a-z0-9-]*)(?=$|[\s,{):>+~.\[])/g)) {
    found.push(match[1]);
  }
  return found;
};

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
  // Deliberate non-decision: the host's business-primary stays the host's blue.
  // It also paints focus rings and info banners, where the host's own contrast
  // has been tested; a second blue on screen is the cheaper of the two costs.
  assert.ok(!('--dsw-alias-state-business-primary' in table), 'business-primary was taken over');
});

test('inserts one stylesheet, from inside the effect, into the document root', async () => {
  const theme = await loadTheme();
  assert.equal(theme.styles.length, 1, 'more than one stylesheet was created');
  assert.ok(theme.appended.includes(theme.styleEl), 'the stylesheet was created but never inserted');
  assert.deepEqual(theme.appendedInEffect, [1], 'the stylesheet was inserted outside ctx.effect');
  assert.equal(theme.styleEl?.tagName, 'style');
  assert.equal(theme.styleEl?.dataset.dshTheme, 'dsh-theme-neumorph');
  assert.equal(theme.styleEl?.removed, false);
  assert.ok(theme.css.length > 3000, 'the shadow layer looks empty');
});

test('falls back to documentElement when the document has no head', async () => {
  const theme = await loadTheme({ withoutHead: true });
  assert.ok(theme.styleEl, 'the stylesheet was dropped when head was missing');
  assert.equal(theme.appended.includes(theme.styleEl), true, 'nothing reached the fallback root');
});

test('the host refusing the effect leaves nothing behind', async () => {
  const theme = await loadTheme({ effectRefuses: true });
  assert.equal(theme.applyErrors.length, 1, 'the refusal was swallowed instead of surfacing');
  assert.equal(theme.styles.length, 0, 'a stylesheet was created although no effect owns it');
  assert.equal(theme.appended.length, 0, 'a stylesheet was inserted although no effect owns it');
});

test('applying twice keeps a single live stylesheet', async () => {
  const theme = await loadTheme({ applies: 2 });
  const live = theme.styles.filter((node) => node.connected);
  assert.equal(live.length, 1, `a second apply stacked ${live.length} stylesheets`);
  assert.equal(theme.styles[0]?.removed, true, 'the stale sheet was left in the document');
});

test('ships a stylesheet that is balanced and free of host-external selectors', async () => {
  const { css } = await loadTheme();
  const rules = stripComments(css);

  assert.equal((rules.match(/\{/g) ?? []).length, (rules.match(/\}/g) ?? []).length, 'unbalanced braces');
  assert.equal((rules.match(/\(/g) ?? []).length, (rules.match(/\)/g) ?? []).length, 'unbalanced parens');

  // Third-party namespaces. The theme ships for the host only.
  assert.doesNotMatch(rules, /\bdshwv[-_]/);

  for (const rule of parseRules(css)) {
    for (const tag of typeSelectors(rule.header)) {
      assert.ok(
        BARE_TAG_ALLOWLIST.has(tag),
        `stylesheet styles a bare tag: ${tag} - a span is not text until the host says so`,
      );
    }
  }
});

test('every host anchor is guarded, underscore-delimited, and covers both conventions', async () => {
  const { css } = await loadTheme();
  const anchors = classAnchors(css);

  // 1. The BEM guard sits on the anchor itself, except where the anchor is
  //    already inside a :not(), where matching too much is the safe direction:
  //    all an over-broad exclusion can do is subtract one of our own rules.
  const flat = stripComments(css);
  for (const anchor of anchors) {
    const after = flat.slice(anchor.index + `[class${anchor.kind}="${anchor.value}"]`.length);
    const excluded = enclosingFunctions(flat, anchor.index).some((name) => name.includes('not'));
    if (excluded) continue;
    assert.ok(
      after.startsWith(':not([class*="__"])'),
      `anchor [class${anchor.kind}="${anchor.value}"] has no BEM guard`,
    );
  }

  // 2. Shapes. `$=` is a complete local; `*=` is either a complete local between
  //    underscores or one of the documented fragments. Nothing straddles a
  //    longer local (`[class*="_card"]` would also match `_cardContent_x_y`).
  for (const { kind, value } of anchors) {
    if (kind === '$') {
      assert.match(value, /^_[a-z][A-Za-z0-9]*$/, `suffix anchor is not a host local: ${value}`);
      continue;
    }
    if (FREE_FRAGMENTS.has(value)) continue;
    assert.match(
      value,
      /^_[a-z][A-Za-z0-9]*_$/,
      `substring anchor is not underscore-delimited: ${value}`,
    );
  }

  // 3. Both conventions, for every complete local the sheet names. Anchoring
  //    only `<hash>_<local>` leaves the pre-built app stylesheet untouched,
  //    which is most of the UI.
  const suffixLocals = anchors.filter((anchor) => anchor.kind === '$').map((anchor) => anchor.value);
  assert.ok(suffixLocals.length >= 8, 'the sheet stopped anchoring host locals at all');
  for (const local of new Set(suffixLocals)) {
    assert.ok(
      anchors.some((anchor) => anchor.kind === '*' && anchor.value === `${local}_`),
      `local ${local} is anchored for only one of the host's two class conventions`,
    );
  }
});

test('gives text fields a visible focus ring, drawn inside the field', async () => {
  const { css } = await loadTheme();
  const rules = parseRules(css);

  // No rule may switch focus indication off. A theme that does leaves a keyboard
  // user with no idea which box the caret is in.
  for (const rule of rules) {
    assert.doesNotMatch(rule.body, /outline:\s*none/, `a rule switches the outline off: ${rule.header.slice(0, 80)}`);
  }

  const rings = rules.filter(
    (rule) =>
      rule.header.includes(':focus-visible') &&
      /textarea|input|\[contenteditable/.test(rule.header) &&
      rule.body.includes('--dsw-alias-brand-primary'),
  );
  assert.equal(rings.length, 1, 'the text fields have no focus ring of their own');

  const [ring] = rings;
  assert.match(ring.body, /outline:\s*1\.5px solid var\(--dsw-alias-brand-primary\)/, 'the ring is not the accent');
  assert.match(ring.body, /outline-offset:\s*-2px/, 'the ring is drawn outside the field again');
  // An outline composes with the recessed shadow; replacing the shadow is what
  // used to hide the ring entirely.
  assert.doesNotMatch(ring.body, /box-shadow/, 'the ring replaced the recessed shadow');
  // Native checkables keep the host ring: it is the only thing they can show.
  for (const type of ['checkbox', 'radio', 'range', 'color']) {
    assert.ok(ring.header.includes(`:not([type="${type}"])`), `the field rule restyles ${type}`);
  }
});

test('leaves relief on surfaces only, and only on host anchors', async () => {
  const { css } = await loadTheme();
  const rules = parseRules(css);

  /** @param {string} anchor @param {string} shadow */
  const hasRelief = (anchor, shadow) =>
    rules.some((rule) => rule.header.includes(anchor) && rule.body.includes(shadow));

  assert.ok(hasRelief('_composerSeat', 'var(--qn-out)'), 'the composer slab lost its relief');
  assert.ok(hasRelief('_card_', 'var(--qn-drop)'), 'cards lost their relief');
  assert.ok(hasRelief('_menu_', 'var(--qn-out-lg)'), 'floating surfaces lost their relief');
  assert.ok(hasRelief('_sessionRow_', 'var(--qn-drop)'), 'session rows lost their relief');
  assert.ok(hasRelief('[data-menu-material]', 'var(--qn-out-lg)'), 'the menu material lost its relief');

  // The menu panel already clips its own material layer; a second `overflow`
  // rule here only risks cutting off a long menu's scroll.
  assert.doesNotMatch(css, /\[data-menu-material\]\s*\{[^}]*overflow/, 'the menu material is clipped again');
});

test('tearing the plugin down removes the stylesheet and the token layer', async () => {
  const theme = await loadTheme();
  assert.equal(theme.styleEl?.removed, false);

  theme.dispose();

  assert.equal(theme.styleEl?.removed, true, 'the stylesheet outlived the plugin');
  assert.equal(theme.styles.filter((node) => node.connected).length, 0, 'a sheet stayed connected');
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
  assert.equal(theme.styleEl?.removed, true, 'a rejected table leaked the stylesheet');
});

test('a table rejected for its radius entries retries with the colour-only subset', async () => {
  const theme = await loadTheme({ rejectTokens: 1 });

  assert.equal(theme.tokenCalls, 2, 'the colour-only retry did not run');
  const names = Object.keys(/** @type {Record<string, unknown>} */ (theme.tokens));
  assert.equal(names.length, TOKEN_COUNT - RADIUS_TOKENS.length, 'the retry kept radius tokens');
  for (const name of RADIUS_TOKENS) assert.ok(!names.includes(name), `${name} survived the retry`);
});
