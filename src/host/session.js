// SPDX-License-Identifier: MPL-2.0
// Where the user was in each view, kept for the browser tab's session: leaving
// a view and coming back restores it; closing the tab forgets it.
// Values are JSON; storage may be unavailable (private mode), which only loses
// the restoration.

const PREFIX = "oie.flow-ui.";
const resetListeners = new Set();

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

/** Subscribes to explicit browser-session resets (triggered from Settings). */
export function subscribeSessionReset(listener) {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

/** Removes all Flow UI session keys from sessionStorage and notifies active screens. */
export function clearSession() {
  try {
    if (typeof sessionStorage !== "undefined") {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(PREFIX)) keys.push(key);
      }
      keys.forEach(key => sessionStorage.removeItem(key));
    }
  } catch {
    // Storage unavailable: active screens still reset in-memory state below.
  }
  resetListeners.forEach(listener => listener());
}
