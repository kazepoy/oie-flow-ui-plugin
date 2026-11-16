// SPDX-License-Identifier: MPL-2.0
// Zoomable compound graph view of Channel Writer → Channel Reader links across groups.
import { useMemo, useState } from "../host/react.js";
import { can } from "../host/permissions.js";
import { formatNumber, t } from "../i18n/index.js";
import { arrowPaths } from "../channel-flow/layout/edges.js";
import { useViewport } from "../channel-flow/viewport/useViewport.js";
import { Minimap } from "../channel-flow/Minimap.jsx";
import { SOURCE_COUNTERS, emptyStats } from "../shared/model/stats.js";
import { Button, cx } from "../shared/ui/Button.jsx";
import { EmptyState } from "../shared/ui/EmptyState.jsx";
import { Icon } from "../shared/ui/Icon.jsx";
import { TagList } from "../shared/ui/Tag.jsx";
import { ZoomControls } from "../shared/ui/ZoomControls.jsx";
import { ConnectorDetail, StatusPip } from "./ConnectorCard.jsx";
import { ConnectorCounters } from "./Counters.jsx";
import { FlowsToolbar } from "./FlowsToolbar.jsx";
import { buildLinksGraph, connectedSubgraph } from "./links-graph.js";
import { layoutLinksGraph } from "./links-layout.js";

const STATE_TONE = { STARTED: "ok", PAUSED: "warn", STOPPED: "error" };

function LinkNode({ node, selected, focused, dimmed, showDetails, onToggleFocus, actions }) {
  const tone = !node.hidden && (node.stats.ERROR > 0 ? "ofu-card--error" : node.stats.QUEUED > 0 ? "ofu-card--queued" : "");
  const stopped = !node.hidden && node.state && node.state !== "STARTED";
  const label = (
    <>
      {(!node.hidden || node.state) && <StatusPip state={node.state} />}
      <span className="ofu-links-node__title">{node.name}</span>
    </>
  );
  const hasDetails = showDetails && (node.source?.transport || node.tags.length > 0);
  return (
    <article
      className={cx(
        "ofu-links-node",
        node.hidden && "ofu-links-node--hidden",
        tone,
        stopped && "ofu-card--stopped",
        selected && "ofu-links-node--selected",
        focused && "ofu-links-node--focused",
        dimmed && "ofu-links-node--dimmed"
      )}
      style={{ left: node.box.x, top: node.box.y, width: node.box.width, height: node.box.height }}
      onClick={event => { event.stopPropagation(); onToggleFocus(node.id); }}>
      <div className="ofu-links-node__head">
        {!node.hidden && actions.canOpenMessages
          ? <button type="button" className="ofu-channel__name ofu-links-node__name"
              title={t("flows.channel.openMessages", { name: node.name })}
              onClick={event => { event.stopPropagation(); actions.openMessages(node.id); }}>{label}</button>
          : <span className="ofu-channel__name ofu-links-node__name" title={node.name}>{label}</span>}
        <div className="ofu-links-node__actions">
          {!node.hidden && actions.canViewFlow && (
            <button type="button" className="ofu-control ofu-control--flow"
              title={t("flows.channel.flowTitle")} aria-label={t("flows.channel.flowTitle")}
              onClick={event => { event.stopPropagation(); actions.openFlow(node.id); }}>
              <Icon name="flow" />
            </button>
          )}
          {!node.hidden && (
            <button type="button" className="ofu-links-node__rows"
              aria-label={t("flows.linksGraph.showInRowsTitle", { name: node.name })}
              title={t("flows.linksGraph.showInRowsTitle", { name: node.name })}
              onClick={event => { event.stopPropagation(); actions.focusLane(node.id); }}>
              <Icon name="rows" />
            </button>
          )}
          <button type="button" className={cx("ofu-links-node__focus", selected && "ofu-links-node__focus--active")}
            aria-pressed={selected} aria-label={t("flows.linksGraph.focusChain")}
            title={t("flows.linksGraph.focusChain")}
            onClick={event => { event.stopPropagation(); onToggleFocus(node.id); }}>
            <Icon name="focus" />
          </button>
        </div>
      </div>
      {node.hidden ? (
        <p className="ofu-links-node__empty">{t("flows.linksGraph.hiddenTarget")}</p>
      ) : (
        <>
          <div className="ofu-links-node__counters" onClick={event => event.stopPropagation()}>
            <ConnectorCounters stats={node.stats} keys={SOURCE_COUNTERS} where={node.name}
              onOpen={actions.canOpenMessages ? () => actions.openMessages(node.id) : undefined} />
          </div>
          {hasDetails && (
            <div className="ofu-links-node__details">
              {node.source?.transport && <ConnectorDetail connector={node.source} />}
              {node.tags.length > 0 && <TagList tags={node.tags} />}
            </div>
          )}
        </>
      )}
    </article>
  );
}

