// SPDX-License-Identifier: MPL-2.0
// The plugin's style sheets, added once to the page. Each CSS file is bundled as
// text by esbuild (see build.mjs) and listed in src/styles.js.
const ATTRIBUTE = "data-plugin";
const ID = "flow-ui";

/** @param {string[]} sheets CSS texts, in cascade order */
export function installStyles(sheets) {
  document.head.querySelector(`style[${ATTRIBUTE}="${ID}"]`)?.remove();
  const style = document.createElement("style");
  style.setAttribute(ATTRIBUTE, ID);
  style.textContent = sheets.join("\n");
  document.head.append(style);
}
