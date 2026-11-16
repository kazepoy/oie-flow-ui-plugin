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
import { readSession, subscribeSessionReset, writeSession } from "../host/session.js";
import { t } from "../i18n/index.js";
import { addStats, emptyStats } from "../shared/model/stats.js";
import { Button, cx } from "../shared/ui/Button.jsx";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { useLocale } from "../shared/ui/useLocale.js";
import { useSettings } from "../shared/ui/useSettings.js";
import { FlowsLinksGraph } from "./FlowsLinksGraph.jsx";
import { FlowsToolbar } from "./FlowsToolbar.jsx";
import { GroupSection } from "./GroupSection.jsx";
import { groupLanes, openGroups } from "./model.js";
import { useStatuses } from "./useStatuses.js";

const SESSION_KEY = "flows";
const SCROLL_KEY = "flows.scroll";
const DEFAULT_VIEW = { mode: "rows", linkedOnly: true, filter: "", lifetime: false, toggled: {}, links: true, details: false, stoppedOnly: false };

export function FlowsMonitoringView() {
  const locale = useLocale();
  const [settings, updateSettings] = useSettings({ sync: true });
  const { statuses, groups, groupsReadable, waits, links, details, disabled, tags, error, updated, refresh, reloadCounters } = useStatuses(settings.refreshSeconds);
  const [view, setView] = useState(() => readSession(SESSION_KEY, DEFAULT_VIEW));
  const body = useRef(null);
  const restored = useRef(false);
  const scrollTimer = useRef(0);
  const [highlighted, setHighlighted] = useState(null);
  const [busy, setBusy] = useState(() => new Set());

  const update = patch => setView(previous => ({ ...previous, ...patch }));
  useEffect(() => writeSession(SESSION_KEY, view), [view]);
  useEffect(() => subscribeSessionReset(() => {
    restored.current = true;
    setHighlighted(null);
    setView(DEFAULT_VIEW);
    if (body.current) body.current.scrollTop = 0;
  }), []);

  const grouped = useMemo(() => statuses
    ? groupLanes(statuses, groups, {
      filter: view.filter, lifetime: view.lifetime, waits, links, details, disabled,
      showDisabled: view.details, stoppedOnly: view.stoppedOnly, tags,
      defaultGroupName: t(groupsReadable ? "flows.group.default" : "flows.group.all")
    })
    : [], [statuses, groups, groupsReadable, waits, links, details, disabled, tags, view.filter, view.lifetime, view.details, view.stoppedOnly, locale]);
  const names = useMemo(() => new Map((statuses ?? []).map(status => [String(status.channelId), status.name])), [statuses]);
  const open = openGroups(grouped, view.toggled, settings.expandedGroups, view.filter.trim() !== "" || view.stoppedOnly);
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
      const id = String(channelId);
      const group = grouped.find(candidate => candidate.lanes.some(lane => lane.id === id));
      restored.current = true;
      const patch = { mode: "rows" };
      if (group) {
        if (!open.has(group.id)) patch.toggled = { ...view.toggled, [group.id]: true };
      } else if (view.filter) {
        patch.filter = "";
      }
      update(patch);
      setHighlighted(id);
    }
  };
  const toggle = id => update({ toggled: { ...view.toggled, [id]: !open.has(id) } });
  // Before the groups are loaded there is nothing to open or close: keep the state.
  const setAll = value => grouped.length && update({ toggled: Object.fromEntries(grouped.map(group => [group.id, value])) });

  if (view.mode === "links") {
    return (
      <FlowsLinksGraph locale={locale} settings={settings} updateSettings={updateSettings}
        statuses={statuses} groups={groups} groupsReadable={groupsReadable}
        waits={waits} links={links} details={details} tags={tags}
        error={error} updated={updated} refresh={refresh}
        view={view} update={update} actions={actions} />
    );
  }

  const filterControls = (
    <button type="button"
      className={cx("ofu-filter-pill", view.stoppedOnly && "ofu-filter-pill--active")}
      aria-pressed={view.stoppedOnly}
      title={t("flows.stoppedOnlyTitle")}
      onClick={() => update({ stoppedOnly: !view.stoppedOnly })}>
      <Icon name="filter" />
      <span>{t("flows.stoppedOnly")}</span>
    </button>
  );

  const rowControls = (
    <>
      <label className="ofu-check" title={t("flows.detailsTitle")}>
        <input type="checkbox" checked={view.details} onChange={event => update({ details: event.target.checked })} />
        {t("flows.details")}
      </label>
      <label className="ofu-check" title={t("flows.linksTitle")}>
        <input type="checkbox" checked={view.links} onChange={event => update({ links: event.target.checked })} />
        {t("flows.links")}
      </label>
      <span className="ofu-toolbar__sep" aria-hidden="true" />
      <Button icon="expand" label={t("flows.expandAll")} onClick={() => setAll(true)} />
      <Button icon="collapse" label={t("flows.collapseAll")} onClick={() => setAll(false)} />
    </>
  );

  return (
    <div className="ofu ofu-screen ofu-flows">
      <FlowsToolbar view={view} update={update} totals={totals} tags={tags}
        filterControls={filterControls} modeControls={rowControls} groupsReadable={groupsReadable}
        chainsUnknown={grouped.some(group => group.lanes.some(lane => !lane.chainsKnown))}
        error={error} updated={updated} onRefresh={refresh} />
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
