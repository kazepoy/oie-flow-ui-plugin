// SPDX-License-Identifier: MPL-2.0
// Flows Monitoring (Monitor menu): deployed channels by group, one row per
// channel, with message counters for each connector.
import { useEffect, useMemo, useRef, useState } from "../host/react.js";
import { can } from "../host/permissions.js";
import { channelStatus, controlChannel } from "../host/api.js";
import { confirm, toast } from "../host/platform.js";
import { COMMAND_PERMISSION, CONFIRMED, EXPECTED_STATE } from "./controls.js";
import { asList } from "../shared/model/xstream.js";
import { channelEditorPath, channelFlowPath, messagesPath, navigate } from "../host/routes.js";
import { readSession, writeSession } from "../host/session.js";
import { formatTime, t } from "../i18n/index.js";
import { addStats, emptyStats } from "../shared/model/stats.js";
import { Button } from "../shared/ui/Button.jsx";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { useSettings } from "../shared/ui/useSettings.js";
import { SettingsButton } from "../settings/SettingsButton.jsx";
import { FlowsHelp } from "./FlowsHelp.jsx";
import { GroupSection } from "./GroupSection.jsx";
import { Totals } from "./Counters.jsx";
import { groupLanes, openGroups } from "./model.js";
import { useStatuses } from "./useStatuses.js";

const SESSION_KEY = "flows";
const SCROLL_KEY = "flows.scroll";

