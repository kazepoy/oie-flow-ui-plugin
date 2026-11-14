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

/**
 * Web Admin's confirmation dialog; resolves to true when the user confirms.
 * @param {{ danger?: boolean, okLabel?: string }} [options]
 */
export function confirm(title, message, options) {
  const dialog = current?.ui?.confirmDialog;
  return dialog ? dialog(title, message, options) : Promise.resolve(window.confirm(`${title}\n\n${message}`));
}

/** A short notification in the corner of the page. */
export function toast(message, type = "info") {
  current?.ui?.toast?.(message, type);
}

/** Task button for Web Admin's left sidebar taskbar (null when unauthorized or unavailable). */
export function taskButton(label, iconName, onClick, opts) {
  return current?.ui?.taskButton?.(label, iconName, onClick, opts) ?? null;
}

/** Evaluates an RBAC task pair; returns true when no authorization controller restricts it. */
export function canTask(group, task) {
  return current?.checkTask?.(group, task) ?? true;
}

/** Subscribes to a Web Admin store event key and returns an unsubscribe function. */
export function subscribeStore(key, listener) {
  return current?.store?.subscribe?.(key, listener) ?? (() => {});
}
