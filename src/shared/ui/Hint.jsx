// SPDX-License-Identifier: MPL-2.0
// A short first-use hint. Once dismissed it stays hidden for this user.
import { t } from "../../i18n/index.js";
import { Icon } from "./Icon.jsx";
import { useSettings } from "./useSettings.js";

/** @param {{ id: string, children: any }} props */
export function Hint({ id, children }) {
  const [settings, update] = useSettings();
  if (settings.hiddenHints.includes(id)) return null;
  return (
    <span className="ofu-hint" role="note">
      {children}
      <button type="button" aria-label={t("common.dismissHint")} title={t("common.dismissHint")}
        onClick={() => update({ hiddenHints: [...settings.hiddenHints, id] })}>
        <Icon name="close" />
      </button>
    </span>
  );
}
