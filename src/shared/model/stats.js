// SPDX-License-Identifier: MPL-2.0
// Message counters of a channel or connector, read from a dashboard status.
import { asList } from "./xstream.js";

/** Statuses counted by the engine, in the order of the totals. */
export const STATUSES = ["RECEIVED", "FILTERED", "QUEUED", "SENT", "ERROR"];

/** Counters of a source card and of a destination card, main status first. */
export const SOURCE_COUNTERS = ["RECEIVED", "FILTERED", "QUEUED", "ERROR"];
export const DESTINATION_COUNTERS = ["SENT", "FILTERED", "QUEUED", "ERROR"];

/** @typedef {{ RECEIVED: number, FILTERED: number, QUEUED: number, SENT: number, ERROR: number }} Stats */

/** @returns {Stats} */
export const emptyStats = () => ({ RECEIVED: 0, FILTERED: 0, QUEUED: 0, SENT: 0, ERROR: 0 });

/**
 * The counters of a dashboard status. The engine sends a map of Status → count
 * (current or lifetime), and the queue size apart, in `queued`.
 * @param {any} status
 * @param {boolean} [lifetime]
 * @returns {Stats}
 */
export function statsOf(status, lifetime = false) {
  const stats = emptyStats();
  const map = lifetime ? status?.lifetimeStatistics : status?.statistics;
  for (const entry of asList(map?.entry)) {
    const name = entry["com.mirth.connect.donkey.model.message.Status"] ?? entry.string ?? entry.key;
    const count = Number(entry.long ?? entry.value) || 0;
    if (name in stats && name !== "QUEUED") stats[name] += count;
  }
  stats.QUEUED = Number(status?.queued) || 0;
  return stats;
}

/** @param {Stats} a @param {Stats} b @returns {Stats} */
export function addStats(a, b) {
  const sum = emptyStats();
  for (const key of STATUSES) sum[key] = (a[key] || 0) + (b[key] || 0);
  return sum;
}
