/**
 * Minimal harness that loads `client.js` the way the Harness web client does:
 * it stubs `window.__ModuleLoader__` and a bare `document`, then hands the
 * returned definition a fake plugin context.
 *
 * The stub is deliberately strict where the plugin can fail quietly:
 *
 *  - `createElement` returns a fresh node per call, tagged with the real tag
 *    name, so "created a style, never appended it" is observable;
 *  - `head.appendChild` records the node, so a stylesheet that reaches no root
 *    cannot pass as inserted;
 *  - `remove()` detaches the node again, so a leak after dispose is visible;
 *  - `overrideTokens` can be told to reject, so the colour-only retry and the
 *    "rejected twice" path are both reachable from a test.
 */

/** @typedef {{ light: string, dark: string }} TokenPair */

/**
 * @typedef {object} HarnessOptions
 * @property {number} [rejectTokens] Number of leading `overrideTokens` calls
 *   that throw. `1` exercises the colour-only retry, `2` the total rejection.
 */

/**
 * Load the plugin and apply it to a fake context.
 *
 * @param {HarnessOptions} [options]
 * @returns {Promise<{
 *   id: string,
 *   inject: string[],
 *   tokens: Record<string, TokenPair> | null,
 *   css: string,
 *   styleEl: FakeNode,
 *   created: FakeNode[],
 *   appended: FakeNode[],
 *   tokenCalls: number,
 *   dispose: () => void,
 * }>}
 */
let loadCount = 0;

/**
 * @typedef {object} FakeNode
 * @property {string} tagName
 * @property {Record<string, string>} dataset
 * @property {string} textContent
 * @property {boolean} removed
 * @property {boolean} connected
 * @property {() => void} remove
 */

export async function loadTheme(options = {}) {
  const rejectTokens = options.rejectTokens ?? 0;

  /** @type {any} */
  let definition = null;

  /** @type {FakeNode[]} */
  const created = [];
  /** @type {FakeNode[]} */
  const appended = [];

  /** @type {FakeNode} */
  const root = {
    tagName: 'head',
    dataset: {},
    textContent: '',
    removed: false,
    connected: true,
    remove() {},
  };
  /** @type {any} */
  const head = {
    tagName: 'head',
    appendChild(/** @type {FakeNode} */ node) {
      appended.push(node);
      node.connected = true;
      return node;
    },
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
    head,
    documentElement: root,
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
      const cleanup = fn();
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

  let applyError = null;
  try {
    plugin.apply(ctx);
  } catch (error) {
    applyError = error;
  }
  if (applyError) throw applyError;

  const styleEl = created.find((node) => node.tagName === 'style');
  if (!styleEl) throw new Error('client.js never created a <style> element');

  return {
    id: definition.id,
    inject: plugin.inject,
    get tokens() {
      return tokens;
    },
    css: styleEl.textContent,
    styleEl,
    created,
    appended,
    get tokenCalls() {
      return tokenCalls;
    },
    dispose() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
