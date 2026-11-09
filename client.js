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

    /** Cool-grey soft-UI palette: one surface family, steel-blue accent. */
    const TOKENS = {
      // ---- surfaces: ONE colour, shadows do all the separating --------------
      // Neumorphism is monochrome: every surface is the same colour as the page,
      // and only light and shade tell them apart. Anything that used to be a
      // slightly darker chip (icon plates, label plates, code bars, group
      // headers) therefore disappears into the surface instead of showing as a
      // rectangle behind the text.
      '--dsw-alias-bg-base': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-layer-1': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-layer-2': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-layer-3': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-overlay': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-module-platform': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-document-preview': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-bg-multi-select': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-specific-sidebar-fill': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-specific-input-major': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-specific-selector': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-tip': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-login-input': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-menu-surface-fill': { light: '#e0e5ecf5', dark: '#262b31f5' },
      '--dsw-alias-menu-group-header-fill': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-bubble': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-bubble-highlight': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-sidebar-nav-item-active': { light: 'transparent', dark: 'transparent' },
      '--dsw-specific-sidebar-nav-item-active-accent': { light: 'transparent', dark: 'transparent' },

      // ---- button fills: the same colour, relief comes from the shadow -----
      '--dsw-alias-button-elevated-fill': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-floating-fill': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-floating-hover': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-ghost-active-fill': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-ghost-active-hover': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-primary-dimmed': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-button-contrast-fill': { light: '#3a4450', dark: '#c9d3de' },
      '--dsw-alias-interactive-bg-hover-solid': { light: 'transparent', dark: 'transparent' },

      // ---- code and inline panels: recessed, not tinted --------------------
      '--dsw-alias-markdown-code-block': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-code-block-banner': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-inline-code': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-code-segment-selected': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-code-segment-unselected': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-citation': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-tag': { light: 'transparent', dark: 'transparent' },
      '--dsw-alias-markdown-placeholder': { light: 'transparent', dark: 'transparent' },

      // ---- floating chrome: the only things allowed to differ --------------
      '--dsw-alias-toast-bg': { light: '#333d49', dark: '#3a444f' },
      '--dsw-alias-tooltip-bg': { light: '#333d49', dark: '#3a444f' },
      '--dsw-alias-switch-thumb': { light: '#f2f5f9', dark: '#cfd6df' },
      '--dsw-alias-scrollbar-bg-l1': { light: '#c9d2dd', dark: '#3a424a' },
      '--dsw-alias-scrollbar-bg-l2': { light: '#c9d2dd', dark: '#3a424a' },
      '--dsw-alias-scrollbar-hover-l1': { light: '#b9c4d1', dark: '#4a535d' },
      '--dsw-alias-scrollbar-hover-l2': { light: '#b9c4d1', dark: '#4a535d' },

      // ---- hairlines: effectively gone, shadows replace them ---------------
      '--dsw-alias-settings-card-fill': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-onboarding-card-fill': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-onboarding-secondary-fill': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-turn-trigger-bg': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-turn-trigger-bg-hover': { light: '#d8dfe8', dark: '#2c333b' },
      '--dsw-alias-button-tool-bar-fill': { light: '#e0e5ec', dark: '#262b31' },
      '--dsw-alias-tooltip-key-bg': { light: '#3a444f', dark: '#3a444f' },
      '--dsw-alias-bg-skeleton': { light: '#d8dfe8', dark: '#2c333b' },
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
   Only elements the harness itself styles are touched, and only by name:
   every host class is a CSS-module pair of the form <hash>_<local>, so a
   class that contains an underscore is host markup. Plugin UI names its own
   elements (dshwv-menu-btn and friends) and is left alone.
   Nothing here targets a bare tag: a span is not text until it says so. */
/* Same rule, for the pieces of text that are wrapped in a div rather than a
   span: a label, a title, a value. They are content too. */
body :is([class*="_label"], [class*="_title"], [class*="_value"], [class*="_text"], [class*="_name"], [class*="_desc"], [class*="_caption"], [class*="_hint"], [class*="_meta"], [class*="_timestamp"]) {
  background-color: transparent !important;
  box-shadow: none !important;
}

/* ---- controls: soft, raised --------------------------------------------
   Buttons are objects again: a filled shape with the same paired light and
   shade as the surface around it. Full-width rows and every control that
   lives inside a menu, a tab strip or a picker are excluded, because a
   shadow under a row that spans the panel reads as a stray line, and a
   stack of them reads as alternating high and low. */
body :where(button, [role="button"])[class*="_"]:not([aria-checked]):not([role="checkbox"]):not([role="radio"]):not([class*="_primary"]):not([role="menuitem"]):not([role="option"]):not([role="tab"]):not([class*="_callRow"]):not([class*="_panelRow"]):not([class*="_cardContent"]):not([class*="_row"]):not([class*="_tab"]):not([class*="_option"]):not([class*="_cell"]):not([class*="_switcher"]):not([class*="_segmented"]):not(:is([role="menu"], [role="tablist"], [role="listbox"], [data-menu-material], [class*="_tabs"], [class*="_groups"], [class*="_menu"]) *) {
  border-radius: 12px !important;
  border-color: transparent !important;
  background-color: var(--dsw-alias-bg-base) !important;
  box-shadow: var(--qn-out-sm) !important;
}

body :where(button, [role="button"])[class*="_"]:not([aria-checked]):not([role="checkbox"]):not([role="radio"]):not([class*="_primary"]):not([role="menuitem"]):not([role="option"]):not([role="tab"]):not([class*="_callRow"]):not([class*="_panelRow"]):not([class*="_cardContent"]):not([class*="_row"]):not([class*="_tab"]):not([class*="_option"]):not([class*="_cell"]):not([class*="_switcher"]):not([class*="_segmented"]):not(:is([role="menu"], [role="tablist"], [role="listbox"], [data-menu-material], [class*="_tabs"], [class*="_groups"], [class*="_menu"]) *):hover:not(:disabled) {
  box-shadow: var(--qn-out) !important;
}

body :where(button, [role="button"])[class*="_"]:not([aria-checked]):not([role="checkbox"]):not([role="radio"]):not([class*="_primary"]):not([role="menuitem"]):not([role="option"]):not([role="tab"]):not([class*="_callRow"]):not([class*="_panelRow"]):not([class*="_cardContent"]):not([class*="_row"]):not([class*="_tab"]):not([class*="_option"]):not([class*="_cell"]):not([class*="_switcher"]):not([class*="_segmented"]):not(:is([role="menu"], [role="tablist"], [role="listbox"], [data-menu-material], [class*="_tabs"], [class*="_groups"], [class*="_menu"]) *):active:not(:disabled) {
  box-shadow: var(--qn-in-sm) !important;
}

/* The send button is a filled pill and keeps one soft shadow of its own. */
body button[class*="_primary"] {
  border-radius: 999px !important;
  border-color: transparent !important;
  box-shadow: 0 3px 8px rgba(74, 107, 138, 0.28) !important;
}

body button[class*="_primary"]:hover:not(:disabled) {
  box-shadow: 0 4px 10px rgba(74, 107, 138, 0.34) !important;
}

body button[class*="_primary"]:active:not(:disabled) {
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
body [class$="_card"], [class*="_card "], [class$="Card"], [class*="Card "] {
  box-shadow: var(--qn-drop) !important;
  border-color: transparent !important;
}

/* ---- composer: the one big soft slab ------------------------------------ */
body [class*="_composerSeat"] [class$="_card"],
body [class*="_composerSeat"] [class*="_card "],
body [class*="_composerHero"] [class$="_card"],
body [class*="_composerHero"] [class*="_card "] {
  box-shadow: var(--qn-out) !important;
  border-radius: 22px !important;
  border-color: transparent !important;
}

/* ---- floating surfaces: menus, dialogs, tooltips ------------------------ */
body :where([role="menu"], [role="dialog"], [role="listbox"], [role="tooltip"]),
body [data-menu-material],
body :is([class$="_menu"], [class*="_menu "], [class$="_dialog"], [class*="_dialog "]) {
  border-radius: 20px !important;
  box-shadow: var(--qn-out-lg) !important;
}

/* The menu panel carries the fill; its material layer has to inherit the
   rounding, otherwise the list paints over the corners. */
body [data-menu-material] > [aria-hidden="true"] {
  border-radius: inherit !important;
}

body [data-menu-material] {
  overflow: hidden !important;
}

/* ---- session tree: one soft row per session ----------------------------- */
body [class*="_sessionRow"],
body [class*="_projectRow"] {
  border-radius: 12px !important;
  box-shadow: var(--qn-drop) !important;
}

body [class*="_sessionRow"]:hover,
body [class*="_projectRow"]:hover {
  box-shadow: var(--qn-drop-lift) !important;
}

/* ---- code blocks: recessed ---------------------------------------------- */
body :where(pre) {
  box-shadow: var(--qn-in-sm) !important;
  border-radius: 14px !important;
  border-color: transparent !important;
}

/* ---- sidebar: a faint groove instead of a divider line ------------------ */
body [class*="_sidebarCol"] {
  box-shadow: inset -8px 0 14px -14px var(--qn-lo) !important;
}

/* ---- focus: visible on controls, never a ring on the text fields -------- */
body :where(textarea, input, select, [contenteditable="true"]):focus,
body :where(textarea, input, select, [contenteditable="true"]):focus-visible {
  outline: none !important;
}

body :where(button, [role="button"], a):focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}

`;

    return {
      inject: ['theme'],
      apply(ctx) {
        // Shadow layer: neumorphism needs paired soft shadows, and a theme token
        // can only carry a colour, so the shadows are a stylesheet of their own.
        const style = document.createElement('style');
        style.dataset.dshTheme = SOURCE;
        style.textContent = CSS;
        document.head.appendChild(style);

        // Colour layer: `overrideTokens` returns the disposer for exactly this
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

        ctx.effect(() => {
          const disposeTokens = overrideTokens();
          return () => {
            disposeTokens();
            style.remove();
          };
        });
      },
    };
  },
});
