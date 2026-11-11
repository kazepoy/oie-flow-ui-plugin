// SPDX-License-Identifier: MPL-2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { catalogs, resolveLocale, t } from "../../src/i18n/index.js";
import { changedSettings, defaultSettings, sanitize } from "../../src/host/preferences.js";
import { placeUnder } from "../../src/shared/ui/place.js";

test("texts take parameters and plural forms; an unknown key shows itself", () => {
  assert.equal(t("flows.updated", { time: "10:42" }), "Updated 10:42");
  assert.equal(t("flows.group.channels", { count: 1 }), "1 channel");
  assert.equal(t("flows.group.channels", { count: 1200 }), "1,200 channels");
  assert.equal(t("no.such.key"), "no.such.key");
  assert.equal(resolveLocale(["fr-FR", "en-GB"]), "en");
  assert.equal(resolveLocale([]), "en");
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
  const settings = sanitize({ defaultLayout: "bands", wheel: "sideways", refreshSeconds: 30, hiddenHints: ["a", 3], extra: true });
  assert.equal(settings.defaultLayout, "bands");
  assert.equal(settings.wheel, "scroll");
  assert.equal(settings.refreshSeconds, 30);
  assert.deepEqual(settings.hiddenHints, ["a"]);
  assert.equal("extra" in settings, false);
  // Only changes are saved: a default can evolve.
  assert.deepEqual(changedSettings(settings), { defaultLayout: "bands", refreshSeconds: 30, hiddenHints: ["a"] });
  assert.deepEqual(changedSettings(defaultSettings()), {});
});

test("a popover opens under its button, or above it near the bottom of the window", () => {
  const window = { width: 1000, height: 800 };
  assert.deepEqual(placeUnder({ left: 100, top: 50, bottom: 80 }, { width: 200, height: 100 }, window), { left: 100, top: 86 });
  assert.deepEqual(placeUnder({ left: 950, top: 700, bottom: 730 }, { width: 200, height: 100 }, window), { left: 792, top: 594 });
});
