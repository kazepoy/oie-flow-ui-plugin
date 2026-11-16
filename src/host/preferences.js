// SPDX-License-Identifier: MPL-2.0
// Settings for both screens come from two layers:
//   1. Server-wide plugin defaults ("Flow UI" extension properties in OIE's
//      `configuration` table), edited in Manage › Settings › Flow UI and
//      included natively in OIE Backup Config / Restore Config.
//   2. Per-user overrides ("flowui.settings" user preference, with localStorage
//      fallback), edited from each screen's gear button (⚙) or by closing the
//      minimap / hiding hints.
import { canTask, currentUser, toast } from "./platform.js";
import { pluginProperties, setPluginProperties, setUserPreference, userPreference } from "./api.js";
import { asList } from "../shared/model/xstream.js";
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

/** Keeps only keys that differ from `base` (defaults unless another baseline is given). */
export function changedSettings(value, base = defaultSettings()) {
  return Object.fromEntries(Object.entries(value).filter(([key, item]) => JSON.stringify(item) !== JSON.stringify(base[key])));
}

/** Parses OIE's XStream/JSON extension properties payload into known screen-setting overrides. */
export function parsePluginProperties(raw) {
  const pairs = [];
  if (raw && typeof raw === "object") {
    if (raw.property !== undefined) {
      for (const item of asList(raw.property)) {
        if (item && typeof item === "object") pairs.push([item["@name"] ?? item.name, item.$ ?? item.value]);
      }
    } else if (raw.entry !== undefined) {
      for (const entry of asList(raw.entry)) {
        if (!entry || typeof entry !== "object") continue;
        const values = Array.isArray(entry.string) ? entry.string : Object.values(entry);
        pairs.push([values[0], values[1]]);
      }
    } else {
      for (const [name, val] of Object.entries(raw)) {
        if (!name.startsWith("@")) pairs.push([name, val]);
      }
    }
  }
  const result = {};
  for (const [rawKey, rawValue] of pairs) {
    const key = String(rawKey ?? "");
    const allowed = SETTING_CHOICES[key];
    if (!allowed) continue;
    const match = /** @type {any[]} */ (allowed).find(choice => String(choice) === String(rawValue));
    if (match !== undefined) result[key] = match;
  }
  return result;
}

/** Serializes all server-wide plugin settings (excluding per-user hiddenHints) for OIE. */
export function serializePluginProperties(value) {
  const clean = sanitize(value);
  return {
    property: Object.keys(SETTING_CHOICES).map(name => ({ "@name": name, $: String(clean[name]) }))
  };
}

/** Sanitizes a sparse user-preference object, keeping only overridden keys. @returns {Partial<Settings>} */
function sanitizeUserOverrides(raw) {
  /** @type {Partial<Settings>} */
  const result = {};
  if (!raw || typeof raw !== "object") return result;
  for (const [key, allowed] of Object.entries(SETTING_CHOICES)) {
    if (/** @type {any[]} */ (allowed).includes(raw[key])) result[key] = raw[key];
  }
  if (Array.isArray(raw.hiddenHints)) {
    const hints = raw.hiddenHints.filter(id => typeof id === "string");
    if (hints.length) result.hiddenHints = hints;
  }
  return result;
}

/** @type {Partial<Settings>} */
let serverOverrides = {};
/** @type {Partial<Settings>} */
let userOverrides = {};
let settings = defaultSettings();
let savedOnServer = true;
let serverGeneration = 0;
/** @type {Promise<Settings> | null} */
let refreshInFlight = null;
const listeners = new Set();

const canReadPluginSettings = () =>
  canTask("view", "doShowExtensions") || canTask("view", "doShowSettings");

const canonicalServerOverrides = parsed => changedSettings({ ...defaultSettings(), ...parsed, hiddenHints: [] });

const notify = () => {
  settings = sanitize({ ...defaultSettings(), ...serverOverrides, ...userOverrides });
  listeners.forEach(listener => listener(settings));
};

export const getSettings = () => settings;
export const getPluginSettings = () => sanitize({ ...defaultSettings(), ...serverOverrides });
export const hasUserChoiceOverrides = () => Object.keys(SETTING_CHOICES).some(key => key in userOverrides);

export function subscribeSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"); } catch { return null; }
}

