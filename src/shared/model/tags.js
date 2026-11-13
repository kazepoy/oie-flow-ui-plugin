// SPDX-License-Identifier: MPL-2.0
// Channel tags from /server/channelTags, shared between Flows Monitoring and
// Channel Flow's picker.
import { asList } from "./xstream.js";

const byName = (a, b) => String(a.name).localeCompare(String(b.name));

/**
 * CSS rgb() string for a channel tag's backgroundColor, or null when unset.
 * @param {any} tag
 * @returns {string | null}
 */
export function tagColor(tag) {
  const color = tag?.backgroundColor;
  if (!color || typeof color !== "object") return null;
  const parts = [color.red, color.green, color.blue];
  if (parts.some(value => value === null || value === undefined || value === "")) return null;
  const numbers = parts.map(Number);
  return numbers.every(Number.isFinite) ? `rgb(${numbers[0]}, ${numbers[1]}, ${numbers[2]})` : null;
}

/**
 * Normalizes tags and indexes them by channel id, sorted by tag name.
 * @param {any} rawTags
 * @returns {Map<string, { id: string, name: string, color: string | null }[]>}
 */
export function tagsByChannel(rawTags) {
  const byChannel = new Map();
  for (const raw of asList(rawTags ?? [], "channelTag")) {
    const name = String(raw?.name ?? "").trim();
    if (!name) continue;
    const tag = { id: String(raw.id ?? name), name, color: tagColor(raw) };
    for (const channelId of asList(raw.channelIds, "string").map(String)) {
      const list = byChannel.get(channelId) ?? [];
      if (!list.some(existing => existing.id === tag.id)) {
        list.push(tag);
        byChannel.set(channelId, list);
      }
    }
  }
  for (const list of byChannel.values()) list.sort(byName);
  return byChannel;
}

/** Inline tint derived from a tag's backgroundColor, readable in both themes. */
export const tagStyle = color => color ? {
  background: `color-mix(in srgb, ${color} 24%, transparent)`,
  borderColor: `color-mix(in srgb, ${color} 42%, transparent)`,
  color: `color-mix(in srgb, ${color} 72%, var(--ofu-ink))`
} : undefined;

