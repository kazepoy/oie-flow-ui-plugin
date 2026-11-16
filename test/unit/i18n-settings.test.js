// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  catalogs,
  currentLocale,
  initLocale,
  localePreference,
  resolveLocale,
  setLocale,
  setLocalePreference,
  subscribeLocale,
  t
} from "../../src/i18n/index.js";
import { bindPlatform } from "../../src/host/platform.js";
import {
  changedSettings,
  defaultSettings,
  getPluginSettings,
  getSettings,
  hasUserChoiceOverrides,
  loadSettings,
  parsePluginProperties,
  refreshPluginSettings,
  reloadPluginSettings,
  resetAllUserOverrides,
  resetUserChoiceOverrides,
  sanitize,
  savePluginSettings,
  serializePluginProperties,
  subscribeSettings,
  updateSettings
} from "../../src/host/preferences.js";
import { placeUnder } from "../../src/shared/ui/place.js";

test("texts take parameters and plural forms; an unknown key shows itself", () => {
  assert.equal(t("flows.updated", { time: "10:42" }), "Updated 10:42");
  assert.equal(t("flows.group.channels", { count: 1 }), "1 channel");
  assert.equal(t("flows.group.channels", { count: 1200 }), "1,200 channels");
  assert.equal(t("no.such.key"), "no.such.key");
  assert.equal(resolveLocale(["fr-FR", "en-GB"]), "fr");
  assert.equal(resolveLocale(["es-ES", "fr-CA"]), "fr");
  assert.equal(resolveLocale(["en-AU", "fr"]), "en");
  assert.equal(resolveLocale(["FR_fr"]), "fr");
  assert.equal(resolveLocale(["constructor", "zh-CN"]), "en");
  assert.equal(resolveLocale([]), "en");
});

function leafKeys(tree, prefix = "") {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !("one" in value && "other" in value)) {
      return leafKeys(value, path);
    }
    return [path];
  });
}

function placeholders(entry) {
  const texts = typeof entry === "object" ? Object.values(entry) : [String(entry)];
  return [...new Set(texts.flatMap(text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1])))].sort();
}

test("all locale catalogs match English keys and placeholders", () => {
  const { en, ...others } = catalogs();
  const enKeys = leafKeys(en).sort();
  const lookup = (catalog, path) => path.split(".").reduce((value, part) => value?.[part], catalog);
  for (const [code, catalog] of Object.entries(others)) {
    assert.deepEqual(leafKeys(catalog).sort(), enKeys, `${code} keys match en`);
    for (const path of enKeys) {
      const enEntry = lookup(en, path);
      const otherEntry = lookup(catalog, path);
      assert.equal(typeof otherEntry, typeof enEntry, `${code}.${path} matches type`);
      assert.deepEqual(placeholders(otherEntry), placeholders(enEntry), `${code}.${path} placeholders match`);
    }
  }
});

test("locale preference persists in localStorage, falls back to browser languages, and notifies subscribers", () => {
  const originalWindow = globalThis.window;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const store = new Map();
  let preferred = ["fr-FR", "en-US"];
  globalThis.window = /** @type {any} */ ({
    localStorage: {
      getItem: key => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
      removeItem: key => store.delete(key)
    }
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { get languages() { return preferred; } }
  });
  const seen = [];
  const unsub = subscribeLocale(next => seen.push(next));
  try {
    assert.equal(initLocale(), "fr");
    assert.equal(localePreference(), "auto");

    assert.equal(setLocalePreference("en"), "en");
    assert.equal(localePreference(), "en");
    assert.equal(store.get("oie.flow-ui.locale"), "en");
    assert.equal(t("flows.title"), "Flows Monitoring");

    assert.equal(setLocalePreference("fr"), "fr");
    assert.equal(currentLocale(), "fr");
    assert.equal(t("flows.title"), "Suivi des flux");
    assert.equal(t("flows.group.channels", { count: 1 }), "1 canal");
    assert.equal(t("flows.group.channels", { count: 1200 }), `${new Intl.NumberFormat("fr").format(1200)} canaux`);

    preferred = ["en-US"];
    assert.equal(setLocalePreference("auto"), "en");
    assert.equal(localePreference(), "auto");
    assert.equal(store.has("oie.flow-ui.locale"), false);
    assert.equal(t("flows.title"), "Flows Monitoring");

    store.set("oie.flow-ui.locale", "fr");
    assert.equal(initLocale(), "fr");
    assert.equal(localePreference(), "fr");

    assert.deepEqual(seen, ["en", "fr", "en"]);
  } finally {
    unsub();
    setLocale(["en"]);
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  }
});