function writeLocal(value) {
  try {
    if (!value || Object.keys(value).length === 0) localStorage.removeItem(LOCAL_KEY);
    else localStorage.setItem(LOCAL_KEY, JSON.stringify(value));
  } catch { /* nothing more to try */ }
}

async function persistUserOverrides() {
  writeLocal(userOverrides);
  const user = currentUser();
  if (!user || !savedOnServer) return;
  try {
    await setUserPreference(user.id, PREFERENCE, JSON.stringify(userOverrides));
  } catch {
    savedOnServer = false;
    toast(t("settings.savedLocally"), "warn");
  }
}

/** Reads user overrides and (when permitted) server plugin properties once, after sign-in. */
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
  userOverrides = sanitizeUserOverrides(stored);
  if (canReadPluginSettings()) {
    const generation = ++serverGeneration;
    try {
      const raw = await pluginProperties();
      const parsed = parsePluginProperties(raw);
      if (generation === serverGeneration) serverOverrides = canonicalServerOverrides(parsed);
      // Seed defaults once on a fresh server so OIE Backup Config includes Flow UI before the first Settings save.
      if (Object.keys(parsed).length === 0 && canTask("settings_Flow UI", "doSave")) {
        setPluginProperties(serializePluginProperties(defaultSettings())).catch(() => {});
      }
    } catch { /* keep defaults or newer server overrides */ }
  }
  notify();
}

/** Reloads server-wide plugin settings from OIE (throws on failure so Settings can report it). */
export async function reloadPluginSettings() {
  const generation = ++serverGeneration;
  const raw = await pluginProperties();
  if (generation === serverGeneration) {
    serverOverrides = canonicalServerOverrides(parsePluginProperties(raw));
    notify();
  }
  return getPluginSettings();
}

/** Silently refreshes server-wide plugin settings when opening a view (e.g. after Restore Config). */
export function refreshPluginSettings() {
  if (!canReadPluginSettings()) return Promise.resolve(getPluginSettings());
  if (refreshInFlight) return refreshInFlight;
  const generation = ++serverGeneration;
  refreshInFlight = pluginProperties()
    .then(raw => {
      if (generation !== serverGeneration) return getPluginSettings();
      const next = canonicalServerOverrides(parsePluginProperties(raw));
      if (JSON.stringify(next) !== JSON.stringify(serverOverrides)) {
        serverOverrides = next;
        notify();
      }
      return getPluginSettings();
    })
    .catch(() => getPluginSettings())
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

/** Saves server-wide plugin settings to OIE (`extensions/Flow UI/properties`). */
export async function savePluginSettings(draft) {
  const generation = ++serverGeneration;
  const clean = sanitize(draft);
  await setPluginProperties(serializePluginProperties(clean));
  if (generation === serverGeneration) {
    serverOverrides = changedSettings({ ...clean, hiddenHints: [] });
    notify();
  }
  return getPluginSettings();
}

/** Clears per-user setting overrides (keeping hiddenHints) so server defaults apply. */
export async function resetUserChoiceOverrides() {
  /** @type {Partial<Settings>} */
  const next = {};
  if (userOverrides.hiddenHints?.length) next.hiddenHints = userOverrides.hiddenHints;
  userOverrides = next;
  notify();
  await persistUserOverrides();
}

/** Clears every per-user override stored locally and on the server, including hiddenHints. */
export async function resetAllUserOverrides() {
  userOverrides = {};
  notify();
  await persistUserOverrides();
}

/** Updates per-user overrides (⚙ gear popover, minimap close, hint dismiss). @param {Partial<Settings>} patch */
export async function updateSettings(patch) {
  const base = getPluginSettings();
  /** @type {Partial<Settings>} */
  const next = { ...userOverrides };
  for (const [key, value] of Object.entries(patch || {})) {
    if (key === "hiddenHints") {
      const hints = Array.isArray(value) ? value.filter(id => typeof id === "string") : [];
      if (hints.length) next.hiddenHints = hints;
      else delete next.hiddenHints;
      continue;
    }
    const allowed = SETTING_CHOICES[key];
    if (!allowed || !/** @type {any[]} */ (allowed).includes(value)) continue;
    if (value === base[key]) delete next[key];
    else next[key] = value;
  }
  userOverrides = next;
  notify();
  await persistUserOverrides();
}
