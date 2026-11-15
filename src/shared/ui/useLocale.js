// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from "../../host/react.js";
import { currentLocale, subscribeLocale } from "../../i18n/index.js";

/** Subscribes to live language changes so views re-render immediately when locale changes. */
export function useLocale() {
  const [, setRevision] = useState(0);
  useEffect(() => subscribeLocale(() => setRevision(n => n + 1)), []);
  return currentLocale();
}
