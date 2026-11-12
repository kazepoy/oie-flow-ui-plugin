// SPDX-License-Identifier: MPL-2.0
// Paths of the plugin's views and of the Web Admin views it links to.
// Only routes that Web Admin declares are used; what they cannot target (an editor
// tab, a destination row, a step) is listed in doc/platform-limits.md (WA-01,
// WA-02) and, for WA-02, reached through editor-dom.js.
import { platform } from "./platform.js";

const enc = encodeURIComponent;

export const FLOWS_PATH = "/flows";
export const CHANNEL_FLOW_PATH = "/channel-flow";

export const channelFlowPath = channelId => channelId ? `${CHANNEL_FLOW_PATH}/${enc(channelId)}` : CHANNEL_FLOW_PATH;

/** Messages of a channel, optionally of one connector (0 = source). */
export const messagesPath = (channelId, metaDataId) =>
  `/messages/${enc(channelId)}${metaDataId == null ? "" : `?metaDataId=${enc(metaDataId)}`}`;

export const channelEditorPath = channelId => `/channels/${enc(channelId)}/edit`;

/** Filter, transformer or response editor of a connector. */
export const stepEditorPath = (channelId, section, metaDataId) =>
  `/channels/${enc(channelId)}/${section}/${enc(metaDataId)}`;

export function navigate(path) {
  platform().router.navigate(path);
}

/**
 * Opens the filter, transformer or response editor. From the channel editor's
 * Flow tab, the draft is handed over first so unsaved changes are kept: the
 * editor reads it from the "editingChannel" store key (WA-09).
 */
export function openStepEditor(channel, section, metaDataId, { draft = false } = {}) {
  if (draft) platform().store.setState("editingChannel", channel);
  navigate(stepEditorPath(channel.id, section, metaDataId));
}