async function sources(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? sources(join(dir, entry.name)) : [join(dir, entry.name)]));
  return nested.flat().filter(file => /\.(js|jsx)$/.test(file) && !file.includes("locales"));
}

test("every text key used in the code exists in the English catalog", async () => {
  const lookup = key => key.split(".").reduce((value, part) => value?.[part], catalogs().en);
  const missing = [];
  for (const file of await sources(new URL("../../src", import.meta.url).pathname)) {
    const code = await readFile(file, "utf8");
    for (const [, key] of code.matchAll(/\bt\(\s*"([\w.]+)"/g)) {
      if (lookup(key) === undefined) missing.push(`${key} (${file.split("/src/")[1]})`);
    }
  }
  assert.deepEqual(missing, []);
});

test("settings keep known values only", () => {
  assert.deepEqual(sanitize(null), defaultSettings());
  assert.equal(defaultSettings().expandedGroups, "all");
  assert.equal(defaultSettings().minimap, "auto");
  const settings = sanitize({ defaultLayout: "sideways", expandedGroups: "first", minimap: "off", refreshSeconds: 30, hiddenHints: ["a", 3], extra: true });
  assert.equal(settings.defaultLayout, "auto");
  assert.equal(settings.expandedGroups, "first");
  assert.equal(settings.minimap, "off");
  assert.equal(settings.refreshSeconds, 30);
  assert.deepEqual(settings.hiddenHints, ["a"]);
  assert.equal("extra" in settings, false);
  // Only changes are saved: a default can evolve.
  assert.deepEqual(changedSettings(settings), { expandedGroups: "first", minimap: "off", refreshSeconds: 30, hiddenHints: ["a"] });
  assert.deepEqual(changedSettings(defaultSettings()), {});
});

test("a popover opens under its button, or above it near the bottom of the window", () => {
  const window = { width: 1000, height: 800 };
  assert.deepEqual(placeUnder({ left: 100, top: 50, bottom: 80 }, { width: 200, height: 100 }, window), { left: 100, top: 86 });
  assert.deepEqual(placeUnder({ left: 950, top: 700, bottom: 730 }, { width: 200, height: 100 }, window), { left: 792, top: 594 });
});

test("plugin properties serialize and parse OIE XStream shapes cleanly", () => {
  assert.deepEqual(parsePluginProperties(null), {});
  assert.deepEqual(parsePluginProperties({
    property: [
      { "@name": "defaultLayout", $: "bands" },
      { "@name": "refreshSeconds", $: "30" },
      { "@name": "visibleSteps", $: "0" },
      { "@name": "unknown", $: "ignored" },
      { "@name": "minimap", $: "invalid" }
    ]
  }), { defaultLayout: "bands", refreshSeconds: 30, visibleSteps: 0 });
  // Single XStream property arrives as an object instead of an array.
  assert.deepEqual(parsePluginProperties({
    property: { "@name": "expandedGroups", $: "first" }
  }), { expandedGroups: "first" });

  assert.deepEqual(serializePluginProperties({
    ...defaultSettings(),
    defaultLayout: "columns",
    refreshSeconds: 60,
    hiddenHints: ["zoom"]
  }), {
    property: [
      { "@name": "defaultLayout", $: "columns" },
      { "@name": "visibleSteps", $: "5" },
      { "@name": "minimap", $: "auto" },
      { "@name": "expandedGroups", $: "all" },
      { "@name": "refreshSeconds", $: "60" }
    ]
  });
});

test("server plugin settings compose with sparse per-user overrides and reset cleanly", async () => {
  let serverProps = { property: [{ "@name": "defaultLayout", $: "bands" }] };
  let userPref = JSON.stringify({ minimap: "off" });
  bindPlatform({
    store: { getState: key => key === "user" ? { id: 1, username: "admin" } : null },
    checkTask: () => true,
    ui: { toast: () => {} },
    api: {
      extensions: {
        properties: async () => serverProps,
        setProperties: async (_name, props) => { serverProps = props; }
      },
      users: {
        getPreference: async () => userPref,
        setPreference: async (_id, _key, value) => { userPref = value; }
      }
    }
  });

  await loadSettings();
  assert.equal(getPluginSettings().defaultLayout, "bands");
  assert.equal(getSettings().defaultLayout, "bands");
  assert.equal(getSettings().minimap, "off");
  assert.equal(hasUserChoiceOverrides(), true);

  await savePluginSettings({ ...defaultSettings(), expandedGroups: "first", refreshSeconds: 30 });
  assert.equal(getPluginSettings().expandedGroups, "first");
  assert.equal(getSettings().expandedGroups, "first");
  assert.equal(getSettings().minimap, "off");

  // Setting a choice back to the server value removes the personal override.
  await updateSettings({ minimap: "auto" });
  assert.equal(hasUserChoiceOverrides(), false);

  await updateSettings({ refreshSeconds: 0, hiddenHints: ["hint1"] });
  assert.equal(getSettings().refreshSeconds, 0);
  await resetUserChoiceOverrides();
  assert.equal(hasUserChoiceOverrides(), false);
  assert.equal(getSettings().refreshSeconds, 30);
  assert.deepEqual(getSettings().hiddenHints, ["hint1"]);

  await resetAllUserOverrides();
  assert.deepEqual(getSettings().hiddenHints, []);

  // Reloading picks up external changes (such as OIE Restore Config).
  serverProps = { property: [{ "@name": "visibleSteps", $: "8" }] };
  await reloadPluginSettings();
  assert.equal(getSettings().visibleSteps, 8);
  assert.equal(getSettings().expandedGroups, "all");

  // Silent view-mount refresh deduplicates calls, notifies only on change, and ignores errors / missing permission.
  let reads = 0;
  let notifications = 0;
  let allowRead = true;
  let shouldFail = false;
  const unsub = subscribeSettings(() => { notifications++; });
  bindPlatform({
    store: { getState: key => key === "user" ? { id: 1, username: "admin" } : null },
    checkTask: () => allowRead,
    ui: { toast: () => {} },
    api: {
      extensions: {
        properties: async () => {
          reads++;
          if (shouldFail) throw new Error("boom");
          return serverProps;
        },
        setProperties: async (_name, props) => { serverProps = props; }
      },
      users: {
        getPreference: async () => userPref,
        setPreference: async (_id, _key, value) => { userPref = value; }
      }
    }
  });
  serverProps = { property: [{ "@name": "defaultLayout", $: "columns" }] };
  await Promise.all([refreshPluginSettings(), refreshPluginSettings()]);
  assert.equal(reads, 1);
  assert.equal(notifications, 1);
  assert.equal(getSettings().defaultLayout, "columns");
  // Same value again: reads once, does not notify listeners needlessly.
  await refreshPluginSettings();
  assert.equal(notifications, 1);
  // Error or missing permission does not throw or wipe current server overrides.
  shouldFail = true;
  await refreshPluginSettings();
  assert.equal(getSettings().defaultLayout, "columns");
  shouldFail = false;
  allowRead = false;
  serverProps = { property: [{ "@name": "defaultLayout", $: "line" }] };
  await refreshPluginSettings();
  assert.equal(reads, 3);
  assert.equal(getSettings().defaultLayout, "columns");
  // Empty server payload resets server overrides cleanly when permitted.
  allowRead = true;
  serverProps = null;
  await refreshPluginSettings();
  assert.equal(getSettings().defaultLayout, "auto");

  // loadSettings() seeds defaults on a clean server when saving is permitted, so Backup Config includes Flow UI.
  await loadSettings();
  assert.deepEqual(serverProps, serializePluginProperties(defaultSettings()));
  unsub();
});