export function FlowsMonitoringView() {
  const [settings] = useSettings();
  const { statuses, groups, groupsReadable, waits, links, details, tags, error, updated, refresh, reloadCounters } = useStatuses(settings.refreshSeconds);
  const [view, setView] = useState(() => readSession(SESSION_KEY, { filter: "", lifetime: false, toggled: {}, links: true, details: false }));
  const body = useRef(null);
  const restored = useRef(false);
  const scrollTimer = useRef(0);
  const [highlighted, setHighlighted] = useState(null);
  const [busy, setBusy] = useState(() => new Set());

  const update = patch => setView(previous => ({ ...previous, ...patch }));
  useEffect(() => writeSession(SESSION_KEY, view), [view]);

  const grouped = useMemo(() => statuses
    ? groupLanes(statuses, groups, {
      filter: view.filter, lifetime: view.lifetime, waits, links, details, tags,
      defaultGroupName: t(groupsReadable ? "flows.group.default" : "flows.group.all")
    })
    : [], [statuses, groups, groupsReadable, waits, links, details, tags, view.filter, view.lifetime]);
  const names = useMemo(() => new Map((statuses ?? []).map(status => [String(status.channelId), status.name])), [statuses]);
  const open = openGroups(grouped, view.toggled, settings.expandedGroups, view.filter.trim() !== "");
  const totals = grouped.reduce((sum, group) => addStats(sum, group.stats), emptyStats());

  // Back on the page: scroll to where the user was, once the rows are there.
  useEffect(() => {
    if (restored.current || !statuses || !body.current) return;
    restored.current = true;
    body.current.scrollTop = readSession(SCROLL_KEY, { top: 0 }).top;
  }, [statuses]);

  // A link was followed: show the target row, highlighted for a moment.
  useEffect(() => {
    if (!highlighted) return undefined;
    document.getElementById(`ofu-lane-${highlighted}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(() => setHighlighted(null), 2500);
    return () => clearTimeout(timer);
  }, [highlighted]);

  /** Reads the target's state a few times until it is the expected one. */
  async function waitForState(target, expected) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const status = await channelStatus(target.channelId).catch(() => null);
      const state = target.metaDataId == null ? status?.state
        : asList(status?.childStatuses, "dashboardStatus").find(child => Number(child.metaDataId) === Number(target.metaDataId))?.state;
      if (state === expected) return true;
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    return false;
  }

  // Start, pause, resume or stop a channel or a connector, then read the new state.
  const busyKey = target => `${target.channelId}:${target.metaDataId ?? ""}`;
  async function control(command, target) {
    if (CONFIRMED.has(command)) {
      const confirmed = await confirm(t(`flows.control.confirm.${command}.title`),
        t(`flows.control.confirm.${command}.message`, { name: target.name }), { danger: true, okLabel: t(`flows.control.confirm.${command}.ok`) });
      if (!confirmed) return;
    }
    const key = busyKey(target);
    setBusy(previous => new Set(previous).add(key));
    try {
      await controlChannel(command, target.channelId, target.metaDataId);
      // The engine may answer "done" and refuse the change (OIE-12): check the state.
      const reached = await waitForState(target, EXPECTED_STATE[command]);
      if (reached) toast(t(`flows.control.done.${command}`, { name: target.name }));
      else toast(t("flows.control.unchanged", { name: target.name }), "warn");
    } catch (failure) {
      toast(t("flows.control.failed", { name: target.name, error: failure?.message || String(failure) }), "error");
    } finally {
      await reloadCounters();
      setBusy(previous => { const next = new Set(previous); next.delete(key); return next; });
    }
  }

  // The scroll position is saved apart, without re-rendering the view.
  const saveScroll = event => {
    const top = event.currentTarget.scrollTop;
    clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => writeSession(SCROLL_KEY, { top }), 150);
  };

  const actions = {
    canOpenMessages: can("viewMessages"),
    canViewFlow: can("viewChannels"),
    canEdit: can("editChannel"),
    openMessages: (channelId, metaDataId) => navigate(messagesPath(channelId, metaDataId)),
    openFlow: channelId => navigate(channelFlowPath(channelId)),
    openEditor: channelId => navigate(channelEditorPath(channelId)),
    showLinks: view.links,
    showDetails: view.details,
    canControl: command => can(COMMAND_PERMISSION[command]),
    isBusy: target => busy.has(busyKey(target)),
    control,
    highlighted,
    channelName: channelId => names.get(String(channelId)) ?? null,
    focusLane: channelId => {
      const group = grouped.find(candidate => candidate.lanes.some(lane => lane.id === String(channelId)));
      if (group && !open.has(group.id)) update({ toggled: { ...view.toggled, [group.id]: true } });
      setHighlighted(String(channelId));
    }
  };
  const toggle = id => update({ toggled: { ...view.toggled, [id]: !open.has(id) } });
  // Before the groups are loaded there is nothing to open or close: keep the state.
  const setAll = value => grouped.length && update({ toggled: Object.fromEntries(grouped.map(group => [group.id, value])) });

  return (
    <div className="ofu ofu-screen ofu-flows">
      <div className="ofu-toolbar">
        <h1 className="ofu-toolbar__title">{t("flows.title")}</h1>
        <Totals stats={totals} label={t("flows.totalsLabel")} />
        <input type="search" className="ofu-search" placeholder={t(tags.size ? "flows.filterWithTags" : "flows.filter")} aria-label={t(tags.size ? "flows.filterWithTags" : "flows.filter")}
          value={view.filter} onChange={event => update({ filter: event.target.value })} />
        <label className="ofu-check" title={t("flows.lifetimeTitle")}>
          <input type="checkbox" checked={view.lifetime} onChange={event => update({ lifetime: event.target.checked })} />
          {t("flows.lifetime")}
        </label>
        <label className="ofu-check" title={t("flows.detailsTitle")}>
          <input type="checkbox" checked={view.details} onChange={event => update({ details: event.target.checked })} />
          {t("flows.details")}
        </label>
        <label className="ofu-check" title={t("flows.linksTitle")}>
          <input type="checkbox" checked={view.links} onChange={event => update({ links: event.target.checked })} />
          {t("flows.links")}
        </label>
        <Button icon="expand" label={t("flows.expandAll")} onClick={() => setAll(true)} />
        <Button icon="collapse" label={t("flows.collapseAll")} onClick={() => setAll(false)} />
        <span className="ofu-toolbar__end">
          <span className="ofu-muted" role="status">
            {error ? t("flows.refreshFailed", { error }) : updated ? t("flows.updated", { time: formatTime(updated) }) : t("common.loading")}
          </span>
          {!groupsReadable && <span className="ofu-muted" title={t("flows.group.unreadableTitle")}>{t("flows.group.unreadable")}</span>}
          {grouped.some(group => group.lanes.some(lane => !lane.chainsKnown)) && (
            <span className="ofu-muted" title={t("flows.chain.unknownTitle")}>{t("flows.chain.unknown")}</span>
          )}
          <Button icon="refresh" label={t("flows.refreshTitle")} onClick={refresh}>{t("flows.refresh")}</Button>
          <FlowsHelp />
          <SettingsButton screen="flows" />
        </span>
      </div>
      <div ref={body} className="ofu-flows__body" onScroll={saveScroll}>
        {statuses && !grouped.length && (
          <EmptyState title={view.filter ? t("flows.empty.filtered") : t("flows.empty.none")}>
            {!view.filter && t("flows.empty.noneHelp")}
          </EmptyState>
        )}
        {grouped.map(group => (
          <GroupSection key={group.id} group={group} open={open.has(group.id)} onToggle={() => toggle(group.id)} actions={actions} />
        ))}
      </div>
    </div>
  );
}
