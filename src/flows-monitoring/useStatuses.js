// SPDX-License-Identifier: MPL-2.0
// Loads what Flows Monitoring shows. Counters refresh on a timer while the tab
// is visible; groups and chains (heavier: full channel configurations) only on
// load and on Refresh.
import { useCallback, useEffect, useState } from "../host/react.js";
import { channelConfigurations, channelGroups, channelStatuses } from "../host/api.js";
import { asList } from "../shared/model/xstream.js";
import { channelLinks, waitsOf } from "./model.js";

/**
 * @param {number} refreshSeconds 0 = only on demand
 * @returns {{ statuses: any[] | null, groups: any[], groupsReadable: boolean, waits: Map<string, Map<number, boolean>>, links: any,
 *             error: string, updated: Date | null, refresh: () => void, reloadCounters: () => Promise<void> }}
 */
export function useStatuses(refreshSeconds) {
  const [data, setData] = useState({ statuses: null, groups: [], groupsReadable: true, waits: new Map(), links: channelLinks([]) });
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);

  const load = useCallback(async (withStructure) => {
    try {
      const [statuses, groups] = await Promise.all([channelStatuses(), withStructure ? channelGroups() : null]);
      const list = asList(statuses, "dashboardStatus");
      let waits = null;
      let links = null;
      if (withStructure && list.length) {
        // Without the right to read channels, chains and links stay unknown.
        const channels = await channelConfigurations(list.map(status => status.channelId)).catch(() => []);
        waits = new Map(channels.map(channel => [String(channel.id), waitsOf(channel)]));
        links = channelLinks(channels);
      }
      setData(previous => ({
        statuses: list,
        groups: withStructure ? asList(groups ?? [], "channelGroup") : previous.groups,
        groupsReadable: withStructure ? groups !== null : previous.groupsReadable,
        waits: waits ?? previous.waits,
        links: links ?? previous.links
      }));
      setError("");
      setUpdated(new Date());
    } catch (failure) {
      setError(failure?.message || String(failure));
    }
  }, []);

  useEffect(() => {
    load(true);
    if (!refreshSeconds) return undefined;
    const timer = setInterval(() => { if (!document.hidden) load(false); }, refreshSeconds * 1000);
    return () => clearInterval(timer);
  }, [load, refreshSeconds]);

  return { ...data, error, updated, refresh: () => load(true), reloadCounters: () => load(false) };
}
