// SPDX-License-Identifier: MPL-2.0
// From engine data to what Flows Monitoring draws:
//   groups → lanes (one per deployed channel) → source + destination chains → counters.
import { asList, destinationsOf, isTrue } from "../shared/model/xstream.js";
import { splitChains } from "../shared/model/chains.js";
import { addStats, emptyStats, statsOf } from "../shared/model/stats.js";

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

/** A connector card: what it is, its state and its counters. */
function connectorOf(status, lifetime, fallbackName) {
  return {
    metaDataId: Number(status?.metaDataId ?? 0),
    name: status?.name || fallbackName,
    state: status?.state ?? null,
    stats: status ? statsOf(status, lifetime) : emptyStats()
  };
}

/**
 * One channel row. Statuses only list deployed, enabled connectors (OIE-02).
 * Without the channel's configuration (`waits` unknown: the user may not read
 * channels), the chains are unknown: the destinations stay in one row, in order,
 * and `chainsKnown` is false.
 * @param {any} status dashboard status of the channel
 * @param {{ lifetime?: boolean, waits?: Map<number, boolean>, links?: { outgoing: Map<string, Map<number, string>>, incoming: Map<string, any[]> } }} [options]
 */
export function channelLane(status, { lifetime = false, waits, links = { outgoing: new Map(), incoming: new Map() } } = {}) {
  const children = asList(status.childStatuses, "dashboardStatus");
  const sourceStatus = children.find(child => child.statusType === "SOURCE_CONNECTOR" || Number(child.metaDataId) === 0);
  const destinations = children.filter(child => child !== sourceStatus)
    .sort((a, b) => Number(a.metaDataId) - Number(b.metaDataId));
  const chainsKnown = !!waits;
  const chains = splitChains(destinations, {
    enabled: () => true,
    waits: child => chainsKnown ? waits.get(Number(child.metaDataId)) ?? false : true
  });
  return {
    id: String(status.channelId),
    name: status.name || String(status.channelId),
    state: status.state,
    chainsKnown,
    stats: statsOf(status, lifetime),
    source: connectorOf(sourceStatus, lifetime, "Source"),
    chains: chains.map(chain => chain.map(child => ({
      ...connectorOf(child, lifetime, `Destination ${child.metaDataId}`),
      linkTo: links.outgoing.get(String(status.channelId))?.get(Number(child.metaDataId)) ?? null
    }))),
    calledBy: links.incoming.get(String(status.channelId)) ?? []
  };
}

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

/**
 * Lanes by channel group, groups sorted by name, the channels in no group last
 * under the default group. Empty groups are left out.
 * @param {any[]} statuses
 * @param {any[]} groups channel groups ({ id, name, channels })
 * @param {{ filter?: string, lifetime?: boolean, waits?: Map<string, Map<number, boolean>>, links?: any, defaultGroupName: string }} options
 */
export function groupLanes(statuses, groups, { filter = "", lifetime = false, waits = new Map(), links, defaultGroupName }) {
  const needle = filter.trim().toLowerCase();
  const lanes = statuses
    .map(status => channelLane(status, { lifetime, waits: waits.get(String(status.channelId)), links }))
    .filter(lane => !needle || lane.name.toLowerCase().includes(needle))
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

