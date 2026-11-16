// SPDX-License-Identifier: MPL-2.0
// From engine data to what Flows Monitoring draws:
//   groups → lanes (one per deployed channel) → source + destination chains → counters.
import { asList, destinationsOf, isTrue } from "../shared/model/xstream.js";
import { splitChains } from "../shared/model/chains.js";
import { addStats, emptyStats, statsOf } from "../shared/model/stats.js";
import { endpointOf } from "../shared/model/endpoint.js";

export const DEFAULT_GROUP_ID = "default";

/**
 * metaDataId → waits for the previous destination, read from a channel
 * configuration. Dashboard statuses always say false (OIE-01), so chains come
 * from the configuration.
 * @returns {Map<number, boolean>}
 */
export function waitsOf(channel) {
  return new Map(destinationsOf(channel).map(destination =>
    [Number(destination.metaDataId), isTrue(destination.waitForPrevious)]));
}

/**
 * Links between channels: a Channel Writer destination sends to another channel
 * (its Channel Reader source). Read from the channel configurations.
 * @returns {{ outgoing: Map<string, Map<number, string>>, incoming: Map<string, { channelId: string, metaDataId: number }[]> }}
 */
export function channelLinks(channels) {
  const outgoing = new Map();
  const incoming = new Map();
  for (const channel of channels) {
    for (const destination of destinationsOf(channel)) {
      const target = String(destination.properties?.channelId ?? "");
      if (destination.transportName !== "Channel Writer" || !isTrue(destination.enabled) || !target || target === "none") continue;
      const from = String(channel.id);
      const metaDataId = Number(destination.metaDataId);
      if (!outgoing.has(from)) outgoing.set(from, new Map());
      outgoing.get(from).set(metaDataId, target);
      if (!incoming.has(target)) incoming.set(target, []);
      incoming.get(target).push({ channelId: from, metaDataId });
    }
  }
  return { outgoing, incoming };
}

/**
 * Type and address of each connector of a channel (metaDataId → details), read
 * from its configuration: dashboard statuses do not carry them.
 * @returns {Map<number, { transport: string, endpoint: string }>}
 */
export function connectorDetails(channel) {
  const source = channel?.sourceConnector;
  const connectors = [...(source ? [{ ...source, metaDataId: 0 }] : []), ...destinationsOf(channel)];
  return new Map(connectors.map(connector => [Number(connector.metaDataId),
    { transport: connector.transportName || "", endpoint: endpointOf(connector) }]));
}

/**
 * Disabled destinations of a channel (excluded from OIE dashboard statuses).
 * @returns {{ metaDataId: number, name: string, transport: string, endpoint: string, waitForPrevious: boolean, disabled: true }[]}
 */
export function disabledDestinationsOf(channel) {
  return destinationsOf(channel)
    .filter(destination => !isTrue(destination.enabled))
    .map(destination => ({
      metaDataId: Number(destination.metaDataId),
      name: destination.name || `Destination ${destination.metaDataId}`,
      transport: destination.transportName || "",
      endpoint: endpointOf(destination),
      waitForPrevious: isTrue(destination.waitForPrevious),
      disabled: true
    }));
}

/** A connector card: what it is, its state and its counters. */
function connectorOf(status, lifetime, fallbackName, details) {
  const own = details?.get(Number(status?.metaDataId ?? 0));
  return {
    transport: own?.transport ?? "",
    endpoint: own?.endpoint ?? "",
    metaDataId: Number(status?.metaDataId ?? 0),
    name: status?.name || fallbackName,
    state: status?.state ?? null,
    queueEnabled: isTrue(status?.queueEnabled ?? false),
    stats: status ? statsOf(status, lifetime) : emptyStats()
  };
}

/**
 * One channel row. Statuses only list deployed, enabled connectors (OIE-02).
 * Without the channel's configuration (`waits` unknown: the user may not read
 * channels), the chains are unknown: the destinations stay in one row, in order,
 * and `chainsKnown` is false.
 * @param {any} status dashboard status of the channel
 * @param {{ lifetime?: boolean, waits?: Map<number, boolean>, links?: { outgoing: Map<string, Map<number, string>>, incoming: Map<string, any[]> },
 *          details?: Map<number, { transport: string, endpoint: string }>, disabled?: any[], showDisabled?: boolean,
 *          tags?: { id: string, name: string, color: string | null }[] }} [options]
 */
