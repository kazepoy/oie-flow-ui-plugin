// SPDX-License-Identifier: MPL-2.0
// Paths of the plugin's views and of the Web Admin views it links to.
// Only routes and URL parameters that Web Admin declares are used; remaining
// platform gaps are listed in doc/platform-limits.md.
import { platform } from "./platform.js";

const enc = encodeURIComponent;

function queryString(params) {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, value]) => value != null);
  if (!entries.length) return "";
  return `?${entries.map(([key, value]) => `${enc(key)}=${enc(value)}`).join("&")}`;
}

export const FLOWS_PATH = "/flows";
export const CHANNEL_FLOW_PATH = "/channel-flow";

export const channelFlowPath = channelId => channelId ? `${CHANNEL_FLOW_PATH}/${enc(channelId)}` : CHANNEL_FLOW_PATH;

/** Messages of a channel, optionally of one connector (0 = source). */
export const messagesPath = (channelId, metaDataId) =>
  `/messages/${enc(channelId)}${metaDataId == null ? "" : `?metaDataId=${enc(metaDataId)}`}`;

/**
 * Channel editor, optionally targeting a tab, destination or script.
 * @param {string} channelId
 * @param {Record<string, string | number | undefined | null>} [query]
 */
export const channelEditorPath = (channelId, query) =>
  `/channels/${enc(channelId)}/edit${queryString(query)}`;

/**
 * Filter, transformer or response editor of a connector, optionally targeting a step.
 * @param {string} channelId
 * @param {string} section
 * @param {string | number} metaDataId
 * @param {string | number} [step]
 */
export const stepEditorPath = (channelId, section, metaDataId, step) =>
  `/channels/${enc(channelId)}/${section}/${enc(metaDataId)}${step == null ? "" : `?step=${enc(step)}`}`;

export function navigate(path) {
  platform().router.navigate(path);
}

/**
 * Opens the filter, transformer or response editor. From the channel editor's
 * Flow tab, the draft is handed over first so unsaved changes are kept: the
 * editor reads it from the "editingChannel" store key (WA-09).
 * @param {any} channel
 * @param {string} section
 * @param {string | number} metaDataId
 * @param {{ draft?: boolean, step?: string | number }} [options]
 */
export function openStepEditor(channel, section, metaDataId, { draft = false, step } = {}) {
  if (draft) platform().store.setState("editingChannel", channel);
  navigate(stepEditorPath(channel.id, section, metaDataId, step));
}
