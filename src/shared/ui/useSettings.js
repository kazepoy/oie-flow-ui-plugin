// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from "../../host/react.js";
import { getSettings, refreshPluginSettings, subscribeSettings, updateSettings } from "../../host/preferences.js";
import { useLocale } from "./useLocale.js";

/**
 * The user's settings, re-rendering when they or the active language change.
 * Pass `{ sync: true }` from top-level views to pick up server-side changes (such as Restore Config) without reloading the page.
 * @param {{ sync?: boolean }} [options]
 * @returns {[import("../../host/preferences.js").Settings, typeof updateSettings]}
 */
export function useSettings({ sync = false } = {}) {
  useLocale();
  const [settings, setSettings] = useState(getSettings);
  useEffect(() => {
    const unsubscribe = subscribeSettings(setSettings);
    if (sync) refreshPluginSettings();
    return () => { unsubscribe(); };
  }, [sync]);
  return [settings, updateSettings];
}