export function channelLane(status, { lifetime = false, waits, links = { outgoing: new Map(), incoming: new Map() }, details, disabled = [], showDisabled = false, tags = [] } = {}) {
  const children = asList(status.childStatuses, "dashboardStatus");
  const sourceStatus = children.find(child => child.statusType === "SOURCE_CONNECTOR" || Number(child.metaDataId) === 0);
  const deployed = children.filter(child => child !== sourceStatus);
  const destinations = (showDisabled && disabled.length ? [...deployed, ...disabled] : deployed)
    .sort((a, b) => Number(a.metaDataId) - Number(b.metaDataId));
  const chainsKnown = !!waits;
  const chains = splitChains(destinations, {
    enabled: item => !item.disabled,
    waits: child => child.disabled ? child.waitForPrevious : (chainsKnown ? waits.get(Number(child.metaDataId)) ?? false : true)
  });
  return {
    id: String(status.channelId),
    name: status.name || String(status.channelId),
    state: status.state,
    tags,
    hasDisabled: disabled.length > 0,
    chainsKnown,
    stats: statsOf(status, lifetime),
    source: connectorOf(sourceStatus, lifetime, "Source", details),
    chains: chains.map(chain => chain.map(child => child.disabled ? {
      metaDataId: child.metaDataId,
      name: child.name,
      transport: child.transport,
      endpoint: child.endpoint,
      state: null,
      queueEnabled: false,
      stats: emptyStats(),
      linkTo: null,
      disabled: true
    } : {
      ...connectorOf(child, lifetime, `Destination ${child.metaDataId}`, details),
      linkTo: links.outgoing.get(String(status.channelId))?.get(Number(child.metaDataId)) ?? null,
      disabled: false
    })),
    calledBy: links.incoming.get(String(status.channelId)) ?? []
  };
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

/**
 * Lanes by channel group, groups sorted by name, the channels in no group last
 * under the default group. Empty groups are left out.
 * @param {any[]} statuses
 * @param {any[]} groups channel groups ({ id, name, channels })
 * @param {{ filter?: string, lifetime?: boolean, waits?: Map<string, Map<number, boolean>>, links?: any, details?: Map<string, any>, disabled?: Map<string, any[]>, showDisabled?: boolean, stoppedOnly?: boolean, tags?: Map<string, any[]>, defaultGroupName: string }} options
 */
export function groupLanes(statuses, groups, { filter = "", lifetime = false, waits = new Map(), links, details = new Map(), disabled = new Map(), showDisabled = false, stoppedOnly = false, tags = new Map(), defaultGroupName }) {
  const needle = filter.trim().toLowerCase();
  const isStopped = lane => (lane.state && lane.state !== "STARTED")
    || (lane.source.state && lane.source.state !== "STARTED")
    || lane.chains.some(chain => chain.some(connector => !connector.disabled && connector.state && connector.state !== "STARTED"));
  const lanes = statuses
    .map(status => {
      const id = String(status.channelId);
      return channelLane(status, { lifetime, waits: waits.get(id), links, details: details.get(id), disabled: disabled.get(id) ?? [], showDisabled, tags: tags.get(id) ?? [] });
    })
    .filter(lane => (!stoppedOnly || isStopped(lane)) && (!needle || lane.name.toLowerCase().includes(needle) || lane.tags.some(tag => tag.name.toLowerCase().includes(needle))))
    .sort(byName);
  const laneById = new Map(lanes.map(lane => [lane.id, lane]));
  const grouped = new Set();
  const result = [...groups].sort(byName).map(group => {
    const members = asList(group.channels, "channel")
      .map(channel => laneById.get(String(channel?.id ?? channel)))
      .filter(Boolean)
      .sort(byName);
    members.forEach(lane => grouped.add(lane.id));
    return { id: String(group.id), name: group.name || defaultGroupName, lanes: members };
  });
  const rest = lanes.filter(lane => !grouped.has(lane.id));
  if (rest.length) result.push({ id: DEFAULT_GROUP_ID, name: defaultGroupName, lanes: rest });
  return result
    .filter(group => group.lanes.length)
    .map(group => ({ ...group, stats: group.lanes.reduce((sum, lane) => addStats(sum, lane.stats), emptyStats()) }));
}

/**
 * Which groups are open: the ones the user opened or closed during the session,
 * otherwise the default from the settings ("first", "all" or "none"). A filter
 * opens every group that has a match.
 * @param {{ id: string }[]} groups
 * @param {Record<string, boolean>} toggled group id → open, from the session
 */
export function openGroups(groups, toggled, defaultMode, filtering) {
  return new Set(groups.filter((group, index) => {
    if (filtering) return true;
    if (group.id in toggled) return toggled[group.id];
    return defaultMode === "all" || (defaultMode === "first" && index === 0);
  }).map(group => group.id));
}

