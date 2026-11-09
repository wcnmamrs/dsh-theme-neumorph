/**
 * Minimal harness that loads `client.js` the way the Harness web client does:
 * it stubs `window.__ModuleLoader__` and a bare `document`, then hands the
 * returned definition a fake plugin context.
 *
 * It exists so the theme can be asserted without a browser: the plugin only
 * touches `document.createElement('style')`, `document.head.appendChild` and
 * `ctx.theme.overrideTokens`, which is a small enough surface to fake.
 */

/** @typedef {{ light: string, dark: string }} TokenPair */

/**
 * Load the plugin and apply it to a fake context.
 *
 * @returns {Promise<{
 *   id: string,
 *   inject: string[],
 *   tokens: Record<string, TokenPair>,
 *   css: string,
 *   styleEl: { dataset: Record<string, string>, textContent: string, removed: boolean },
 *   dispose: () => void,
 * }>}
 */
let loadCount = 0;

export async function loadTheme() {
  /** @type {any} */
  let definition = null;

  const styleEl = {
    dataset: /** @type {Record<string, string>} */ ({}),
    textContent: '',
    removed: false,
    remove() {
      this.removed = true;
    },
  };

  globalThis.window = /** @type {any} */ ({
    __ModuleLoader__: {
      load(candidate) {
        definition = candidate;
      },
    },
  });
  globalThis.document = /** @type {any} */ ({
    createElement: () => styleEl,
    head: { appendChild() {} },
  });

  // Cache-busted: every load must re-run the module body, exactly like a fresh page.
  await import(`../client.js?load=${++loadCount}`);
  if (definition === null) throw new Error('client.js never called __ModuleLoader__.load()');

  const plugin = definition.factory(() => {
    throw new Error('the theme must not require() anything at load time');
  });

  /** @type {Record<string, TokenPair> | null} */
  let tokens = null;
  /** @type {Array<() => void>} */
  const cleanups = [];

  const ctx = {
    effect(/** @type {() => (() => void) | void} */ fn) {
      const cleanup = fn();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    theme: {
      overrideTokens(/** @type {string} */ _source, /** @type {Record<string, TokenPair>} */ table) {
        tokens = table;
        return () => {
          tokens = null;
        };
      },
    },
  };

  plugin.apply(ctx);

  return {
    id: definition.id,
    inject: plugin.inject,
    get tokens() {
      return /** @type {Record<string, TokenPair>} */ (tokens);
    },
    css: styleEl.textContent,
    styleEl,
    dispose() {
      for (const cleanup of cleanups) cleanup();
    },
  };
}
