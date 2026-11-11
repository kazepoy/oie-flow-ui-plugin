// SPDX-License-Identifier: MPL-2.0
// Flows Monitoring (Monitor menu): deployed channels by group, one row per
// channel, with message counters for each connector.
import { useEffect, useMemo, useRef, useState } from "../host/react.js";
import { can } from "../host/permissions.js";
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
  const { statuses, groups, groupsReadable, waits, links, error, updated, refresh } = useStatuses(settings.refreshSeconds);
  const [view, setView] = useState(() => readSession(SESSION_KEY, { filter: "", lifetime: false, toggled: {}, links: true }));
  const body = useRef(null);
  const restored = useRef(false);
  const scrollTimer = useRef(0);
  const [highlighted, setHighlighted] = useState(null);

  const update = patch => setView(previous => ({ ...previous, ...patch }));
  useEffect(() => writeSession(SESSION_KEY, view), [view]);

  const grouped = useMemo(() => statuses
    ? groupLanes(statuses, groups, {
      filter: view.filter, lifetime: view.lifetime, waits, links,
      defaultGroupName: t(groupsReadable ? "flows.group.default" : "flows.group.all")
    })
    : [], [statuses, groups, groupsReadable, waits, links, view.filter, view.lifetime]);
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
        <input type="search" className="ofu-search" placeholder={t("flows.filter")} aria-label={t("flows.filter")}
          value={view.filter} onChange={event => update({ filter: event.target.value })} />
        <label className="ofu-check" title={t("flows.lifetimeTitle")}>
          <input type="checkbox" checked={view.lifetime} onChange={event => update({ lifetime: event.target.checked })} />
          {t("flows.lifetime")}
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
