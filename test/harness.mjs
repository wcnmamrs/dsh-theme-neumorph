/**
 * Minimal harness that loads `client.js` the way the Harness web client does:
 * it stubs `window.__ModuleLoader__` and a bare `document`, then hands the
 * returned definition a fake plugin context.
 *
 * The stub is deliberately strict where the plugin can fail quietly:
 *
 *  - `createElement` returns a fresh node per call, tagged with the real tag
 *    name, so "created a style, never appended it" is observable;
 *  - the root records every `appendChild`, and remembers how many `ctx.effect`
 *    calls were open at that moment, so "appended outside the effect" - the
 *    shape that leaks a stylesheet on a throw - is observable too;
 *  - `remove()` detaches the node again, so a leak after dispose is visible;
 *  - `querySelectorAll` only understands the one selector the plugin uses to
 *    de-duplicate its own sheet, and throws on anything else instead of
 *    silently returning nothing;
 *  - `overrideTokens` can be told to reject, so the colour-only retry and the
 *    "rejected twice" path are both reachable from a test.
 */

/** @typedef {{ light: string, dark: string }} TokenPair */

/**
 * @typedef {object} FakeNode
 * @property {string} tagName
 * @property {Record<string, string>} dataset
 * @property {string} textContent
 * @property {boolean} removed
 * @property {boolean} connected
 * @property {() => void} remove
 */

/**
 * @typedef {object} HarnessOptions
 * @property {number} [rejectTokens] Number of leading `overrideTokens` calls
 *   that throw. `1` exercises the colour-only retry, `2` the total rejection.
 * @property {number} [applies] How many times `apply()` runs on the same page,
 *   the way a hot reload would.
 * @property {boolean} [effectRefuses] Make `ctx.effect` throw without running
 *   its callback, so nothing the plugin inserted should exist afterwards.
 * @property {boolean} [withoutHead] Leave `document.head` undefined, the way a
 *   document outside the normal load path can be, to exercise the fallback.
 */

let loadCount = 0;

/**
 * Load the plugin and apply it to a fake context.
 *
 * @param {HarnessOptions} [options]
 * @returns {Promise<{
 *   id: string,
 *   inject: string[],
 *   tokens: Record<string, TokenPair> | null,
 *   css: string,
 *   styleEl: FakeNode | null,
 *   styles: FakeNode[],
 *   created: FakeNode[],
 *   appended: FakeNode[],
 *   appendedInEffect: number[],
 *   tokenCalls: number,
 *   dispose: () => void,
 * }>}
 */
export async function loadTheme(options = {}) {
  const rejectTokens = options.rejectTokens ?? 0;
  const applies = options.applies ?? 1;

  /** @type {any} */
  let definition = null;

  /** @type {FakeNode[]} */
  const created = [];
  /** @type {FakeNode[]} */
  const appended = [];
  /** Effect depth at each append, in call order. */
  const appendedInEffect = [];

  let effectDepth = 0;

  /** Both roots record the same way: a fallback insert must be as visible as a
   *  normal one, otherwise the fallback path is untestable. */
  const record = (/** @type {FakeNode} */ node) => {
    appended.push(node);
    appendedInEffect.push(effectDepth);
    node.connected = true;
    return node;
  };

  /** @type {FakeNode} */
  const documentElement = {
    tagName: 'html',
    dataset: {},
    textContent: '',
    removed: false,
    connected: true,
    remove() {},
    appendChild: record,
  };
  /** @type {any} */
  const head = {
    tagName: 'head',
    dataset: {},
    textContent: '',
    removed: false,
    connected: true,
    remove() {},
    appendChild: record,
  };

  /** @returns {FakeNode} */
  const makeNode = (/** @type {string} */ tagName) => {
    /** @type {FakeNode} */
    const node = {
      tagName: String(tagName).toLowerCase(),
      dataset: {},
      textContent: '',
      removed: false,
      connected: false,
      remove() {
        node.removed = true;
        node.connected = false;
      },
    };
    created.push(node);
    return node;
  };

  globalThis.window = /** @type {any} */ ({
    __ModuleLoader__: {
      load(candidate) {
        definition = candidate;
      },
    },
  });
  globalThis.document = /** @type {any} */ ({
    createElement: makeNode,
    head: options.withoutHead ? undefined : head,
    documentElement,
    querySelectorAll(/** @type {string} */ selector) {
      const match = /^style\[data-dsh-theme="(.+)"\]$/.exec(selector.trim());
      if (!match) throw new Error(`harness does not understand the selector: ${selector}`);
      return appended.filter((node) => node.connected && node.dataset.dshTheme === match[1]);
    },
  });

  // Cache-busted: every load must re-run the module body, exactly like a fresh page.
  await import(`../client.js?load=${++loadCount}`);
  if (definition === null) throw new Error('client.js never called __ModuleLoader__.load()');

  const plugin = definition.factory(() => {
    throw new Error('the theme must not require() anything at load time');
  });

  /** @type {Record<string, TokenPair> | null} */
  let tokens = null;
  let tokenCalls = 0;
  /** @type {Array<() => void>} */
  const cleanups = [];

  const ctx = {
    effect(/** @type {() => (() => void) | void} */ fn) {
      if (options.effectRefuses) throw new Error('the host refused to register the effect');
      effectDepth += 1;
      let cleanup;
      try {
        cleanup = fn();
      } finally {
        effectDepth -= 1;
      }
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    theme: {
      overrideTokens(/** @type {string} */ _source, /** @type {Record<string, TokenPair>} */ table) {
        tokenCalls += 1;
        if (tokenCalls <= rejectTokens) throw new TypeError('host rejected the token table');
        tokens = table;
        return () => {
          tokens = null;
        };
      },
    },
  };

  /** @type {unknown[]} */
  const applyErrors = [];
  for (let run = 0; run < applies; run += 1) {
    try {
      plugin.apply(ctx);
    } catch (error) {
      // A throw here is not the finding: what the throw leaves behind is.
      applyErrors.push(error);
    }
  }

  const styles = created.filter((node) => node.tagName === 'style');
  const liveStyles = styles.filter((node) => node.connected);

  return {
    id: definition.id,
    inject: plugin.inject,
    get tokens() {
      return tokens;
    },
    css: liveStyles.at(-1)?.textContent ?? styles.at(-1)?.textContent ?? '',
    styleEl: liveStyles.at(-1) ?? null,
    styles,
    created,
    appended,
    appendedInEffect,
    applyErrors,
    get tokenCalls() {
      return tokenCalls;
    },
    dispose() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
