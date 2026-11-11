// SPDX-License-Identifier: MPL-2.0
// Engine data read through Web Admin's API client, with the user's session:
// the server only returns the channels the user's role allows.
import { platform } from "./platform.js";
import { asList } from "../shared/model/xstream.js";

const api = () => platform().api;

/** Dashboard statuses of the deployed channels, with their connectors. */
export const channelStatuses = () => api().status.list();

/**
 * Channel groups ({ id, name, channels }), or null when the user may not read
 * them (RBAC permission viewChannelGroups).
 */
export const channelGroups = () => api().channelGroups.list().catch(() => null);

/** Full configurations of the given channels. */
export const channelConfigurations = async channelIds =>
  channelIds.length ? asList(await api().channels.list(channelIds), "channel") : [];

/** The saved configuration of one channel. */
export const channelConfiguration = channelId => api().channels.get(channelId);

/** { id: name } of every channel the user may see. */
export async function channelNames() {
  const value = await api().channels.idsAndNames();
  const entries = asList(value?.map ?? value, "entry");
  return new Map(entries.map(entry => {
    const [id, name] = asList(entry.string);
    return [String(id), String(name ?? id)];
  }));
}

/**
 * Starts, pauses, resumes or stops a channel, or starts or stops one of its
 * connectors, as the Dashboard does.
 * @param {"start" | "pause" | "resume" | "stop" | "startConnector" | "stopConnector"} command
 */
export function controlChannel(command, channelId, metaDataId) {
  const status = api().status;
  return command === "startConnector" || command === "stopConnector"
    ? status[command](channelId, metaDataId)
    : status[command](channelId);
}

/** The dashboard status of one channel. */
export const channelStatus = channelId => api().status.one(channelId);

/** A user preference, as a string, or null when unset. */
export async function userPreference(userId, name) {
  const value = await api().users.getPreference(userId, name, { raw: true });
  return value == null || value === "" ? null : String(value);
}

export const setUserPreference = (userId, name, value) => api().users.setPreference(userId, name, value);
