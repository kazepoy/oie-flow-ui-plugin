// SPDX-License-Identifier: MPL-2.0
// The user's settings for both screens. They are saved in the user's OIE
// preferences ("flowui.settings"), so they follow the user from one browser to
// another. When the server refuses, they are kept in this browser instead
// (doc/limites-plateforme.md, WA-06).
import { currentUser, toast } from "./platform.js";
import { setUserPreference, userPreference } from "./api.js";
import { t } from "../i18n/index.js";

const PREFERENCE = "flowui.settings";
const LOCAL_KEY = "oie.flow-ui.settings";

/** Allowed values of each setting; the first one is the default. */
export const SETTING_CHOICES = {
  defaultLayout: ["auto", "line", "columns", "bands"],
  visibleSteps: [5, 3, 8, 0],
  minimap: ["auto", "off"],
  expandedGroups: ["all", "first", "none"],
  refreshSeconds: [5, 10, 30, 60, 0]
};

/**
 * @typedef {{ defaultLayout: string, expandedGroups: string, visibleSteps: number,
 *             minimap: string, refreshSeconds: number, hiddenHints: string[] }} Settings
 */

/** @returns {Settings} */
export function defaultSettings() {
  return /** @type {Settings} */ ({
    ...Object.fromEntries(Object.entries(SETTING_CHOICES).map(([key, values]) => [key, values[0]])),
    hiddenHints: []
  });
}

/** Keeps known keys with allowed values only, so a stale preference cannot break a view. */
export function sanitize(value) {
  const settings = defaultSettings();
  if (!value || typeof value !== "object") return settings;
  for (const [key, allowed] of Object.entries(SETTING_CHOICES)) {
    if (/** @type {any[]} */ (allowed).includes(value[key])) settings[key] = value[key];
  }
  if (Array.isArray(value.hiddenHints)) settings.hiddenHints = value.hiddenHints.filter(id => typeof id === "string");
  return settings;
}

/** Only what differs from the defaults is saved, so a default can change later. */
export function changedSettings(value) {
  const defaults = defaultSettings();
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => JSON.stringify(item) !== JSON.stringify(defaults[key])));
}

let settings = defaultSettings();
let savedOnServer = true;
const listeners = new Set();

export const getSettings = () => settings;

export function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); } catch { return null; }
}

function writeLocal(value) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(value)); } catch { /* nothing more to try */ }
}

/** Reads the settings once, after sign-in. */
export async function loadSettings() {
  const user = currentUser();
  let stored = null;
  try {
    const text = user ? await userPreference(user.id, PREFERENCE) : null;
    stored = text ? JSON.parse(text) : readLocal();
  } catch {
    savedOnServer = false;
    stored = readLocal();
  }
  settings = sanitize(stored);
  listeners.forEach(listener => listener(settings));
}

/** @param {Partial<Settings>} patch */
export async function updateSettings(patch) {
  settings = sanitize({ ...settings, ...patch });
  listeners.forEach(listener => listener(settings));
  writeLocal(changedSettings(settings));
  const user = currentUser();
  if (!user || !savedOnServer) return;
  try {
    await setUserPreference(user.id, PREFERENCE, JSON.stringify(changedSettings(settings)));
  } catch {
    savedOnServer = false;
    toast(t("settings.savedLocally"), "warn");
  }
}
