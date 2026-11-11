// SPDX-License-Identifier: MPL-2.0
// The channel list of Channel Flow's picker.
import { asList } from "../../shared/model/xstream.js";

/** Channels by group, groups by name, ungrouped channels last. */
export function pickerGroups(names, groups, filter, defaultGroupName) {
  const needle = filter.trim().toLowerCase();
  const matches = id => names.has(id) && (!needle || names.get(id).toLowerCase().includes(needle));
  const byName = (a, b) => a.name.localeCompare(b.name);
  const grouped = new Set();
  const result = [...groups].sort((a, b) => String(a.name).localeCompare(String(b.name))).map(group => {
    const ids = asList(group.channels, "channel").map(channel => String(channel?.id ?? channel));
    ids.forEach(id => grouped.add(id));
    return { id: String(group.id), name: group.name, channels: ids.filter(matches).map(id => ({ id, name: names.get(id) })).sort(byName) };
  });
  const rest = [...names.keys()].filter(id => !grouped.has(id) && matches(id)).map(id => ({ id, name: names.get(id) })).sort(byName);
  if (rest.length) result.push({ id: "default", name: defaultGroupName, channels: rest });
  return result.filter(group => group.channels.length);
}
