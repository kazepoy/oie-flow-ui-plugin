// SPDX-License-Identifier: MPL-2.0
// Pure graph model for cross-channel Channel Writer → Channel Reader links.
import { addStats, emptyStats } from "../shared/model/stats.js";
import { channelLane, DEFAULT_GROUP_ID, groupLanes } from "./model.js";

/**
 * Determine visual severity kind of a link edge from its destination and endpoints.
 * @param {any} sourceNode
 * @param {any} destConnector
 * @param {boolean} targetOff
 * @returns {"error" | "queued" | "off" | "message"}
 */
function edgeKind(sourceNode, destConnector, targetOff) {
  if (destConnector.stats.ERROR > 0) return "error";
  if (destConnector.stats.QUEUED > 0) return "queued";
  if (targetOff) return "off";
  if (sourceNode.state && sourceNode.state !== "STARTED") return "off";
  if (destConnector.state && destConnector.state !== "STARTED") return "off";
  return "message";
}

/** Map each known channel id to its group metadata from the unfiltered group list. */
function channelGroupMap(groups, statuses, defaultGroupName) {
  const map = new Map();
  for (const group of groups) {
    const id = String(group.id);
    const name = group.name || defaultGroupName;
    const raw = Array.isArray(group.channels) ? group.channels : group.channels?.channel ? [group.channels.channel].flat() : [];
    for (const channel of raw) {
      map.set(String(channel?.id ?? channel), { id, name });
    }
  }
  for (const status of statuses) {
    const id = String(status.channelId);
    if (!map.has(id)) map.set(id, { id: DEFAULT_GROUP_ID, name: defaultGroupName });
  }
  return map;
}

/**
 * Build the channel link graph ready for layout.
 * @param {{ statuses: any[], groups: any[], waits?: Map<string, Map<number, boolean>>, links?: any,
 *           details?: Map<string, any>, tags?: Map<string, any[]>, filter?: string,
 *           linkedOnly?: boolean, lifetime?: boolean, defaultGroupName: string, hiddenTargetName: string }} options
 */
