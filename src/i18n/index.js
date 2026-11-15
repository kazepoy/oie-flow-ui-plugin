// SPDX-License-Identifier: MPL-2.0
// Translations. Every visible text goes through t(); catalogs live in locales/.
//
//   t("flows.title")                         → "Flows Monitoring"
//   t("flows.group.channels", { count: 3 })  → "3 channels" (plural forms: one, other…)
//   t("flows.updated", { time: "10:42" })    → "Updated 10:42"
//
// Adding a language: see doc/i18n.md.
import en from "./locales/en.js";
import fr from "./locales/fr.js";

/** @type {Record<string, Record<string, any>>} */
const CATALOGS = { en, fr };
const FALLBACK = "en";
const STORAGE_KEY = "oie.flow-ui.locale";
export const LOCALE_CHOICES = ["auto", ...Object.keys(CATALOGS)];

const listeners = new Set();

const browserLanguages = () => globalThis.navigator?.languages ?? [globalThis.navigator?.language];

const normalizeTag = tag => String(tag || "").toLowerCase().split(/[-_]/)[0];

function storedPreference() {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = window.localStorage?.getItem(STORAGE_KEY) || "";
    return Object.hasOwn(CATALOGS, saved) ? saved : "auto";
  } catch {
    return "auto";
  }
}

/**
 * Picks the first supported language among the preferred ones (BCP 47 tags).
 * @param {readonly (string | null | undefined)[]} [preferred]
 */
export function resolveLocale(preferred = []) {
  for (const tag of preferred) {
    if (!tag) continue;
    const raw = String(tag);
    if (Object.hasOwn(CATALOGS, raw)) return raw;
    const base = normalizeTag(raw);
    if (Object.hasOwn(CATALOGS, base)) return base;
  }
  return FALLBACK;
}

const effectiveLocale = pref => pref === "auto" ? resolveLocale(browserLanguages()) : pref;

let preference = storedPreference();
let locale = effectiveLocale(preference);

const notify = () => {
  listeners.forEach(listener => listener(locale));
};

/** Recomputes locale from stored preference and browser languages at plugin load. */
export function initLocale() {
  preference = storedPreference();
  locale = effectiveLocale(preference);
  return locale;
}

export function setLocale(preferred) {
  preference = "auto";
  locale = resolveLocale(preferred);
  notify();
}

export const currentLocale = () => locale;
export const localePreference = () => preference;

/** Stores the user's browser language preference ("auto", "en", "fr") and applies it immediately. */
export function setLocalePreference(next) {
  const normalized = normalizeTag(next);
  preference = Object.hasOwn(CATALOGS, normalized) ? normalized : "auto";
  if (typeof window !== "undefined") {
    try {
      if (preference === "auto") window.localStorage?.removeItem(STORAGE_KEY);
      else window.localStorage?.setItem(STORAGE_KEY, preference);
    } catch {
      // localStorage may be disabled in restricted browsing contexts
    }
  }
  locale = effectiveLocale(preference);
  notify();
  return locale;
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function lookup(catalog, key) {
  let value = catalog;
  for (const part of key.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return undefined;
    value = value[part];
  }
  return value;
}

/**
 * @param {string} key dotted path in the catalog
 * @param {Record<string, string | number>} [params] values for {name} placeholders;
 *   `count` also selects the plural form when the entry has several
 * @returns {string}
 */
export function t(key, params = {}) {
  let value = lookup(CATALOGS[locale], key) ?? lookup(CATALOGS[FALLBACK], key);
  if (value == null) return key;
  if (typeof value === "object") {
    const form = new Intl.PluralRules(locale).select(Number(params.count ?? 0));
    value = value[form] ?? value.other;
  }
  return String(value).replace(/\{(\w+)\}/g, (match, name) =>
    name in params ? formatValue(params[name]) : match);
}

const formatValue = value => typeof value === "number" ? formatNumber(value) : String(value);

export const formatNumber = number => new Intl.NumberFormat(locale).format(number);

export const formatTime = date => new Intl.DateTimeFormat(locale, { timeStyle: "medium" }).format(date);

/** The catalogs, for tests. */
export const catalogs = () => CATALOGS;
