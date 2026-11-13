/**
 * Client half of the Neumorph theme.
 *
 * Neumorphism cannot be expressed with colour tokens alone: it needs paired
 * soft shadows (a light rim and a dark rim) and rounded corners. So this
 * plugin does three things:
 *
 *  1. stacks a token override layer on `ctx.theme` that collapses every
 *     surface token (base, layer-1..3, overlay, menu, selector, tip, button
 *     fills, code panels, scrollbars) onto one cool-grey family, so no hard
 *     white block survives to break the illusion;
 *  2. rounds the shared radius tokens, so corners are soft everywhere;
 *  3. injects a stylesheet that gives controls, fields, panels and the
 *     composer the raised / pressed shadow pair.
 *
 * Everything is registered inside `ctx.effect`, so disabling the plugin
 * restores the host look exactly.
 */

window.__ModuleLoader__.load({
  id: 'dsh-theme-neumorph',
  factory(require) {
    const SOURCE = 'dsh-theme-neumorph';

    /**
     * The palette is a handful of families, not 72 unrelated values. Naming
     * them once keeps the table honest: every surface below is literally the
     * same colour, so nothing can drift back to a slightly-off grey.
     */
    /** The page itself: every surface, card and chip sits on this one colour. */
    const SURFACE = { light: '#e0e5ec', dark: '#262b31' };
    /** Chips that must vanish into the surface instead of drawing a plate. */
    const FLAT = { light: 'transparent', dark: 'transparent' };
    /** Scrollbar thumb, resting and hovered. */
    const SCROLL = { light: '#c9d2dd', dark: '#3a424a' };
    const SCROLL_HOVER = { light: '#b9c4d1', dark: '#4a535d' };
    /** Hover wash for rows and triggers: a shade, never a second colour. */
    const HOVER = { light: '#d8dfe8', dark: '#2c333b' };
    /** Floating surfaces that must stay legible above everything else. */
    const FLOAT = { light: '#333d49', dark: '#3a444f' };

    /** Cool-grey soft-UI palette: one surface family, steel-blue accent. */
    const TOKENS = {
      // ---- surfaces: ONE colour, shadows do all the separating --------------
      // Neumorphism is monochrome: every surface is the same colour as the page,
      // and only light and shade tell them apart. Anything that used to be a
      // slightly darker chip (icon plates, label plates, code bars, group
      // headers) therefore disappears into the surface instead of showing as a
      // rectangle behind the text.
      '--dsw-alias-bg-base': SURFACE,
      '--dsw-alias-bg-layer-1': SURFACE,
      '--dsw-alias-bg-layer-2': SURFACE,
      '--dsw-alias-bg-layer-3': SURFACE,
      '--dsw-alias-bg-overlay': SURFACE,
      '--dsw-alias-bg-module-platform': SURFACE,
      '--dsw-alias-bg-document-preview': SURFACE,
      '--dsw-alias-bg-multi-select': SURFACE,
      '--dsw-specific-sidebar-fill': SURFACE,
      '--dsw-specific-input-major': SURFACE,
      '--dsw-specific-selector': FLAT,
      '--dsw-specific-tip': FLAT,
      '--dsw-specific-login-input': SURFACE,
      '--dsw-menu-surface-fill': { light: '#e0e5ecf5', dark: '#262b31f5' },
      '--dsw-alias-menu-group-header-fill': FLAT,
      '--dsw-specific-bubble': FLAT,
      '--dsw-specific-bubble-highlight': FLAT,
      '--dsw-specific-sidebar-nav-item-active': FLAT,
      '--dsw-specific-sidebar-nav-item-active-accent': FLAT,

      // ---- button fills: the same colour, relief comes from the shadow -----
      '--dsw-alias-button-elevated-fill': FLAT,
      '--dsw-alias-button-floating-fill': FLAT,
      '--dsw-alias-button-floating-hover': FLAT,
      '--dsw-alias-button-ghost-active-fill': FLAT,
      '--dsw-alias-button-ghost-active-hover': FLAT,
      '--dsw-alias-button-primary-dimmed': FLAT,
      '--dsw-alias-button-contrast-fill': { light: '#3a4450', dark: '#c9d3de' },
      '--dsw-alias-interactive-bg-hover-solid': FLAT,

      // ---- code and inline panels: recessed, not tinted --------------------
      '--dsw-alias-markdown-code-block': FLAT,
      '--dsw-alias-markdown-code-block-banner': FLAT,
      '--dsw-alias-markdown-inline-code': FLAT,
      '--dsw-alias-markdown-code-segment-selected': FLAT,
      '--dsw-alias-markdown-code-segment-unselected': FLAT,
      '--dsw-alias-markdown-citation': FLAT,
      '--dsw-alias-markdown-tag': FLAT,
      '--dsw-alias-markdown-placeholder': FLAT,

      // ---- floating chrome: the only things allowed to differ --------------
      '--dsw-alias-toast-bg': FLOAT,
      '--dsw-alias-tooltip-bg': FLOAT,
      '--dsw-alias-switch-thumb': { light: '#f2f5f9', dark: '#cfd6df' },
      '--dsw-alias-scrollbar-bg-l1': SCROLL,
      '--dsw-alias-scrollbar-bg-l2': SCROLL,
      '--dsw-alias-scrollbar-hover-l1': SCROLL_HOVER,
      '--dsw-alias-scrollbar-hover-l2': SCROLL_HOVER,

      // ---- hairlines: effectively gone, shadows replace them ---------------
      '--dsw-alias-settings-card-fill': SURFACE,
      '--dsw-alias-onboarding-card-fill': SURFACE,
      '--dsw-alias-onboarding-secondary-fill': SURFACE,
      '--dsw-alias-turn-trigger-bg': SURFACE,
      '--dsw-alias-turn-trigger-bg-hover': HOVER,
      '--dsw-alias-button-tool-bar-fill': SURFACE,
      '--dsw-alias-tooltip-key-bg': { light: '#3a444f', dark: '#3a444f' },
      '--dsw-alias-bg-skeleton': HOVER,
      '--dsw-alias-border-l1': { light: '#0000000a', dark: '#ffffff0a' },
      '--dsw-alias-border-l2': { light: '#00000014', dark: '#ffffff14' },
      '--dsw-alias-border-l3': { light: '#00000018', dark: '#ffffff18' },
      '--dsw-alias-border-l4': { light: '#0000001e', dark: '#ffffff1e' },

      // ---- type -------------------------------------------------------------
      '--dsw-alias-label-primary': { light: '#333d49', dark: '#e4e9ef' },
      '--dsw-alias-label-secondary': { light: '#6b7683', dark: '#9aa5b1' },
      '--dsw-alias-label-tertiary': { light: '#7d8794', dark: '#8b96a3' },
      '--dsw-alias-label-caption': { light: '#8d97a3', dark: '#7f8a97' },
      '--dsw-alias-link': { light: '#4a6b8a', dark: '#8fb4d4' },

      // ---- steel-blue accent ------------------------------------------------
      '--dsw-alias-brand-primary': { light: '#4a6b8a', dark: '#7ea6c9' },
      '--dsw-alias-button-info-fill': { light: '#4a6b8a', dark: '#5f86ab' },
      '--dsw-alias-button-info-hover': { light: '#55789a', dark: '#6d93b7' },

      // ---- states -----------------------------------------------------------
      '--dsw-alias-state-error-primary': { light: '#b4463c', dark: '#e08379' },
      '--dsw-alias-state-success-primary': { light: '#3f7d5f', dark: '#6fb894' },
      '--dsw-alias-state-warn-primary': { light: '#a8722c', dark: '#d9a25c' },
      '--dsw-alias-state-idle-primary': { light: '#b9c3cf', dark: '#5b6672' },

      // ---- soft corners everywhere -----------------------------------------
      '--dsw-radius-xs': { light: '6px', dark: '6px' },
      '--dsw-radius-sm': { light: '10px', dark: '10px' },
      '--dsw-radius-md': { light: '14px', dark: '14px' },
      '--dsw-radius-lg': { light: '18px', dark: '18px' },
      '--dsw-radius-xl': { light: '22px', dark: '22px' },
      '--dsw-radius-panel': { light: '26px', dark: '26px' },
    };

    /**
     * The host ships two CSS-module naming conventions at once:
     *
     *   - the pre-built app stylesheet names its classes `_<local>_<hash>_<line>`
     *     (`_card_7gxqk_107`);
     *   - the component styles injected from JS name theirs `<hash>_<local>`
     *     (`wSkVaW_card`).
     *
     * So an anchor for a local name has to cover both, and it must not straddle
     * a longer local: `_card_` never matches `_cardContent_1a2b_9`, while a bare
     * `[class*="_card"]` would. Every anchor also refuses a double underscore,
     * because that is how a plugin names its own elements (`panel__card`) and no
     * host class contains one.
     */
    const guard = (anchor) => `${anchor}:not([class*="__"])`;

    /** Anchors on a free-form class fragment (`_title`, `_label`). */
    const sub = (...fragments) =>
      fragments.map((fragment) => guard(`[class*="${fragment}"]`)).join(',\n  ');

    /** Anchors on a complete local name, in both host conventions. */
    const host = (...locals) =>
      locals
        .flatMap((local) => [`[class$="_${local}"]`, `[class*="_${local}_"]`])
        .map(guard)
        .join(',\n  ');

    /** A host button: anything the host painted with a class, minus the cases
     *  below. Kept as one constant so the three states cannot drift apart. */
    const BUTTON_SELECTOR = `body :where(button, [role="button"])[class*="_"]:not([class*="__"]):not([aria-checked]):not([role="checkbox"]):not([role="radio"]):not(:is(${host(
      'primary',
    )})):not([role="menuitem"]):not([role="option"]):not([role="tab"]):not([class*="_callRow"]):not([class*="_panelRow"]):not([class*="_cardContent"]):not([class*="_row"]):not([class*="_tab"]):not([class*="_option"]):not([class*="_cell"]):not([class*="_switcher"]):not([class*="_segmented"]):not(:is([role="menu"], [role="tablist"], [role="listbox"], [data-menu-material], [class*="_tabs"], [class*="_groups"], [class*="_menu"]) *)`;

    const CSS = `
body {
  --qn-hi: #ffffff;
  --qn-lo: rgba(163, 177, 198, 0.6);
  --qn-out-sm: -2px -2px 5px var(--qn-hi), 3px 3px 6px var(--qn-lo);
  --qn-out: -4px -4px 10px var(--qn-hi), 5px 5px 12px var(--qn-lo);
  --qn-out-lg: -5px -5px 14px var(--qn-hi), 7px 7px 17px var(--qn-lo);
  --qn-in-sm: inset 2px 2px 5px var(--qn-lo), inset -2px -2px 5px var(--qn-hi);
  --qn-in: inset 3px 3px 7px var(--qn-lo), inset -3px -3px 7px var(--qn-hi);
  /* Repeated controls and list rows cast downward only: a rim light on every
     item in a stack reads as alternating high/low, which is exactly what
     neumorphism must avoid. One light source, one direction. */
  --qn-drop-1: rgba(163, 177, 198, 0.6);
  --qn-drop-2: rgba(90, 110, 135, 0.1);
  --qn-drop: 0 2px 6px var(--qn-drop-1), 0 1px 2px var(--qn-drop-2);
  --qn-drop-lift: 0 3px 9px var(--qn-drop-1), 0 1px 3px var(--qn-drop-2);
}

body[data-ds-dark-theme] {
  --qn-hi: rgba(255, 255, 255, 0.055);
  --qn-lo: rgba(0, 0, 0, 0.62);
  --qn-drop-1: rgba(0, 0, 0, 0.55);
  --qn-drop-2: rgba(0, 0, 0, 0.35);
}

/* ---- text is flat ------------------------------------------------------
   Text never carries a plate of its own: a label sits on the surface, it does
   not sit in a slightly different rectangle. Only host markup is touched, and
   only by the name the host gives it (see the host/sub helpers above), so a plugin's
   own elements are never repainted. Nothing here targets a bare tag: a span is
   not text until the host says so. */
body :is(${sub('_label', '_title', '_value', '_text', '_name', '_desc', '_caption', '_hint', '_meta', '_timestamp')}, ${host(
  'itemLabel',
  'runStateLabel',
  'dockHintLabel',
  'clickableLabel',
  'labelGroup',
  'tabTitle',
  'floatTitle',
  'failedTitle',
  'stringValue',
  'numberValue',
  'otherValue',
  'keywordValue',
  'popoverText',
)}) {
  background-color: transparent !important;
  box-shadow: none !important;
}

/* ---- controls: soft, raised --------------------------------------------
   Buttons are objects again: a filled shape with the same paired light and
   shade as the surface around it. Full-width rows and every control that
   lives inside a menu, a tab strip or a picker are excluded, because a
   shadow under a row that spans the panel reads as a stray line, and a
   stack of them reads as alternating high and low. */
${BUTTON_SELECTOR} {
  border-radius: 12px !important;
  border-color: transparent !important;
  background-color: var(--dsw-alias-bg-base) !important;
  box-shadow: var(--qn-out-sm) !important;
}

${BUTTON_SELECTOR}:hover:not(:disabled) {
  box-shadow: var(--qn-out) !important;
}

${BUTTON_SELECTOR}:active:not(:disabled) {
  box-shadow: var(--qn-in-sm) !important;
}

/* The send button is a filled pill and keeps one soft shadow of its own. */
body :where(button, [role="button"]):is(${host('primary')}) {
  border-radius: 999px !important;
  border-color: transparent !important;
  box-shadow: 0 3px 8px rgba(74, 107, 138, 0.28) !important;
}

body :where(button, [role="button"]):is(${host('primary')}):hover:not(:disabled) {
  box-shadow: 0 4px 10px rgba(74, 107, 138, 0.34) !important;
}

body :where(button, [role="button"]):is(${host('primary')}):active:not(:disabled) {
  box-shadow: inset 2px 2px 5px rgba(0, 0, 0, 0.26) !important;
}

/* ---- text fields: pressed into the surface ------------------------------ */
body :where(
  textarea,
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),
  [contenteditable="true"]
) {
  box-shadow: var(--qn-in) !important;
  border-radius: 14px !important;
  border-color: transparent !important;
}

/* ---- cards: the only panels that get relief ----------------------------
   Deliberately narrow. Rows, tabs, chips, list items and every other small
   block stay flat: a shadow on each of them turns the page into a field of
   pillows, which is not what neumorphism is for. */
body :is(${host('card')}) {
  box-shadow: var(--qn-drop) !important;
  border-color: transparent !important;
}

/* ---- composer: the one big soft slab ------------------------------------ */
body :is(${host('composerSeat')}) :is(${host('card')}),
body :is(${host('composerHero')}) :is(${host('card')}) {
  box-shadow: var(--qn-out) !important;
  border-radius: 22px !important;
  border-color: transparent !important;
}

/* ---- floating surfaces: menus, dialogs, tooltips ------------------------ */
body :where([role="menu"], [role="dialog"], [role="listbox"], [role="tooltip"]),
body [data-menu-material],
body :is(${host('menu', 'dialog')}) {
  border-radius: 20px !important;
  box-shadow: var(--qn-out-lg) !important;
}

/* The menu panel carries the fill; its material layer has to inherit the
   rounding, otherwise the list paints over the corners. */
body [data-menu-material] > [aria-hidden="true"] {
  border-radius: inherit !important;
}

/* ---- session tree: one soft row per session ----------------------------- */
body :is(${host('sessionRow', 'projectRow')}) {
  border-radius: 12px !important;
  box-shadow: var(--qn-drop) !important;
}

body :is(${host('sessionRow', 'projectRow')}):hover {
  box-shadow: var(--qn-drop-lift) !important;
}

/* ---- code blocks: recessed ---------------------------------------------- */
body :where(pre) {
  box-shadow: var(--qn-in-sm) !important;
  border-radius: 14px !important;
  border-color: transparent !important;
}

/* ---- sidebar: a faint groove instead of a divider line ------------------ */
body :is(${host('sidebarCol')}) {
  box-shadow: inset -8px 0 14px -14px var(--qn-lo) !important;
}

/* ---- focus: a ring, drawn inside the field -----------------------------
   The host draws its ring outside the box, which on a soft surface reads as a
   stray edge floating beside the field. So the ring is moved inward instead of
   removed: an outline with a negative offset follows the border radius, composes
   with the recessed shadow instead of replacing it, and still exists for every
   control type - including the checkable ones this sheet never restyles, which
   keep the host ring untouched. A theme that sets outline: none on a focus
   state leaves a keyboard user with no idea where they are; this one does not. */
body :where(
  textarea,
  input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),
  select,
  [contenteditable="true"]
):focus-visible {
  outline: 1.5px solid var(--dsw-alias-brand-primary) !important;
  outline-offset: -2px !important;
}

body :where(button, [role="button"], a):focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
`;

    return {
      inject: ['theme'],
      apply(ctx) {
        // Colour table: `overrideTokens` returns the disposer for exactly this
        // layer. The radius tokens are the only non-colour entries, so they are
        // what gets dropped first if a host build ever rejects the table.
        const overrideTokens = () => {
          try {
            return ctx.theme.overrideTokens(SOURCE, TOKENS);
          } catch (error) {
            const colorsOnly = Object.fromEntries(
              Object.entries(TOKENS).filter(([name]) => !name.startsWith('--dsw-radius-')),
            );
            console.warn('[dsh-theme-neumorph] full token table rejected, retrying without radius tokens', error);
            return ctx.theme.overrideTokens(SOURCE, colorsOnly);
          }
        };

        // Everything the plugin adds is created and released inside one effect:
        // a stylesheet inserted before the effect registered would outlive a
        // throw, and a second apply would stack a second copy of it. So the old
        // sheet of this source is dropped first, and a throw after insertion
        // takes the sheet back out again.
        ctx.effect(() => {
          const root = document.head ?? document.documentElement;
          for (const stale of document.querySelectorAll?.(`style[data-dsh-theme="${SOURCE}"]`) ?? []) {
            stale.remove();
          }

          // Shadow layer: neumorphism needs paired soft shadows, and a theme
          // token can only carry a colour, so the shadows are a stylesheet of
          // their own.
          const style = document.createElement('style');
          style.dataset.dshTheme = SOURCE;
          style.textContent = CSS;

          let disposeTokens = null;
          try {
            root.appendChild(style);
            disposeTokens = overrideTokens();
          } catch (error) {
            // Whatever happened, this effect owns what it inserted: give it back
            // before getting out of the way. The one exception is the token
            // table, which has a colour-only retry of its own; if even that is
            // rejected the shadows are still worth keeping, so report and carry on.
            if (style.parentNode === null && disposeTokens === null) {
              style.remove();
              throw error;
            }
            console.warn('[dsh-theme-neumorph] token layer rejected, shadows only', error);
          }

          return () => {
            // Sheet first: one frame of host colours is better than one frame of
            // plugin shadows over the host's own palette.
            style.remove();
            disposeTokens?.();
          };
        });
      },
    };
  },
});
