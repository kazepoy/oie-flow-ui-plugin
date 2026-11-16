// SPDX-License-Identifier: MPL-2.0
// Flow UI settings:
//   - Manage › Settings › Flow UI (SettingsPanel) edits server-wide plugin
//     properties (`extensions/Flow UI/properties`) using Web Admin's classic left
//     taskbar Save / Refresh / Restore Defaults flow, and participates natively in
//     OIE Backup Config / Restore Config.
//   - Each screen's gear button (SettingsButton) stores sparse per-user
//     overrides on top of the server defaults.
import { useCallback, useEffect, useRef, useState } from "../host/react.js";
import { LOCALE_CHOICES, localePreference, setLocalePreference, t } from "../i18n/index.js";
import { canTask, confirm, subscribeStore, taskButton, toast } from "../host/platform.js";
import {
  defaultSettings,
  getPluginSettings,
  hasUserChoiceOverrides,
  reloadPluginSettings,
  resetAllUserOverrides,
  resetUserChoiceOverrides,
  savePluginSettings,
  SETTING_CHOICES,
  sanitize
} from "../host/preferences.js";
import { clearSession } from "../host/session.js";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { PopoverButton } from "../shared/ui/Popover.jsx";
import { useLocale } from "../shared/ui/useLocale.js";
import { useSettings } from "../shared/ui/useSettings.js";

const TASK_GROUP = "settings_Flow UI";
const SETTING_NAMES = Object.keys(SETTING_CHOICES);

/** The settings of each screen. */
const SCREENS = {
  flows: { title: "flows.title", names: ["expandedGroups", "refreshSeconds"] },
  flowsLinks: { title: "flows.mode.links", names: ["minimap", "refreshSeconds"] },
  channelFlow: { title: "channelFlow.title", names: ["defaultLayout", "visibleSteps", "minimap"] }
};

const snapshot = value => JSON.stringify(SETTING_NAMES.map(name => value[name]));

/** One setting: its label on the left, its choices on the right, as in Web Admin's Settings. */
function Choice({ name, settings, onChange, disabled = false }) {
  const id = `ofu-setting-${name}`;
  return (
    <div className="ofu-setting">
      <label htmlFor={id}>{t(`settings.${name}.label`)}</label>
      <select id={id} value={String(settings[name])} disabled={disabled}
        onChange={event => {
          const value = SETTING_CHOICES[name].find(choice => String(choice) === event.target.value);
          onChange(name, value);
        }}>
        {SETTING_CHOICES[name].map(choice => (
          <option key={choice} value={String(choice)}>{t(`settings.${name}.${choice}`)}</option>
        ))}
      </select>
    </div>
  );
}

function ScreenSettings({ screen, settings, onChange, disabled = false }) {
  return SCREENS[screen].names.map(name => (
    <Choice key={name} name={name} settings={settings} onChange={onChange} disabled={disabled} />
  ));
}

/** Browser-local language selector: takes effect immediately without changing server defaults. */
function LanguageChoice({ id = "ofu-setting-language" }) {
  const preference = localePreference();
  return (
    <div className="ofu-setting">
      <label htmlFor={id}>{t("settings.language.label")}</label>
      <select id={id} value={preference} onChange={event => {
        event.nativeEvent?.stopPropagation?.();
        setLocalePreference(event.target.value);
      }}>
        {LOCALE_CHOICES.map(choice => (
          <option key={choice} value={choice}>{t(`settings.language.${choice}`)}</option>
        ))}
      </select>
    </div>
  );
}

