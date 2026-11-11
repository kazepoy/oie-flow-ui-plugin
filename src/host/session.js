// SPDX-License-Identifier: MPL-2.0
// Where the user was in each view, kept for the browser tab's session: leaving
// a view and coming back restores it; closing the tab forgets it.
// Values are JSON; storage may be unavailable (private mode), which only loses
// the restoration.

const PREFIX = "oie.flow-ui.";

/** @template T @param {string} key @param {T} fallback @returns {T} */
export function readSession(key, fallback) {
  try {
    const text = sessionStorage.getItem(PREFIX + key);
    return text == null ? fallback : { ...fallback, ...JSON.parse(text) };
  } catch {
    return fallback;
  }
}

export function writeSession(key, value) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the view simply starts from its default next time.
  }
}
