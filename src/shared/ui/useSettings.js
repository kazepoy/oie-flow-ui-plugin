// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from "../../host/react.js";
import { getSettings, subscribeSettings, updateSettings } from "../../host/preferences.js";

/** The user's settings, re-rendering when they change. @returns {[import("../../host/preferences.js").Settings, typeof updateSettings]} */
export function useSettings() {
  const [settings, setSettings] = useState(getSettings);
  useEffect(() => {
    const unsubscribe = subscribeSettings(setSettings);
    return () => { unsubscribe(); };
  }, []);
  return [settings, updateSettings];
}