export function buildLinksGraph({
  statuses,
  groups,
  waits = new Map(),
  links = { outgoing: new Map(), incoming: new Map() },
  details = new Map(),
  tags = new Map(),
  filter = "",
  linkedOnly = true,
  lifetime = false,
  defaultGroupName,
  hiddenTargetName
}) {
  const grouped = groupLanes(statuses, groups, { filter, lifetime, waits, links, details, tags, defaultGroupName });
  const statusById = new Map(statuses.map(status => [String(status.channelId), status]));
  const knownGroupOf = channelGroupMap(groups, statuses, defaultGroupName);

  /** @type {Map<string, any>} */
  const nodeMap = new Map();
  /** @type {Map<string, { id: string, name: string, nodeIds: string[], hiddenCount: number }>} */
  const groupMap = new Map();

  const ensureGroup = (id, name) => {
    if (!groupMap.has(id)) groupMap.set(id, { id, name, nodeIds: [], hiddenCount: 0 });
    return groupMap.get(id);
  };

  for (const group of grouped) {
    const entry = ensureGroup(group.id, group.name);
    for (const lane of group.lanes) {
      const node = {
        id: lane.id,
        name: lane.name,
        groupId: group.id,
        state: lane.state,
        tags: lane.tags,
        stats: lane.stats,
        source: lane.source,
        chains: lane.chains,
        hidden: false
      };
      nodeMap.set(node.id, node);
      entry.nodeIds.push(node.id);
    }
  }

  const ensureGhost = channelId => {
    let existing = nodeMap.get(channelId);
    if (existing) return existing;
    const knownStatus = statusById.get(channelId);
    const groupInfo = knownGroupOf.get(channelId) ?? { id: DEFAULT_GROUP_ID, name: defaultGroupName };
    existing = {
      id: channelId,
      name: knownStatus?.name || hiddenTargetName,
      groupId: groupInfo.id,
      state: knownStatus?.state ?? null,
      tags: [],
      stats: emptyStats(),
      source: null,
      chains: [],
      hidden: true
    };
    nodeMap.set(channelId, existing);
    ensureGroup(groupInfo.id, groupInfo.name).nodeIds.push(channelId);
    return existing;
  };

  /** @type {any[]} */
  const edges = [];
  const seenEdges = new Set();
  const pushEdge = (sourceNode, dest, targetId) => {
    const edgeId = `${sourceNode.id}:${dest.metaDataId}->${targetId}`;
    if (seenEdges.has(edgeId)) return;
    seenEdges.add(edgeId);
    const target = ensureGhost(targetId);
    const targetOff = target.hidden || (target.state && target.state !== "STARTED");
    edges.push({
      id: edgeId,
      from: sourceNode.id,
      to: targetId,
      metaDataId: dest.metaDataId,
      destinationName: dest.name,
      state: dest.state,
      stats: dest.stats,
      kind: edgeKind(sourceNode, dest, targetOff)
    });
  };

  for (const node of [...nodeMap.values()]) {
    for (const chain of node.chains) {
      for (const dest of chain) {
        if (dest.linkTo) pushEdge(node, dest, String(dest.linkTo));
      }
    }
    for (const caller of links.incoming.get(node.id) ?? []) {
      const callerId = String(caller.channelId);
      if (nodeMap.has(callerId) && !nodeMap.get(callerId).hidden) continue;
      const callerStatus = statusById.get(callerId);
      if (!callerStatus) continue;
      const callerNode = ensureGhost(callerId);
      const lane = channelLane(callerStatus, { lifetime, waits: waits.get(callerId), links, details: details.get(callerId), tags: tags.get(callerId) ?? [] });
      const dest = lane.chains.flat().find(item => Number(item.metaDataId) === Number(caller.metaDataId));
      if (dest) pushEdge(callerNode, dest, node.id);
    }
  }

  const linkedIds = new Set();
  for (const edge of edges) {
    linkedIds.add(edge.from);
    linkedIds.add(edge.to);
  }

  const nodes = [...nodeMap.values()].filter(node => !linkedOnly || linkedIds.has(node.id));
  const keptIds = new Set(nodes.map(node => node.id));
  const activeGroups = [...groupMap.values()]
    .map(group => {
      const memberIds = group.nodeIds.filter(id => keptIds.has(id));
      const stats = memberIds
        .map(id => nodeMap.get(id))
        .filter(node => node && !node.hidden)
        .reduce((sum, node) => addStats(sum, node.stats), emptyStats());
      return { id: group.id, name: group.name, nodeIds: memberIds, stats };
    })
    .filter(group => group.nodeIds.length > 0);

  const visibleCount = nodes.filter(node => !node.hidden).length;
  const totals = nodes
    .filter(node => !node.hidden)
    .reduce((sum, node) => addStats(sum, node.stats), emptyStats());

  return { groups: activeGroups, nodes, edges, visibleCount, linkedCount: linkedIds.size, totals };
}

/**
 * Compute all upstream callers and downstream targets reachable from `focusId`,
 * plus the edges along paths passing through `focusId`.
 * @param {{ id: string, from: string, to: string }[]} edges
 * @param {string | null} focusId
 * @returns {{ nodeIds: Set<string>, edgeIds: Set<string> } | null}
 */
export function connectedSubgraph(edges, focusId) {
  if (!focusId) return null;
  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    outgoing.get(edge.from).push(edge.to);
    incoming.get(edge.to).push(edge.from);
  }
  const walk = (start, adj) => {
    const visited = new Set();
    const queue = [...(adj.get(start) ?? [])];
    while (queue.length) {
      const next = queue.shift();
      if (next === start || visited.has(next)) continue;
      visited.add(next);
      for (const neighbor of adj.get(next) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    return visited;
  };
  const upstream = walk(focusId, incoming);
  const downstream = walk(focusId, outgoing);
  const nodeIds = new Set([focusId, ...upstream, ...downstream]);
  const inUp = id => id === focusId || upstream.has(id);
  const inDown = id => id === focusId || downstream.has(id);
  const edgeIds = new Set(
    edges
      .filter(edge => (inUp(edge.from) && inUp(edge.to)) || (inDown(edge.from) && inDown(edge.to)))
      .map(edge => edge.id)
  );
  return { nodeIds, edgeIds };
}
