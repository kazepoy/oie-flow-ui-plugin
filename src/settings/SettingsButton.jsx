// SPDX-License-Identifier: MPL-2.0
// The user's Flow UI settings. Each screen's gear button shows that screen's
// settings; Manage › Settings › Flow UI shows them all. They are the user's own
// and follow them across browsers (src/host/preferences.js); a change applies at once.
import { t } from "../i18n/index.js";
import { SETTING_CHOICES } from "../host/preferences.js";
import { PopoverButton } from "../shared/ui/Popover.jsx";
import { useSettings } from "../shared/ui/useSettings.js";

/** The settings of each screen. */
const SCREENS = {
  flows: { title: "flows.title", names: ["expandedGroups", "refreshSeconds"] },
  channelFlow: { title: "channelFlow.title", names: ["defaultLayout", "visibleSteps"] }
};

/** One setting: its label on the left, its choices on the right, as in Web Admin's Settings. */
function Choice({ name, settings, update }) {
  const id = `ofu-setting-${name}`;
  return (
    <div className="ofu-setting">
      <label htmlFor={id}>{t(`settings.${name}.label`)}</label>
      <select id={id} value={String(settings[name])}
        onChange={event => {
          const value = SETTING_CHOICES[name].find(choice => String(choice) === event.target.value);
          update({ [name]: value });
        }}>
        {SETTING_CHOICES[name].map(choice => (
          <option key={choice} value={String(choice)}>{t(`settings.${name}.${choice}`)}</option>
        ))}
      </select>
    </div>
  );
}

function ScreenSettings({ screen, settings, update }) {
  return SCREENS[screen].names.map(name => <Choice key={name} name={name} settings={settings} update={update} />);
}

function ShowHints({ settings, update }) {
  if (!settings.hiddenHints.length) return null;
  return (
    <p>
      <button type="button" className="ofu-button ofu-button--link" onClick={() => update({ hiddenHints: [] })}>
        {t("settings.showHints")}
      </button>
    </p>
  );
}

/** Gear button of a screen's toolbar. @param {{ screen: keyof typeof SCREENS }} props */
export function SettingsButton({ screen }) {
  const [settings, update] = useSettings();
  return (
    <PopoverButton icon="settings" label={t("settings.titleOf", { screen: t(SCREENS[screen].title) })}>
      {() => (
        <div className="ofu-settings">
          <h3>{t("settings.titleOf", { screen: t(SCREENS[screen].title) })}</h3>
          <ScreenSettings screen={screen} settings={settings} update={update} />
          <ShowHints settings={settings} update={update} />
          <p className="ofu-muted">{t("settings.alsoInSettings")}</p>
        </div>
      )}
    </PopoverButton>
  );
}

/**
 * Manage › Settings › Flow UI: every setting. Laid out with Web Admin's own
 * panel classes (panel, panel-header, panel-body), like the other Settings tabs.
 */
export function SettingsPanel() {
  const [settings, update] = useSettings();
  return (
    <div className="ofu ofu-settings ofu-settings-panel">
      <p className="ofu-muted">{t("settings.panelIntro")}</p>
      {["flows", "channelFlow"].map(screen => (
        <div key={screen} className="panel">
          <div className="panel-header">{t(SCREENS[screen].title)}</div>
          <div className="panel-body">
            <ScreenSettings screen={screen} settings={settings} update={update} />
          </div>
        </div>
      ))}
      <ShowHints settings={settings} update={update} />
    </div>
  );
}