/** @param {any} props */
export function FlowsLinksGraph({
  locale,
  settings,
  updateSettings,
  statuses,
  groups,
  groupsReadable,
  waits,
  links,
  details,
  tags,
  error,
  updated,
  refresh,
  view,
  update,
  actions
}) {
  const [focusId, setFocusId] = useState(null);
  const canViewChannels = can("viewChannels");

  const graph = useMemo(() => {
    if (!canViewChannels || !statuses) return { groups: [], nodes: [], edges: [], totals: emptyStats(), visibleCount: 0, linkedCount: 0 };
    return buildLinksGraph({
      statuses,
      groups,
      waits,
      links,
      details,
      tags,
      filter: view.filter,
      linkedOnly: view.linkedOnly,
      lifetime: view.lifetime,
      defaultGroupName: t(groupsReadable ? "flows.group.default" : "flows.group.all"),
      hiddenTargetName: t("flows.linksGraph.hiddenTarget")
    });
  }, [canViewChannels, statuses, groups, groupsReadable, waits, links, details, tags, view.filter, view.linkedOnly, view.lifetime, locale]);

  const scene = useMemo(() => layoutLinksGraph(graph, { details: view.details }), [graph, view.details]);
  const nodeById = useMemo(() => new Map(scene.nodes.map(node => [node.id, node])), [scene.nodes]);
  const effectiveFocus = focusId && nodeById.has(focusId) ? focusId : null;
  const focusedNode = effectiveFocus ? nodeById.get(effectiveFocus) : null;
  const subgraph = useMemo(() => connectedSubgraph(scene.edges, effectiveFocus), [scene.edges, effectiveFocus]);
  const viewport = useViewport({ scene, sessionKey: "flows.linksView" });

  const toggleFocus = id => setFocusId(prev => prev === id ? null : id);
  const hasDiagram = canViewChannels && scene.nodes.length > 0;

  const filterControls = (
    <label className="ofu-check" title={t("flows.linksGraph.linkedOnlyTitle")}>
      <input type="checkbox" checked={view.linkedOnly} onChange={event => update({ linkedOnly: event.target.checked })} />
      {t("flows.linksGraph.linkedOnly")}
    </label>
  );

  const modeControls = (
    <>
      <label className="ofu-check" title={t("flows.detailsTitle")}>
        <input type="checkbox" checked={view.details} onChange={event => update({ details: event.target.checked })} />
        {t("flows.details")}
      </label>
      {effectiveFocus && (
        <>
          {focusedNode && !focusedNode.hidden && (
            <Button icon="rows" label={t("flows.linksGraph.showInRowsTitle", { name: focusedNode.name })}
              onClick={() => actions.focusLane(effectiveFocus)}>
              {t("flows.linksGraph.showInRows")}
            </Button>
          )}
          <Button label={t("flows.linksGraph.clearFocusTitle")} onClick={() => setFocusId(null)}>
            {t("flows.linksGraph.clearFocus")}
          </Button>
        </>
      )}
    </>
  );

  return (
    <div className="ofu ofu-screen ofu-flows">
      <FlowsToolbar view={view} update={update} totals={graph.totals} tags={tags}
        filterControls={filterControls} modeControls={modeControls} endControls={hasDiagram ? <ZoomControls viewport={viewport} /> : null}
        groupsReadable={groupsReadable} error={error} updated={updated} onRefresh={refresh} />
      <div className="ofu-flow">
        <div ref={viewport.viewportRef} className="ofu-flow__viewport" tabIndex={0}
          aria-label={t("flows.linksGraph.diagramLabel")} aria-roledescription={t("channelFlow.diagramRole")}
          onClick={() => setFocusId(null)}
          onKeyDown={event => { if (event.key === "Escape") setFocusId(null); }}>
          <div ref={viewport.stageRef} className="ofu-flow__stage" style={{ width: scene.width, height: scene.height }}>
            {hasDiagram && (
              <>
                {scene.groups.map(group => {
                  const groupFocused = !subgraph || group.nodeIds.some(id => subgraph.nodeIds.has(id));
                  return (
                    <section key={group.id}
                      className={cx("ofu-links-group", !groupFocused && "ofu-links-group--dimmed")}
                      style={{ left: group.box.x, top: group.box.y, width: group.box.width, height: group.box.height }}
                      aria-label={group.name}>
                      <header className="ofu-links-group__head">
                        <span className="ofu-links-group__name" title={group.name}>{group.name}</span>
                        <span className="ofu-links-group__count">{t("flows.group.channels", { count: group.nodeIds.length })}</span>
                        {group.stats.ERROR > 0 && (
                          <span className="ofu-links-group__badge ofu-status-ERROR">{formatNumber(group.stats.ERROR)}</span>
                        )}
                        {group.stats.QUEUED > 0 && (
                          <span className="ofu-links-group__badge ofu-status-QUEUED">{formatNumber(group.stats.QUEUED)}</span>
                        )}
                      </header>
                    </section>
                  );
                })}
                {scene.nodes.map(node => (
                  <LinkNode key={node.id} node={node}
                    selected={node.id === effectiveFocus}
                    focused={Boolean(subgraph?.nodeIds.has(node.id))}
                    dimmed={Boolean(subgraph && !subgraph.nodeIds.has(node.id))}
                    showDetails={view.details}
                    onToggleFocus={toggleFocus} actions={actions} />
                ))}
                <svg className="ofu-flow__edges" width={scene.width} height={scene.height} aria-hidden="true">
                  {scene.edges.map(edge => {
                    const { line, head } = arrowPaths(edge);
                    const focused = subgraph?.edgeIds.has(edge.id);
                    const dimmed = subgraph && !focused;
                    return (
                      <g key={edge.id} className={cx(
                        "ofu-edge",
                        "ofu-links-edge",
                        `ofu-edge--${edge.kind === "off" ? "off" : "message"}`,
                        `ofu-links-edge--${edge.kind}`,
                        edge.back && "ofu-links-edge--back",
                        focused && "ofu-links-edge--focused",
                        dimmed && "ofu-links-edge--dimmed"
                      )}>
                        <path className="ofu-edge__line" d={line} />
                        {head && <path className="ofu-edge__head" d={head} />}
                      </g>
                    );
                  })}
                </svg>
                {scene.edges.map(edge => {
                  const source = nodeById.get(edge.from);
                  const canOpen = actions.canOpenMessages && source && !source.hidden;
                  const dimmed = subgraph && !subgraph.edgeIds.has(edge.id);
                  const [lx, ly] = edge.labelPos;
                  const title = canOpen
                    ? t("flows.card.openMessages", { where: `${source.name} · ${edge.destinationName}` })
                    : edge.destinationName;
                  const cls = cx(
                    "ofu-links-edge-label",
                    `ofu-links-edge-label--${edge.kind}`,
                    dimmed && "ofu-links-edge-label--dimmed"
                  );
                  const badge = edge.stats.ERROR > 0
                    ? <span className="ofu-links-edge-label__stat ofu-status-ERROR">{formatNumber(edge.stats.ERROR)}</span>
                    : edge.stats.QUEUED > 0
                      ? <span className="ofu-links-edge-label__stat ofu-status-QUEUED">{formatNumber(edge.stats.QUEUED)}</span>
                      : null;
                  return canOpen ? (
                    <button key={`lbl-${edge.id}`} type="button" className={cls} style={{ left: lx, top: ly }}
                      title={title} onClick={event => { event.stopPropagation(); actions.openMessages(edge.from, edge.metaDataId); }}>
                      {view.details && (
                        <span className="ofu-links-edge-label__id">{t("flows.card.destination", { id: edge.metaDataId })}</span>
                      )}
                      <span className="ofu-links-edge-label__text">{edge.destinationName}</span>
                      {badge}
                    </button>
                  ) : (
                    <span key={`lbl-${edge.id}`} className={cls} style={{ left: lx, top: ly }} title={title}>
                      {view.details && (
                        <span className="ofu-links-edge-label__id">{t("flows.card.destination", { id: edge.metaDataId })}</span>
                      )}
                      <span className="ofu-links-edge-label__text">{edge.destinationName}</span>
                      {badge}
                    </span>
                  );
                })}
              </>
            )}
          </div>
          {!canViewChannels && (
            <div className="ofu-links__overlay">
              <EmptyState title={t("flows.linksGraph.emptyUnreadable")}>
                {t("flows.linksGraph.emptyUnreadableHelp")}
              </EmptyState>
            </div>
          )}
          {canViewChannels && statuses && scene.nodes.length === 0 && (
            <div className="ofu-links__overlay">
              {view.linkedOnly ? (
                <EmptyState title={t("flows.linksGraph.emptyNoLinks")}>
                  <p>{t("flows.linksGraph.emptyNoLinksHelp")}</p>
                  <Button onClick={() => update({ linkedOnly: false })}>{t("flows.linksGraph.showAll")}</Button>
                </EmptyState>
              ) : (
                <EmptyState title={view.filter ? t("flows.empty.filtered") : t("flows.empty.none")}>
                  {!view.filter && t("flows.empty.noneHelp")}
                </EmptyState>
              )}
            </div>
          )}
        </div>
        {hasDiagram && settings.minimap !== "off" && (
          <Minimap scene={scene} viewport={viewport} onClose={() => updateSettings({ minimap: "off" })} />
        )}
      </div>
    </div>
  );
}
