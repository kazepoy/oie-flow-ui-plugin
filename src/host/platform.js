// SPDX-License-Identifier: MPL-2.0
// The Web Admin platform object, kept here so that only src/host/ depends on it.
// Every use of platform.* outside this folder is a bug.

/** @type {any} */
let current = null;

export function bindPlatform(platform) {
  current = platform;
}

/** @returns {any} */
export function platform() {
  if (!current) throw new Error("Flow UI: the platform is not bound yet");
  return current;
}

/** The signed-in user ({ id, username, ... }) or null. */
export function currentUser() {
  return current?.store?.getState("user") ?? null;
}

/** A short notification in the corner of the page. */
export function toast(message, type = "info") {
  current?.ui?.toast?.(message, type);
}
