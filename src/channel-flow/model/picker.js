// SPDX-License-Identifier: MPL-2.0
// The channel list of Channel Flow's picker, with channel tags and filtering.
import { asList } from "../../shared/model/xstream.js";
import { tagColor, tagsByChannel } from "../../shared/model/tags.js";

export { tagColor };

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

/**
 * Distinct tags assigned to at least one visible channel, sorted by name.
 * @param {Map<string, string>} names
 * @param {any} rawTags
 * @returns {{ id: string, name: string, color: string | null }[]}
 */
export function availablePickerTags(names, rawTags) {
  const byChannel = tagsByChannel(rawTags);
  const visible = new Map();
  for (const id of names.keys()) {
    for (const tag of byChannel.get(id) ?? []) {
      if (!visible.has(tag.id)) visible.set(tag.id, tag);
    }
  }
  return [...visible.values()].sort(byName);
}

/**
 * Channels by group, groups by name, ungrouped channels last.
 * Matches on channel name or tag name, and optionally on a selected tag id.
 * @param {Map<string, string>} names
 * @param {any[]} groups
 * @param {string} filter
 * @param {string} defaultGroupName
 * @param {{ tags?: any, tagId?: string }} [options]
 */
export function pickerGroups(names, groups, filter, defaultGroupName, { tags = [], tagId = "" } = {}) {
  const needle = String(filter ?? "").trim().toLowerCase();
  const byChannel = tagsByChannel(tags);
  const matches = id => {
    if (!names.has(id)) return false;
    const channelTags = byChannel.get(id) ?? [];
    if (tagId && !channelTags.some(tag => tag.id === tagId)) return false;
    if (!needle) return true;
    return names.get(id).toLowerCase().includes(needle)
      || channelTags.some(tag => tag.name.toLowerCase().includes(needle));
  };
  const toChannel = id => ({ id, name: names.get(id), tags: byChannel.get(id) ?? [] });
  const grouped = new Set();
  const result = [...groups].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(group => {
    const ids = asList(group.channels, "channel").map(channel => String(channel?.id ?? channel));
    ids.forEach(id => grouped.add(id));
    return { id: String(group.id), name: group.name, channels: ids.filter(matches).map(toChannel).sort(byName) };
  });
  const rest = [...names.keys()].filter(id => !grouped.has(id) && matches(id)).map(toChannel).sort(byName);
  if (rest.length) result.push({ id: "default", name: defaultGroupName, channels: rest });
  return result.filter(group => group.channels.length);
}