function LanguageCard() {
  return (
    <div className="panel">
      <div className="panel-header">{t("settings.interface.title")}</div>
      <div className="panel-body">
        <LanguageChoice />
        <p className="ofu-muted">{t("settings.language.note")}</p>
      </div>
    </div>
  );
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

function ResetPersonalOverrides({ show }) {
  if (!show) return null;
  return (
    <p>
      <button type="button" className="ofu-button ofu-button--link" onClick={() => resetUserChoiceOverrides()}>
        {t("settings.resetOverrides")}
      </button>
    </p>
  );
}

function ResetBrowserSettings({ resetLocale = true }) {
  const handleReset = async () => {
    await resetAllUserOverrides();
    if (resetLocale) setLocalePreference("auto");
    clearSession();
    toast(t("settings.resetBrowserDone"));
  };
  return (
    <p>
      <button type="button" className="ofu-button ofu-button--link" onClick={handleReset}>
        {t("settings.resetBrowser")}
      </button>
    </p>
  );
}

/** Gear button of a screen's toolbar. @param {{ screen: keyof typeof SCREENS }} props */
export function SettingsButton({ screen }) {
  const [settings, update] = useSettings();
  const handleChange = (name, value) => update({ [name]: value });
  return (
    <PopoverButton icon="settings" label={t("settings.titleOf", { screen: t(SCREENS[screen].title) })}>
      {() => (
        <div className="ofu-settings">
          <h3>{t("settings.titleOf", { screen: t(SCREENS[screen].title) })}</h3>
          <ScreenSettings screen={screen} settings={settings} onChange={handleChange} />
          <ShowHints settings={settings} update={update} />
          <ResetPersonalOverrides show={hasUserChoiceOverrides()} />
          <ResetBrowserSettings />
          <p className="ofu-muted">{t("settings.alsoInSettings")}</p>
        </div>
      )}
    </PopoverButton>
  );
}

/**
 * Manage › Settings › Flow UI: server-wide plugin settings saved with Web Admin's
 * native left-sidebar Save / Refresh / Restore Defaults flow.
 * @param {{ setTasks?: Function, setSave?: Function, markDirty?: Function, markClean?: Function }} [props]
 */
export function SettingsPanel({ setTasks, setSave, markDirty, markClean } = {}) {
  const locale = useLocale();
  const preference = localePreference();
  const [userSettings, updateUser] = useSettings();
  const [phase, setPhase] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(getPluginSettings);
  const [permissionsRevision, setPermissionsRevision] = useState(0);

  const mountedRef = useRef(true);
  const operationRef = useRef(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const savedRef = useRef(draft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const dirtyRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeStore("webPlugins", () => setPermissionsRevision(n => n + 1));
    return () => { unsubscribe(); };
  }, []);

  const canRefresh = canTask(TASK_GROUP, "doRefresh");
  const canSave = canTask(TASK_GROUP, "doSave");

  const load = useCallback(async (fromRefreshButton = false) => {
    if (operationRef.current || !mountedRef.current) return;
    if (!canTask(TASK_GROUP, "doRefresh")) {
      setErrorMessage(t("settings.noReadPermission"));
      setPhase("error");
      return;
    }
    if (fromRefreshButton && dirtyRef.current) {
      const ok = await confirm(t("settings.refreshTitle"), t("settings.refreshConfirm"));
      if (!ok || !mountedRef.current) return;
    }
    operationRef.current = true;
    setBusy(true);
    setPhase("loading");
    try {
      const loaded = await reloadPluginSettings();
      if (!mountedRef.current) return;
      savedRef.current = loaded;
      draftRef.current = loaded;
      dirtyRef.current = false;
      setDraft(loaded);
      setPhase("ready");
      markClean?.();
    } catch (error) {
      if (!mountedRef.current) return;
      const message = String(error?.message || error);
      setErrorMessage(message);
      setPhase("error");
      toast(t("settings.loadFailed", { error: message }), "error");
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [markClean]);

  const save = useCallback(async () => {
    if (operationRef.current || phaseRef.current !== "ready" || !mountedRef.current || !canTask(TASK_GROUP, "doSave")) {
      return false;
    }
    operationRef.current = true;
    setBusy(true);
    const submitted = sanitize(draftRef.current);
    try {
      const saved = await savePluginSettings(submitted);
      if (!mountedRef.current) return false;
      savedRef.current = saved;
      const stillDirty = snapshot(draftRef.current) !== snapshot(saved);
      dirtyRef.current = stillDirty;
      if (stillDirty) markDirty?.();
      else markClean?.();
      toast(t("settings.saved"));
      return !stillDirty;
    } catch (error) {
      if (mountedRef.current) toast(t("settings.saveFailed", { error: String(error?.message || error) }), "error");
      return false;
    } finally {
      operationRef.current = false;
      if (mountedRef.current) setBusy(false);
    }
  }, [markClean, markDirty]);

  const restoreDefaults = useCallback(() => {
    if (operationRef.current || phaseRef.current !== "ready" || !mountedRef.current || !canTask(TASK_GROUP, "doSave")) return;
    setDraft(defaultSettings());
  }, []);

  const resetBrowser = useCallback(async () => {
    await resetAllUserOverrides();
    setLocalePreference("auto");
    clearSession();
    toast(t("settings.resetBrowserDone"));
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;
  const saveRef = useRef(save);
  saveRef.current = save;
  const restoreRef = useRef(restoreDefaults);
  restoreRef.current = restoreDefaults;
  const resetBrowserRef = useRef(resetBrowser);
  resetBrowserRef.current = resetBrowser;

  useEffect(() => {
    mountedRef.current = true;
    loadRef.current(false);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (phase !== "ready") {
      dirtyRef.current = false;
      markClean?.();
      return;
    }
    const isDirty = snapshot(draft) !== snapshot(savedRef.current);
    dirtyRef.current = isDirty;
    if (isDirty) markDirty?.();
    else markClean?.();
  }, [phase, draft, markDirty, markClean, locale, preference]);

  useEffect(() => {
    setSave?.(phase === "ready" && canSave ? () => saveRef.current() : null);
    setTasks?.(t("settings.tasksTitle"), [
      taskButton(t("settings.task.refresh"), "refresh", () => loadRef.current(true), {
        group: TASK_GROUP, task: "doRefresh", disabled: busy
      }),
      taskButton(t("settings.task.save"), "save", () => saveRef.current(), {
        group: TASK_GROUP, task: "doSave", primary: true, disabled: busy || phase !== "ready"
      }),
      taskButton(t("settings.task.restoreDefaults"), "undo", () => restoreRef.current(), {
        group: TASK_GROUP, task: "doSave", disabled: busy || phase !== "ready",
        title: t("settings.task.restoreDefaultsTitle")
      }),
      taskButton(t("settings.task.resetBrowser"), "undo", () => resetBrowserRef.current(), {
        disabled: busy,
        title: t("settings.resetBrowserTitle")
      })
    ].filter(Boolean));
  }, [setSave, setTasks, busy, phase, permissionsRevision, canRefresh, canSave, locale]);

  if (phase === "loading") {
    return (
      <div className="ofu ofu-settings ofu-settings-panel">
        <EmptyState title={t("common.loading")} />
      </div>
    );
  }
  if (phase === "error") {
    return (
      <div className="ofu ofu-settings ofu-settings-panel">
        <LanguageCard />
        <EmptyState title={t("settings.loadTitle")}>{errorMessage}</EmptyState>
      </div>
    );
  }

  const handleDraftChange = (name, value) => setDraft(previous => sanitize({ ...previous, [name]: value }));

  return (
    <div className="ofu ofu-settings ofu-settings-panel">
      <LanguageCard />
      <p className="ofu-muted">{t("settings.panelIntro")}</p>
      {["flows", "channelFlow"].map(screen => (
        <div key={screen} className="panel">
          <div className="panel-header">{t(SCREENS[screen].title)}</div>
          <div className="panel-body">
            <ScreenSettings screen={screen} settings={draft} onChange={handleDraftChange} disabled={busy || !canSave} />
          </div>
        </div>
      ))}
    </div>
  );
}
