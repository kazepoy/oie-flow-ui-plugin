// SPDX-License-Identifier: MPL-2.0
// Shared toolbar of Flows Monitoring across Rows and Links map views.
import { formatTime, t } from "../i18n/index.js";
import { Button, SegmentedControl } from "../shared/ui/Button.jsx";
import { SettingsButton } from "../settings/SettingsButton.jsx";
import { Totals } from "./Counters.jsx";
import { FlowsHelp } from "./FlowsHelp.jsx";

const MODE_OPTIONS = () => [
  { value: "rows", label: t("flows.mode.rows"), title: t("flows.mode.rowsTitle") },
  { value: "links", label: t("flows.mode.links"), title: t("flows.mode.linksTitle") }
];

/**
 * @param {{ view: any, update: (patch: any) => void, totals: any, tags: Map<string, any[]>,
 *           filterControls?: any, modeControls?: any, endControls?: any, groupsReadable: boolean,
 *           chainsUnknown?: boolean, error: string | null, updated: Date | null,
 *           onRefresh: () => void }} props
 */
export function FlowsToolbar({
  view,
  update,
  totals,
  tags,
  filterControls,
  modeControls,
  endControls,
  groupsReadable,
  chainsUnknown = false,
  error,
  updated,
  onRefresh
}) {
  return (
    <div className="ofu-toolbar ofu-toolbar--stacked">
      <div className="ofu-toolbar__row">
        <h1 className="ofu-toolbar__title">{t("flows.title")}</h1>
        <SegmentedControl label={t("flows.mode.label")} value={view.mode} options={MODE_OPTIONS()}
          onChange={mode => update({ mode })} />
        <Totals stats={totals} label={t("flows.totalsLabel")} />
        <label className="ofu-check" title={t("flows.lifetimeTitle")}>
          <input type="checkbox" checked={view.lifetime} onChange={event => update({ lifetime: event.target.checked })} />
          {t("flows.lifetime")}
        </label>
        <span className="ofu-toolbar__end">
          <span className="ofu-muted" role="status">
            {error ? t("flows.refreshFailed", { error }) : updated ? t("flows.updated", { time: formatTime(updated) }) : t("common.loading")}
          </span>
          {!groupsReadable && <span className="ofu-muted" title={t("flows.group.unreadableTitle")}>{t("flows.group.unreadable")}</span>}
          {chainsUnknown && (
            <span className="ofu-muted" title={t("flows.chain.unknownTitle")}>{t("flows.chain.unknown")}</span>
          )}
          <Button icon="refresh" label={t("flows.refreshTitle")} onClick={onRefresh}>{t("flows.refresh")}</Button>
          <FlowsHelp mode={view.mode} />
          <SettingsButton screen={view.mode === "links" ? "flowsLinks" : "flows"} />
        </span>
      </div>
      <div className="ofu-toolbar__row ofu-toolbar__row--sub">
        <input type="search" className="ofu-search"
          placeholder={t(tags.size ? "flows.filterWithTags" : "flows.filter")}
          aria-label={t(tags.size ? "flows.filterWithTags" : "flows.filter")}
          value={view.filter} onChange={event => update({ filter: event.target.value })} />
        {filterControls}
        {modeControls && <span className="ofu-toolbar__sep" aria-hidden="true" />}
        {modeControls}
        {endControls && <span className="ofu-toolbar__end">{endControls}</span>}
      </div>
    </div>
  );
}
